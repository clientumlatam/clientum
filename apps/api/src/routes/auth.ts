import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { sendPasswordResetEmail } from "../lib/email";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  isReplitOidcEnabled,
  type SessionData,
} from "../lib/auth";
import { ensureTrialSubscription } from "./settings";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

const IS_DEV = process.env.NODE_ENV === "development";

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>, idPrefix = "") {
  const email = (claims.email as string) || null;
  const firstName = ((claims.first_name || claims.given_name) as string) || null;
  const lastName = ((claims.last_name || claims.family_name) as string) || null;
  const profileImageUrl = (claims.profile_image_url || claims.picture) as string | null;

  // Account linking: if the provider uses a prefix (e.g. Google "google_"),
  // check if a user with the same email already exists from another provider.
  // If yes, update their profile and return them (no duplicate account created).
  if (email && idPrefix) {
    const [existingByEmail] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingByEmail) {
      const [linked] = await db
        .update(usersTable)
        .set({
          firstName: firstName || existingByEmail.firstName,
          lastName: lastName || existingByEmail.lastName,
          profileImageUrl: profileImageUrl ?? existingByEmail.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, existingByEmail.id))
        .returning();
      return linked;
    }
  }

  const userData = {
    id: idPrefix + (claims.sub as string),
    email,
    firstName,
    lastName,
    profileImageUrl,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();
  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  if (!isReplitOidcEnabled()) {
    const returnTo = getSafeReturnTo(req.query.returnTo);
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (googleConfigured) {
      res.redirect(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      res.redirect(`/api/auth/dev-login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    return;
  }
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  let dbUser: Awaited<ReturnType<typeof upsertUser>>;
  try {
    dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
  } catch (err) {
    req.log?.error({ err }, "upsertUser failed during OIDC callback");
    res.redirect("/api/login?error=db");
    return;
  }

  await ensureTrialSubscription(dbUser.id);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: (dbUser.role ?? "user") as "user" | "admin",
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const origin = getOrigin(req);
  const sid = getSessionId(req);

  // If logged in via Google, revoke the access token silently before clearing session.
  // This avoids the disruptive redirect to accounts.google.com/logout that signs
  // the user out of all Google services, while still invalidating app access.
  if (sid) {
    try {
      const session = await getSession(sid);
      if (session?.access_token && session?.user?.id?.startsWith("google_")) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.access_token)}`,
          { method: "POST", signal: AbortSignal.timeout(3000) },
        );
      }
    } catch { /* ignore — session will be cleared regardless */ }
  }

  await clearSession(res, sid);

  if (!isReplitOidcEnabled()) {
    res.redirect(origin);
    return;
  }

  const config = await getOidcConfig();
  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

async function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return oidc.discovery(new URL("https://accounts.google.com"), clientId, { client_secret: clientSecret });
}

router.get("/auth/google", async (req: Request, res: Response) => {
  const config = await getGoogleConfig();
  if (!config) {
    res.redirect("/?error=google_not_configured");
    return;
  }
  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  setOidcCookie(res, "g_code_verifier", codeVerifier);
  setOidcCookie(res, "g_nonce", nonce);
  setOidcCookie(res, "g_state", state);
  setOidcCookie(res, "g_return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const config = await getGoogleConfig();
  if (!config) { res.redirect("/"); return; }

  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;
  const codeVerifier = req.cookies?.g_code_verifier;
  const nonce = req.cookies?.g_nonce;
  const expectedState = req.cookies?.g_state;
  const returnTo = getSafeReturnTo(req.cookies?.g_return_to);

  res.clearCookie("g_code_verifier", { path: "/" });
  res.clearCookie("g_nonce", { path: "/" });
  res.clearCookie("g_state", { path: "/" });
  res.clearCookie("g_return_to", { path: "/" });

  if (!codeVerifier || !expectedState) { res.redirect("/api/auth/google"); return; }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch (err) {
    req.log?.error({ err }, "Google OAuth callback error");
    res.redirect("/api/auth/google");
    return;
  }

  const claims = tokens.claims();
  if (!claims) { res.redirect("/api/auth/google"); return; }

  let dbUser: Awaited<ReturnType<typeof upsertUser>>;
  try {
    dbUser = await upsertUser(claims as unknown as Record<string, unknown>, "google_");
  } catch (err) {
    req.log?.error({ err }, "upsertUser failed during Google callback");
    res.redirect("/api/auth/google?error=db");
    return;
  }

  await ensureTrialSubscription(dbUser.id);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: (dbUser.role ?? "user") as "user" | "admin",
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

// ── Mobile auth ────────────────────────────────────────────────────────────────

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required parameters" });
    return;
  }

  const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

  try {
    const config = await getOidcConfig();
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        role: (dbUser.role ?? "user") as "user" | "admin",
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
  } catch (err) {
    req.log.error({ err }, "Mobile token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

// ── Email + Password auth helpers ──────────────────────────────────────────────

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) { resolve(false); return; }
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived));
    });
  });
}

// ── Email + Password endpoints ────────────────────────────────────────────────

router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Email y contraseña son requeridos" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Ya existe una cuenta con ese email. Intentá iniciar sesión." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: email.split("@")[0],
    })
    .returning();

  await ensureTrialSubscription(newUser.id);

  const sessionData: SessionData = {
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      profileImageUrl: newUser.profileImageUrl,
      role: (newUser.role ?? "user") as "user" | "admin",
    },
    access_token: "email_auth",
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ ok: true, redirectTo: "/app" });
});

router.post("/auth/login-email", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Email y contraseña son requeridos" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Email o contraseña incorrectos" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email o contraseña incorrectos" });
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: (user.role ?? "user") as "user" | "admin",
    },
    access_token: "email_auth",
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ ok: true, redirectTo: "/app" });
});

// ── Password reset ────────────────────────────────────────────────────────────

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email requerido" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  // Always respond OK to avoid leaking whether email exists
  if (!user || !user.passwordHash) {
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(passwordResetTokensTable).values({
    token,
    userId: user.id,
    expiresAt,
  });

  const origin = getOrigin(req);
  const resetUrl = `${origin}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email!, resetUrl);
  } catch (err) {
    req.log?.error({ err }, "Failed to send password reset email");
  }

  res.json({ ok: true });
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body ?? {};
  if (!token || typeof token !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Token y contraseña son requeridos" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    return;
  }

  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        eq(passwordResetTokensTable.used, false),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(400).json({ error: "El enlace es inválido o ya expiró. Solicitá uno nuevo." });
    return;
  }

  const passwordHash = await hashPassword(password);

  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, row.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ used: true })
    .where(eq(passwordResetTokensTable.token, token));

  res.json({ ok: true });
});

// ── Dev login (solo NODE_ENV=development) ──────────────────────────────────────
router.get("/auth/dev-login", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, "admin_clientum"))
    .limit(1);

  if (!user) {
    res.status(404).send(
      "Admin user no encontrado. Ejecutá primero: <br><code>pnpm --filter @workspace/scripts run seed:admin</code>",
    );
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: (user.role ?? "user") as "user" | "admin",
    },
    access_token: "dev_token",
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
  };

  const sid = await createSession(sessionData);

  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });

  const returnTo = String(req.query.returnTo ?? "/app");
  res.redirect(returnTo);
});

export default router;

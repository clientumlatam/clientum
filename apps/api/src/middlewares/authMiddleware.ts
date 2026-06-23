import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  isReplitOidcEnabled,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// Per-session in-flight refresh promises to prevent race conditions
// when multiple concurrent requests arrive with an expired token.
const refreshInFlight = new Map<string, Promise<SessionData | null>>();

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  if (!isReplitOidcEnabled()) {
    return session;
  }

  // If a refresh is already in progress for this session, wait for it
  // instead of starting a second one (which would invalidate the first
  // refresh_token and log the user out).
  const inflight = refreshInFlight.get(sid);
  if (inflight) return inflight;

  const refreshPromise = (async (): Promise<SessionData | null> => {
    try {
      const config = await getOidcConfig();
      const tokens = await oidc.refreshTokenGrant(
        config,
        session.refresh_token!,
      );
      session.access_token = tokens.access_token;
      session.refresh_token = tokens.refresh_token ?? session.refresh_token;
      session.expires_at = tokens.expiresIn()
        ? now + tokens.expiresIn()!
        : session.expires_at;
      await updateSession(sid, session);
      return session;
    } catch {
      return null;
    } finally {
      refreshInFlight.delete(sid);
    }
  })();

  refreshInFlight.set(sid, refreshPromise);
  return refreshPromise;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.user = refreshed.user;
  next();
}

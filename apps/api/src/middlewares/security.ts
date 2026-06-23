import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

export const configureHelmet = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const enforceHSTS = (req: Request, res: Response, next: NextFunction) => {
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

const rateLimitMessage = { ok: false, error: "Demasiadas solicitudes. Intentá de nuevo en un momento." };

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const widgetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skipSuccessfulRequests: false,
});

export const adminExecLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiadas ejecuciones. Esperá 5 minutos antes de intentar de nuevo." },
});

const allowedOrigins = (() => {
  const origins: (string | RegExp)[] = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/.*\.replit\.app$/,
    /^https:\/\/.*\.replit\.dev$/,
    /^https:\/\/.*\.repl\.co$/,
  ];
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(new RegExp(`^https?://${process.env.REPLIT_DEV_DOMAIN.replace(/\./g, "\\.")}$`));
  }
  if (isProd) {
    origins.push(/^https:\/\/(www\.)?clientum\.com\.ar$/);
  }
  return origins;
})();

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(null, allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

export const widgetCorsOptions = {
  origin: true,
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

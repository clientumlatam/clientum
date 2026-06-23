import express, { type Express, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "./middlewares/authMiddleware";
import {
  configureHelmet,
  enforceHSTS,
  corsOptions,
  widgetCorsOptions,
  generalLimiter,
  authLimiter,
  webhookLimiter,
  widgetLimiter,
  adminLimiter,
  adminExecLimiter,
} from "./middlewares/security";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.set("trust proxy", 1);

app.use(compression({ level: 6 }));
app.use(configureHelmet);
app.use(enforceHSTS);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use("/api/widget", cors(widgetCorsOptions));
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/chatbot/webhook", webhookLimiter);
app.use("/api/widget", widgetLimiter);
app.use("/api/admin/exec", adminExecLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api", generalLimiter);

app.use(authMiddleware);

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(__dirname, "../../clientum/dist/public");
  app.use("/assets", express.static(path.join(staticDir, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));
  app.use(express.static(staticDir, { maxAge: "10m" }));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;

import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { api } from "./routes";
import { optionalAuth } from "./middleware/auth";
import { apiLimiter, requireCsrfHeader } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { buildOpenApi } from "./docs/openapi";
import { uploadRoot } from "./lib/storage";
import { renderIndex, sitemap } from "./lib/seo";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Behind Render/NGINX: trust the first proxy so req.ip and secure cookies work.
  app.set("trust proxy", env.isProd ? 1 : false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
          "frame-src": ["'self'", "https://accounts.google.com/gsi/"],
          "connect-src": ["'self'", "https://accounts.google.com/gsi/", "ws:", "wss:"],
          "style-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          // Swagger UI needs inline scripts; it's only served under /api/docs.
          "upgrade-insecure-requests": env.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" }, quietReqLogger: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(cookieParser());

  const spec = buildOpenApi();
  app.get("/api/openapi.json", (_req, res) => res.json(spec));
  app.use(
    "/api/docs",
    helmet({ contentSecurityPolicy: { directives: { "script-src": ["'self'", "'unsafe-inline'"] } } }),
    swaggerUi.serve,
    swaggerUi.setup(spec, { customSiteTitle: "Klyro API" })
  );

  app.use("/api", apiLimiter, requireCsrfHeader, optionalAuth, api);
  app.use("/api", notFoundHandler);

  app.use(
    "/uploads",
    express.static(uploadRoot, {
      maxAge: "30d",
      immutable: true,
      setHeaders: (res) => res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"),
    })
  );

  app.get("/sitemap.xml", async (_req, res) => {
    res.type("application/xml").send(await sitemap());
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(`User-agent: *\nDisallow: /api/\nDisallow: /settings\nDisallow: /write\nSitemap: ${env.APP_URL}/sitemap.xml\n`);
  });

  // Production: serve the built React app and inject per-page meta for link previews.
  const clientDist = path.resolve(__dirname, "../../client/dist");
  const indexHtml = path.join(clientDist, "index.html");
  if (existsSync(indexHtml)) {
    app.use(express.static(clientDist, { index: false, maxAge: "1y", setHeaders: (res, file) => file.endsWith(".html") && res.setHeader("Cache-Control", "no-cache") }));
    app.get(/^(?!\/api\/|\/uploads\/|\/socket\.io\/).*/, async (req: Request, res: Response) => {
      res.setHeader("Cache-Control", "no-cache");
      res.type("html").send(await renderIndex(indexHtml, req.path));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

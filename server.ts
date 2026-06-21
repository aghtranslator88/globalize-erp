import express, { NextFunction, Request, Response } from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import { DatabaseManager, sanitizeProfile, verifyPassword } from "./server-db";
import { registerWhatsAppRoutes } from "./server-whatsapp";

dotenv.config();

type AuthenticatedRequest = Request & {
  user?: any;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getAuthSecret() {
  return requireEnv("AUTH_SECRET");
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload: any) {
  const secret = getAuthSecret();
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string) {
  const secret = getAuthSecret();
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}

function requireAuth(dbManager: DatabaseManager) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = getBearerToken(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload?.sub) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const profiles = await dbManager.getEntities("profiles");
    const user = profiles.find((profile) => profile.id === payload.sub && profile.isActive);
    if (!user) {
      return res.status(401).json({ success: false, error: "Session user is no longer active." });
    }

    req.user = user;
    next();
  };
}

function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions." });
    }
    next();
  };
}

function validateEmailPayload(body: any) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body?.to || !emailRegex.test(String(body.to))) return "A valid recipient email is required.";
  if (!body?.subject || String(body.subject).length > 200) return "A subject is required and must be under 200 characters.";
  if (!body?.text && !body?.html) return "Email body text or HTML is required.";
  return null;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(requireEnv("PORT"));
  const DB_FILE_PATH = requireEnv("DB_PATH");
  const jsonLimit = requireEnv("JSON_LIMIT");

  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ limit: jsonLimit, extended: true }));

  const dbManager = new DatabaseManager(DB_FILE_PATH);
  await dbManager.connect();
  await dbManager.init();

  const authenticated = requireAuth(dbManager);

  app.get("/healthz", async (_req, res) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required." });
      }

      const profile = await dbManager.findProfileForAuth(String(identifier));
      if (!profile || !profile.isActive || !verifyPassword(String(password), profile.passwordHash)) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const token = signToken({
        sub: profile.id,
        role: profile.role,
        iat: Date.now(),
        exp: Date.now() + Number(requireEnv("SESSION_TTL_MS"))
      });

      return res.json({ success: true, token, user: sanitizeProfile(profile) });
    } catch (error: any) {
      console.error("Login failed:", error);
      res.status(500).json({ success: false, error: "Authentication service failed." });
    }
  });

  app.get("/api/auth/me", authenticated, async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: sanitizeProfile(req.user) });
  });

  app.post("/api/auth/verify-password", authenticated, async (req: AuthenticatedRequest, res) => {
    const password = String(req.body?.password || "");
    const userId = String(req.body?.userId || req.user.id);
    const profiles = await dbManager.getEntities("profiles");
    const profile = profiles.find((p) => p.id === userId);

    if (!profile) return res.status(404).json({ success: false, error: "Profile not found." });
    if (userId !== req.user.id && !["owner", "accountant", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions." });
    }

    res.json({ success: verifyPassword(password, profile.passwordHash) });
  });

  app.get("/api/load-db", authenticated, async (_req, res) => {
    try {
      const data = await dbManager.loadAll({ redactSecrets: true });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error loading database:", error);
      res.status(500).json({ success: false, error: "Failed to load database." });
    }
  });

  app.post("/api/save-db", authenticated, requireRoles("owner", "admin", "accountant", "sales", "translator"), async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) return res.status(400).json({ success: false, error: "Missing payload." });
      await dbManager.saveAll(payload);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving database:", error);
      res.status(500).json({ success: false, error: "Failed to save database." });
    }
  });

  app.post("/api/send-email", authenticated, requireRoles("owner", "admin", "accountant", "sales"), async (req: AuthenticatedRequest, res) => {
    const validationError = validateEmailPayload(req.body);
    if (validationError) return res.status(400).json({ success: false, error: validationError });

    try {
      const host = requireEnv("SMTP_HOST");
      const port = Number(requireEnv("SMTP_PORT"));
      const user = requireEnv("SMTP_USER");
      const pass = requireEnv("SMTP_PASS");
      const from = requireEnv("SMTP_FROM");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      const info = await transporter.sendMail({
        from,
        to: req.body.to,
        subject: req.body.subject,
        text: req.body.text,
        html: req.body.html
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(502).json({ success: false, error: "Email provider rejected the request." });
    }
  });

  registerWhatsAppRoutes(app, dbManager, authenticated);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled request error:", err);
    res.status(500).json({ success: false, error: "Unexpected server error." });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

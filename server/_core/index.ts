import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createSimpleToken, isAccountName, signInSimple } from "./simpleAuth";
import { getOtherPushTokens, savePushToken } from "../db";
import { sendPushNotification } from "../push";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/auth/login", async (req, res) => {
    const name = req.body?.name;
    const password = req.body?.password;
    if (typeof name !== "string" || !isAccountName(name) || typeof password !== "string") {
      res.status(400).json({ error: "Geçersiz giriş bilgileri." });
      return;
    }
    const user = await signInSimple(name, password);
    if (!user) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }
    res.json({ sessionToken: createSimpleToken(name), user });
  });

  app.post("/api/push/register", async (req, res) => {
    const { name, password, token } = req.body ?? {};
    if (typeof name !== "string" || !isAccountName(name) || password !== (process.env.CHAT_PASSWORD || "your_chat_password_here") || typeof token !== "string") {
      res.status(400).json({ error: "Geçersiz bildirim kaydı." });
      return;
    }
    const user = await signInSimple(name, password);
    if (!user) { res.status(401).json({ error: "Yetkisiz." }); return; }
    await savePushToken(user.id, token);
    res.json({ ok: true });
  });

  app.post("/api/push/send", async (req, res) => {
    const { name, password, body, kind } = req.body ?? {};
    if (typeof name !== "string" || !isAccountName(name) || password !== (process.env.CHAT_PASSWORD || "your_chat_password_here")) {
      res.status(401).json({ error: "Yetkisiz." });
      return;
    }
    const user = await signInSimple(name, password);
    if (!user) { res.status(401).json({ error: "Yetkisiz." }); return; }
    const recipients = await getOtherPushTokens(user.id);
    await sendPushNotification(
      recipients.flatMap((row) => row.pushToken ? [row.pushToken] : []),
      name,
      kind === "image" ? "Sana bir görsel gönderdi" : String(body ?? "Yeni mesaj"),
      { type: "chat" },
    );
    res.json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);

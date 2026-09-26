import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { ACCESS_COOKIE } from "./cookies";
import { verifyAccessToken } from "./tokens";
import { logger } from "./logger";

let io: Server | null = null;

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    path: "/socket.io",
    cors: { origin: env.corsOrigins, credentials: true },
  });

  // Authenticate with the same httpOnly access cookie the REST API uses.
  io.use((socket, next) => {
    const token = readCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) return next(new Error("unauthorized"));
    socket.data.userId = payload.sub;
    next();
  });

  io.on("connection", (socket) => {
    void socket.join(`user:${socket.data.userId as string}`);
    logger.debug({ userId: socket.data.userId }, "socket connected");
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export async function closeSocket(): Promise<void> {
  await io?.close();
  io = null;
}

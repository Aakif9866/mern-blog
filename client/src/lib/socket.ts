import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Connects with the httpOnly auth cookie; the server rejects anonymous sockets. */
export function connectSocket(): Socket {
  socket ??= io({ path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"], reconnectionDelayMax: 30_000 });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

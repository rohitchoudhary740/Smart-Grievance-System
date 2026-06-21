import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(tenantId: string, userId: string): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.on('connect', () => {
      s.emit('join:tenant', tenantId);
      s.emit('join:user', userId);
    });
  }
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

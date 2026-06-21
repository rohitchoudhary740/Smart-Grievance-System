import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SocketEvent } from '../types';

let io: IOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: config.cors.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Clients join a room keyed by tenantId for scoped broadcasting
    socket.on('join:tenant', (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
      logger.debug(`Socket ${socket.id} joined tenant room: ${tenantId}`);
    });

    // Officers join their personal room for direct assignment notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅  Socket.IO initialised');
  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialised. Call initSocketIO first.');
  return io;
}

// ─── Typed emit helpers ───────────────────────────────────────────────────────

export function emitToTenant(tenantId: string, event: SocketEvent, data: unknown): void {
  getIO().to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(userId: string, event: SocketEvent, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

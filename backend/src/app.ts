import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';

// ─── Route imports (will be filled out in Step 4) ────────────────────────────
import authRoutes from './routes/auth';
import citizenRoutes from './routes/citizen';
import officerRoutes from './routes/officer';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import publicRoutes from './routes/public';

export function createApp(): Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth attempts.' },
  });

  app.use(globalLimiter);

  // ── Body parsers ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ── HTTP request logging ──────────────────────────────────────────────────
  if (config.isDev()) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
      })
    );
  }

  // ── Static file serving (uploaded photos) ─────────────────────────────────
  app.use('/uploads', express.static(path.resolve(config.upload.dir)));

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRoutes);
  app.use('/api/public', publicRoutes);  // No auth — public tracking
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/citizen', citizenRoutes);
  app.use('/api/officer', officerRoutes);
  app.use('/api/admin', adminRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

  return app;
}
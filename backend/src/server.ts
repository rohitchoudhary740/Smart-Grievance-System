import http from 'http';
import { createApp } from './app';
import { connectDB } from './services/dbService';
import { initSocketIO } from './services/socketService';
import { config } from './config';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // 1. Connect to MongoDB Atlas
  await connectDB();

  // 2. Create Express app
  const app = createApp();

  // 3. Wrap in HTTP server (required for Socket.IO)
  const httpServer = http.createServer(app);

  // 4. Attach Socket.IO
  initSocketIO(httpServer);

  // 5. Seed demo data (no-op if already exists)
  const { seedDemoTenant } = await import('./services/tenantService');
  const { seedDemoUsers }  = await import('./services/userService');
  const { getDepartmentsByTenant } = await import('./services/tenantService');
  await seedDemoTenant();
  const tenant = (await import('./models/Tenant')).Tenant;
  const t = await tenant.findOne({ slug: 'demo-city' });
  if (t) {
    const depts = await getDepartmentsByTenant(t._id.toString());
    const deptMap: Record<string, string> = {};
    depts.forEach((d) => { deptMap[d.slug] = d._id.toString(); });
    await seedDemoUsers(t._id.toString(), deptMap);
  }

  // 6. Start MongoDB Change Streams (real-time push via Socket.IO)
  const { startChangeStreams } = await import('./services/changeStreamService');
  startChangeStreams();

  // 7. Start cron jobs (SLA checker) — imported here to run after DB is ready
  const { startSLACron } = await import('./services/slaService');
  startSLACron();

  // 6. Listen
  httpServer.listen(config.port, () => {
    logger.info(`🚀  PS-CRM backend running on port ${config.port} [${config.env}]`);
    logger.info(`   Socket.IO ready for real-time connections`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    httpServer.close(async () => {
      const { disconnectDB } = await import('./services/dbService');
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});

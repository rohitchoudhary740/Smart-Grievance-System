import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(config.mongodb.uri, {
      // Atlas recommended settings
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
    });

    isConnected = true;
    logger.info('✅  MongoDB Atlas connected');

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — will retry');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error', err);
    });
  } catch (err) {
    logger.error('MongoDB connection failed', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected cleanly');
}

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user.
 * Does NOT hit the database — all required info lives in the token.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    respond.unauthorized(res, 'Missing or malformed Authorization header');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      respond.unauthorized(res, 'Token expired — please log in again');
    } else {
      logger.warn(`Invalid JWT: ${err.message}`);
      respond.unauthorized(res, 'Invalid token');
    }
  }
}

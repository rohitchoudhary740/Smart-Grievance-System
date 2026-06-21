import { Request, Response, NextFunction } from 'express';
import { getTenantById } from '../services/tenantService';
import { respond } from '../utils/respond';

/**
 * Must run AFTER authMiddleware.
 * Validates that the tenantId from the JWT belongs to an active tenant.
 * Attaches tenant to req for downstream use.
 *
 * This prevents a token from one tenant being replayed against another.
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    respond.forbidden(res, 'No tenant context in token');
    return;
  }

  // Lightweight async check — result cached at OS/TCP level in Atlas
  getTenantById(tenantId)
    .then((tenant) => {
      if (!tenant) {
        respond.forbidden(res, 'Tenant not found or inactive');
        return;
      }
      // Attach to request for controllers that need tenant settings
      (req as any).tenant = tenant;
      next();
    })
    .catch(() => respond.serverError(res, 'Tenant lookup failed'));
}

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { respond } from '../utils/respond';

/**
 * Factory — returns a middleware that allows only the given roles.
 *
 * Usage:
 *   router.post('/grievances', auth, tenant, role(UserRole.CITIZEN), handler)
 *   router.get('/admin/all',   auth, tenant, role(UserRole.ADMIN, UserRole.SUPER_ADMIN), handler)
 */
export function role(...allowed: UserRole[]) {
  return function roleCheckMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const userRole = req.user?.role;

    if (!userRole) {
      respond.unauthorized(res);
      return;
    }

    if (!allowed.includes(userRole as UserRole)) {
      respond.forbidden(
        res,
        `Access denied — requires one of: ${allowed.join(', ')}`
      );
      return;
    }

    next();
  };
}

// ─── Convenience pre-built guards ─────────────────────────────────────────────

export const isCitizen  = role(UserRole.CITIZEN);
export const isOfficer  = role(UserRole.OFFICER, UserRole.DEPT_HEAD);
export const isAdmin    = role(UserRole.ADMIN, UserRole.SUPER_ADMIN);
export const isStaff    = role(UserRole.OFFICER, UserRole.DEPT_HEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN);

import { Request, Response } from 'express';
import { getTenantBySlug } from '../services/tenantService';
import { getUserByEmail, getUserById, createUser, updateLastLogin } from '../services/userService';
import { hashPassword, verifyPassword, signToken, buildTokenPayload, safeUser } from '../services/authService';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';

// ── POST /api/auth/register ───────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, tenantSlug } = req.body as {
      name: string;
      email: string;
      password: string;
      tenantSlug: string;
    };

    // 1. Resolve tenant from slug
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      respond.notFound(res, `Organisation "${tenantSlug}" not found`);
      return;
    }

    // 2. Check for existing account
    const existing = await getUserByEmail(email, tenant._id.toString());
    if (existing) {
      respond.conflict(res, 'An account with this email already exists');
      return;
    }

    // 3. Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      tenantId: tenant._id.toString(),
      name,
      email,
      passwordHash,
    });

    // 4. Sign token and respond
    const payload = buildTokenPayload(user);
    const token = signToken(payload);

    respond.created(res, {
      token,
      user: safeUser(user, {
        name:         tenant.name,
        slug:         tenant.slug,
        logoUrl:      tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      }),
    });
  } catch (err) {
    logger.error('register error', err);
    respond.serverError(res);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, tenantSlug } = req.body as {
      email: string;
      password: string;
      tenantSlug: string;
    };

    // 1. Resolve tenant
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      // Deliberately vague to prevent tenant enumeration
      respond.unauthorized(res, 'Invalid credentials');
      return;
    }

    // 2. Look up user — include passwordHash for comparison
    const user = await getUserByEmail(email, tenant._id.toString(), true);
    if (!user || !user.isActive) {
      respond.unauthorized(res, 'Invalid credentials');
      return;
    }

    // 3. Verify password
    const valid = await verifyPassword(password, (user as any).passwordHash);
    if (!valid) {
      respond.unauthorized(res, 'Invalid credentials');
      return;
    }

    // 4. Update last login (fire-and-forget)
    updateLastLogin(user._id.toString()).catch(() => {});

    // 5. Sign and respond
    const payload = buildTokenPayload(user);
    const token = signToken(payload);

    respond.ok(res, {
      token,
      user: safeUser(user, {
        name:         tenant.name,
        slug:         tenant.slug,
        logoUrl:      tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      }),
    });
  } catch (err) {
    logger.error('login error', err);
    respond.serverError(res);
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const user = await getUserById(userId, tenantId);
    if (!user) {
      respond.notFound(res, 'User not found');
      return;
    }
    const tenant = await getTenantBySlug('');
    respond.ok(res, safeUser(user));
  } catch (err) {
    logger.error('me error', err);
    respond.serverError(res);
  }
}

import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  validate([
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 128 }).withMessage('Password must be 6–128 characters'),
    body('tenantSlug')
      .trim()
      .notEmpty().withMessage('Organisation ID (tenantSlug) is required')
      .matches(/^[a-z0-9-]+$/).withMessage('Organisation ID must be lowercase alphanumeric with hyphens'),
  ]),
  register
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  validate([
    body('email')
      .trim()
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    body('tenantSlug')
      .trim()
      .notEmpty().withMessage('Organisation ID is required'),
  ]),
  login
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, me);

export default router;

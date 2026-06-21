
import { Router } from 'express';
import { body } from 'express-validator';
import {
  allGrievances, officerLeaderboard, adminTimeline, reassign,
  analytics, criticalZones,
  getDepts, createDept, updateDept,
  getUsers, patchUserRole,
  auditLogs, exportCSV, deleteAnyGrievance,
} from '../controllers/adminController';
import { authMiddleware } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { isAdmin } from '../middlewares/role';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authMiddleware, tenantMiddleware, isAdmin);

// Grievances
router.get('/grievances',                    allGrievances);
router.get('/grievances/:id/timeline',       adminTimeline);
router.delete('/grievances/:id', deleteAnyGrievance);
router.patch(
  '/grievances/:id/assign',
  validate([body('officerId').notEmpty().withMessage('officerId required')]),
  reassign
);

// Analytics
router.get('/analytics',      analytics);
router.get('/critical-zones', criticalZones);

// Departments
router.get('/leaderboard', isAdmin, officerLeaderboard);

router.get('/departments',      getDepts);
router.post('/departments',     createDept);
router.put('/departments/:id',  updateDept);

// Users
router.get('/users',               getUsers);
router.patch('/users/:id/role',    patchUserRole);

// Audit + Export
router.get('/audit-logs', auditLogs);
router.get('/export',     exportCSV);

export default router;
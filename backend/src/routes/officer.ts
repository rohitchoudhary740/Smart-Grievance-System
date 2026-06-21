import { Router } from 'express';
import { body } from 'express-validator';
import {
  myTasks, getGrievanceDetail, updateStatus, uploadProof,
  getOfficerTimeline, performance,
} from '../controllers/officerController';
import { authMiddleware } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { isOfficer } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';
import { GrievanceStatus } from '../types';

const router = Router();

router.use(authMiddleware, tenantMiddleware, isOfficer);

router.get('/grievances', myTasks);
router.get('/grievances/:id', getGrievanceDetail);

router.patch(
  '/grievances/:id/status',
  validate([
    body('status')
      .isIn(Object.values(GrievanceStatus))
      .withMessage('Invalid status'),
  ]),
  updateStatus
);

router.post('/grievances/:id/proof', upload.array('photos', 5), uploadProof);
router.get('/grievances/:id/timeline', getOfficerTimeline);
router.get('/performance', performance);

export default router;
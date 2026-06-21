import { Router } from 'express';
import { body } from 'express-validator';
import {
  submitGrievance, myGrievances, getGrievance,
  leaveFeedback, reopen, getTimeline, support, deleteMyGrievance,
} from '../controllers/citizenController';
import { citizenChatbot } from '../controllers/citizenChatbotController';
import { authMiddleware } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { isCitizen } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';

const router = Router();

// All citizen routes require auth + tenant + citizen role
router.use(authMiddleware, tenantMiddleware, isCitizen);

router.post(
  '/chatbot',
  validate([
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ max: 2000 }).withMessage('Message is too long'),
    body('history')
      .optional()
      .isArray()
      .withMessage('History must be an array'),
  ]),
  citizenChatbot
);

router.post(
  '/grievances',
  upload.array('photos', 5),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
  ]),
  submitGrievance
);

router.get('/grievances',          myGrievances);
router.get('/grievances/:id',      getGrievance);
router.get('/grievances/:id/timeline', getTimeline);

router.post(
  '/grievances/:id/support',
  support
);

router.delete('/grievances/:id', deleteMyGrievance);

router.post(
  '/grievances/:id/feedback',
  validate([body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5')]),
  leaveFeedback
);

router.post(
  '/grievances/:id/reopen',
  validate([body('reason').trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters')]),
  reopen
);

export default router;

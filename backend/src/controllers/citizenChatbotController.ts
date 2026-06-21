import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { respond } from '../utils/respond';
import { answerCitizenChatbot } from '../services/citizenChatbotService';

export async function citizenChatbot(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { message, history } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    const reply = await answerCitizenChatbot({
      tenantId,
      userId,
      message,
      history,
    });

    respond.ok(res, { reply });
  } catch (err) {
    logger.error('citizenChatbot error', err);
    respond.serverError(res);
  }
}


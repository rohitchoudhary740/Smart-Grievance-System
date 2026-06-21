import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Grievance } from '../models/Grievance';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface CitizenChatbotParams {
  tenantId: string;
  userId: string;
  message: string;
  history?: ChatMessage[];
}

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

function extractTicketNumber(text: string): string | null {
  // Typical format: GRV-2026-00009
  const m = text.toUpperCase().match(/\b([A-Z]{3,}-\d{4}-\d{3,})\b/);
  return m?.[1] ?? null;
}

function toISO(date: any): string | undefined {
  if (!date) return undefined;
  try {
    return new Date(date).toISOString();
  } catch {
    return undefined;
  }
}

export async function answerCitizenChatbot(params: CitizenChatbotParams): Promise<string> {
  const message = String(params.message ?? '').trim();
  if (!message) return 'Please type your question.';

  // Pull grievance context only when the citizen provides a ticket number we can match.
  const ticketNumber = extractTicketNumber(message);

  let grievanceContext: any = null;
  if (ticketNumber) {
    try {
      const g = await Grievance.findOne({
        tenantId: params.tenantId,
        submittedById: params.userId,
        ticketNumber: ticketNumber.toUpperCase(),
      })
        .populate({ path: 'departmentId', select: 'name slug' })
        .populate({ path: 'assignedOfficerId', select: 'name role' })
        .lean();

      if (g) {
        grievanceContext = {
          ticketNumber: g.ticketNumber,
          title: g.title,
          status: g.status,
          priority: g.priority,
          slaRisk: g.slaRisk,
          department: (g as any).departmentId ?? undefined,
          assignedOfficer: (g as any).assignedOfficerId ?? undefined,
          dueAt: toISO(g.dueAt),
          estimatedResolutionTime: g.estimatedResolutionTime,
          slaBreachedAt: toISO(g.slaBreachedAt),
        };
      }
    } catch (err) {
      logger.warn('citizenChatbot grievance lookup failed: ' + String((err as any)?.message ?? err));
    }
  }

  const history = (params.history ?? [])
    .slice(-12)
    .map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content ?? ''),
    }))
    .filter((m) => m.content.trim().length > 0);

  const conversation = history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `
You are Gemini, a professional AI assistant for citizens using the PS-CRM grievance portal.

You must help citizens with:
- how to file a complaint
- what information is required (title/description/address/ward)
- how to track a ticket (use the Ticket Number on the Track page)
- how to reopen/submit support/feedback (for resolved cases)
- general guidance about the portal

If the user provides a ticket number (example: GRV-2026-00009) and grievanceContext is provided,
then answer using ONLY that grievanceContext for status/timeline fields.

Do NOT ask for sensitive personal data (Aadhaar, passwords, OTP, etc).

Response quality rules:
- Use natural, professional language (no invented words, no gibberish).
- If uncertain, say "I am not sure" instead of guessing.
- Keep response concise but informative (up to ~220 words).
- Use bullets when steps are requested.
- Reply in the same language as the user's message (English or Hindi).

User message:
${message}

Conversation history (if any):
${conversation || '(none)'}

Grievance context (if ticket found for this citizen, otherwise null):
${JSON.stringify(grievanceContext)}
`.trim();

  const candidates = [
    config.gemini.model,
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  let lastErr: unknown = null;
  for (const m of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          topK: 32,
          maxOutputTokens: 700,
        },
      });
      const reply = result.response.text().trim();
      if (reply) return reply;
    } catch (err) {
      lastErr = err;
      logger.warn(`citizenChatbot Gemini failed (${m}): ${String((err as any)?.message ?? err)}`);
    }
  }

  logger.error('citizenChatbot Gemini completely failed: ' + String((lastErr as any)?.message ?? lastErr));
  return 'I could not process your request right now. Please try again later, or use the Track page with your ticket number.';
}


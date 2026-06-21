import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { Priority, SLARisk } from '../types';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export interface AIClassification {
  suggestedCategory: string;
  suggestedDepartmentName: string;
  priority: Priority;
  slaRisk: SLARisk;
  summary: string;
  confidence: number;
  language: string;
}

const FALLBACK: AIClassification = {
  suggestedCategory: 'general',
  suggestedDepartmentName: 'General Administration',
  priority: Priority.MEDIUM,
  slaRisk: SLARisk.LOW,
  summary: 'Complaint submitted. Awaiting manual classification.',
  confidence: 0,
  language: 'Unknown',
};

export async function classifyComplaint(
  title: string,
  description: string
): Promise<AIClassification> {
  try {
    logger.info('🤖 Calling Gemini AI...');

    const prompt = `
You are an AI assistant for a government CRM system.

Classify the complaint and return ONLY JSON.

Departments:
- Roads & Infrastructure
- Water Supply
- Sanitation
- Electricity
- General Administration

Title: "${title}"
Description: "${description}"

Return JSON:
{
  "suggestedCategory": "string",
  "suggestedDepartmentName": "string",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "slaRisk": "LOW | MEDIUM | HIGH",
  "summary": "short sentence",
  "confidence": number,
  "language": "English/Hindi"
}
`;

    let raw = '';

    // Try multiple model names because availability varies per API key/project.
    const candidates = [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    for (const m of candidates) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent(prompt);
        raw = result.response.text().trim();
        logger.info(`✅ Gemini model used: ${m}`);
        break;
      } catch (err: any) {
        logger.warn(`⚠️ Gemini model failed (${m}): ${err?.message ?? String(err)}`);
      }
    }

    if (!raw) {
      return FALLBACK;
    }

    logger.info('Gemini raw: ' + raw.substring(0, 200));

    // ✅ CLEAN MARKDOWN + extract the first JSON object
    raw = raw.replace(/```json|```/g, '').trim();

    const extracted = extractFirstJsonObject(raw);

    // ✅ SAFE PARSE
    let parsed: Partial<AIClassification> = {};
    try {
      parsed = extracted ? JSON.parse(extracted) : JSON.parse(raw);
    } catch {
      logger.warn('⚠️ JSON parse failed');
      return FALLBACK;
    }

    // ✅ FINAL OUTPUT
    logger.info(
      '🧠 Gemini suggestedDepartmentName raw: ' +
        String(parsed.suggestedDepartmentName ?? '')
    );
    const out: AIClassification = {
      suggestedCategory: String(parsed.suggestedCategory ?? 'general').trim().toLowerCase(),

      suggestedDepartmentName: validateDepartment(
        parsed.suggestedDepartmentName
      ),

      priority: validateEnum(
        parsed.priority,
        Object.values(Priority),
        Priority.MEDIUM
      ),

      slaRisk: validateEnum(
        parsed.slaRisk,
        Object.values(SLARisk),
        SLARisk.LOW
      ),

      summary: String(parsed.summary ?? '').slice(0, 200),

      confidence: clampNumber(parsed.confidence, 0, 1, 0.5),

      language: String(parsed.language ?? 'Unknown'),
    };

    logger.info('✅ AI result: ' + JSON.stringify(out));

    return out;

  } catch (err: any) {
    logger.error('❌ Gemini completely failed: ' + err.message);
    return FALLBACK;
  }
}

// 🔧 Helpers
function validateEnum<T extends string>(
  val: unknown,
  valid: T[],
  fallback: T
): T {
  if (typeof val === 'string') {
    const normalized = val.trim().toUpperCase();
    return valid.includes(normalized as T) ? (normalized as T) : fallback;
  }
  return valid.includes(val as T) ? (val as T) : fallback;
}

function clampNumber(
  val: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function validateDepartment(dept: unknown): string {
  const validDepartments = [
    'Roads & Infrastructure',
    'Water Supply',
    'Sanitation',
    'Electricity',
    'General Administration',
  ];

  const raw = String(dept ?? '').trim();
  if (!raw) return 'General Administration';

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, 'and')
      // replace punctuation with spaces so tokens still match
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const norm = normalize(raw);
  const candidates = validDepartments.map((d) => ({ d, n: normalize(d) }));

  // Keyword-based fast paths (handles Gemini variations like "Roads and Infra").
  if (norm.includes('electric')) return 'Electricity';
  if (norm.includes('water')) return 'Water Supply';
  if (norm.includes('sanitation')) return 'Sanitation';
  if (norm.includes('general') || norm.includes('admin')) {
    return 'General Administration';
  }
  if (norm.includes('road') || norm.includes('infrastructure')) {
    return 'Roads & Infrastructure';
  }

  // More tolerant fuzzy matching against canonical names.
  const found = candidates.find(({ n }) => norm === n || norm.includes(n) || n.includes(norm));
  return found?.d ?? 'General Administration';
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
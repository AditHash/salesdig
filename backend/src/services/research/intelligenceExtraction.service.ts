import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { RESEARCH_MODEL, type ProviderUsage } from './evidenceExtraction.service.js';

export const INTELLIGENCE_PROMPT_VERSION = 'target-intelligence-v1';

export type IntelligenceClaim = {
  id: string;
  statement: string;
  classification: 'fact' | 'inference' | 'recommendation';
  certainty: 'confirmed' | 'likely' | 'unknown';
  eventDate: string | null;
};

export type TargetIntelligence = {
  technologies: Array<{ claimId: string; name: string; category: string; status: string; rationale: string; observedAt: string | null }>;
  people: Array<{ claimId: string; name: string; role: string; buyingRole: string; currentness: string; rationale: string }>;
  signals: Array<{ claimId: string; signalType: string; strength: string; eventDate: string | null; interpretation: string; fingerprint: string }>;
  gaps: Array<{ claimId: string; statement: string; certainty: string; rationale: string }>;
};

const categories = new Set(['cloud', 'data', 'backend', 'infrastructure', 'ai', 'monitoring', 'crm', 'other']);
const buyingRoles = new Set(['economic_buyer', 'technical_buyer', 'champion', 'influencer', 'procurement', 'sponsor', 'unknown']);
const signalTypes = new Set(['hiring', 'funding', 'expansion', 'partnership', 'product_launch', 'modernization', 'leadership_change', 'other']);
const date = /^\d{4}-\d{2}-\d{2}$/;

const client = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};
const cleanText = (value: unknown, min: number, max: number, name: string) => {
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const text = value.trim();
  if (text.length < min || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) throw new Error(`${name} has invalid length`);
  return text;
};
const optionalDate = (value: unknown, name: string): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !date.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) throw new Error(`${name} must be an ISO date or null`);
  return value;
};
const list = (value: unknown, name: string, limit: number) => {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`${name} must be a list of at most ${limit} items`);
  return value as Record<string, unknown>[];
};
const usageFrom = (response: any): ProviderUsage => ({
  promptTokens: response.usageMetadata?.promptTokenCount ?? null,
  outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
  totalTokens: response.usageMetadata?.totalTokenCount ?? null
});
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const validateTargetIntelligence = (value: unknown, claims: IntelligenceClaim[]): TargetIntelligence => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Intelligence response must be an object');
  const input = value as Record<string, unknown>;
  const byId = new Map(claims.map(claim => [claim.id, claim]));
  const claim = (raw: unknown, allowed: IntelligenceClaim['classification'][]): IntelligenceClaim => {
    if (typeof raw !== 'string' || !byId.has(raw)) throw new Error('Intelligence item references an unknown claim');
    const item = byId.get(raw)!;
    if (!allowed.includes(item.classification)) throw new Error('Intelligence item uses an incompatible claim classification');
    return item;
  };
  const technologies = list(input.technologies ?? [], 'technologies', 30).map(item => {
    const supporting = claim(item.claimId, ['fact', 'inference']);
    const name = cleanText(item.name, 2, 160, 'technology name');
    const category = cleanText(item.category, 2, 32, 'technology category');
    if (!categories.has(category)) throw new Error('Unsupported technology category');
    const requestedStatus = cleanText(item.status, 2, 16, 'technology status');
    if (!['confirmed', 'likely', 'unknown'].includes(requestedStatus)) throw new Error('Unsupported technology status');
    const jobEvidence = /\b(job|jobs|hiring|recruit|career|role|opening)\b/i.test(supporting.statement);
    const status = requestedStatus === 'confirmed' && (supporting.classification !== 'fact' || supporting.certainty !== 'confirmed' || jobEvidence) ? 'likely' : requestedStatus;
    return { claimId: supporting.id, name, category, status, rationale: cleanText(item.rationale, 8, 1000, 'technology rationale'), observedAt: optionalDate(item.observedAt, 'technology observedAt') };
  });
  const people = list(input.people ?? [], 'people', 25).map(item => {
    const supporting = claim(item.claimId, ['fact']);
    const currentness = cleanText(item.currentness, 2, 16, 'person currentness');
    if (!['confirmed', 'likely', 'unknown'].includes(currentness)) throw new Error('Unsupported person currentness');
    return { claimId: supporting.id, name: cleanText(item.name, 2, 160, 'person name'), role: cleanText(item.role, 2, 200, 'person role'),
      buyingRole: cleanText(item.buyingRole, 2, 32, 'person buyingRole'), currentness,
      rationale: cleanText(item.rationale, 8, 1000, 'person rationale') };
  }).map(item => {
    if (!buyingRoles.has(item.buyingRole)) throw new Error('Unsupported buying role');
    return item;
  });
  const seenSignals = new Set<string>();
  const signals = list(input.signals ?? [], 'signals', 30).map(item => {
    const supporting = claim(item.claimId, ['fact', 'inference']);
    const signalType = cleanText(item.signalType, 2, 32, 'signal type');
    if (!signalTypes.has(signalType)) throw new Error('Unsupported signal type');
    const strength = cleanText(item.strength, 2, 16, 'signal strength');
    if (!['low', 'medium', 'high'].includes(strength)) throw new Error('Unsupported signal strength');
    const eventDate = optionalDate(item.eventDate, 'signal eventDate') ?? supporting.eventDate;
    const interpretation = cleanText(item.interpretation, 8, 1000, 'signal interpretation');
    const fingerprint = hash(`${signalType}|${eventDate ?? ''}|${interpretation.toLowerCase().replace(/\s+/g, ' ')}`);
    if (seenSignals.has(fingerprint)) throw new Error('Duplicate buying signal');
    seenSignals.add(fingerprint);
    return { claimId: supporting.id, signalType, strength, eventDate, interpretation, fingerprint };
  });
  const gaps = list(input.gaps ?? [], 'gaps', 20).map(item => {
    const supporting = claim(item.claimId, ['fact', 'inference']);
    const certainty = cleanText(item.certainty, 2, 16, 'gap certainty');
    if (!['likely', 'unknown'].includes(certainty)) throw new Error('Gap certainty must be likely or unknown');
    const statement = cleanText(item.statement, 8, 1000, 'gap statement');
    if (/\b(no evidence|lack of public|not found|unknown)\b/i.test(statement)) throw new Error('A missing public fact cannot create a gap');
    return { claimId: supporting.id, statement, certainty, rationale: cleanText(item.rationale, 8, 1000, 'gap rationale') };
  });
  return { technologies, people, signals, gaps };
};

export const extractTargetIntelligence = async (companyName: string, claims: IntelligenceClaim[]): Promise<{ intelligence: TargetIntelligence; usage: ProviderUsage }> => {
  const prompt = `Build target-account intelligence for ${companyName} from only these evidence-linked claims. Return JSON only.\n\nClaims:\n${JSON.stringify(claims)}\n\nRules: use a claimId exactly as supplied. Technologies: classify cloud/data/backend/infrastructure/ai/monitoring/crm/other; a job posting proves requested skills, never production use, so mark it likely. People must be explicitly named and current role directly supported by a fact. Signals are discrete events, not trends unless comparable dated events exist. Gaps are discovery hypotheses derived from affirmative evidence; missing public information alone is never a gap. Do not create contact details, budgets, commitments, or unsourced claims.\n\nReturn { technologies: [{claimId,name,category,status,rationale,observedAt}], people: [{claimId,name,role,buyingRole,currentness,rationale}], signals: [{claimId,signalType,strength,eventDate,interpretation}], gaps: [{claimId,statement,certainty,rationale}] }.`;
  const response = await client().models.generateContent({ model: RESEARCH_MODEL, contents: prompt, config: {
    responseMimeType: 'application/json', maxOutputTokens: 4096,
    responseSchema: { type: Type.OBJECT, properties: {
      technologies: { type: Type.ARRAY, items: { type: Type.OBJECT } }, people: { type: Type.ARRAY, items: { type: Type.OBJECT } },
      signals: { type: Type.ARRAY, items: { type: Type.OBJECT } }, gaps: { type: Type.ARRAY, items: { type: Type.OBJECT } }
    }, required: ['technologies', 'people', 'signals', 'gaps'] }
  }});
  if (!response.text) throw new Error('Intelligence extraction returned no content');
  return { intelligence: validateTargetIntelligence(JSON.parse(response.text), claims), usage: usageFrom(response) };
};

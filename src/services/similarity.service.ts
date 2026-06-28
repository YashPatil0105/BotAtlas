import crypto from 'crypto';

// ─── SYNONYM MAP ──────────────────────────────────

const SYNONYM_MAP: Record<string, string> = {
  'upload': 'upload', 'send': 'upload', 'transfer': 'upload', 'push': 'upload',
  'download': 'download', 'pull': 'download', 'fetch': 'download', 'retrieve': 'download',
  'report': 'file', 'document': 'file', 'spreadsheet': 'file',
  'notification': 'notify', 'email alert': 'notify', 'alert': 'notify', 'message': 'notify',
  'login': 'login', 'sign in': 'login', 'authenticate': 'login', 'log in': 'login',
  'validate': 'validate', 'verify': 'validate', 'check': 'validate', 'confirm': 'validate',
  'error': 'error', 'exception': 'error', 'failure': 'error', 'fault': 'error',
  'database': 'database', 'db': 'database', 'sql': 'database',
  'server': 'server', 'machine': 'server', 'vm': 'server', 'virtual machine': 'server',
};

// ─── NORMALIZATION ─────────────────────────────────

export function normalizeText(text: string): string {
  let normalized = text.toLowerCase().trim();
  // Remove punctuation except hyphens and underscores
  normalized = normalized.replace(/[^\w\s-]/g, '');
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  // Apply synonym replacements (longest match first)
  const sortedSynonyms = Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length);
  for (const synonym of sortedSynonyms) {
    const regex = new RegExp(`\\b${synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, SYNONYM_MAP[synonym]);
  }
  return normalized.trim();
}

// ─── CANONICAL SIGNATURE ───────────────────────────

export function generateCanonicalSignature(
  actionType: string,
  inputType?: string | null,
  systemType?: string | null,
  validationType?: string | null,
  retryStrategy?: string | null
): string {
  const parts = [
    actionType || 'OTHER',
    inputType || 'NONE',
    systemType || 'NONE',
    validationType || 'NONE',
    retryStrategy || 'NONE',
  ];
  return parts.map(p => p.toUpperCase().replace(/\s+/g, '_')).join('|');
}

// ─── EXACT HASH ────────────────────────────────────

export function generateExactHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─── N-GRAM GENERATION ─────────────────────────────

export function generateNgrams(actionTypes: string[], windowSize: number): string[] {
  if (actionTypes.length < windowSize) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= actionTypes.length - windowSize; i++) {
    ngrams.push(actionTypes.slice(i, i + windowSize).join('|'));
  }
  return ngrams;
}

export function generateAllNgrams(actionTypes: string[]): string[] {
  const ngrams: string[] = [];
  for (const windowSize of [2, 3, 4]) {
    ngrams.push(...generateNgrams(actionTypes, windowSize));
  }
  return ngrams;
}

// ─── JACCARD SIMILARITY ────────────────────────────

export function jaccardSimilarity(setA: string[], setB: string[]): number {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ─── SEQUENCE SIMILARITY ───────────────────────────

export function sequenceSimilarity(stepsA: string[], stepsB: string[]): number {
  const ngramsA = generateAllNgrams(stepsA);
  const ngramsB = generateAllNgrams(stepsB);
  return jaccardSimilarity(ngramsA, ngramsB);
}

// ─── CANONICAL SIMILARITY ──────────────────────────

export function canonicalSimilarity(sigsA: string[], sigsB: string[]): number {
  if (sigsA.length === 0 || sigsB.length === 0) return 0;
  const setA = new Set(sigsA);
  const setB = new Set(sigsB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── FINAL SCORE ───────────────────────────────────

export function calculateFinalScore(
  sequenceScore: number,
  canonicalScore: number,
  fuzzyScore: number,
  semanticScore?: number | null
): number {
  if (semanticScore != null) {
    return 0.35 * sequenceScore + 0.25 * canonicalScore + 0.20 * fuzzyScore + 0.20 * semanticScore;
  }
  return 0.50 * sequenceScore + 0.30 * canonicalScore + 0.20 * fuzzyScore;
}

// ─── SIMILARITY BAND ──────────────────────────────

export function getSimilarityBand(score: number): {
  label: string;
  color: string;
  description: string;
} {
  const pct = score * 100;
  if (pct >= 90) return { label: 'Exact Match', color: 'emerald', description: 'Near-exact reuse candidate' };
  if (pct >= 70) return { label: 'Strong Match', color: 'blue', description: 'Strong partial reuse candidate' };
  if (pct >= 50) return { label: 'Related', color: 'amber', description: 'Related pattern — manual review needed' };
  return { label: 'Weak', color: 'slate', description: 'Weak relation' };
}

// ─── PROCESS STEP ON SAVE ──────────────────────────

export function processStepForMatching(step: {
  description: string;
  actionType: string;
  inputType?: string | null;
  systemType?: string | null;
  validationType?: string | null;
  retryStrategy?: string | null;
}) {
  const normalizedText = normalizeText(step.description);
  const canonicalSignature = generateCanonicalSignature(
    step.actionType,
    step.inputType,
    step.systemType,
    step.validationType,
    step.retryStrategy
  );
  const exactHash = generateExactHash(canonicalSignature);

  return { normalizedText, canonicalSignature, exactHash };
}

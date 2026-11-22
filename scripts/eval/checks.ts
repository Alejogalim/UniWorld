/** Deterministic checks for one counselor reply (plan 28). Pure: no network, no I/O. */
export type EvalLang = 'en' | 'es' | 'vi';

export type CheckId =
  | 'questionCount'
  | 'endsWithQuestion'
  | 'singleQuestion'
  | 'length'
  | 'language'
  | 'noPrescription'
  | 'nameSpacing'
  | 'tag';

export interface CheckResult {
  id: CheckId;
  pass: boolean;
  detail?: string;
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function countQuestions(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

/** A conjunction followed by a second question word: "…, and why?", "y por qué", "và tại sao". Option lists ("A, B or C?") pass. */
const SECOND_QUESTION: Record<EvalLang, RegExp> = {
  en: /(?:^|[\s,;])(?:and|or)\s+(?:what|why|how|which|where|who|when|do you|did you|are you|would you|could you|can you|is it|was it)(?=[\s,?!.]|$)/i,
  es: /(?:^|[\s,;])(?:y|o|e|u)\s+(?:qué|por qué|cómo|cuál|cuáles|dónde|quién|quiénes|cuándo|cuánto|cuánta)(?=[\s,?!.]|$)/i,
  vi: /(?:^|[\s,;])(?:và|hay|hoặc)\s+(?:tại sao|vì sao|thế nào|như thế nào|ra sao|làm sao|ở đâu|khi nào)(?=[\s,?!.]|$)/i,
};

export function isDoubleBarrelled(question: string, lang: EvalLang): boolean {
  return SECOND_QUESTION[lang].test(question);
}

const VI_MARKS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/giu;
const ES_WORDS = new Set(['el', 'la', 'los', 'las', 'que', 'qué', 'de', 'y', 'en', 'un', 'una', 'es', 'por', 'para', 'con', 'tu', 'tus', 'te', 'cómo', 'más', 'lo', 'se', 'del', 'al', 'pero', 'como', 'muy', 'eso', 'esto', 'algo', 'cuando', 'hay']);
const EN_WORDS = new Set(['the', 'and', 'you', 'is', 'to', 'of', 'what', 'that', 'in', 'it', 'your', 'do', 'for', 'with', 'are', 'how', 'this', 'was', 'my', 'when', 'something', 'about', 'have']);

/** Rough language guess for en/es/vi; 'unknown' when the text is too short to tell. */
export function detectLanguage(text: string): EvalLang | 'unknown' {
  if ((text.match(VI_MARKS) ?? []).length >= 3) return 'vi';
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  let es = words.filter((word) => ES_WORDS.has(word)).length;
  const en = words.filter((word) => EN_WORDS.has(word)).length;
  if (/[¿¡ñ]/.test(text)) es += 2;
  if (es >= 2 && es > en) return 'es';
  if (en >= 2 && en > es) return 'en';
  return 'unknown';
}

const PRESCRIPTION: RegExp[] = [
  /\byou should (?:be|become|study|go into|pursue|choose|major in|work as)\b/i,
  /\byou(?:'d|’d| would) (?:make|be) (?:a |an )?(?:great|good|perfect|excellent|natural)\b/i,
  /\b(?:perfect|ideal|right|best) (?:career|job|major|degree|path) for you\b/i,
  /\bI (?:recommend|suggest) (?:that )?(?:you )?(?:become|study|pursue|go into)\b/i,
  /deber[ií]as (?:ser|estudiar|dedicarte|elegir|hacerte)\b/i,
  /ser[ií]as (?:un|una) (?:gran|buen|buena|excelente)\b/i,
  /(?:carrera|trabajo|profesi[oó]n) (?:perfecta|perfecto|ideal) para ti/i,
  /te recomiendo (?:estudiar|ser|que estudies|que seas)\b/i,
  /bạn nên (?:trở thành|học ngành|làm nghề|chọn ngành|theo ngành)/i,
  /(?:nghề|ngành|công việc) (?:hoàn hảo|lý tưởng|phù hợp nhất) (?:cho|với) bạn/i,
];

/** The first career prescription in the text ("you should be a…"), or null. Checks all three languages. */
export function findPrescription(text: string): string | null {
  for (const pattern of PRESCRIPTION) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when the student's first name appears as a whole word. */
export function mentionsName(text: string, name: string): boolean {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return false;
  return new RegExp(`(?:^|[^\\p{L}])${escapeRegExp(first)}(?=[^\\p{L}]|$)`, 'iu').test(text);
}

/** The name may appear at most once in any three consecutive replies. */
export function nameSpacingOk(replies: string[], index: number, name: string): boolean {
  if (!mentionsName(replies[index] ?? '', name)) return true;
  return !replies.slice(Math.max(0, index - 2), index).some((reply) => mentionsName(reply, name));
}

export interface CheckInput {
  /** The reply as the student sees it. */
  reply: string;
  lang: EvalLang;
  name: string;
  /** Earlier visible replies in this conversation, oldest first. */
  previousReplies: string[];
  /** False only for replies the app told not to ask anything (plan 28 intake answers 1-5). */
  expectQuestion: boolean;
  /** The raw reply (with control tags) and whether it must end with one; both set from plan 29 on. */
  raw?: string;
  expectTag?: boolean;
}

const ANY_TAG = /<\s*(?:next|follow)\s*\/?\s*>/gi;

/** Intake replies end with exactly one <next/> or <follow/>; free-chat replies carry none. */
export function tagCheck(raw: string, expectTag: boolean): CheckResult {
  const count = (raw.match(ANY_TAG) ?? []).length;
  if (!expectTag) return { id: 'tag', pass: count === 0, detail: `${count} tags in a free-chat reply` };
  const atEnd = /<(?:next|follow)\/>\s*$/.test(raw);
  return { id: 'tag', pass: count === 1 && atEnd, detail: `${count} tags, last at end: ${atEnd}` };
}

export function runChecks(input: CheckInput): CheckResult[] {
  const text = input.reply.trim();
  const sentences = splitSentences(text);
  const questionSentences = sentences.filter((sentence) => sentence.includes('?'));
  const statements = sentences.length - questionSentences.length;
  const questions = countQuestions(text);
  const expected = input.expectQuestion ? 1 : 0;
  const results: CheckResult[] = [
    { id: 'questionCount', pass: questions === expected, detail: `${questions} question marks, expected ${expected}` },
  ];
  if (input.expectQuestion) {
    results.push({ id: 'endsWithQuestion', pass: text.endsWith('?') });
    const doubled = questionSentences.find((sentence) => isDoubleBarrelled(sentence, input.lang));
    results.push({ id: 'singleQuestion', pass: doubled === undefined, detail: doubled });
  }
  const max = input.expectQuestion ? 4 : 2;
  results.push({
    id: 'length',
    pass: statements >= 1 && statements <= max && text.length <= 700,
    detail: `${statements} sentences besides the question, ${text.length} chars`,
  });
  const detected = detectLanguage(text);
  results.push({ id: 'language', pass: detected === input.lang || detected === 'unknown', detail: `detected ${detected}` });
  const prescription = findPrescription(text);
  results.push({ id: 'noPrescription', pass: prescription === null, detail: prescription ?? undefined });
  const all = [...input.previousReplies, text];
  results.push({ id: 'nameSpacing', pass: nameSpacingOk(all, all.length - 1, input.name) });
  if (input.raw !== undefined && input.expectTag !== undefined) results.push(tagCheck(input.raw, input.expectTag));
  return results;
}

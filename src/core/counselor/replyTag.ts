/** Control tags the counselor appends to intake replies (plan 29). Never shown to the student. */
export type ReplyTag = 'next' | 'follow';

const TAGS = /<\s*(next|follow)\s*\/?\s*>/gi;
const FULL_TAGS = ['<next/>', '<follow/>'];

/** The last control tag in a reply, or null when there is none. */
export function readReplyTag(raw: string): ReplyTag | null {
  let tag: ReplyTag | null = null;
  for (const match of raw.matchAll(TAGS)) tag = match[1]!.toLowerCase() as ReplyTag;
  return tag;
}

/** The finished reply without control tags. */
export function stripReplyTags(raw: string): string {
  return raw.replace(TAGS, '').trim();
}

/** For streaming: strips finished tags and hides an unfinished one at the very end ("<", "<fol", "<next/"). */
export function visibleReply(raw: string): string {
  const text = raw.replace(TAGS, '');
  const partial = /<[a-z/\s]*$/i.exec(text);
  if (partial) {
    const compact = partial[0].replace(/\s/g, '').toLowerCase();
    if (FULL_TAGS.some((tag) => tag.startsWith(compact))) return text.slice(0, partial.index).trimEnd();
  }
  return text.trimEnd();
}

import type { CheckResult } from './checks';
import type { JudgeScore } from './judge';
import type { Persona } from './personas';

export interface ReplyResult {
  turn: number;
  student: string;
  reply: string;
  checks: CheckResult[];
  judge: JudgeScore | null;
  judgeError?: string;
}

export interface PersonaResult {
  persona: Persona;
  replies: ReplyResult[];
  error?: string;
}

export interface ReportMeta {
  startedAt: string;
  provider: string;
  model: string;
  judge: boolean;
}

const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim();

function pct(pass: number, total: number): string {
  return total === 0 ? '–' : `${pass}/${total} (${Math.round((pass / total) * 100)}%)`;
}

function avg(values: number[]): string {
  return values.length === 0 ? '–' : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

export function renderReport(meta: ReportMeta, results: PersonaResult[]): string {
  const lines: string[] = [
    `# Counselor eval, ${meta.startedAt}`,
    '',
    `Provider: ${meta.provider} · Model: ${meta.model} · Judge: ${meta.judge ? 'on' : 'off'}`,
    '',
    '## Summary',
    '',
    '| Persona | Replies | Checks passed | Grounded | Concrete | Targets gap | Language OK (judge) |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const result of results) {
    const checks = result.replies.flatMap((reply) => reply.checks);
    const judged = result.replies.map((reply) => reply.judge).filter((j): j is JudgeScore => j !== null);
    const languageOk = judged.length ? `${judged.filter((j) => j.languageOk).length}/${judged.length}` : '–';
    lines.push(
      `| ${result.persona.id} | ${result.replies.length} | ${pct(checks.filter((c) => c.pass).length, checks.length)} | ` +
        `${avg(judged.map((j) => j.grounded))} | ${avg(judged.map((j) => j.concrete))} | ${avg(judged.map((j) => j.targetsGap))} | ${languageOk} |`,
    );
  }

  const failures = new Map<string, number>();
  for (const check of results.flatMap((r) => r.replies.flatMap((reply) => reply.checks))) {
    if (!check.pass) failures.set(check.id, (failures.get(check.id) ?? 0) + 1);
  }
  lines.push('', '## Failed checks', '');
  if (failures.size === 0) {
    lines.push('None.');
  } else {
    lines.push('| Check | Failures |', '|---|---|');
    for (const [id, count] of [...failures].sort((a, b) => b[1] - a[1])) lines.push(`| ${id} | ${count} |`);
  }

  for (const result of results) {
    lines.push('', `## ${result.persona.id}: ${result.persona.label} (${result.persona.lang})`, '');
    if (result.error) lines.push(`**Run stopped:** ${oneLine(result.error)}`, '');
    for (const reply of result.replies) {
      lines.push(`**${reply.turn}. Student:** ${oneLine(reply.student)}`, '', `**Counselor:** ${oneLine(reply.reply)}`, '');
      const failed = reply.checks.filter((c) => !c.pass);
      if (failed.length) {
        lines.push(`- Failed: ${failed.map((c) => (c.detail ? `${c.id} (${oneLine(c.detail)})` : c.id)).join('; ')}`);
      }
      if (reply.judge) {
        const j = reply.judge;
        lines.push(
          `- Judge: grounded ${j.grounded} · concrete ${j.concrete} · targets gap ${j.targetsGap}` +
            `${j.languageOk ? '' : ' · wrong language'}${j.notes ? `: ${oneLine(j.notes)}` : ''}`,
        );
      }
      if (reply.judgeError) lines.push(`- Judge error: ${oneLine(reply.judgeError)}`);
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

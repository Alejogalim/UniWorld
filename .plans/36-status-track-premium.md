# 36 — My universities: status track, premium pass (legible, one accent)

Branch: `feat/status-track-motion` (plan 35 is built and committed on it). Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ (DESIGN.md edits are owner-approved for this plan).

## Why (owner feedback on plan 35)
"Too grey so it is not very visible, but also too colourful so it looks like slop; I want a premium feeling that is also nice to read."

Plan 35's motion concept stays exactly as it is (travelling light to the current step, breathing current node, fill + pop on change, draw-in on page entry, visibility and reduced-motion rules, session status memory). Only the visual language changes:

1. **Legibility.** The completed path is full ink, not 60% ink. The line is 2px. Labels get a deliberate three-step hierarchy: current = ink, weight 600; completed = ink at 75%; upcoming = chart grey. Labels go from 11px to 12px with a 16px line height, 8px under the node in both variants.
2. **One accent.** Ember is the only colour on the track while it is in progress: the current node, its breathing ring and the travelling light. The peach (ember-2) core of the light, the amber waitlisted dot and the green/amber sparks are gone.
3. **Outcomes as glyphs.** The final node becomes a 16px solid disc with a 10px lucide glyph knocked out of it: admitted = evidence-green disc with a check, waitlisted = ink disc with a pause glyph, rejected = chart-grey disc with an x (and the rest of the track goes chart grey, as before). The only flourish left is one soft ember ring expanding once around the final node when admitted or waitlisted is newly reached.
4. **Neutral cards.** The status-coloured card rim and outer glow (`statusAccent` / `.status-card`) are removed: every card keeps the standard `Panel` rim and shadow.
5. **Premium details.** Node diameters on the 4px grid (8 / 12 / 16); the 2px line is centred on the node slot at an integer pixel; filled nodes sit on the line like beads on a wire (a 2px knockout ring in the ground colour); the light is softer (peak opacity 0.7, 32px tail at 40% ember, brighter 8px core); the breathing ring is smaller (scale 1.8, was 2.4), fainter (opacity 0.4, was 0.6), thinner (1px) and slower (3.6 to 4.4 s, was 2.8 to 3.4 s); the pop spring has less bounce; every easing is DESIGN.md's `cubic-bezier(0.2, 0, 0, 1)`.

### Decisions and their reasons
- **Admitted: green fill (a seal), not a green stroke icon.** A 10px stroked check is ~1.25px thick; on WebKitGTK's software path it antialiases to a grey-green smudge and needs a second ring around it to read as a node, which adds a stroke colour. A solid 16px disc with the check knocked out in the ground colour is one shape and one colour, reads instantly at a glance, matches the rule that reached steps are filled, and keeps the green to ~200 px² per card with no halo. This is a named exception to the Evidence Rule (recorded in DESIGN.md): the admission is the university's own decision, and it is the only green on the screen's tracks.
- **Waitlisted: ink disc with a pause glyph** (solid bars, `fill="currentColor"`), not a clock: a clock is a circle inside a circle at 16px and turns to noise; two bars read as "on hold" at 10px.
- **Rejected: chart-grey disc with an x;** the completed line and nodes also go chart grey (unchanged from plan 35), and completed labels drop to chart grey, so the whole track is calm.
- **Card rim: neutral for every status, and no urgent glow.** The coloured rims (green through grey by status) were the main source of "too colourful": seven slightly different greens across a list. There is no existing urgent-deadline glow, and adding one would put a second ember element on a card that already has the ember days-left pill (`DeadlineNote`), which breaks the Ember Rule ("if two ember things compete, one is wrong"). So: standard rim, no glow. `statusAccent` becomes dead code and is deleted with its test.
- **The travelling light uses `--ember-1` (`#ff5a1f`) in both themes**, not `--signal`. In light mode `--signal` (`#b53204`) on the new full-ink line is dark red on near-black (3.2:1) and barely shows; ember-1 is 6.35:1 on the ink line in light, and 3.12:1 on the white line in dark while its 1px over-spill sits on the dark panel at 6.27:1. Same ember family as the current node, so it still reads as one accent.
- **Knockout ground.** The overview track sits on a card (`--panel`); the editor track sits on the page ground (`--background`). A CSS variable `--track-ground` carries the right one, used by the knockout ring, the hollow upcoming nodes and the knocked-out glyphs.
- **Upcoming nodes: hollow 8px with a 1.5px chart-grey border** (was hairline): they carry the upcoming steps at 6.0:1, so the line beyond the current step can stay a quiet hairline.

### Contrast (WCAG 2.x, computed; card = `--panel`, dark card top = `#151517`)
| element | light | dark | target |
|---|---|---|---|
| current label, ink | 19.8 | 19.55 (18.24 on card top) | 4.5 |
| completed label, ink at 75% (`#474747` / `#c2c2c2`) | 9.29 | 10.98 (10.46) | 4.5 |
| upcoming label, chart grey | 5.99 | 6.00 (5.59) | 4.5 |
| completed line and nodes, ink | 19.8 | 19.55 | 3 |
| upcoming node border, chart grey | 5.99 | 6.00 | 3 |
| current node, signal | 6.14 | 6.84 | 3 |
| admitted disc, evidence / knocked-out check on it | 5.95 / 5.95 | 8.69 / 8.69 | 3 |
| waitlisted disc, ink / glyph on it | 19.8 / 19.8 | 19.55 / 19.55 | 3 |
| rejected disc, chart grey / x on it | 5.99 / 5.99 | 6.00 / 6.00 | 3 |
| travelling light (ember-1) on the completed line / on the panel | 6.35 / 3.12 | 3.12 / 6.27 | decorative |
| line beyond the current step, hairline | 1.85 | 1.70 | decorative (the nodes carry it) |

Editor track (page ground, light `#f7f6f4`): ink 18.3, ink 75% ~8.6, chart grey 5.5. Dark ground is black: all higher than on the card.

## Builder rules
- Work on branch `feat/status-track-motion`. No commits, no branch switches, no `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- Touch ONLY these files:
  - `src/ui/screens/myUnis/StatusProgress.tsx` (full replacement)
  - `src/ui/screens/myUnis/trackMotion.ts` (three exact edits)
  - `src/ui/screens/myUnis/trackMotion.test.ts` (four exact edits)
  - `src/ui/screens/myUnis/TrackedUniCard.tsx` (five exact edits)
  - `src/ui/screens/myUnis/status.ts` (one exact deletion)
  - `src/ui/screens/myUnis/status.test.ts` (two exact edits)
  - `src/index.css` (two block replacements)
  - `DESIGN.md` (four exact edits)
  - this plan file (checkboxes + Builder notes)
- Do NOT edit `MyUnis.tsx`, `TrackedUniEditor.tsx`, `useLiveWhileVisible.ts`, i18n files, or anything else.
- Minimal diff: apart from the full replacement of `StatusProgress.tsx`, every step is an exact string replacement. Another dev (Quan) wrote these files: do not reformat, re-indent, reorder imports or "tidy" anything not named here.
- Apply each edit with a small script that asserts the "old" text occurs exactly once before replacing. If an "old" text is not found exactly once, stop and write it under Builder notes; do not guess.

---

## Step 1 — `src/ui/screens/myUnis/trackMotion.ts` (three exact edits)
- [x] 1a. Old:
```ts
export type Flourish = 'burst' | 'settle-waitlisted' | null;

/**
 * The one-time outcome flourish for a change on the overview track. Only a real change into an
 * outcome plays one; a first mount (`from` null) never does. Rejected has no flourish.
 */
export function outcomeFlourish(
  from: TrackedStatus | null,
  to: TrackedStatus,
  variant: TrackVariant,
): Flourish {
  if (variant !== 'overview' || from === null || from === to) return null;
  if (to === 'admitted') return 'burst';
  if (to === 'waitlisted') return 'settle-waitlisted';
  return null;
}
```
New:
```ts
export type Flourish = 'ring' | null;

/**
 * The one-time outcome flourish for a change on the overview track: a single soft ember ring around
 * the final node. Only a real change into admitted or waitlisted plays it; a first mount (`from` null)
 * never does. Rejected has no flourish.
 */
export function outcomeFlourish(
  from: TrackedStatus | null,
  to: TrackedStatus,
  variant: TrackVariant,
): Flourish {
  if (variant !== 'overview' || from === null || from === to) return null;
  if (to === 'admitted' || to === 'waitlisted') return 'ring';
  return null;
}
```
- [x] 1b. Old:
```ts
    ringPeriodMs: Math.round(2800 + random() * 600),
```
New:
```ts
    ringPeriodMs: Math.round(3600 + random() * 800),
```
- [x] 1c. Old (delete the whole spark helper, including the blank line after it):
```ts
export interface Spark {
  dx: number;
  dy: number;
}

/** End offsets (px) for the admitted burst: `count` sparks evenly around a circle, the first straight up. */
export function sparkVectors(count = 6, radius = 14): Spark[] {
  const round = (value: number) => Math.round(value * 100) / 100;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return { dx: round(Math.cos(angle) * radius), dy: round(Math.sin(angle) * radius) };
  });
}

```
New: (nothing — the next line, `export interface StatusMemory {`, follows the blank line after `introDelayMs`).

## Step 2 — `src/ui/screens/myUnis/trackMotion.test.ts` (four exact edits)
- [x] 2a. Old:
```ts
  outcomeFlourish,
  sparkVectors,
  stepCount,
```
New:
```ts
  outcomeFlourish,
  stepCount,
```
- [x] 2b. Old:
```ts
describe('outcomeFlourish', () => {
  it('bursts only on a real change to admitted', () => {
    expect(outcomeFlourish('waiting', 'admitted', 'overview')).toBe('burst');
    expect(outcomeFlourish('rejected', 'admitted', 'overview')).toBe('burst');
    expect(outcomeFlourish(null, 'admitted', 'overview')).toBeNull();
    expect(outcomeFlourish('admitted', 'admitted', 'overview')).toBeNull();
  });

  it('settles waitlisted once and gives rejected nothing', () => {
    expect(outcomeFlourish('waiting', 'waitlisted', 'overview')).toBe('settle-waitlisted');
    expect(outcomeFlourish('waiting', 'rejected', 'overview')).toBeNull();
  });
```
New:
```ts
describe('outcomeFlourish', () => {
  it('rings once only on a real change to admitted or waitlisted', () => {
    expect(outcomeFlourish('waiting', 'admitted', 'overview')).toBe('ring');
    expect(outcomeFlourish('rejected', 'admitted', 'overview')).toBe('ring');
    expect(outcomeFlourish('waiting', 'waitlisted', 'overview')).toBe('ring');
    expect(outcomeFlourish(null, 'admitted', 'overview')).toBeNull();
    expect(outcomeFlourish('admitted', 'admitted', 'overview')).toBeNull();
  });

  it('gives rejected nothing', () => {
    expect(outcomeFlourish('waiting', 'rejected', 'overview')).toBeNull();
  });
```
- [x] 2c. Old:
```ts
    expect(low).toEqual({ pulsePeriodMs: 5000, pulseDelayMs: 800, ringPeriodMs: 2800, ringDelayMs: 0 });
```
New:
```ts
    expect(low).toEqual({ pulsePeriodMs: 5000, pulseDelayMs: 800, ringPeriodMs: 3600, ringDelayMs: 0 });
```
and Old:
```ts
    expect(high.ringPeriodMs).toBeLessThanOrEqual(3400);
```
New:
```ts
    expect(high.ringPeriodMs).toBeLessThanOrEqual(4400);
```
- [x] 2d. Old (delete, including the blank line after it):
```ts
describe('sparkVectors', () => {
  it('spreads the sparks evenly on a circle, the first straight up', () => {
    const sparks = sparkVectors(6, 14);
    expect(sparks).toHaveLength(6);
    for (const { dx, dy } of sparks) expect(Math.hypot(dx, dy)).toBeCloseTo(14, 1);
    expect(sparks[0].dx).toBeCloseTo(0);
    expect(sparks[0].dy).toBeCloseTo(-14);
  });
});

```
New: (nothing — `describe('createStatusMemory', () => {` follows the `introDelayMs` describe and one blank line).

## Step 3 — `src/ui/screens/myUnis/StatusProgress.tsx` (full replacement)
- [x] Replace the whole file with exactly:
```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Pause, X, type LucideIcon } from 'lucide-react';
import type { TrackedStatus } from '@/core/contracts';
import { cn } from '@/lib/utils';
import { Chip } from '@/ui/components/Chip';
import { OUTCOMES, OVERVIEW_STEPS, PIPELINE, finalOutcomeOf, type FinalOutcomeStatus } from './status';
import {
  fillStartScale,
  introDelayMs,
  isLooping,
  outcomeFlourish,
  statusMemory,
  trackIndex,
  trackProgress,
  trackTiming,
  type TrackVariant,
} from './trackMotion';
import { useLiveWhileVisible } from './useLiveWhileVisible';

interface StatusProgressProps {
  status: TrackedStatus;
  name: string;
  /** When given, the stages and outcomes become selectable controls. */
  onChange?: (status: TrackedStatus) => void;
  /** CSS colour of the progress light: the current node and its ring. Defaults to the ember signal. */
  accent?: string;
  /**
   * Remembers the last status shown under this key for the app session, so a remounted track can
   * play the change (the overview card passes the university id). The editor leaves it out.
   */
  trackKey?: string | number;
  /** Card position on the page's first paint. When given, the track draws in once on mount. */
  drawIn?: number;
  className?: string;
}

interface Step {
  key: TrackedStatus | 'outcome';
  label: string;
}

interface Change {
  id: number;
  from: TrackedStatus;
}

const EASE = [0.2, 0, 0, 1] as const;
/** Node diameters in px, on the 4px grid. The line is 2px and centred on the node slot. */
const NODE = { done: 8, current: 12, upcoming: 8, outcome: 16 } as const;
/** A ring in the ground colour around a filled node, so it sits on the line like a bead on a wire. */
const KNOCKOUT = '0 0 0 2px var(--track-ground)';
/** The final node once an outcome is reached: a solid disc with one glyph knocked out of it. */
const OUTCOME_NODE: Record<FinalOutcomeStatus, { Icon: LucideIcon; fill: string }> = {
  admitted: { Icon: Check, fill: 'var(--evidence)' },
  waitlisted: { Icon: Pause, fill: 'var(--foreground)' },
  rejected: { Icon: X, fill: 'var(--chart-grey)' },
};
/** How long the node fade-in trails the line as it draws from the first node to the last. */
const NODE_TRAIL_MS = 480;

/**
 * The application track. The overview shows considering → preparing → applied → waiting → one
 * shared final-outcome node. The editor shows the three-stage pipeline plus the outcome controls.
 * A straight 2px line runs behind the nodes: the completed part in ink, the rest a hairline. One
 * accent, ember: a small ember light travels from the first node to the current one, and the current
 * node breathes. Loops run only on screen and never under reduced motion.
 */
export function StatusProgress({
  status,
  name,
  onChange,
  accent = 'var(--signal)',
  trackKey,
  drawIn,
  className,
}: StatusProgressProps) {
  const { t } = useTranslation('myUnis');
  const reduceMotion = useReducedMotion() ?? false;
  const interactive = Boolean(onChange);
  const variant: TrackVariant = interactive ? 'editor' : 'overview';
  const finalOutcome = finalOutcomeOf(status);
  const rejected = finalOutcome === 'rejected';
  const current = trackIndex(status, variant);
  const progress = trackProgress(status, variant);

  // A change is a new status while mounted, or (overview cards) a status that differs from the one
  // this card showed last time this session. A first mount is never a change.
  const [change, setChange] = useState<Change | null>(() => {
    const last = trackKey === undefined ? null : statusMemory.peek(trackKey);
    return last !== null && last !== status ? { id: 1, from: last } : null;
  });
  const [shown, setShown] = useState(status);
  if (shown !== status) {
    setShown(status);
    setChange({ id: (change?.id ?? 0) + 1, from: shown });
  }

  useEffect(() => {
    if (trackKey !== undefined) statusMemory.remember(trackKey, status);
  }, [trackKey, status]);

  const [timing] = useState(() => trackTiming());
  // Captured once: the draw-in plays on mount only, and never together with a change.
  const [intro] = useState(() => drawIn !== undefined && change === null && !reduceMotion);

  const trackRef = useRef<HTMLDivElement>(null);
  const looping = isLooping(status) && !reduceMotion;
  const live = useLiveWhileVisible(trackRef, looping);

  const fillFrom = change ? fillStartScale(change.from, status, variant) : null;
  const flourish = change && !reduceMotion ? outcomeFlourish(change.from, status, variant) : null;
  const changeId = change?.id ?? 0;
  const introDelay = introDelayMs(drawIn ?? 0);
  const lineColor = rejected ? 'var(--chart-grey)' : 'var(--foreground)';

  const steps: Step[] = interactive
    ? PIPELINE.map((stage) => ({ key: stage, label: t(`status.${stage}`) }))
    : [
        ...OVERVIEW_STEPS.map((stage) => ({ key: stage, label: t(`status.${stage}`) })),
        {
          key: 'outcome',
          label: finalOutcome ? t(`status.${finalOutcome}`) : t('status.final'),
        },
      ];

  const count = steps.length;
  const slot = interactive ? 20 : 16;
  const trackVars = {
    '--pulse-period': `${timing.pulsePeriodMs}ms`,
    '--pulse-delay': `${timing.pulseDelayMs}ms`,
    '--ring-period': `${timing.ringPeriodMs}ms`,
    '--ring-delay': `${timing.ringDelayMs}ms`,
    '--ring-color': accent,
    '--intro-delay': `${introDelay}ms`,
    // The surface under the track: the card on the overview, the page ground in the editor.
    '--track-ground': interactive ? 'var(--background)' : 'var(--panel)',
  } as CSSProperties;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div
        className={cn(
          'min-w-0',
          !interactive && 'status-track-scroll max-md:overflow-x-auto max-md:py-3',
        )}
      >
        <div
          ref={trackRef}
          role="group"
          aria-label={`${t('status.label', { name })} ${t('status.current', { status: t(`status.${status}`) })}`}
          className={cn(
            'status-track relative flex',
            looping && !live && 'is-paused',
            !interactive && 'max-md:min-w-[44rem]',
          )}
          style={trackVars}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${50 / count}%`,
              right: `${50 / count}%`,
              top: `${slot / 2 - 1}px`,
              height: '2px',
            }}
          >
            <div className={cn('absolute inset-0', intro && 'status-draw')}>
              <span className="absolute inset-0 rounded-full bg-hairline" />
              <motion.span
                key={`fill-${changeId}`}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: lineColor,
                  transformOrigin: 'left center',
                }}
                initial={
                  !change ? false : reduceMotion ? { opacity: 0 } : fillFrom === null ? false : { scaleX: fillFrom }
                }
                animate={{ opacity: 1, scaleX: 1 }}
                transition={reduceMotion ? { duration: 0.25 } : { duration: 0.5, ease: EASE }}
              />
            </div>
            {looping && current > 0 && (
              <span
                key={`pulse-${changeId}`}
                className="status-pulse"
                style={{ width: `${progress * 100}%` }}
              />
            )}
          </div>

          {steps.map((step, i) => {
            const done = i < current;
            const isCurrent = i === current;
            const upcoming = !done && !isCurrent;
            const outcome = !interactive && step.key === 'outcome' && isCurrent ? finalOutcome : null;
            const outcomeNode = outcome ? OUTCOME_NODE[outcome] : null;
            const OutcomeIcon = outcomeNode?.Icon;
            const pop = isCurrent && change !== null && !reduceMotion;
            const nodeDelay = intro ? introDelay + (count > 1 ? (i / (count - 1)) * NODE_TRAIL_MS : 0) : 0;

            const dotSize = outcomeNode
              ? NODE.outcome
              : isCurrent
                ? NODE.current
                : done
                  ? NODE.done
                  : NODE.upcoming;

            let dotStyle: CSSProperties;
            if (outcomeNode) {
              dotStyle = { backgroundColor: outcomeNode.fill, boxShadow: KNOCKOUT };
            } else if (isCurrent) {
              dotStyle = { backgroundColor: accent, boxShadow: KNOCKOUT };
            } else if (done) {
              dotStyle = { backgroundColor: lineColor, boxShadow: KNOCKOUT };
            } else {
              dotStyle = { backgroundColor: 'var(--track-ground)' };
            }

            const labelClass = cn(
              'text-center text-xs leading-4 break-words transition-colors duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              isCurrent
                ? 'font-semibold text-foreground'
                : done && !rejected
                  ? 'text-foreground/75'
                  : 'text-chart-grey',
              interactive && !isCurrent && 'group-hover:text-foreground',
            );

            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cn('relative grid shrink-0 place-items-center', intro && 'status-node-in')}
                  style={{ width: slot, height: slot, '--node-delay': `${nodeDelay}ms` } as CSSProperties}
                >
                  <motion.span
                    key={pop ? `pop-${changeId}` : 'dot'}
                    className={cn(
                      'relative grid place-items-center rounded-full',
                      upcoming && 'border-[1.5px] border-chart-grey',
                    )}
                    style={{ width: dotSize, height: dotSize, ...dotStyle }}
                    initial={pop ? { scale: 0.6 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  >
                    {OutcomeIcon && (
                      <OutcomeIcon
                        aria-hidden="true"
                        size={10}
                        strokeWidth={3}
                        fill={outcome === 'waitlisted' ? 'currentColor' : 'none'}
                        style={{ color: 'var(--track-ground)' }}
                      />
                    )}
                    {isCurrent && looping && <span className="status-ring" />}
                    {outcomeNode && flourish === 'ring' && <span className="status-ring status-ring--once" />}
                  </motion.span>
                </span>
                <span className={labelClass}>{step.label}</span>
              </>
            );

            return interactive ? (
              <button
                key={step.key}
                type="button"
                onClick={() => step.key !== 'outcome' && onChange?.(step.key)}
                aria-pressed={status === step.key}
                aria-current={isCurrent ? 'step' : undefined}
                className="group relative z-10 flex flex-1 flex-col items-center gap-2 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
              >
                {content}
              </button>
            ) : (
              <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {interactive && onChange && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="type-label text-chart-grey">{t('status.afterApplying')}</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={status === 'applied'} onClick={() => onChange('applied')}>
              {t('status.none')}
            </Chip>
            {OUTCOMES.map((value) => (
              <Chip key={value} selected={status === value} onClick={() => onChange(value)}>
                {t(`status.${value}`)}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```
Notes for the builder (do not change the code above unless `bun run build` fails):
- Unchanged from plan 35 on purpose: the `if (shown !== status)` render-time state adjustment, the `initial={...}` ternary on the fill, aria labels, `aria-pressed`/`aria-current`, the `is-paused` logic, the draw-in and the session memory.
- If TypeScript rejects `fill={...}` or `style` on the lucide icon, keep the icon and record the exact error under Builder notes; do not change the visual values.
- `border-chart-grey`, `bg-hairline`, `text-foreground/75` and `ease-[cubic-bezier(0.2,0,0,1)]` are valid Tailwind v4 classes in this project (`--color-chart-grey` and `--color-hairline` exist in `@theme inline`).

## Step 4 — `src/ui/screens/myUnis/TrackedUniCard.tsx` (five exact edits)
- [x] 4a. Old (first line of the file; delete it):
```tsx
import type { CSSProperties } from 'react';
```
New: (nothing — the file then starts with `import { useTranslation } from 'react-i18next';`).
- [x] 4b. Old (delete the line):
```tsx
import { statusAccent } from './status';
```
New: (nothing).
- [x] 4c. Old:
```tsx
 * facts run through the middle, and the status track owns the bottom line. The rim and outer glow
 * take their colour from the status accent.
 */
```
New:
```tsx
 * facts run through the middle, and the status track owns the bottom line. The card keeps the
 * standard panel rim for every status: the status lives on the track alone.
 */
```
- [x] 4d. Old (delete the line):
```tsx
  const accent = statusAccent(uni.status);
```
New: (nothing).
- [x] 4e. Old:
```tsx
    <Panel
      className="status-card flex min-w-0 flex-col gap-4 p-5 md:p-6"
      style={{ '--card-accent': accent } as CSSProperties}
    >
```
New:
```tsx
    <Panel className="flex min-w-0 flex-col gap-4 p-5 md:p-6">
```

## Step 5 — `src/ui/screens/myUnis/status.ts` (one exact deletion)
- [x] Old (from the blank line after `outcomeOf`'s closing `}` to the end of the file):
```ts

/**
 * The accent colour for a status, as a CSS colour. Completion warms from neutral grey to the
 * evidence green; outcomes sit around the same green with different weights.
 */
const STATUS_ACCENTS: Record<TrackedStatus, string> = {
  considering: 'var(--chart-grey)',
  preparing: 'color-mix(in oklch, var(--evidence) 45%, var(--chart-grey))',
  applied: 'var(--evidence)',
  waiting: 'color-mix(in oklch, var(--evidence) 80%, var(--chart-grey))',
  admitted: 'var(--evidence)',
  waitlisted: 'color-mix(in oklch, var(--evidence) 55%, var(--chart-grey))',
  rejected: 'var(--chart-grey)',
};

/** A CSS colour that reflects how far the application has progressed. */
export function statusAccent(status: TrackedStatus): string {
  return STATUS_ACCENTS[status];
}
```
New: (nothing). The file must still end with `outcomeOf`'s closing `}` followed by a single newline. `TrackedStatus` is still used by the other functions, so its import stays.

## Step 6 — `src/ui/screens/myUnis/status.test.ts` (two exact edits)
- [x] 6a. Old:
```ts
  stageIndex,
  statusAccent,
} from './status';
```
New:
```ts
  stageIndex,
} from './status';
```
- [x] 6b. Old:
```ts
  });

  it('gives every status an accent colour', () => {
    for (const status of [...PIPELINE, ...OUTCOMES]) expect(statusAccent(status)).toBeTruthy();
  });
});
```
New:
```ts
  });
});
```

## Step 7 — `src/index.css` (two block replacements, inside `@layer components`)
- [x] 7a. Delete the status-card block. Old (exactly these lines, plus the one blank line that follows them, so `/* Below md the seven-step status track ...` follows the `.dark .panel-ember` block after one blank line):
```css
  /* Status card: the rim and an outer glow take their colour from the application status. */
  .status-card {
    --rim: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--card-accent) 60%, transparent),
      color-mix(in oklch, var(--card-accent) 18%, transparent)
    );
    box-shadow:
      0 0 0 1px color-mix(in oklch, var(--card-accent) 16%, transparent),
      0 0 32px -12px color-mix(in oklch, var(--card-accent) 65%, transparent);
    transition: box-shadow 200ms ease;
  }
  .status-card:hover {
    box-shadow:
      0 0 0 1px color-mix(in oklch, var(--card-accent) 24%, transparent),
      0 0 44px -12px color-mix(in oklch, var(--card-accent) 80%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .status-card { transition: none; }
  }

```
New: (nothing).
- [x] 7b. Replace the plan-35 status-track block: every line from `  /* Status track (plan 35): a straight line; a small ember light travels to the current step and the current` down to and including the closing `  }` of the `@media (prefers-reduced-motion: reduce)` block that contains `.status-spark { display: none; }` (the next line after it is the blank line before `  /* Primary button fill`). Leave everything else untouched.

New (2-space indent, as in the surrounding layer):
```css
  /* Status track (plans 35, 36): a straight 2px line; one accent, ember. A small ember light travels to the
     current step and the current node breathes. Only small elements animate, transform and opacity only.
     Per-card timing arrives as CSS variables from StatusProgress; .is-paused (off screen or hidden window)
     freezes the loops. */
  .status-pulse {
    position: absolute;
    left: 0;
    top: 50%;
    height: 0;
    transform: translateX(-100%);
    will-change: transform;
    animation: status-pulse-travel var(--pulse-period, 6000ms) linear var(--pulse-delay, 0ms) infinite;
  }
  /* The light: a 32px tail at 40% ember with a brighter 8px core at its leading end, centred on the line.
     ember-1 in both themes: it reads on the ink line in light (6.35:1) and on the panel in dark (6.27:1). */
  .status-pulse::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -4px;
    width: 32px;
    height: 4px;
    border-radius: 999px;
    background:
      radial-gradient(closest-side, var(--ember-1), transparent) right center / 8px 4px no-repeat,
      linear-gradient(to right, transparent, color-mix(in oklch, var(--ember-1) 40%, transparent));
    opacity: 0;
    animation: status-pulse-fade var(--pulse-period, 6000ms) linear var(--pulse-delay, 0ms) infinite;
  }
  @keyframes status-pulse-travel {
    0% {
      transform: translateX(-100%);
      animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
    }
    30%,
    100% {
      transform: translateX(0);
    }
  }
  @keyframes status-pulse-fade {
    0% { opacity: 0; }
    5% { opacity: 0.7; }
    28% { opacity: 0.55; }
    38%,
    100% { opacity: 0; }
  }

  /* The current node breathes: a thin, faint ember ring grows a little and fades. */
  .status-ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 1px solid var(--ring-color, var(--signal));
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity;
    animation: status-ring-breathe var(--ring-period, 4000ms) cubic-bezier(0.2, 0, 0, 1) var(--ring-delay, 0ms) infinite;
  }
  /* Once, when admitted or waitlisted is newly reached: the ember light's last breath around the final node. */
  .status-ring--once {
    animation-duration: 1400ms;
    animation-delay: 300ms;
    animation-iteration-count: 1;
  }
  @keyframes status-ring-breathe {
    0% { transform: scale(1); opacity: 0.4; }
    70%,
    100% { transform: scale(1.8); opacity: 0; }
  }

  .status-track.is-paused .status-pulse,
  .status-track.is-paused .status-pulse::after,
  .status-track.is-paused .status-ring {
    animation-play-state: paused;
  }

  /* First paint of My universities: the line draws left to right, the nodes follow it. */
  .status-draw {
    transform-origin: left center;
    animation: status-draw 600ms cubic-bezier(0.2, 0, 0, 1) var(--intro-delay, 0ms) both;
  }
  @keyframes status-draw {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  .status-node-in {
    animation: status-node-in 240ms cubic-bezier(0.2, 0, 0, 1) var(--node-delay, 0ms) both;
  }
  @keyframes status-node-in {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-pulse,
    .status-ring { display: none; }
    .status-draw,
    .status-node-in { animation: none; }
  }
```
- [x] After the edits, `grep -rn "status-card\|card-accent\|status-spark\|status-node--waitlisted\|status-ring-ping\|statusAccent\|sparkVectors" src` must print nothing.

## Step 8 — `DESIGN.md` (four exact edits)
- [x] 8a. Old:
```
**The Evidence Rule.** Green means evidence only: a fact with a source and a matching quote. Never "done", "success" or celebration.
```
New:
```
**The Evidence Rule.** Green means evidence only: a fact with a source and a matching quote. Never "done", "success" or celebration. One named exception (plan 36): the admitted seal, the 16px final node of a My universities status track, because the admission is the university's own decision. No other green on the track or the card.
```
- [x] 8b. Old:
```
The card rim and outer glow take their colour from the status accent.
```
New:
```
Every card keeps the standard panel rim and shadow whatever its status (plan 36): the status lives on the track alone, and an urgent deadline is already marked by the ember days-left pill, so the card adds no glow.
```
- [x] 8c. Old (the five lines starting with `- **Status track** (`StatusProgress`, plan 35):` down to and including the line starting with `  - **First paint:**`):
```
- **Status track** (`StatusProgress`, plan 35): considering, preparing, applied, waiting, then one shared final-outcome dot (admitted, waitlisted or rejected); the editor shows the three pipeline stages plus the outcome chips. A straight 1.5px line: the completed part in ink at 60%, the rest a hairline. Completed nodes are small ink dots, the current node a larger ember (signal) dot with a soft ember ring, upcoming nodes hollow hairline dots. Labels are chart grey except the current one (ink, medium).
  - **Light travels along the track:** every 5 to 7 s (random per card) a 40px soft ember glow slides from the first node to the current one, decelerating, and fades into it; it never passes the current step. The current node breathes: a faint ember ring scales up and fades about every 3 s. Both are named exceptions to "nothing that glows is ever animated": tiny elements, transform and opacity only, per-card CSS timing, running only while the card is on screen and the window is visible. They stop once a final outcome is reached.
  - **Status change:** the completed line fills from the old node to the new one (500ms, scaleX), the new current node pops with a small spring, and its label fades to ink. A card remembers (for the session) the status it last showed, so the change plays when the list returns from the editor.
  - **Outcomes:** admitted, a one-time burst of six tiny sparks (700ms) on an actual change, then the final dot settles in evidence green (the only green on the track); waitlisted, the dot settles in ember-2 with one slow ring pulse; rejected, no flourish and the whole track goes calm chart grey.
  - **First paint:** on entering My universities each card's line draws in left to right once (600ms, 60ms stagger per card, capped at eight cards), the nodes following it.
```
New:
```
- **Status track** (`StatusProgress`, plans 35 and 36): considering, preparing, applied, waiting, then one shared final-outcome node (admitted, waitlisted or rejected); the editor shows the three pipeline stages plus the outcome chips. One accent, ember; everything else is ink, grey and a hairline.
  - **Geometry:** a straight 2px line centred on a 16px node slot (20px in the editor), from the first node's centre to the last. Completed part in full ink, the rest a hairline. Nodes on the 4px grid: completed 8px ink discs, current 12px ember (signal) disc, upcoming 8px hollow with a 1.5px chart-grey border, a reached outcome 16px. Filled nodes carry a 2px ring in the ground colour (`--track-ground`: the panel on the card, the page ground in the editor), so they sit on the line like beads on a wire.
  - **Labels:** 12px / 16px, centred under each node 8px below it, in equal-width columns. Current: ink, weight 600 (19.8 light, 19.55 dark). Completed: ink at 75% (9.3 / 11.0). Upcoming: chart grey (6.0 / 6.0). Labels wrap; they never truncate.
  - **Light travels along the track:** every 5 to 7 s (random per card) a soft ember light (`--ember-1`, a 32px tail at 40% with a brighter 8px core, peak opacity 0.7) slides from the first node to the current one, decelerating, and fades into it; it never passes the current step. ember-1 rather than signal so it reads on the ink line in light mode (6.35:1). The current node breathes: a 1px ember ring grows to 1.8x at opacity 0.4 and fades, every 3.6 to 4.4 s. Both are named exceptions to "nothing that glows is ever animated": tiny elements, transform and opacity only, per-card CSS timing, running only while the card is on screen and the window is visible. They stop once a final outcome is reached.
  - **Status change:** the completed line fills from the old node to the new one (500ms, scaleX), the new current node pops with a soft spring (from 0.6, little overshoot), and its label fades to ink (300ms, `cubic-bezier(0.2, 0, 0, 1)`). A card remembers (for the session) the status it last showed, so the change plays when the list returns from the editor.
  - **Outcomes:** the final node becomes a 16px solid disc with a 10px lucide glyph knocked out in the ground colour. Admitted: evidence green with a check (the only green, see the Evidence Rule). Waitlisted: ink with a pause glyph. Rejected: chart grey with an x, and the completed line, nodes and labels go chart grey too. On an actual change to admitted or waitlisted, one soft ember ring expands once around the final node (1400ms); rejected has no flourish. No sparks, no second accent.
  - **First paint:** on entering My universities each card's line draws in left to right once (600ms, 60ms stagger per card, capped at eight cards), the nodes following it.
```
- [x] 8d. Old:
```
on the status track no loops, no burst, no draw-in, no pop, and the fill becomes a 250ms fade.
```
New:
```
on the status track no loops, no outcome ring, no draw-in, no pop, and the fill becomes a 250ms fade.
```

## Verify (run all; all must pass)
```bash
cd /home/alejogalim/Documents/Projects/UniWorld
bun run build
bun run check:i18n
bun test
grep -rn "status-card\|card-accent\|status-spark\|status-node--waitlisted\|status-ring-ping\|statusAccent\|sparkVectors" src || echo "clean"
git status --short
git diff --stat
```
`git status --short` must list only the files named in Builder rules (plus the pre-existing untracked `.impeccable/` and `graphify-out/`). `git diff --stat` must not show `MyUnis.tsx`, `TrackedUniEditor.tsx` or `useLiveWhileVisible.ts`.

## Acceptance (orchestrator checks visually, light and dark)
- At a glance the track reads: a crisp 2px ink line up to the current step, a quiet hairline after it; completed nodes are ink beads, the current node an ember bead, upcoming nodes hollow grey rings. Labels: current bold ink, completed softer ink, upcoming grey.
- The only colour on an in-progress card is ember (current node, its ring, the travelling light, and the urgent days-left pill if any). Cards have the standard rim: no green or grey status rims or glows.
- The travelling light is soft and visible in both themes on the ink line; the breathing ring is small and slow.
- Admitted: green 16px seal with a check; Waitlisted: ink disc with a pause glyph; Rejected: grey disc with an x and an all-grey track. Editing Waiting → Admitted and saving: line fills, final node pops, one ember ring expands once; no sparks.
- Draw-in on page entry still staggers; closing the editor does not replay it. The editor track's knockout rings match the page ground (no white halos on paper, no grey halos on black).
- Reduced motion: no light, ring, draw-in or pop; a status change only fades the line in.

## Builder notes

- Applied (no commits): steps 1, 2, 3, 4, 5, 6, 7, 8a, 8b, 8d and the verify grep. Each old text was asserted to occur exactly once before replacement; StatusProgress.tsx was replaced in full from the fenced block.
- **Not applied: 8c (DESIGN.md status-track block).** Its old text does not match. The repo's "First paint" line reads `on entering Shortlist each card's line draws in`, not `on entering My universities` (the destination was renamed to Shortlist in 67eeed5). The 8c new text also says "My universities", so applying it verbatim would reintroduce the old name. Left DESIGN.md's plan-35 wording for this block; the orchestrator should decide whether to apply 8c with "Shortlist".
- Step 7b matched by content (start `  /* Status track (plan 35)`, end before `  /* Primary button fill`) rather than fixed line numbers, because step 7a shifts lines. The first attempt at writing index.css truncated it (a helper-script bug, not a plan issue). index.css had no uncommitted changes before this run, so it was restored with `git checkout` and all its edits re-applied; the final diff was reviewed.
- Verify: `bun run build` (tsc + vite build) exit 0; `bun run check:i18n` passed; `bun test` 266 pass, 0 fail; the leftover grep prints nothing; `git diff --stat` touches only the named files (8 files). MyUnis.tsx, TrackedUniEditor.tsx and useLiveWhileVisible.ts are untouched.
- `git status` also shows `design/logo-options/` as untracked. It appeared during this run (not created by the builder) and was left alone.
- Not run: the app (per builder rules); visual acceptance is the orchestrator's.

# 37 — University detail: centred column, calm header, tidy facts

Branch: `feat/status-track-motion`. Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ (the DESIGN.md edits in Step 5 are owner-approved for this plan).

## Why (owner feedback)
"Align the items correctly, the card should be centred, and make it look good."

What is wrong today (screenshot at 1920x1080, route `/finder/uni/:rorId`):
1. The page title "Atlas" is centred over the working column, but the content is a left-aligned 1120px block (`max-w-[1120px] px-12`), so the page looks off-centre.
2. "Back" floats in the middle: the quiet `Button` is a flex child of a `flex-col` and stretches to full width, so its centred text lands at x≈540, aligned with nothing.
3. The header card has the heavy `.panel-ember` glow, and its actions (secondary Refresh pill, plain "In your list" text, quiet "Open my list") float top-right in three different styles, not aligned with the title.
4. Source superscripts ("1", "5") drop onto a line of their own under multi-line values: the value and the marker are two flex items in a `flex-wrap` row.
5. "english" shows in lowercase: the core returns language *names* as well as ISO codes, and `languageName("english")` just echoes the input.
6. Four dashed "Not found — check official site" rows are scattered between found facts and read as noise; rows have no rhythm (8px padding).

## Decisions
- **One centred 800px column** (`mx-auto w-full max-w-[800px] px-6 pt-2 pb-12`), the same pattern as Settings (centred 640px, `px-6 pt-2 pb-12`) but wider because facts need a label column plus ~60ch of value. Back sits above the card, its arrow aligned to the column's left edge (`-ml-4 self-start`: the quiet sm button has 16px padding).
- **Header: a plain `Panel`, no `.panel-ember`.** The `.panel-ember` glow is a shared token used by other screens, so it can't be "calmed" for this page alone without restyling a primitive per screen. The One Panel Rule allows *at most* one, and on this page the memorable thing is the facts, not the card. The single ember element left on the page is the "Add to my list" primary button (one ember action per region).
- **Header content, top to bottom, all left-aligned:** flag (24px) + university name in Headline (28px, `.type-headline`); program in Title (`.type-title`); one muted meta line "Pittsburgh, United States · Last checked Nov 22, 2026" (date in tabular figures); then one row of 36px (`size="sm"`) pill actions on a shared centre line:
  - not in list: **Add to my list** (primary, the one ember action);
  - in list: a check icon + "In your list" (Chart Grey status text) and **Open my list** (secondary);
  - **Refresh** (quiet, with icon) pushed to the far right of the row (`ml-auto -mr-4`, so its text aligns with the card's right padding); on narrow widths it wraps onto its own line, still right-aligned.
  - "Open this university from Atlas to add it to your list." stays as a small muted note under the row when the name is unknown.
  - No "Remove from list" button is added: removal lives in Shortlist, and the plan keeps behaviour unchanged.
- **Superscript stays inline.** The value and the `SourceMarker` become one inline run joined by a no-break space (`"\u00A0"`, written as that escape, not a literal character). Unicode line breaking never breaks before or after a no-break space, so the marker always ends the last line of text.
- **Languages read as names in the UI language, capitalised.** New `languageLabel(raw, uiLang)` in `src/ui/data/languages.ts`: an ISO 639-1 code goes through `languageName`; an English name in any case ("english") is mapped back to its code via `Intl.DisplayNames('en')` and then named in the UI language ("English" / "inglés" / "Tiếng Anh"); anything else is trimmed and capitalised. The joined list's first letter is capitalised (so Spanish reads "Inglés, francés").
- **Missing facts: keep per-row rows, sink them to the end.** DESIGN.md's Fact line rule says the missing fact "keeps its row height" and the Do list says to design the missing state as carefully as the present one, so collapsing them into one summary line would break the signature. Instead, found facts render first and missing facts after, each group in its original order. The source markers are numbered in render order, so they still count 1, 2, 3… down the page. The missing row's look (Chart Grey, dashed underline) is unchanged.
- **Rhythm and responsiveness.** Fact rows get 12px vertical padding (was 8), a 24px column gap (was 16), and matching 1.55 line heights on label and value so baselines line up. The 11rem label column stacks above the value when the *container* is narrower than 36rem (576px) — a container query, not a viewport breakpoint, because the same view also renders embedded in the Atlas dock (320–600px, already an `@container`). The full page wrapper gets `@container` too.
- **Embedded (Atlas dock) view** gets the same header layout with smaller type (name in Title, program at body size weight 500) and keeps its existing paddings.
- **No i18n changes.** Every string already exists (`detail.inList`, `detail.openList`, `detail.addToList`, `detail.refresh`, `detail.lastChecked`, `detail.addNeedsName`); the "·" separator is punctuation.

## Builder rules
- Work on branch `feat/status-track-motion`. No commits, no branch switches, no `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- Touch ONLY these files:
  - `src/ui/screens/UniDetail.tsx` (six exact edits, one of them a block replacement)
  - `src/ui/components/FactLine.tsx` (one exact edit)
  - `src/ui/data/languages.ts` (one append)
  - `src/ui/data/languages.test.ts` (new file)
  - `DESIGN.md` (three exact edits)
  - this plan file (checkboxes + Builder notes)
- Do NOT edit `Finder.tsx`, `Panel.tsx`, `Flag.tsx`, `button.tsx`, `ResultRow.tsx`, `src/index.css`, i18n files, or anything else.
- Minimal diff: another dev (Quan) edits these files too. Do not reformat, re-indent, reorder imports or "tidy" anything not named here. Keep each file's quote style (UniDetail uses single quotes, FactLine double quotes).
- Apply each edit with a small script (e.g. `bun -e` or `python3`) that asserts the "old" text occurs exactly once before replacing. If an "old" text is not found exactly once, stop and write it under Builder notes; do not guess.

---

## Step 1 — `src/ui/data/languages.ts` (append at end of file)

Append this after the existing `languageName` function (leave everything above untouched):

```ts

let englishNames: Map<string, string> | null = null;

/** ISO 639-1 code for an English language name in any case ("english" -> "en"), or null. */
function codeForEnglishName(name: string): string | null {
  if (!englishNames) {
    englishNames = new Map();
    const en = namesFor('en');
    if (en) {
      for (const code of LANGUAGE_CODES) {
        try {
          const label = en.of(code);
          if (label && label !== code) englishNames.set(label.toLowerCase(), code);
        } catch {
          // Unknown to this engine's Intl data: skip it.
        }
      }
    }
  }
  return englishNames.get(name.toLowerCase()) ?? null;
}

/**
 * A language as the core returned it (an ISO code like "en" or a name like "english"), shown in the
 * UI language. Unknown names are trimmed and capitalised, never shown raw.
 */
export function languageLabel(raw: string, uiLang: string): string {
  const value = raw.trim();
  const lower = value.toLowerCase();
  if (LANGUAGE_CODES.includes(lower)) return languageName(lower, uiLang);
  const code = codeForEnglishName(value);
  if (code) return languageName(code, uiLang);
  return value.charAt(0).toLocaleUpperCase(uiLang) + value.slice(1);
}
```

- [x] Step 1 done

## Step 2 — `src/ui/data/languages.test.ts` (new file)

```ts
import { describe, expect, test } from 'bun:test';
import { languageLabel } from './languages';

describe('languageLabel', () => {
  test('names ISO codes in the UI language', () => {
    expect(languageLabel('en', 'en')).toBe('English');
    expect(languageLabel('EN', 'vi')).toBe('Tiếng Anh');
  });

  test('maps English names in any case to the UI language', () => {
    expect(languageLabel('english', 'en')).toBe('English');
    expect(languageLabel(' French ', 'en')).toBe('French');
    expect(languageLabel('english', 'es').toLowerCase()).toBe('inglés');
  });

  test('capitalises names it cannot map', () => {
    expect(languageLabel('  elvish ', 'en')).toBe('Elvish');
  });
});
```

- [x] Step 2 done

## Step 3 — `src/ui/components/FactLine.tsx` (one exact edit)

Old (inside `FactLine`, the whole returned JSX):
```tsx
    <div className="grid min-h-11 grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-b border-hairline py-2">
      <span className="text-sm text-chart-grey">{label}</span>
      {sourced ? (
        <span className="flex flex-wrap items-baseline gap-1 text-base font-medium text-foreground">
          <span className="min-w-0 break-words">
            {format ? format(fact.value as T) : Array.isArray(fact.value) ? fact.value.join(", ") : fact.value}
          </span>
          <SourceMarker index={index} sourceUrl={fact.sourceUrl} sourceKind={fact.sourceKind} quote={fact.quote} />
        </span>
      ) : (
        <span className="text-sm text-chart-grey underline decoration-dashed decoration-1 underline-offset-4">
```
New:
```tsx
    <div className="grid min-h-11 grid-cols-1 items-baseline gap-x-6 gap-y-1 border-b border-hairline py-3 @min-[36rem]:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <span className="text-sm leading-[1.55] text-chart-grey">{label}</span>
      {sourced ? (
        // One inline run: the no-break space glues the marker to the last word so it never wraps alone.
        <span className="min-w-0 text-base leading-[1.55] font-medium break-words text-foreground">
          {format ? format(fact.value as T) : Array.isArray(fact.value) ? fact.value.join(", ") : fact.value}
          {"\u00A0"}
          <SourceMarker index={index} sourceUrl={fact.sourceUrl} sourceKind={fact.sourceKind} quote={fact.quote} />
        </span>
      ) : (
        <span className="text-sm leading-[1.55] text-chart-grey underline decoration-dashed decoration-1 underline-offset-4">
```

Also, in the doc comment just above `export function FactLine`, old:
```
 * the source tag, the quote and the URL. Missing facts keep the row height.
```
new:
```
 * the source tag, the quote and the URL. Missing facts keep the row height. Needs a `@container`
 * ancestor: narrower than 36rem, the label stacks above the value.
```
(That is the second replacement in this file; both must match exactly once.) Do not touch `SourceMarker` or `hasSourcedValue`.

- [x] Step 3 done

## Step 4 — `src/ui/screens/UniDetail.tsx`

### 4a — imports
Old: `import { ArrowLeft, RefreshCw } from 'lucide-react';`
New: `import { ArrowLeft, Check, RefreshCw } from 'lucide-react';`

Old: `import { languageName } from '@/ui/data/languages';`
New: `import { languageLabel } from '@/ui/data/languages';`

### 4b — Back button aligned to the column edge
Old:
```tsx
    <Button variant="quiet" size="sm" onClick={onBack}>
      <ArrowLeft aria-hidden="true" />
      {t('detail.back')}
```
New:
```tsx
    <Button variant="quiet" size="sm" className="-ml-4 self-start" onClick={onBack}>
      <ArrowLeft aria-hidden="true" />
      {t('detail.back')}
```

### 4c — no-program page wrapper
Old:
```tsx
      <div className="max-w-[1120px] px-12 py-8">
        <div className="flex flex-col gap-6">
          {back}
          {content}
```
New:
```tsx
      <div className="@container mx-auto w-full max-w-[800px] px-6 pt-2 pb-12">
        <div className="flex flex-col gap-3">
          {back}
          {content}
```

### 4d — block replacement: actions, header and facts
Replace the contiguous block that starts at the line
```tsx
  const primaryAction = existing ? (
```
and ends with (inclusive) the facts block's closing lines, i.e. the first occurrence after it of
```tsx
            }
          />
        </div>
      )}
```
(the end of the "How to apply" `FactLine`, its wrapping `</div>` and `)}`). Leave the following `    </div>\n  );` (end of `body`) untouched. Assert the start line occurs exactly once and the end text occurs exactly once after the start.

New block (replaces it entirely):
```tsx
  // Found facts first, then the missing ones, each group in its original order. The source markers are
  // numbered as the rows render, so they still count down the page.
  const factRows: { fact: Fact<unknown>; render: (index: number) => ReactNode }[] = detail
    ? [
        {
          fact: detail.overview,
          render: (i) => <FactLine key="overview" label={t('detail.sections.overview')} fact={detail.overview} index={i} />,
        },
        {
          fact: detail.languages,
          render: (i) => (
            <FactLine
              key="languages"
              label={t('detail.sections.language')}
              fact={detail.languages}
              index={i}
              format={(codes) => {
                const text = codes.map((c) => languageLabel(c, uiLang)).filter(Boolean).join(', ');
                return text.charAt(0).toLocaleUpperCase(uiLang) + text.slice(1);
              }}
            />
          ),
        },
        {
          fact: detail.tuition,
          render: (i) => <FactLine key="tuition" label={t('detail.sections.tuition')} fact={detail.tuition} index={i} />,
        },
        {
          fact: detail.scholarships,
          render: (i) => (
            <FactLine key="scholarships" label={t('detail.sections.scholarships')} fact={detail.scholarships} index={i} />
          ),
        },
        {
          fact: detail.deadlines,
          render: (i) => <FactLine key="deadlines" label={t('detail.sections.deadlines')} fact={detail.deadlines} index={i} />,
        },
        {
          fact: detail.nextDeadline,
          render: (i) => (
            <FactLine key="nextDeadline" label={t('detail.sections.nextDeadline')} fact={detail.nextDeadline} index={i} />
          ),
        },
        {
          fact: detail.exams,
          render: (i) => <FactLine key="exams" label={t('detail.sections.exams')} fact={detail.exams} index={i} />,
        },
        {
          fact: detail.requirements,
          render: (i) => (
            <FactLine key="requirements" label={t('detail.sections.requirements')} fact={detail.requirements} index={i} />
          ),
        },
        {
          fact: detail.applyUrl,
          render: (i) => (
            <FactLine
              key="applyUrl"
              label={t('detail.sections.apply')}
              fact={detail.applyUrl}
              index={i}
              format={(url) =>
                isWebUrl(url) ? (
                  <a
                    href={url}
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl(url).catch((err: unknown) => console.error('Could not open the application link', err));
                    }}
                    className="break-all underline decoration-hairline underline-offset-2 hover:text-signal"
                  >
                    {url}
                  </a>
                ) : (
                  url
                )
              }
            />
          ),
        },
      ]
    : [];
  const orderedFacts = [
    ...factRows.filter((row) => factValue(row.fact) !== null),
    ...factRows.filter((row) => factValue(row.fact) === null),
  ];

  // One row of 36px pills under the title: the list action, then a quiet Refresh at the far end.
  const listAction = existing ? (
    <>
      <span className="inline-flex items-center gap-1.5 text-sm text-chart-grey">
        <Check className="size-4" aria-hidden="true" />
        {t('detail.inList')}
      </span>
      <Button variant="secondary" size="sm" onClick={() => navigate('/my-unis')}>
        {t('detail.openList')}
      </Button>
    </>
  ) : (
    <Button size="sm" onClick={addToList} disabled={!detail || !nameKnown || busy || adding}>
      {t('detail.addToList')}
    </Button>
  );

  const body = (
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-6'}>
      <Panel className={embedded ? 'p-4' : 'p-6 @min-[36rem]:p-8'}>
        <header className="flex flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <Flag code={countryCode} className={embedded ? 'mt-0.5' : 'mt-1 size-6'} />
              <h2
                className={`min-w-0 break-words text-foreground ${embedded ? 'type-title' : 'type-headline'}`}
              >
                {nameKnown ? name : t('detail.untitled')}
              </h2>
            </div>
            <p
              className={
                embedded
                  ? 'text-[0.9375rem] leading-[1.4] font-medium text-foreground'
                  : 'type-title text-foreground'
              }
            >
              {detail?.program ?? program}
            </p>
            {(place || checked) && (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-[1.55] text-chart-grey">
                {place && <span>{place}</span>}
                {place && checked && <span aria-hidden="true">·</span>}
                {checked && (
                  <span>
                    {t('detail.lastChecked')}{' '}
                    <span className="font-mono tabular-nums">{checked}</span>
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {listAction}
              <Button variant="quiet" size="sm" className="-mr-4 ml-auto" disabled={busy} onClick={() => load(true)}>
                <RefreshCw aria-hidden="true" />
                {t('detail.refresh')}
              </Button>
            </div>
            {!existing && !nameKnown && trackedLoaded && (
              <p className="max-w-[48ch] text-xs leading-[1.5] text-chart-grey">{t('detail.addNeedsName')}</p>
            )}
          </div>
        </header>
      </Panel>

      {listError ? <ErrorNote message={messageOf(listError)} /> : null}
      {addError ? <ErrorNote title={t('detail.addError')} message={messageOf(addError)} /> : null}
      {busy && <ProgressLine message={t('detail.loading')} />}
      {loadNote}

      {detail && (
        <div className="flex flex-col border-t border-hairline">
          {orderedFacts.map((row) => row.render(mark(row.fact)))}
        </div>
      )}
```

Notes for the builder:
- `mark`, `place`, `checked`, `busy`, `loadNote` are defined above this block and stay as they are. `ReactNode` and `Fact` are already imported.
- `mark` must be called inside the `.map` (render order), not while building `factRows`.

### 4e — full-page wrapper
Old:
```tsx
    <div className="max-w-[1120px] px-12 py-8">
      <div className="flex flex-col gap-6">
        {back}
        {body}
```
New:
```tsx
    <div className="@container mx-auto w-full max-w-[800px] px-6 pt-2 pb-12">
      <div className="flex flex-col gap-3">
        {back}
        {body}
```

After Step 4, `grep -n "languageName\|primaryAction\|max-w-\[1120px\]\|variant=\"ember\"" src/ui/screens/UniDetail.tsx` must print nothing.

- [x] Step 4 done

## Step 5 — `DESIGN.md` (three exact edits)

5a. In `## Layout`, old:
```
Onboarding is a single 640px sheet. Settings is a single centred 640px column of grouped lists.
```
new:
```
Onboarding is a single 640px sheet. Settings is a single centred 640px column of grouped lists. The university detail page is a single centred 800px column: Back aligned to its left edge, the header card, then the fact list.
```

5b. Old:
```
Unchanged in behaviour. A 14px label in Chart Grey, the value in body text, and a Data-style source superscript. The popover is a rimmed 20px surface. The missing fact reads "Not found, check official site" in Chart Grey, with a dashed underline, and keeps its row height.
```
new:
```
Unchanged in behaviour. A 14px label in Chart Grey, the value in body text at weight 500, and a Data-style source superscript joined to the last word by a no-break space, so it never wraps onto a line of its own. The popover is a rimmed 20px surface. The missing fact reads "Not found, check official site" in Chart Grey, with a dashed underline, and keeps its row height. Found facts come first and missing facts after, each group in its original order; the source numbers count down the page. The label sits in an 11rem column beside the value with 12px row padding, and stacks above the value when its container is narrower than 36rem. Language values are names in the UI language (never codes or raw lowercase).
```

5c. Insert a new section directly before the line `### Fact line (signature)`. Old:
```
### Fact line (signature)
```
new:
```
### University detail
- **Header:** a plain `Panel` (no `.panel-ember`; the page's one ember element is the Add to my list button). Flag disc and university name in Headline, the program in Title, then one muted meta line: place · Last checked date (tabular). Everything is left-aligned.
- **Actions:** one row of 36px pills under the meta line. Not in the list: Add to my list (primary). In the list: a check with "In your list" in Chart Grey and Open my list (secondary). Refresh is quiet, at the far right of the row; the row wraps on narrow widths.
- **Embedded in the Atlas dock:** the same layout, name in Title and program at body size.

### Fact line (signature)
```

- [x] Step 5 done

## Verify
```bash
cd /home/alejogalim/Documents/Projects/UniWorld
bun run build
bun run check:i18n
bun test
grep -n "languageName\|primaryAction\|max-w-\[1120px\]\|variant=\"ember\"" src/ui/screens/UniDetail.tsx   # must print nothing
git status --short   # only the files listed in Builder rules (plus the pre-existing untracked .impeccable/, design/, graphify-out/)
```
Do NOT run `bun tauri dev`; the orchestrator checks visually: centred column under the "Atlas" title, Back arrow on the card's left edge, header actions on one row, superscripts at the end of the last text line, "English" capitalised, missing rows at the bottom, label stacking in the narrow Atlas dock.

- [x] Verify done

## Builder notes
(builder: paste short results here)
- Steps 1-5 applied exactly as written; every old block matched exactly once. No deviations.
- `bun run build`: exit 0 (tsc + vite; only the existing chunk-size warning).
- `bun run check:i18n`: passed (en, es, vi match).
- `bun test`: 269 pass, 0 fail (28 files, includes the new languages.test.ts).
- Grep for `languageName|primaryAction|max-w-[1120px]|variant="ember"` in UniDetail.tsx: empty.
- `git status`: only DESIGN.md, FactLine.tsx, languages.ts, UniDetail.tsx modified; languages.test.ts new; plan file checked. Untracked .impeccable/, design/, graphify-out/ pre-existing. Nothing committed; app not started.
- Visual check (centred column, header row, superscripts, label stacking in the dock) still for the orchestrator.

# 31 — Settings redesign: one calm column of grouped lists

Read first: `.plans/A-build-conventions.md`. Then only the files listed under "Files".

## Rules (read before anything else)
- Haiku builds. No commits, no pushes, no branch switches. No `pkill`/`killall`. Do not start the app (`tauri dev`, `vite`, `bun run dev`): skip those lines of the A-build-conventions verify block.
- Touch ONLY the files listed under "Files". **Owner override:** this plan may edit `DESIGN.md` (only the parts named in step 10), even though A-build-conventions forbids it.
- **Keep behaviour.** Every save, test, remove, model load, retry, confirm, error, navigation and the onboarding-draft reset stays exactly as it is today. You move markup; you do not change logic. Where this plan shows "unchanged", copy the existing code verbatim.
- Copy class strings and i18n strings **exactly** as written here.
- No hex/oklch colours in components. Tokens only (`text-chart-grey`, `bg-shoal`, `divide-hairline`, `bg-signal`, `bg-hairline`, …).
- No uppercase, no `tracking-*`, no eyebrow kickers (DESIGN.md No-Eyebrow Rule, Caps Rule).
- If a step fails twice, stop and write it under "Builder notes".

## Goal
Settings becomes one centred 640px column, like macOS System Settings / Linear: each section is a small grey heading over one rounded group whose rows are split by hairlines. Row = label left, control or value right, 48px tall. No section description lines. Ember appears only on focus rings and the "key saved/connected" dot (plus the destructive Delete text, see "Decisions"). Edit profile is the page's only primary (ember-filled) button.

Final order on the page:
1. **Profile** — one identity row.
2. **Appearance** — Language (select), Theme (segmented System / Light / Dark).
3. **AI** — Provider (segmented OpenRouter / OpenCode Go), Model (combobox).
4. **API keys** — OpenRouter row, OpenCode Go row; each with status dot + text and a "Manage" disclosure. Group footer: keychain line.
5. **Data** — "Delete all data" row with a destructive text button and the inline confirm.
6. **About** — Version row, Sources row (three small links). Group footer: one short line.

## Files
Create:
- `src/ui/components/SegmentedControl.tsx`
- `src/ui/components/SegmentedControl.test.ts`
- `src/ui/screens/settings/SettingsGroup.tsx`
- `src/ui/screens/settings/AppearanceSection.tsx`

Delete:
- `src/ui/screens/settings/SettingsSection.tsx` (replaced by `SettingsGroup.tsx`)
- `src/ui/screens/settings/InterfaceSection.tsx` (replaced by `AppearanceSection.tsx`)

Edit:
- `src/ui/components/index.ts` — export `SegmentedControl`.
- `src/ui/screens/Settings.tsx`
- `src/ui/screens/settings/ProfileSection.tsx`
- `src/ui/screens/settings/AiSection.tsx`
- `src/ui/screens/settings/DataSection.tsx`
- `src/ui/screens/settings/AboutSection.tsx`
- `src/i18n/locales/en/settings.json`, `src/i18n/locales/es/settings.json`, `src/i18n/locales/vi/settings.json` (full replacement, step 9)
- `DESIGN.md` (step 10 only)
- this plan (checkboxes + Builder notes)

Do NOT touch: `deleteAllData.ts`, `Combobox.tsx`, `Input.tsx`, `button.tsx`, `Panel.tsx`, `src/app/theme.ts`, `src/app/language.ts`, `src/ui/layout/**`, `src/index.css`, any other locale namespace.

## Steps

### [x] 1. `src/ui/components/SegmentedControl.tsx` (new)
An accessible radiogroup, pill track, roving focus. Selection follows focus (arrow keys select, like native radios). Disabled options use `aria-disabled` (not `disabled`), are skipped by arrow keys and Home/End, ignore clicks, and carry an optional `title` tooltip plus an sr-only hint.

Write exactly:

```tsx
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Why the option is disabled: shown as a tooltip and read by screen readers. */
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Index of the next enabled option from `from`, stepping by `step` (+1 / -1) and wrapping.
 * Returns `from` when no other option is enabled.
 */
export function nextEnabledIndex(disabled: boolean[], from: number, step: 1 | -1): number {
  const n = disabled.length;
  for (let i = 1; i <= n; i++) {
    const index = (((from + step * i) % n) + n) % n;
    if (!disabled[index]) return index;
  }
  return from;
}

/** The tab stop: the checked option when it is enabled, else the first enabled one, else 0. */
export function tabStopIndex(disabled: boolean[], checked: number): number {
  if (checked >= 0 && !disabled[checked]) return checked;
  const first = disabled.findIndex((d) => !d);
  return first === -1 ? 0 : first;
}

/** A small radiogroup: pill track on shoal, the chosen segment raised on the panel fill with a rim. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-labelledby": labelledBy,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const disabled = options.map((o) => Boolean(o.disabled));
  const checkedIndex = options.findIndex((o) => o.value === value);
  const tabStop = tabStopIndex(disabled, checkedIndex);

  const select = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    refs.current[index]?.focus();
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") target = nextEnabledIndex(disabled, index, 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = nextEnabledIndex(disabled, index, -1);
    else if (event.key === "Home") target = nextEnabledIndex(disabled, -1 + options.length, 1);
    else if (event.key === "End") target = nextEnabledIndex(disabled, 0, -1);
    if (target === null) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-pill border border-hairline bg-shoal p-0.5", className)}
    >
      {options.map((option, index) => {
        const checked = index === checkedIndex;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            title={option.disabled ? option.hint : undefined}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-pill border border-transparent px-3 text-[0.8125rem] font-medium leading-tight transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
              checked
                ? "rim bg-panel text-foreground shadow-(--surface-shadow) [--rim-fill:linear-gradient(var(--panel),var(--panel))]"
                : "text-chart-grey hover:text-foreground",
              option.disabled && "cursor-not-allowed opacity-50 hover:text-chart-grey",
            )}
          >
            {option.label}
            {option.disabled && option.hint && <span className="sr-only">{`. ${option.hint}`}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

Notes: Home uses `nextEnabledIndex(disabled, n - 1, 1)` (wraps to the first enabled from index 0); End uses `nextEnabledIndex(disabled, 0, -1)` (wraps to the last enabled). Keep it as written.

### [x] 2. `src/ui/components/SegmentedControl.test.ts` (new) and export
```ts
import { describe, expect, it } from 'bun:test';
import { nextEnabledIndex, tabStopIndex } from './SegmentedControl';

describe('nextEnabledIndex', () => {
  it('steps forward and wraps', () => {
    expect(nextEnabledIndex([false, false, false], 2, 1)).toBe(0);
    expect(nextEnabledIndex([false, false, false], 0, -1)).toBe(2);
  });
  it('skips disabled options', () => {
    expect(nextEnabledIndex([false, true, false], 0, 1)).toBe(2);
    expect(nextEnabledIndex([false, true, false], 2, -1)).toBe(0);
  });
  it('stays put when nothing else is enabled', () => {
    expect(nextEnabledIndex([false, true], 0, 1)).toBe(0);
  });
  it('finds first and last enabled for Home and End', () => {
    expect(nextEnabledIndex([true, false, false], 2, 1)).toBe(1);
    expect(nextEnabledIndex([false, false, true], 0, -1)).toBe(1);
  });
});

describe('tabStopIndex', () => {
  it('uses the checked option when enabled', () => {
    expect(tabStopIndex([false, false], 1)).toBe(1);
  });
  it('falls back to the first enabled option', () => {
    expect(tabStopIndex([false, true], 1)).toBe(0);
    expect(tabStopIndex([true, false], -1)).toBe(1);
  });
});
```
In `src/ui/components/index.ts` add the line:
```ts
export { SegmentedControl, type SegmentedOption } from "./SegmentedControl";
```

### [x] 3. `src/ui/screens/settings/SettingsGroup.tsx` (new; then delete `SettingsSection.tsx`)
```tsx
import type { ReactNode } from "react";

interface SettingsGroupProps {
  /** Id of the heading; the section is labelled by it. */
  id: string;
  title: string;
  /** One short muted line under the group. Use sparingly. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A settings section: a small sentence-case heading over one rounded group whose rows are split by hairlines.
 * No overflow clipping: the model combobox's list must be able to open past the group's edge.
 */
export function SettingsGroup({ id, title, footer, children }: SettingsGroupProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-4 text-sm font-medium text-chart-grey">
        {title}
      </h2>
      <div className="rim surface rounded-control divide-y divide-hairline">{children}</div>
      {footer && <div className="px-4 text-[0.8125rem] leading-[1.45] text-chart-grey">{footer}</div>}
    </section>
  );
}

interface SettingsRowProps {
  label: ReactNode;
  /** Native control (select, input, combobox input): the label becomes `<label htmlFor>`. */
  htmlFor?: string;
  /** Id on the label, for `aria-labelledby` (segmented control). */
  labelId?: string;
  /** One short muted line under the label. */
  description?: ReactNode;
  descriptionId?: string;
  /** Before the label, e.g. the profile initial. */
  leading?: ReactNode;
  /** The control or value at the trailing edge. */
  children?: ReactNode;
  /** Full-width content under the row line: a disclosure panel, a confirm, a note. */
  below?: ReactNode;
}

/** One 48px row: label (and optional muted line) left, control right. Wraps on narrow windows. */
export function SettingsRow({ label, htmlFor, labelId, description, descriptionId, leading, children, below }: SettingsRowProps) {
  const labelClass = "text-sm break-words text-foreground";
  return (
    <div className="px-4">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading}
          <div className="flex min-w-0 flex-col gap-0.5">
            {htmlFor ? (
              <label htmlFor={htmlFor} id={labelId} className={labelClass}>
                {label}
              </label>
            ) : (
              <span id={labelId} className={labelClass}>
                {label}
              </span>
            )}
            {description && (
              <p id={descriptionId} className="text-[0.8125rem] leading-[1.45] break-words text-chart-grey">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>}
      </div>
      {below && <div className="flex flex-col gap-3 pb-4">{below}</div>}
    </div>
  );
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```
(`.surface` sets the 28px radius in the components layer; the `rounded-control` utility overrides it to 14px. Keep both classes so the group keeps the panel fill, rim and the light-mode soft shadow.)

Update every import of `./SettingsSection` to `./SettingsGroup`. Delete `SettingsSection.tsx`.

### [x] 4. `src/ui/screens/Settings.tsx`
```tsx
import { AboutSection } from './settings/AboutSection';
import { AiSection } from './settings/AiSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { DataSection } from './settings/DataSection';
import { ProfileSection } from './settings/ProfileSection';

/** Design §7.5 / plan 31: one centred 640px column of grouped lists. */
export function SettingsScreen() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-2 pb-12">
      <div className="flex flex-col gap-8">
        <ProfileSection />
        <AppearanceSection />
        <AiSection />
        <DataSection />
        <AboutSection />
      </div>
    </div>
  );
}
```

### [x] 5. `ProfileSection.tsx`
- Section: `<SettingsGroup id="settings-profile" title={t('sections.profile')}>` with exactly ONE `SettingsRow`.
- **Empty profile** (`!profile`): `<SettingsRow label={t('profile.empty')}>` with child `<Button size="sm" onClick={() => navigate('/onboarding')}>{t('profile.create')}</Button>` (primary variant, the default).
- **With profile:**
  - `leading`: `<span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-shoal text-sm font-semibold text-foreground">{initial}</span>` where `const initial = (Array.from(profile.name.trim())[0] ?? '').toLocaleUpperCase(uiLang);`
  - `label`: `<span className="font-medium">{profile.name}</span>`
  - `description`: the summary line built as:
    ```ts
    const levelText = (level: string) => (level === 'native' ? t('onboarding:levels.native') : level);
    const languages = [
      languageName(profile.primaryLang, uiLang),
      ...profile.languages.map((l) =>
        t('profile.languageLevel', { language: languageName(l.lang, uiLang), level: levelText(l.level) }),
      ),
    ];
    const place = profile.residence ?? profile.citizenship;
    const summary = [
      t(`onboarding:program.${profile.program}`),
      place ? countryName(place, uiLang) : null,
      new Intl.ListFormat(uiLang, { style: 'short', type: 'unit' }).format(languages),
    ]
      .filter(Boolean)
      .join(' · ');
    ```
    (CEFR levels show as the bare code "B2", not the long onboarding label; "native" uses its translated word.)
  - child: the Edit button, **primary**, `size="sm"`, with the existing onClick verbatim (reset draft, then `navigate('/onboarding', { state: { from: 'settings' } })`), text `t('profile.edit')`.
- Remove the `<dl>` and all per-field rows.

### [x] 6. `AppearanceSection.tsx` (new; then delete `InterfaceSection.tsx`)
Same state and handlers as `InterfaceSection.tsx` (copy `error`, `changeUiLanguage(...).catch(...)`, `setMode(...).catch(...)` verbatim). Markup:
```tsx
const langId = useId();
const themeLabelId = useId();
return (
  <div className="flex flex-col gap-3">
    <SettingsGroup id="settings-appearance" title={t('sections.appearance')}>
      <SettingsRow label={t('appearance.language')} htmlFor={langId}>
        <div className="w-full sm:w-52">
          <Select id={langId} className="h-9" value={uiLang} onChange={/* existing language handler */}>
            {/* existing LANGS options, common:language.<lng> */}
          </Select>
        </div>
      </SettingsRow>
      <SettingsRow label={t('appearance.theme')} labelId={themeLabelId}>
        <SegmentedControl
          aria-labelledby={themeLabelId}
          value={mode}
          options={MODES.map((m) => ({ value: m, label: t(`common:theme.${m}`) }))}
          onChange={(next) => {
            setError(null);
            setMode(next).catch((err: unknown) => setError(t('common:errors.saveFailed', { error: messageOf(err) })));
          }}
        />
      </SettingsRow>
    </SettingsGroup>
    {error && <ErrorNote message={error} />}
  </div>
);
```
Export name: `AppearanceSection`. No `Field` here.

### [x] 7. `AiSection.tsx` — restructure markup only
All state, effects, `refreshPresence`, `chooseProvider`, `removeOpencode`, `modelBlocked`, model loading effect, `options`, `chooseModel` stay **verbatim**. Remove imports of `Badge`, `Field` (still needed inside KeyRow, keep it), `Select`; add `SegmentedControl`, `ChevronDown` from `lucide-react`, `useId`.

**7a. `KeyBlock` → `KeyRow`.** Props become:
```ts
interface KeyRowProps {
  provider: Provider;
  present: boolean | null;
  title: string;
  /** Muted line under the name; only passed when it matters (missing OpenRouter key). */
  description?: string;
  removeConfirm: string;
  onChanged: () => Promise<void>;
  onRemoved: () => Promise<void>;
}
```
(`primary`, `badge`, `hint` are gone.) Keep `value`, `busy`, `note`, `confirming`, `idle`, `save`, `test`, `remove` verbatim. Add `const [open, setOpen] = useState(false); const panelId = useId();`.

Status (honest, from existing state only):
```ts
const status: 'connected' | 'saved' | 'missing' | null =
  present === null ? null : present === false ? 'missing' : note?.tone === 'ok' ? 'connected' : 'saved';
```
Render:
```tsx
<SettingsRow
  label={title}
  description={description}
  below={open ? (
    <div id={panelId} className="flex flex-col gap-3">
      <Field label={t('ai.keyInput')}>
        {(c) => (
          <Input {...c} type="password" autoComplete="off" spellCheck={false} value={value}
            placeholder={t('ai.keyPlaceholder')} onChange={(e) => setValue(e.target.value)} className="font-mono" />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!idle || value.trim() === ''} onClick={() => void save()}>
          {busy === 'save' ? t('ai.keySaving') : t('ai.saveKey')}
        </Button>
        <Button variant="quiet" size="sm" disabled={!idle || present !== true} onClick={() => void test()}>
          {busy === 'test' ? t('ai.testing') : t('ai.testConnection')}
        </Button>
        {present === true && !confirming && (
          <Button variant="quiet" size="sm" disabled={!idle} onClick={() => setConfirming(true)}>
            {t('ai.removeKey')}
          </Button>
        )}
      </div>
      {/* confirming block: unchanged markup, but both buttons size="sm" */}
      {/* the three note lines (saved / ok / fail): unchanged */}
    </div>
  ) : undefined}
>
  {status && (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-chart-grey">
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', status === 'missing' ? 'bg-hairline' : 'bg-signal')} />
      {t(`ai.status.${status}`)}
    </span>
  )}
  <Button
    variant="quiet"
    size="sm"
    aria-expanded={open}
    aria-controls={open ? panelId : undefined}
    aria-label={t('ai.manageLabel', { provider: title })}
    onClick={() => setOpen((v) => !v)}
  >
    {t('ai.manage')}
    <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform duration-[180ms] motion-reduce:transition-none', open && 'rotate-180')} />
  </Button>
</SettingsRow>
```
Import `cn` from `@/lib/utils`. The panel keeps its state when collapsed (the component stays mounted). Focus stays on the Manage button when toggling.

**7b. `AiSection` return** (replaces the whole old JSX):
```tsx
const providerLabelId = useId();
const modelId = useId();
return (
  <div className="flex flex-col gap-8">
    <SettingsGroup id="settings-ai" title={t('sections.ai')}>
      <SettingsRow label={t('ai.provider.label')} labelId={providerLabelId}>
        <SegmentedControl
          aria-labelledby={providerLabelId}
          value={provider}
          onChange={(next) => void chooseProvider(next)}
          options={[
            { value: 'openrouter', label: t('ai.provider.openrouter') },
            {
              value: 'opencode',
              label: t('ai.provider.opencode'),
              disabled: present.opencode !== true,
              hint: t('ai.provider.needsKey'),
            },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label={t('ai.model.label')}
        htmlFor={modelId}
        below={modelsError || modelSaved || modelSaveError ? (
          <>
            {/* modelsError ErrorNote with Retry: unchanged */}
            {/* modelSaved line: unchanged */}
            {/* modelSaveError ErrorNote: unchanged */}
          </>
        ) : undefined}
      >
        <div className="w-full sm:w-72">
          <Combobox
            id={modelId}
            options={options}
            value={model}
            onChange={(next) => void chooseModel(next)}
            placeholder={modelsBusy ? t('ai.model.loading') : t('ai.model.empty')}
            noMatchesLabel={t('ai.model.noMatches')}
            disabled={modelDisabled}
          />
        </div>
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup id="settings-keys" title={t('sections.keys')} footer={t('ai.keys.footer')}>
      <KeyRow
        provider="openrouter"
        present={present.openrouter}
        title={t('ai.openrouter.title')}
        description={present.openrouter === false ? t('ai.openrouter.finderNeedsKey') : undefined}
        removeConfirm={t('ai.removeOpenrouterConfirm')}
        onChanged={refreshPresence}
        onRemoved={refreshPresence}
      />
      <KeyRow
        provider="opencode"
        present={present.opencode}
        title={t('ai.opencode.title')}
        removeConfirm={t('ai.removeOpencodeConfirm')}
        onChanged={refreshPresence}
        onRemoved={removeOpencode}
      />
    </SettingsGroup>

    {loadError && <ErrorNote message={t('ai.loadFailed', { error: loadError })} />}
  </div>
);
```
The old `ai.model.hint` line and the provider hint are dropped (the "Default (model)" option already names the default).

### [x] 8. `DataSection.tsx` and `AboutSection.tsx`
**Data** — state and `erase` verbatim. Markup:
```tsx
<div className="flex flex-col gap-3">
  <SettingsGroup id="settings-data" title={t('sections.data')}>
    <SettingsRow
      label={t('data.clear')}
      below={confirming ? (
        <div className="flex flex-col gap-3 border-l-2 border-hairline pl-4">
          <p className="text-sm text-foreground">{t('data.clearConfirm')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="text-signal" disabled={busy} onClick={() => void erase()}>
              {busy ? t('data.deleting') : t('data.deleteEverything')}
            </Button>
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
              {t('data.cancel')}
            </Button>
          </div>
        </div>
      ) : undefined}
    >
      {!confirming && (
        <Button
          variant="quiet"
          size="sm"
          aria-label={t('data.clear')}
          className="text-signal hover:text-signal-deep"
          onClick={() => setConfirming(true)}
        >
          {t('data.delete')}
        </Button>
      )}
    </SettingsRow>
  </SettingsGroup>
  {error && <ErrorNote message={error} />}
</div>
```
(The confirm's "Delete everything" moves from the primary ember fill to a secondary pill with signal text, so Edit profile stays the only primary button.)

**About** — `version`, `error`, `open`, `SOURCES` stay. Remove `siteOf`. Change `SOURCES` to:
```ts
const SOURCES = [
  { url: 'https://ror.org', name: 'about.rorName', text: 'about.ror' },
  { url: 'https://github.com/Hipo/university-domains-list', name: 'about.domainsName', text: 'about.domains' },
  { url: 'https://www.naturalearthdata.com', name: 'about.naturalEarthName', text: 'about.naturalEarth' },
] as const;
```
Markup:
```tsx
<SettingsGroup id="settings-about" title={t('sections.about')} footer={t('about.paragraph')}>
  <SettingsRow label={t('about.version')}>
    <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-chart-grey">{version ?? '—'}</span>
  </SettingsRow>
  <SettingsRow label={t('about.sources')} below={error ? <ErrorNote message={error} /> : undefined}>
    {SOURCES.map((source) => (
      <Button key={source.url} variant="quiet" size="sm" className="px-2" title={t(source.text)} onClick={() => open(source.url)}>
        {t(source.name)}
        <ExternalLink aria-hidden="true" className="size-3" />
      </Button>
    ))}
  </SettingsRow>
</SettingsGroup>
```
`ExternalLink` from `lucide-react`. The licence strings stay as the `title` tooltip.

### [x] 9. i18n — replace the three `settings.json` files completely
Removed keys (do not keep): `sections.profileLine`, `sections.interface`, `sections.interfaceLine`, `sections.aiLine`, `sections.dataLine`, `sections.aboutLine`, `profile.name|primaryLanguage|otherLanguages|none|program|citizenship|residence`, the whole `interface` object, `ai.openrouter.badge|hint`, `ai.opencode.badge|hint`, `ai.saved`, `ai.missing`, `ai.model.hint`, the whole `ai.counselorProvider` object, `about.sourcesTitle`, `about.open`.
Renamed/new: `sections.appearance`, `sections.keys`, `appearance.*`, `ai.provider.*`, `ai.status.*`, `ai.manage`, `ai.manageLabel`, `ai.keys.footer`, `ai.openrouter.finderNeedsKey`, `data.delete`, `about.sources`, `about.rorName|domainsName|naturalEarthName`. Changed text: `sections.ai`, `sections.data`, `profile.empty`, `data.clear`, `about.paragraph`.

**en**
```json
{
  "sections": {
    "profile": "Profile",
    "appearance": "Appearance",
    "ai": "AI",
    "keys": "API keys",
    "data": "Data",
    "about": "About"
  },
  "profile": {
    "empty": "No profile yet",
    "create": "Create profile",
    "edit": "Edit profile",
    "languageLevel": "{{language}} ({{level}})"
  },
  "appearance": {
    "language": "Language",
    "theme": "Theme"
  },
  "ai": {
    "provider": {
      "label": "Provider",
      "openrouter": "OpenRouter",
      "opencode": "OpenCode Go",
      "needsKey": "Add an OpenCode Go key under API keys first."
    },
    "keys": {
      "footer": "Keys are stored in your system keychain, never in the database."
    },
    "openrouter": {
      "title": "OpenRouter",
      "finderNeedsKey": "Finder needs an OpenRouter key."
    },
    "opencode": {
      "title": "OpenCode Go"
    },
    "status": {
      "connected": "Connected",
      "saved": "Saved",
      "missing": "Not set"
    },
    "manage": "Manage",
    "manageLabel": "Manage {{provider}} key",
    "keyInput": "New key",
    "keyPlaceholder": "Paste a key to replace the saved one",
    "saveKey": "Save key",
    "keySaving": "Saving…",
    "testConnection": "Test connection",
    "testing": "Testing…",
    "connected": "Connection works",
    "testFailed": "Connection failed",
    "removeKey": "Remove key",
    "removeOpenrouterConfirm": "Remove the OpenRouter key from this computer? Finder will not search until you add a key again.",
    "removeOpencodeConfirm": "Remove the OpenCode Go key from this computer? The counselor will use OpenRouter instead.",
    "removeYes": "Yes, remove key",
    "cancel": "Cancel",
    "keySaved": "Key saved in your keychain.",
    "noDetail": "The provider did not say why. Check the key and try again.",
    "saveFailed": "The key could not be saved: {{error}}",
    "loadFailed": "The AI settings could not be read: {{error}}",
    "model": {
      "label": "Model",
      "defaultOption": "Default ({{model}})",
      "loading": "Loading models…",
      "empty": "No models available",
      "noMatches": "No matching models",
      "loadFailed": "The model list could not be loaded: {{error}}",
      "retry": "Try again",
      "saved": "Model saved automatically.",
      "saveFailed": "The model could not be saved: {{error}}"
    }
  },
  "data": {
    "clear": "Delete all data",
    "delete": "Delete…",
    "clearConfirm": "This deletes your profile, chats, careers, searches, cached details, your university list and both AI keys from this computer.",
    "deleteEverything": "Delete everything",
    "deleting": "Deleting…",
    "deleteFailed": "Some data could not be deleted. {{error}} Try again.",
    "cancel": "Cancel"
  },
  "about": {
    "paragraph": "Every fact shows its source. When one is missing, UniWorld says so.",
    "version": "Version",
    "sources": "Sources",
    "rorName": "ROR",
    "domainsName": "university-domains-list",
    "naturalEarthName": "Natural Earth",
    "ror": "ROR, the university registry. CC0.",
    "domains": "Hipo university-domains-list. MIT.",
    "naturalEarth": "Natural Earth, for the globe. Public domain."
  }
}
```

**es** (same keys)
```json
{
  "sections": {
    "profile": "Perfil",
    "appearance": "Apariencia",
    "ai": "IA",
    "keys": "Claves de API",
    "data": "Datos",
    "about": "Acerca de"
  },
  "profile": {
    "empty": "Todavía no tienes perfil",
    "create": "Crear perfil",
    "edit": "Editar perfil",
    "languageLevel": "{{language}} ({{level}})"
  },
  "appearance": {
    "language": "Idioma",
    "theme": "Tema"
  },
  "ai": {
    "provider": {
      "label": "Proveedor",
      "openrouter": "OpenRouter",
      "opencode": "OpenCode Go",
      "needsKey": "Primero añade una clave de OpenCode Go en Claves de API."
    },
    "keys": {
      "footer": "Las claves se guardan en el llavero de tu sistema, nunca en la base de datos."
    },
    "openrouter": {
      "title": "OpenRouter",
      "finderNeedsKey": "El Buscador necesita una clave de OpenRouter."
    },
    "opencode": {
      "title": "OpenCode Go"
    },
    "status": {
      "connected": "Conectada",
      "saved": "Guardada",
      "missing": "No configurada"
    },
    "manage": "Gestionar",
    "manageLabel": "Gestionar la clave de {{provider}}",
    "keyInput": "Clave nueva",
    "keyPlaceholder": "Pega una clave para reemplazar la guardada",
    "saveKey": "Guardar clave",
    "keySaving": "Guardando…",
    "testConnection": "Probar conexión",
    "testing": "Probando…",
    "connected": "La conexión funciona",
    "testFailed": "La conexión falló",
    "removeKey": "Quitar clave",
    "removeOpenrouterConfirm": "¿Quitar la clave de OpenRouter de esta computadora? El Buscador no buscará hasta que añadas otra clave.",
    "removeOpencodeConfirm": "¿Quitar la clave de OpenCode Go de esta computadora? El orientador usará OpenRouter.",
    "removeYes": "Sí, quitar clave",
    "cancel": "Cancelar",
    "keySaved": "Clave guardada en tu llavero.",
    "noDetail": "El proveedor no dijo por qué. Revisa la clave e inténtalo de nuevo.",
    "saveFailed": "No se pudo guardar la clave: {{error}}",
    "loadFailed": "No se pudo leer la configuración de IA: {{error}}",
    "model": {
      "label": "Modelo",
      "defaultOption": "Predeterminado ({{model}})",
      "loading": "Cargando modelos…",
      "empty": "No hay modelos disponibles",
      "noMatches": "No hay modelos coincidentes",
      "loadFailed": "No se pudo cargar la lista de modelos: {{error}}",
      "retry": "Reintentar",
      "saved": "Modelo guardado automáticamente.",
      "saveFailed": "No se pudo guardar el modelo: {{error}}"
    }
  },
  "data": {
    "clear": "Borrar todos los datos",
    "delete": "Borrar…",
    "clearConfirm": "Esto elimina de esta computadora tu perfil, tus chats, carreras, búsquedas, detalles guardados, tu lista de universidades y las dos claves de IA.",
    "deleteEverything": "Borrar todo",
    "deleting": "Borrando…",
    "deleteFailed": "No se pudieron borrar algunos datos. {{error}} Inténtalo de nuevo.",
    "cancel": "Cancelar"
  },
  "about": {
    "paragraph": "Cada dato muestra su fuente. Si falta alguno, UniWorld lo dice.",
    "version": "Versión",
    "sources": "Fuentes",
    "rorName": "ROR",
    "domainsName": "university-domains-list",
    "naturalEarthName": "Natural Earth",
    "ror": "ROR, el registro de universidades. CC0.",
    "domains": "Hipo university-domains-list. MIT.",
    "naturalEarth": "Natural Earth, para el globo. Dominio público."
  }
}
```

**vi** (same keys)
```json
{
  "sections": {
    "profile": "Hồ sơ",
    "appearance": "Giao diện",
    "ai": "AI",
    "keys": "Khóa API",
    "data": "Dữ liệu",
    "about": "Giới thiệu"
  },
  "profile": {
    "empty": "Bạn chưa có hồ sơ",
    "create": "Tạo hồ sơ",
    "edit": "Sửa hồ sơ",
    "languageLevel": "{{language}} ({{level}})"
  },
  "appearance": {
    "language": "Ngôn ngữ",
    "theme": "Chủ đề"
  },
  "ai": {
    "provider": {
      "label": "Nhà cung cấp",
      "openrouter": "OpenRouter",
      "opencode": "OpenCode Go",
      "needsKey": "Hãy thêm khóa OpenCode Go trong mục Khóa API trước."
    },
    "keys": {
      "footer": "Khóa được lưu trong chuỗi khóa của hệ điều hành, không bao giờ lưu trong cơ sở dữ liệu."
    },
    "openrouter": {
      "title": "OpenRouter",
      "finderNeedsKey": "Tìm trường cần khóa OpenRouter."
    },
    "opencode": {
      "title": "OpenCode Go"
    },
    "status": {
      "connected": "Đã kết nối",
      "saved": "Đã lưu",
      "missing": "Chưa thiết lập"
    },
    "manage": "Quản lý",
    "manageLabel": "Quản lý khóa {{provider}}",
    "keyInput": "Khóa mới",
    "keyPlaceholder": "Dán khóa để thay khóa đã lưu",
    "saveKey": "Lưu khóa",
    "keySaving": "Đang lưu…",
    "testConnection": "Kiểm tra kết nối",
    "testing": "Đang kiểm tra…",
    "connected": "Kết nối hoạt động",
    "testFailed": "Kết nối thất bại",
    "removeKey": "Xóa khóa",
    "removeOpenrouterConfirm": "Xóa khóa OpenRouter khỏi máy tính này? Tìm trường sẽ không tìm kiếm cho đến khi bạn thêm lại khóa.",
    "removeOpencodeConfirm": "Xóa khóa OpenCode Go khỏi máy tính này? Tư vấn sẽ dùng OpenRouter.",
    "removeYes": "Có, xóa khóa",
    "cancel": "Hủy",
    "keySaved": "Đã lưu khóa vào chuỗi khóa của máy.",
    "noDetail": "Nhà cung cấp không nói rõ lý do. Hãy kiểm tra khóa và thử lại.",
    "saveFailed": "Không lưu được khóa: {{error}}",
    "loadFailed": "Không đọc được cài đặt AI: {{error}}",
    "model": {
      "label": "Mô hình",
      "defaultOption": "Mặc định ({{model}})",
      "loading": "Đang tải danh sách mô hình…",
      "empty": "Không có mô hình khả dụng",
      "noMatches": "Không có mô hình phù hợp",
      "loadFailed": "Không tải được danh sách mô hình: {{error}}",
      "retry": "Thử lại",
      "saved": "Đã tự động lưu mô hình.",
      "saveFailed": "Không lưu được mô hình: {{error}}"
    }
  },
  "data": {
    "clear": "Xóa toàn bộ dữ liệu",
    "delete": "Xóa…",
    "clearConfirm": "Thao tác này xóa khỏi máy tính này: hồ sơ, các cuộc trò chuyện, nghề nghiệp, tìm kiếm, chi tiết đã lưu, danh sách trường và cả hai khóa AI.",
    "deleteEverything": "Xóa tất cả",
    "deleting": "Đang xóa…",
    "deleteFailed": "Một số dữ liệu chưa xóa được. {{error}} Hãy thử lại.",
    "cancel": "Hủy"
  },
  "about": {
    "paragraph": "Mỗi thông tin đều ghi nguồn. Khi thiếu, UniWorld sẽ nói rõ.",
    "version": "Phiên bản",
    "sources": "Nguồn",
    "rorName": "ROR",
    "domainsName": "university-domains-list",
    "naturalEarthName": "Natural Earth",
    "ror": "ROR, cơ sở dữ liệu trường đại học. CC0.",
    "domains": "Hipo university-domains-list. MIT.",
    "naturalEarth": "Natural Earth, cho quả địa cầu. Thuộc phạm vi công cộng."
  }
}
```
After writing: `grep -rn "sections\.\(profileLine\|interface\|aiLine\|dataLine\|aboutLine\)\|counselorProvider\|interface\.\(language\|theme\)\|sourcesTitle\|about\.open\|model\.hint\|ai\.saved\|ai\.missing" src/ui` must print nothing.

### [x] 10. `DESIGN.md` (owner override; only these edits)
1. **Layout**, paragraph starting "The working column sits to the right": after "Onboarding is a single 640px sheet." add: `Settings is a single centred 640px column of grouped lists.`
2. **Shapes → Shape lock** table, row `--radius-control`: append `, settings groups` to the "used for" cell. In the sentence "Circles are allowed for the globe, flag discs and dots." change to: `Circles are allowed for the globe, flag discs, dots and the profile initial in Settings.`
3. **Components**: add a new subsection right after "### My universities (Uni Manager)" (before "### Fact line (signature)"):

```md
### Settings
- **One centred 640px column** under the page title. Sections are 32px apart.
- **Grouped lists.** Each section is a small heading (14px, weight 500, Chart Grey, sentence case, aligned with the row text) over one group: panel fill with `rim` and the soft light-mode shadow (`rim surface`), 14px corners (`--radius-control`), rows split by 1px hairlines (`divide-hairline`). No section description lines. A group may carry one short muted footer line (13px, Chart Grey).
- **Rows** are 48px minimum (52px with a 40px combobox): label in ink at 14px on the left, the control or value on the right; an optional one-line muted hint under the label, only where a control needs it. Rows wrap on narrow windows.
- **Profile** is one identity row: the initial in a 36px shoal circle, the name at weight 500, a muted line "program · residence (or citizenship) · languages", and Edit profile, the page's only primary button.
- **Segmented control** (`SegmentedControl`): a pill track on shoal with a hairline stroke; the chosen segment is a raised pill on the panel fill with a rim. A radiogroup: arrow keys move and select, Home/End jump, disabled options are skipped and explain themselves in a tooltip. Used for Theme and AI provider.
- **API keys:** one row per provider with a status dot and text: ember dot for "Connected" (a test passed this session) or "Saved", hairline dot for "Not set". "Manage" is a quiet disclosure button (`aria-expanded`) that reveals the key field, Save, Test connection and Remove inline under the row.
- **Buttons:** quiet everywhere, except Edit profile (primary), Save key and the delete confirm (secondary). The destructive Delete text and the delete confirm use signal text, not a fill.
```

### [x] 11. Verify
```bash
bun run build
bun run check:i18n
bun test
```
All three must pass. Do not start the app. Paste the last lines of each into Builder notes.

## Acceptance (reviewer checks by reading the diff)
- [ ] Page is `mx-auto max-w-[640px]`; six headings in order Profile, Appearance, AI, API keys, Data, About; no description lines.
- [ ] No uppercase/tracking classes added; no hex/oklch in components; radii only `rounded-control`, `rounded-pill`, `rounded-full` (dots, initial).
- [ ] Only one `<Button>` without a `variant` (or `variant="primary"`) is rendered at a time: Edit profile or Create profile.
- [ ] AiSection: save/test/remove/confirm/model/retry/loadError logic identical to before (diff shows only moved JSX); OpenCode segment disabled exactly when `present.opencode !== true`; removing the OpenCode key while it is the provider still switches to OpenRouter.
- [ ] "Finder needs an OpenRouter key." appears only when `present.openrouter === false`.
- [ ] Manage buttons have `aria-expanded` and `aria-controls` (when open); segmented controls are `role="radiogroup"` labelled by their row label, radios have `aria-checked` and a single tab stop.
- [ ] Profile Edit still calls `useOnboardingDraft.getState().reset()` then `navigate('/onboarding', { state: { from: 'settings' } })`.
- [ ] Data delete still uses the inline confirm and `deleteAllLocalData()` then `navigate('/onboarding', { replace: true })`.
- [ ] `bun run build`, `bun run check:i18n`, `bun test` pass.

## Builder notes
Built by Haiku. Steps 1-10 written as specified; no deviations from the code in the plan.

Verify (step 11), app not started, `tauri dev` and `cargo check` not run (the plan's verify list omits cargo check):
- `bun run build`: `tsc && vite build` exits 0 (`✓ built in 1.55s`; only the existing chunk-size warning).
- `bun run check:i18n`: `i18n key check passed (6 namespaces, es, vi match en)`.
- `bun test`: `242 pass, 0 fail, 557 expect() calls, Ran 242 tests across 25 files`. The new `SegmentedControl.test.ts` alone: 6 pass.

Grep check (step 9): prints two lines, both false positives for the pattern, not settings keys. `src/ui/screens/counselor/useCounselor.ts:131` is a comment mentioning `counselorProvider()`. `src/ui/screens/onboarding/AiKeyStep.tsx:79` uses `ai.savedInKeychain`, an onboarding key that the `ai\.saved` pattern matches by prefix. Left untouched (outside the file list).

Files: created SegmentedControl.tsx, SegmentedControl.test.ts, SettingsGroup.tsx, AppearanceSection.tsx; deleted SettingsSection.tsx, InterfaceSection.tsx; edited components/index.ts, Settings.tsx, ProfileSection.tsx, AiSection.tsx, DataSection.tsx, AboutSection.tsx, the three settings.json locales, DESIGN.md (step 10 edits only), and this plan. No commits.

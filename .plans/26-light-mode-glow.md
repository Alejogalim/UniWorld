# 26 — Light mode: soft paper, an ember glow, ember sparks

Goal: light mode gets the same atmosphere as dark mode, adapted to a light ground, the way Gemini's light mode mirrors
its dark mode. Dark mode must look **exactly** as it does now.

Light mode after this plan:
- **Ground:** a soft, barely warm off-white `#f7f6f4` (was `#efefef`), not harsh white and not cream.
- **Glow:** one large, static, soft peach/ember radial glow behind the centre of the working column (Gemini's blue
  glow, in ember). Peak colour about `#f7e0ca`, fading to nothing. No animation.
- **Stars:** yes, stars show in light mode, drawn by the same `Starfield.tsx` canvas: about 60% as many as dark,
  faint warm-taupe specks with 15% ember sparks, ember twinkles instead of white ones, and an ember shooting star.
- **Surfaces:** white panels and the chat composer float on the paper with a soft warm shadow (Gemini's white pill),
  rim 5% to 8% black. The `.panel-ember` card gets a soft ember halo in light too.
- **Numerals:** `.numeral-ember` in light goes ink to signal over the lower half (dark goes ink to ember-2).
- **Globe:** light ocean `#fbfaf8`, atmosphere an ember-tinted rim instead of grey.
- Logo: unchanged. The light mark (near-black arc 18.3:1, deep ember `#7a1204` 10.1:1, bright ember tip `#e2450f`
  3.8:1, 45% ring 3.3:1 on `#f7f6f4`) reads on the new ground. Nothing to change.

Cost: zero new animated layers, zero new timers. The glow is a static background on the existing `.ambient-haze`
element (dark already paints one). The stars reuse the existing static canvas and the existing 10 twinkles and one
shooting-star timer; in light mode they simply run instead of being unmounted.

## Rules for the builder
- Builder is Haiku. Follow this file literally; no design judgement is needed. If something does not match the
  "old" text exactly, stop and write it under "Builder notes".
- **No commits**, no pushes, no branch switches.
- **No `pkill` / `killall`.** Do **not** start the app (`tauri dev`, `vite`). Only run the verify commands.
- Touch only these files:
  1. `src/index.css`
  2. `src/ui/layout/Starfield.tsx`
  3. `src/ui/components/Panel.tsx`
  4. `src/ui/screens/counselor/ChatPane.tsx`
  5. `src/ui/globe/Globe.tsx`
  6. `DESIGN.md`
  7. `.plans/A-build-conventions.md` (two lines, step 7)
  8. this plan (checkboxes and "Builder notes" only)
- Other modified files in the tree (`src/app/router.tsx`, `src/ui/screens/MyUnis.tsx`, `.impeccable/`,
  `graphify-out/`) belong to someone else. Do not touch, format or revert them.
- Keep every globe-read token (`--globe-ocean`, `--background`, `--land`, `--hairline`, `--foreground`, `--signal`,
  `--ember-1`, `--chart-grey`) as 6-digit hex.

---

## Step 1 — `src/index.css`: light tokens (`:root` block, lines ~76-138)

- [x] Replace these lines inside `:root { ... }` (old -> new):

| line (old) | new |
|---|---|
| `--background: #efefef;` | `--background: #f7f6f4;` |
| `--panel: #ffffff;` | unchanged |
| `--shoal: #f4f4f4;` | `--shoal: #f1efec;` |
| `--hairline: #c2c2c2;` | `--hairline: #c2beb8;` |
| `--foreground: #0a0a0a;` | unchanged |
| `--chart-grey: #636366;` | unchanged |
| `--signal: #c53805;` | `--signal: #b53204;` |
| `--signal-deep: #a82f03;` | `--signal-deep: #952903;` |
| `--evidence: #2f7a56;` | `--evidence: #2a7050;` |
| `--land: #d9d9d9;` | unchanged |
| `--globe-ocean: #efefef;` | `--globe-ocean: #fbfaf8;` |
| `--shadow-ink: rgb(0 0 0 / 0.35);` | `--shadow-ink: rgb(64 32 12 / 0.28);` |

- [x] Replace the comment line
  `/* No glow on light paper: transparent shadows, because `none` breaks Tailwind's box-shadow list. */`
  with
  `/* The focus glow stays off on paper: transparent shadow, because `none` breaks Tailwind's box-shadow list. */`
  (keep `--ember-glow: 0 0 #0000;` as is).

- [x] Replace this block:
```css
    /* Surfaces: a sheet laid on the ground. Light cards are flat white with a 6% ring. */
    --surface-fill: linear-gradient(var(--panel), var(--panel));
    --rim-top: rgb(0 0 0 / 0.06);
    --rim-bottom: rgb(0 0 0 / 0.06);
    --rim: linear-gradient(to bottom, var(--rim-top), var(--rim-bottom));
```
with:
```css
    /* Surfaces: white sheets floating on the paper (Gemini-like), a 5% to 8% rim and a soft warm shadow. */
    --surface-fill: linear-gradient(var(--panel), var(--panel));
    --rim-top: rgb(0 0 0 / 0.05);
    --rim-bottom: rgb(0 0 0 / 0.08);
    --rim: linear-gradient(to bottom, var(--rim-top), var(--rim-bottom));
    --surface-shadow: 0 1px 2px rgb(64 32 12 / 0.05), 0 6px 20px -8px rgb(64 32 12 / 0.12);

    /* Starfield on paper (plan 26): warm-taupe specks, 15% ember sparks, fewer and fainter than the night sky.
       Starfield.tsx reads --star-base, --star-warm, --star-alpha and --star-density once per theme. */
    --star-base: #b8a596;
    --star-warm: #ff7a3d;
    --star-alpha: 0.8;
    --star-density: 0.6;
    --star-twinkle-core: rgb(255 90 31 / 0.5);
    --star-twinkle-glow: rgb(247 178 103 / 0.32);
    --star-shoot: #ff5a1f;
```

## Step 2 — `src/index.css`: dark tokens (`.dark` block, lines ~141-168)

Dark values stay identical; we only add the new per-theme tokens.

- [x] Replace:
```css
    /* The starfield's barely warm tint (about 15% of stars). Pure white is --foreground in dark. */
    --star-warm: #fff4ea;
```
with:
```css
    /* Night sky: pure white stars, a barely warm tint on about 15% of them, white twinkles and streak. */
    --star-base: #ffffff;
    --star-warm: #fff4ea;
    --star-alpha: 1;
    --star-density: 1;
    --star-twinkle-core: rgb(255 255 255 / 0.6);
    --star-twinkle-glow: rgb(255 255 255 / 0.27);
    --star-shoot: #ffffff;
```
- [x] After the line `--rim: linear-gradient(to bottom, var(--rim-top), var(--rim-bottom));` inside `.dark`, add:
```css
    /* Dark cards carry no drop shadow; the rim and the gradient do the work. */
    --surface-shadow: 0 0 #0000;
```

## Step 3 — `src/index.css`: components

- [x] Replace the `.numeral-ember` comment + rule (keep the `.dark .numeral-ember` rule exactly as is):
```css
  /* Large display numerals: ink, then in dark mode the lower half warms to the ember peach. */
  .numeral-ember {
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
```
with:
```css
  /* Large display numerals: ink, then the lower half warms. Light: to signal (5.7:1 on paper, 4.8:1 on the glow).
     Dark: to the ember peach (rule below). */
  .numeral-ember {
    color: transparent;
    background-image: linear-gradient(to bottom, var(--foreground) 55%, var(--signal) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    font-variant-numeric: tabular-nums;
  }
```

- [x] Replace the `.surface` rule:
```css
  .surface {
    border-radius: var(--radius-card);
    --rim-fill: var(--surface-fill);
  }
```
with:
```css
  .surface {
    border-radius: var(--radius-card);
    --rim-fill: var(--surface-fill);
    box-shadow: var(--surface-shadow);
  }

  /* Lift: the same soft shadow for a floating white surface that is not a .surface (the chat composer pill). */
  .lift {
    box-shadow: var(--surface-shadow);
  }
```
(The comment above `.surface` stays; change its last sentence "Dark cards are a gradient; light cards are flat white."
to "Dark cards are a gradient; light cards are flat white with a soft warm shadow.")

- [x] Replace the ember panel comment + rule:
```css
  /* Ember panel: the one memorable element per screen. Its glow is outside the box only: no inner wash,
     no inner highlight, no pseudo-element. Dark: a static halo around the whole card. Light: no glow. */
  .dark .panel-ember {
```
with:
```css
  /* Ember panel: the one memorable element per screen. Its glow is outside the box only: no inner wash,
     no inner highlight, no pseudo-element. Both themes: a static halo around the whole card. */
  .panel-ember {
    box-shadow:
      0 0 0 1px color-mix(in oklch, var(--ember-1) 22%, transparent),
      0 0 40px -8px color-mix(in oklch, var(--ember-1) 30%, transparent),
      0 14px 48px -20px color-mix(in oklch, var(--ember-0) 35%, transparent);
  }
  .dark .panel-ember {
```
(the body of `.dark .panel-ember` stays exactly as is). `.panel-ember` must come **after** `.surface` in the file,
which it already does.

- [x] Replace the ambient haze comment + rules:
```css
  /* Ambient haze: dark only, one faint ember glow at the bottom centre of the window. */
  .ambient-haze {
    position: fixed;
    inset: 0;
    z-index: -1;
    display: none;
    pointer-events: none;
    contain: strict;
    opacity: 0.14;
    background: radial-gradient(60% 45% at 50% 100%, var(--ember-1), transparent 70%);
  }
  .dark .ambient-haze { display: block; }
```
with:
```css
  /* Ambient haze: one static ember glow behind the content, above the stars. Never animated (plan 20: a changing
     full-window layer costs ~20 ms a frame on software WebKitGTK; a static one is painted once).
     Light: a large soft peach glow centred on the working column (55% across: the rail sits on the left), peak about
     #f7e0ca, a wide faint ember wash under it. Dark: a faint ember glow at the bottom centre. */
  .ambient-haze {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    contain: strict;
    background:
      radial-gradient(
        38% 42% at 55% 48%,
        color-mix(in srgb, var(--ember-2) 24%, transparent) 0%,
        color-mix(in srgb, var(--ember-2) 10%, transparent) 50%,
        transparent 100%
      ),
      radial-gradient(
        70% 80% at 55% 52%,
        color-mix(in srgb, var(--ember-1) 5%, transparent) 0%,
        transparent 100%
      );
  }
  .dark .ambient-haze {
    opacity: 0.14;
    background: radial-gradient(60% 45% at 50% 100%, var(--ember-1), transparent 70%);
  }
```

## Step 4 — `src/index.css`: twinkles and shooting star

- [x] In `.star-twinkle`, replace:
```css
  background:
    radial-gradient(circle, rgb(255 255 255 / 0.6) 0, rgb(255 255 255 / 0.6) 1.3px, transparent 1.9px),
    radial-gradient(circle, rgb(255 255 255 / 0.27) 0, transparent 6px);
```
with:
```css
  background:
    radial-gradient(circle, var(--star-twinkle-core) 0, var(--star-twinkle-core) 1.3px, transparent 1.9px),
    radial-gradient(circle, var(--star-twinkle-glow) 0, transparent 6px);
```
- [x] In `.star-shoot`, replace `background: linear-gradient(to right, transparent, var(--foreground));` with
  `background: linear-gradient(to right, transparent, var(--star-shoot));`
- [x] Replace the comment above `.star-field`:
  `/* Still sky (plan 21): one static canvas behind everything, drawn from src/ui/layout/Starfield.tsx. Its backing`
  with
  `/* Still sky (plans 21, 26): one static canvas behind everything in both themes, drawn from src/ui/layout/Starfield.tsx. Its backing`
  (second line of that comment unchanged).

## Step 5 — `src/ui/layout/Starfield.tsx`

- [x] Replace the header comment (lines 5-9) with:
```ts
/*
 * Still sky: one static canvas of stars behind everything, drawn once on mount and again after a resize or a theme
 * change. On top of it sit about ten CSS opacity twinkles and a rare shooting star. Nothing drifts, so a full-window
 * repaint never happens on a timer. Both themes: white stars on the night sky, warm specks and ember sparks on paper
 * (colours, alpha scale and density come from the --star-* tokens). Reduced motion keeps the static canvas only.
 */
```
- [x] Replace the first five lines of `paint` (from `const styles = ...` to `const total = ...`):
```ts
  const styles = getComputedStyle(document.documentElement);
  const base = styles.getPropertyValue('--foreground').trim() || '#ffffff';
  const warm = styles.getPropertyValue('--star-warm').trim() || '#fff4ea';
  ctx.clearRect(0, 0, width, height);
  const total = Math.round((width * height) / PX_PER_STAR);
```
with:
```ts
  const styles = getComputedStyle(document.documentElement);
  const base = styles.getPropertyValue('--star-base').trim() || '#ffffff';
  const warm = styles.getPropertyValue('--star-warm').trim() || '#fff4ea';
  const alphaScale = tokenNumber(styles, '--star-alpha');
  const density = tokenNumber(styles, '--star-density');
  ctx.clearRect(0, 0, width, height);
  const total = Math.round(((width * height) / PX_PER_STAR) * density);
```
- [x] In the same loop replace
  `ctx.globalAlpha = alphaMin + Math.random() * (alphaMax - alphaMin);`
  with
  `ctx.globalAlpha = (alphaMin + Math.random() * (alphaMax - alphaMin)) * alphaScale;`
- [x] Add this helper directly above `function paint(`:
```ts
/** A unitless number token (e.g. --star-alpha: 0.8). Missing or invalid falls back to 1, the dark-sky value. */
function tokenNumber(styles: CSSStyleDeclaration, name: string): number {
  const value = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) && value > 0 ? value : 1;
}
```
- [x] Replace the whole `export function Starfield() { ... }` with:
```tsx
export function Starfield() {
  // Read so the effect re-runs (and the canvas repaints with the new --star-* colours) when the theme changes.
  // theme.ts toggles the `.dark` class before it updates `resolved`, so the tokens are current when the effect runs.
  const resolved = useTheme((s) => s.resolved);
  const reduceMotion = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const shootRef = useRef<HTMLDivElement>(null);
  const [twinkles] = useState(makeTwinkles);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layer = layerRef.current;
    const shoot = shootRef.current;
    const motion = !reduceMotion && layer && shoot ? { layer, shoot } : null;
    return startSky(canvas, motion);
  }, [resolved, reduceMotion]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="star-field" />
      {!reduceMotion && (
        <div ref={layerRef} className="star-twinkles" aria-hidden="true">
          {twinkles.map((style, i) => (
            <span key={i} className="star-twinkle" style={style} />
          ))}
          <div ref={shootRef} className="star-shoot" />
        </div>
      )}
    </>
  );
}
```
Nothing else in the file changes (LAYERS, constants, `startSky`, timers, pause logic stay as they are).
`tsc` must not report `resolved` as unused: it is used in the dependency array, which is fine.

## Step 6 — small component touches

- [x] `src/ui/components/Panel.tsx`:
  - The doc comment `/** Plan 16 card: 28px corners, a soft surface, a 1px rim (dark) or a 6% ring (light). No shadow at rest. */`
    becomes `/** Plan 16 card: 28px corners, a soft surface and a 1px rim. Light cards float with a soft warm shadow; inset regions sit flat. */`
  - Replace `inset && "bg-shoal [--rim-fill:linear-gradient(var(--shoal),var(--shoal))]",` with
    `inset && "bg-shoal shadow-none [--rim-fill:linear-gradient(var(--shoal),var(--shoal))]",`
- [x] `src/ui/screens/counselor/ChatPane.tsx` line ~150: in the composer pill's className, replace
  `"rim flex items-end gap-2 rounded-pill bg-panel` with `"rim lift flex items-end gap-2 rounded-pill bg-panel`
  (only that prefix changes; the rest of the className string stays).
- [x] `src/ui/globe/Globe.tsx` in `readPalette`:
  - Replace the comment `// Dark: a faint ember tint (about 25%) on black. Light: a neutral grey haze on paper.` with
    `// Dark: a faint ember tint on black. Light: a soft peach ember rim on paper (plan 26).`
  - Replace `atmosphere: theme === 'dark' ? mix(ocean, ember, 0.85) : mix(ocean, token('--chart-grey'), 0.5),` with
    `atmosphere: theme === 'dark' ? mix(ocean, ember, 0.85) : mix(ocean, ember, 0.35),`
  - Leave `atmosphereAltitude` and everything else unchanged.

## Step 7 — `.plans/A-build-conventions.md` (stale rules)

- [x] In the "Gradients and glow only in these places" bullet replace
  `one `.panel-ember` per screen (outer glow only, no inner wash), the `.ember-button` primary fill, `.numeral-ember` (dark), the `.ambient-haze` (dark), the toggle-on and progress dot (`.ember-fill`), and the globe atmosphere (dark). No other gradients, and no glow in light mode.`
  with
  `one `.panel-ember` per screen (outer glow only, no inner wash, both themes), the `.ember-button` primary fill, `.numeral-ember`, the static `.ambient-haze` (both themes), the toggle-on and progress dot (`.ember-fill`), and the globe atmosphere. No other gradients, and nothing that glows is ever animated.`
- [x] Replace the Starfield bullet with:
  `- Starfield: both themes (white stars on the night sky, warm specks and ember sparks on paper; colours from the `--star-*` tokens), one static canvas behind everything plus ten CSS twinkles and a rare shooting star (plans 21, 26). No per-frame JS; `prefers-reduced-motion` gets the static canvas only.`

## Step 8 — `DESIGN.md`

Make these edits exactly. Wording is given; keep the surrounding sections.

- [x] **Frontmatter `colors`:** `background: "#f7f6f4"`, `shoal: "#f1efec"`, `hairline: "#c2beb8"`,
  `signal: "#b53204"`, `signal-deep: "#952903"`, `evidence: "#2a7050"`. After `star-warm: "#fff4ea"` add
  `star-light: "#b8a596"`, `star-warm-light: "#ff7a3d"`, `globe-ocean: "#fbfaf8"`.
- [x] **Overview**, first paragraph: replace "The chart now sits on a night sky in dark mode and on paper in light mode."
  with "The chart sits on a night sky in dark mode and on warm paper under the same ember light in light mode: one
  atmosphere, two grounds (plan 26)."
- [x] **Key Characteristics:**
  - "Ground: black with stars in dark mode, light grey paper in light mode. The stars are dark theme only." becomes
    "Ground: black with white stars in dark mode; soft off-white paper (`#f7f6f4`) with faint warm specks and ember sparks in light mode. Both carry one static ember glow."
  - "Surfaces are soft: 28px cards with a 1px rim. Dark cards are a vertical gradient; light cards are flat white with a 6% ring." becomes
    "Surfaces are soft: 28px cards with a 1px rim. Dark cards are a vertical gradient; light cards are white sheets with a 5% to 8% rim and a soft warm shadow."
- [x] **Colors > Primary:** `#c53805 light` -> `#b53204 light`; `#a82f03 light` -> `#952903 light`.
  **Secondary:** `#2f7a56 light` -> `#2a7050 light`.
  **Neutral:** Background `#efefef light` -> `#f7f6f4 light`; Shoal `#f4f4f4` -> `#f1efec`; Hairline `#c2c2c2` -> `#c2beb8`;
  Globe ocean `#efefef light` -> `#fbfaf8 light`, and its sentence ends "...in dark mode (ember mixed 85% into the ocean, shell altitude 0.2), and a soft peach ember rim in light mode (ember mixed 35%, altitude 0.12)."
  Star bullet becomes: "**Star** (dark: `#ffffff`, and `#fff4ea` on about 15% of stars; light: warm taupe `#b8a596`, and ember `#ff7a3d` on about 15%): the starfield. No other colour."
- [x] **Token table** rows (light column only unless stated):
  - `--background` `#f7f6f4`; `--panel` text: "`#ffffff` flat (as a one-colour gradient, so the rim can layer under it), with `--surface-shadow`"; `--shoal` `#f1efec`; `--hairline` `#c2beb8`;
  - `--signal` / `--signal-deep` `#b53204` / `#952903`; `--evidence` `#2a7050`;
  - `--ember-glow`: light "none (transparent)";
  - `.panel-ember` outer glow light: "ember-1 22% ring (1px), ember-1 at 30% (40px, spread -8px), ember-0 at 35% (48px, offset 14px down)";
  - `--rim-top` / `--rim-bottom` light "5% black to 8% black";
  - `--globe-ocean` light `#fbfaf8`.
  - Add rows:
    `| --surface-shadow | 0 1px 2px warm 5%, 0 6px 20px -8px warm 12% (rgb 64 32 12) | none |`
    `| --star-base / --star-warm | #b8a596 / #ff7a3d | #ffffff / #fff4ea |`
    `| --star-alpha / --star-density | 0.8 / 0.6 | 1 / 1 |`
    `| --star-twinkle-core / -glow | ember-1 at 50% / ember-2 at 32% | white at 60% / white at 27% |`
    `| --star-shoot | #ff5a1f | #ffffff |`
- [x] **Contrast table:** replace the light rows with these (dark rows unchanged):
```
| ink on background / panel / shoal / glow peak (light) | 18.3 / 19.8 / 17.3 / 15.5 | 4.5:1 |
| chart grey on background / panel / shoal / glow peak (light) | 5.5 / 6.0 / 5.2 / 4.7 | 4.5:1 |
| signal text on background / panel / shoal / glow peak (light) | 5.7 / 6.1 / 5.4 / 4.8 | 4.5:1 |
| evidence on background / panel / shoal / glow peak (light) | 5.5 / 6.0 / 5.2 / 4.7 | 4.5:1 |
| white on primary button (light, both ends) / on signal | 5.1 to 6.0 / 6.1 | 4.5:1 |
| hairline on background / panel / shoal (light) | 1.71 / 1.85 / 1.61 | 1.5:1 |
```
  ("white on urgent pill (light)" keeps 5.1 to 6.0.) Add one sentence under the table: "The light glow peak is
  `#f7e0ca` (ember-2 at 24% over ember-1 at 5% over `#f7f6f4`); every text colour clears 4.5:1 on it, which is why
  the light signal, signal-deep and evidence were deepened in plan 26."
- [x] **Stars contrast:** change "Stars and text (dark only)." to "Stars and text." and append these rows to that table:
```
| chart grey text over a light-mode speck at its strongest (alpha .32 x .8) | 4.62 | 4.5:1 |
| chart grey text over a light-mode ember spark at its strongest | 4.41 | 4.5:1 (residual) |
| chart grey text over a light speck on the glow peak | 4.06 | 4.5:1 (residual) |
| chart grey text over a light ember twinkle core | 3.16 | 4.5:1 (residual, ten dots) |
```
- [x] **Surfaces & Depth:** "**Panel (light):** flat white, 28px, a 6% black ring. No shadow." becomes
  "**Panel (light):** white, 28px, a 1px rim from 5% to 8% black, and a soft warm shadow (`--surface-shadow`). Inset panels (`Panel inset`) sit flat on shoal with no shadow. The chat composer pill takes the same shadow (`.lift`)."
  "**Shadow:** none at rest. ..." becomes "**Shadow:** in dark, none at rest; in light, the soft `--surface-shadow` on white surfaces only. The one floating shadow (`--shadow-float`, warm in light) is for popovers and dialogs. The ember glow on `.panel-ember` is a named exception (below)."
- [x] **Gradients & Glow** list:
  - 2: replace "Light has no glow." with "Light has a softer halo: a 1px ember-1 ring at 22%, ember-1 at 30% over 40px, ember-0 at 35% over 48px, offset 14px down."
  - 4: "Dark only: ink to ember-2 over the lower half of the glyph." -> "Ink to ember-2 (dark) or to signal (light) over the lower half of the glyph."
  - 5: "Dark only: one faint radial ember glow (opacity 0.14) at the bottom centre of the window, behind the content and above the stars." ->
    "One static glow behind the content and above the stars, never animated. Dark: a faint radial ember glow (opacity 0.14) at the bottom centre. Light: a large soft peach glow centred at 55% across, 48% down (38% x 42% ellipse, ember-2 at 24% fading through 10% to nothing) over a wide ember-1 wash at 5% (70% x 80%). Peak about `#f7e0ca`."
  - 7: "Dark: an ember rim on the sphere's edge (`mix(ocean, ember, 0.85)`, altitude 0.2)." -> append " Light: a peach rim (`mix(ocean, ember, 0.35)`, altitude 0.12)."
  - Replace "Everything else is flat. Light mode has no glow." with "Everything else is flat. Nothing that glows is animated."
- [x] **Starfield** section:
  - "Pauses" bullet: replace "The light theme renders nothing, and every timer and listener is removed." with "A theme change tears the sky down and draws it again with the new tokens."
  - "Density" bullet: append " Light multiplies the count by `--star-density` (0.6, about 180 stars)."
  - "Alpha" bullet: append " Light multiplies every alpha by `--star-alpha` (0.8)."
  - "Colour" bullet becomes: "**Colour:** `--star-base` and `--star-warm` (about 15% of stars), read once per activation. Dark: white and `#fff4ea`. Light: warm taupe `#b8a596` specks and ember `#ff7a3d` sparks. The twinkles use `--star-twinkle-core` / `--star-twinkle-glow` (white in dark, ember-1 and ember-2 in light) and the shooting star fades to `--star-shoot` (white in dark, ember-1 in light)."
  - "Always on" bullet becomes: "**Always on:** the stars are always drawn, in both themes. There is no toggle and no setting."
  - "Twinkles" bullet: replace "(`.star-twinkle`, 12 px: a sharp core of radius 1.3 px at alpha 0.6, over a soft glow of alpha 0.27 out to 6 px)" with "(`.star-twinkle`, 12 px: a sharp core of radius 1.3 px over a soft glow out to 6 px, colours from the tokens)".
- [x] **Logo** section, add a bullet: "**On the light ground:** the light mark reads on `#f7f6f4`: near-black arc 18.3:1, deep ember 10.1:1, ember tip 3.8:1, 45% ring 3.3:1."
- [x] **Do's and Don'ts:** delete "**Don't** put a glow on light mode." and replace "**Don't** draw the starfield in light mode, or over the content as a separate layer." with "**Don't** draw the starfield over the content as a separate layer, and don't animate the glow."

## Verify (run all, paste the output tails in Builder notes)

```
bun run build
bun run check:i18n
bun test
grep -n "star-base\|surface-shadow\|star-twinkle-core\|star-shoot" src/index.css
grep -n "resolved === 'dark'\|if (!active" src/ui/layout/Starfield.tsx   # must print nothing
git status --short                                                       # only the 8 listed files (plus the pre-existing others)
```
All three commands must pass. If `bun run build` fails on an unused variable, fix only what this plan introduced.

## Acceptance (for the reviewer, not the builder)
- Dark mode is pixel-identical to before (same star colours, alphas, count, twinkles, streak, haze, panels).
- Light: off-white `#f7f6f4` ground, a soft peach glow behind the centre, faint warm specks with ember sparks,
  ember twinkles, an ember shooting star every 30-60 s, white panels with a soft shadow, an ember halo on the one
  `.panel-ember`.
- Switching theme repaints the canvas with the new colours (no stale white stars on paper).
- No new animation, timer or full-window layer.

## Builder notes

- All Steps 1-8 applied with an assertion script (each old string matched exactly once). No deviations from the plan's text.
- `bun run build`: exit 0 (`built in 2.41s`; the existing >500 kB chunk warning is unchanged).
- `bun run check:i18n`: exit 0 (`i18n key check passed (6 namespaces, es, vi match en)`).
- `bun test`: exit 0, 159 pass, 0 fail, 327 expect() calls across 18 files.
- `grep -n "star-base\|surface-shadow\|star-twinkle-core\|star-shoot" src/index.css`: 9 hits (tokens, `.surface`/`.lift` shadow, twinkle and streak use).
- `grep -n "resolved === 'dark'\|if (!active" src/ui/layout/Starfield.tsx`: no output.
- `git status --short`: M on the 7 planned files (`.plans/A-build-conventions.md`, `DESIGN.md`, `src/index.css`, `src/ui/components/Panel.tsx`, `src/ui/globe/Globe.tsx`, `src/ui/layout/Starfield.tsx`, `src/ui/screens/counselor/ChatPane.tsx`); untracked `.impeccable/`, `graphify-out/` and this plan are pre-existing. No commits, no app start.
- Not in the plan, left untouched (stale after this change, for a follow-up): `DESIGN.md` "### The Globe" still says ocean `#efefef` in light (should be `#fbfaf8`); the Motion paragraph still says "Stars drift and twinkle" (pre-existing wording, stars do not drift).
- Not run: the app itself (per the rules), so the visual acceptance (glow, stars on paper, theme-switch repaint) is for the reviewer.

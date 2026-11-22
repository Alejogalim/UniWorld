---
name: UniWorld
description: A working chart of where a student could study, with real universities, real facts and sources, drawn over a night sky.
colors:
  ink: "#0a0a0a"
  chart-grey: "#636366"
  background: "#efefef"
  panel: "#ffffff"
  shoal: "#f4f4f4"
  hairline: "#c2c2c2"
  land: "#d9d9d9"
  signal: "#c53805"
  signal-deep: "#a82f03"
  evidence: "#2f7a56"
  ember-0: "#b3210a"
  ember-1: "#ff5a1f"
  ember-2: "#f7b267"
  button-top: "#c4400b"
  button-bottom: "#b83304"
  ink-dark: "#ffffff"
  chart-grey-dark: "#8e8e93"
  background-dark: "#000000"
  panel-dark: "#0c0c0d"
  panel-dark-top: "#151517"
  shoal-dark: "#161617"
  hairline-dark: "#39393c"
  land-dark: "#26262a"
  signal-dark: "#ff6a2b"
  signal-deep-dark: "#ff8a4d"
  evidence-dark: "#5fbf8f"
  globe-ocean-dark: "#060607"
  button-top-dark: "#ff8a3d"
  button-bottom-dark: "#ff5a1f"
  star: "#ffffff"
  star-warm: "#fff4ea"
  primary-text: "#ffffff"
  primary-text-dark: "#000000"
typography:
  display:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
rounded:
  pill: "999px"
  card: "28px"
  control: "14px"
  popover: "20px"
spacing:
  hair: "4px"
  tight: "8px"
  base: "12px"
  room: "16px"
  block: "24px"
  section: "32px"
  page: "48px"
---

# Design System: UniWorld

## Overview

**Creative North Star: "The Ember Chart, under stars"**

UniWorld is still a working chart: real universities, real facts, a source on every value, and a visible gap where the soundings are unknown. The Ember Glow pass (plan 16) keeps that discipline and adds two things the owner asked for: soft, squircle-like surfaces with a light rim, and a slow, faint starfield behind every screen. The chart now sits on a night sky in dark mode and on paper in light mode.

The surface is still an instrument used at a desk, often by a sixteen-year-old comparing three countries at once. So this is still an **Operate** system: scanning and density come first, and expression is spent in a few marked places: the globe, the one ember element per screen, the large numerals, and the stars. Everything else is ink, grey, a hairline and a soft surface.

Three rejections still stand: a warm cream and serif editorial template, a neon accent used everywhere, and a grid of identical rounded cards with the same shadow on each. The owner's brief changed one thing: surfaces may now be soft and gradient-rimmed, but only in the places listed under Gradients and Glow.

**Key Characteristics:**
- Ground: black with stars in dark mode, light grey paper in light mode. The stars are dark theme only.
- One warm colour, the ember. It marks what the student must act on now, and it glows in a few fixed places.
- Surfaces are soft: 28px cards with a 1px rim. Dark cards are a vertical gradient; light cards are flat white with a 6% ring.
- One face, Inter Variable, in weights 400 to 600. Numerals are always tabular.
- Headlines are two-tone: grey body text with the key phrase in ink, used on the welcome headline and empty-state titles only.
- Results are still a ranked column of rows, never a grid of equal cards.
- Every fact carries its source or says it is missing. The missing state is designed, not hidden.
- Motion answers an action. The stars and the arrival of search results are the only things that move without a cause.

## Colors

Monochrome first. Ember is the only colour, and it is spent in named places.

### Primary
- **Ember Signal** (`#c53805` light, `#ff6a2b` dark): the focus ring, the selected country, the search-in-progress dot, deadlines inside 30 days, the ember dot on a selected row or chip, and the ember text where the ember is itself the message. Roughly 5% of pixels.
- **Ember Signal, Deep** (`#a82f03` light, `#ff8a4d` dark): the pressed and hover state of signal text.
- **Primary button fill**: a vertical gradient, `#c4400b` to `#b83304` in light (white text) and `#ff8a3d` to `#ff5a1f` in dark (black text). It is a fill, not a second accent.

### Secondary
- **Evidence Green** (`#2f7a56` light, `#5fbf8f` dark): verified evidence only: the official tag, the verified tick next to a sourced fact, and the verified count. Never a button, a celebration or a success toast.

### Neutral
- **Ink** (`#0a0a0a` light, `#ffffff` dark): primary text, icons, and the hairlines that do structural work.
- **Background** (`#efefef` light, `#000000` dark): the ground behind everything.
- **Panel** (`#ffffff` light, `#0c0c0d` dark, with a `#151517` to `#0b0b0c` gradient in dark): sheets laid on the ground.
- **Shoal** (`#f4f4f4` light, `#161617` dark): the second tonal step: hover, the active nav item, inset regions, bubbles.
- **Hairline** (`#c2c2c2` light, `#39393c` dark): every 1px rule and input stroke.
- **Chart Grey** (`#636366` light, `#8e8e93` dark): secondary text and metadata.
- **Land** (`#d9d9d9` light, `#26262a` dark): globe land.
- **Globe ocean** (`#efefef` light, `#060607` dark): the globe sphere; the atmosphere is an ember rim in dark mode (ember mixed 85% into the ocean, shell altitude 0.2).
- **Star** (`#ffffff`, and `#fff4ea` on about 15% of stars): the starfield. Pure white with a barely warm tint. No other colour.

### Token table

| token | light | dark |
|---|---|---|
| `--background` | `#efefef` | `#000000` |
| `--panel` / `--surface-fill` | `#ffffff` flat (as a one-colour gradient, so the rim can layer under it) | `#0c0c0d`, gradient `#151517` to `#0b0b0c` |
| `--shoal` | `#f4f4f4` | `#161617` |
| `--foreground` | `#0a0a0a` | `#ffffff` |
| `--chart-grey` | `#636366` | `#8e8e93` |
| `--hairline` | `#c2c2c2` | `#39393c` |
| `--signal` / `--signal-deep` | `#c53805` / `#a82f03` | `#ff6a2b` / `#ff8a4d` |
| `--evidence` | `#2f7a56` | `#5fbf8f` |
| `--ember-0` / `-1` / `-2` | `#b3210a` / `#ff5a1f` / `#f7b267` | same |
| `--ember-button-top` / `-bottom` | `#c4400b` / `#b83304` | `#ff8a3d` / `#ff5a1f` |
| `--ember-glow` | none | ember-1 at 55% (focus ring and range thumb) |
| `.panel-ember` outer glow | none (no glow on paper) | a 1px `--rim-top` ring, ember-1 at 45% (44px, spread -6px), ember-0 at 55% (60px, offset 14px down) |
| `--rim-top` / `--rim-bottom` | 6% black | 16% white to 4% white |
| `--globe-ocean` | `#efefef` | `#060607` |
| `--land` | `#d9d9d9` | `#26262a` |

### Contrast
Measured with WCAG 2.x relative luminance. The full pair list is in `.plans/16-ui-glow-stars.md`, Builder notes. Summary:

| pair | ratio | target |
|---|---|---|
| ink on background / panel / shoal (light) | 17.2 / 19.8 / 18.0 | 4.5:1 |
| chart grey on background / panel / shoal (light) | 5.2 / 6.0 / 5.4 | 4.5:1 |
| white on primary button (light, both ends) | 5.1 to 6.0 | 4.5:1 |
| black on primary button (dark, both ends) | 6.7 to 9.0 | 4.5:1 |
| ink on dark card (top / bottom) | 18.2 / 19.7 | 4.5:1 |
| chart grey on dark card (top / bottom) | 5.6 / 6.0 | 4.5:1 |
| chart grey on the rendered dark ember glow (worst point, ember-0 at .35) | 4.75 | 4.5:1 |
| ember-2 numeral low stop on the glow | 6.4 to 8.5 | 3:1 |
| white on urgent pill (light) / black on urgent pill (dark) | 5.1 to 6.0 / 6.7 to 9.0 | 4.5:1 |
| hairline on background / panel (light) | 1.55 / 1.78 | 1.5:1 |
| hairline on card bottom (dark) | 1.71 | 1.5:1 |

Stars and text (dark only). A single star pixel under text is the worst case, and the result is not a clean pass:

| pair | ratio | target |
|---|---|---|
| ink text over a base star at alpha .15 (worst pixel) | 15.13 | 4.5:1 |
| chart grey text over a base star at alpha .15 (worst pixel) | 4.64 | 4.5:1 |
| chart grey text over a warm star (`#fff4ea`) at alpha .15 | 4.70 | 4.5:1 |
| chart grey text over a bright star's glow at .15 x .45 | 5.79 | 4.5:1 |
| chart grey text over a base star at alpha .30 (not used: rejected) | 2.63 | 4.5:1 |
| chart grey text over two stacked stars at .15 (worst pixel, overlapping layers) | 2.85 | 4.5:1 (residual) |

The table above is the strict per-pixel view from plan 18, when every baked star was capped at alpha 0.15. The owner has since raised star alphas to 0.14 to 0.32 (bright cores 0.6) so the stars read as stars. Under those values chart-grey text can drop below 4.5:1 on a single star pixel, and two stacked stars are worse. This is accepted by design: the stars are decorative, sit behind the content, and cover a small share of the window. The measured figures are per pixel, not an average over a text run.

### Named Rules
**The Ember Rule.** Ember marks what the student must act on now: the primary action on the screen, the country they selected, a deadline inside 30 days, the search in progress, the one ember panel of the screen. Never a heading, never a link. If two ember things compete on one screen, one of them is wrong.

**The One Panel Rule.** Each screen has at most one `.panel-ember` surface. It is the screen's memorable element. Other panels are plain.

**The Evidence Rule.** Green means evidence only: a fact with a source and a matching quote. Never "done", "success" or celebration.

**The Land Rule.** Land is a neutral grey fill on the globe, never warm.

## Typography

**Face:** Inter Variable, the only family. `--font-sans`, `--font-heading` and `--font-mono` all resolve to the Inter stack. Inter Variable carries Vietnamese diacritics, so no fallback face is needed.

**Numerals:** `.font-mono` is the measured-value style. It is Inter with `font-variant-numeric: tabular-nums` and no tracking. Counts, days, scores and deadlines use it. Mono is no longer a different face.

### Scale
- **Display** (600, 56px / 1.0, tracking -0.035em): screen titles, and the large numerals on the onboarding step, the rank and the summary strip (`.type-display`).
- **Headline** (600, 28px / 1.15, tracking -0.02em): card and section headlines (`.type-headline`).
- **Title** (600, 17px / 1.35): university names, panel titles (`.type-title`).
- **Body** (400, 15px / 1.55): the app default, and prose at 68ch maximum (`.type-body`).
- **Label** (500, 13px / 1.2): buttons, nav, chips, form labels, table headers (`.type-label`). Sentence case.

### Named Rules
**The Two-Tone Rule.** A headline may be two-tone only on the onboarding welcome and on empty-state titles: body text in Chart Grey, the key phrase in ink at weight 600 (a `<strong>` in the translation). The phrase is a phrase, never one word.

**The Numeral Rule.** Large numerals may take the ember gradient (`.numeral-ember`) and only where a number is the point of the line: the onboarding step, a result's rank, the summary strip, the days-left number. Numerals are always tabular.

**The Measured Value Rule.** Numbers that were measured, counted, dated or priced use tabular figures. A sentence or a button never uses them.

**The No-Eyebrow Rule.** No tracked-out uppercase kicker above any heading. Sections are separated by a hairline and space.

**The Caps Rule.** Uppercase only inside a coordinate or an ISO country code. Everywhere else, sentence case.

## Shapes

### Shape lock
Four radii and nothing else, defined as tokens in `src/index.css`:

| token | value | used for |
|---|---|---|
| `--radius-pill` | 999px | action buttons, chips, badges, toggles, sliders, the ember dot, the rail's round footer buttons |
| `--radius-card` | 28px | cards and panels (`Panel`, `.surface`, `.panel-ember`) |
| `--radius-control` | 14px | inputs, selects, textareas, comboboxes, rail nav rows, the chat composer's inner field |
| `--radius-popover` | 20px | popovers, menus, the fact popover, chat bubbles, result rows on hover |

Circles are allowed for the globe, flag discs and dots. Nothing else: no 2px, 4px, 6px or 16px radius, and no other value. The legacy `rounded-sm/md/lg/xl` utilities map onto the four values.

## Surfaces & Depth

- **Panel (dark):** a vertical gradient `#151517` to `#0b0b0c`, with a 1px gradient rim (top 16% white, bottom 4% white). The rim is two background layers (`.rim`): the fill on the padding box and the rim gradient on the border box, so it keeps the radius. There is no mask and no pseudo-element. `.panel-ember` has no inner highlight.
- **Panel (light):** flat white, 28px, a 6% black ring. No shadow.
- **Rim:** `.rim` is a 1px gradient border on any element. It is used on panels, the active nav item, the selected program row, popovers and the composer. The rim gradient paints under the whole box, so a rim needs an opaque `--rim-fill` (`.surface`, or a `[--rim-fill:…]` class matching its background).
- **Shadow:** none at rest. The one floating shadow (`--shadow-float`) is for popovers and dialogs. The dark ember glow is a named exception (below).
- **Flat by default:** structure is drawn with hairlines and tonal steps, not shadows.
- **Flat controls** (secondary buttons, the round footer buttons, the Toggle when off): a plain 1px `border-hairline` (`--hairline`, solid). Measured for the boundary: 1.82 / 1.70 / 1.57 on black, panel and shoal in dark; 1.55 / 1.78 / 1.62 on background, panel and shoal in light. The gradient rim stays on panels, popovers, the active nav row, the program row and the composer.

## Gradients & Glow

Gradients and glows are allowed in these places and nowhere else:

1. **Dark panel surface and rim.** Vertical gradients on `Panel` in dark mode only.
2. **Ember panel (`.panel-ember`).** The glow is outside the box only, and static: dark has a soft halo around the whole card (a 1px rim ring, ember-1 at 45% over 44px, ember-0 at 55% over 60px, offset 14px down). There is no inner wash and no fade-in. Light has no glow. One per screen.
3. **Primary button (`.ember-button`).** A vertical gradient in both themes, and in dark a soft ember glow on hover and focus.
4. **Large numerals (`.numeral-ember`).** Dark only: ink to ember-2 over the lower half of the glyph.
5. **Ambient haze (`.ambient-haze`).** Dark only: one faint radial ember glow (opacity 0.14) at the bottom centre of the window, behind the content and above the stars.
6. **Toggle on, and the progress dot (`.ember-fill`).** Dark: the ember gradient. Light: flat signal.
7. **Globe atmosphere.** Dark: an ember rim on the sphere's edge (`mix(ocean, ember, 0.85)`, altitude 0.2).

Everything else is flat. Light mode has no glow.

## Starfield

Implemented in `src/ui/layout/Starfield.tsx` (one canvas) and `src/index.css` (`.star-field`). Mounted once in `AppShell` as the first child of the shell.

- **Why this design:** the earlier CSS-tile starfield (animated, oversized layers) measured 9 fps in the real app on software WebKitGTK, against 62 fps with the stars hidden. Every full-window animated layer cost about 20 ms per frame in that compositor. So the stars no longer animate on the compositor at all.
- **Method:** a single `<canvas>` fixed behind everything (`pointer-events: none`, `aria-hidden`, `contain: strict`). Its backing store is the viewport at device pixel ratio 1, so the CSS size equals the backing size. Stars are drawn with `arc` and one 12 px glow sprite, which is drawn once.
- **Idle-only motion:** the stars move only while the user is idle. Any pointer move, press, wheel, key, scroll or route change stops all star work at once, and motion resumes 600 ms after the last input. While idle the field redraws at 4 fps from a timer (not per frame). The canvas keeps its last frame during activity. Positions come from a motion clock that only advances while the stars move, so resuming never jumps.
- **Self-protection:** the rate steps down 4 to 2 to 1 fps when the median of the last 8 redraws exceeds 25 ms, or when the timer runs more than 400 ms late three times in a row. If the lowest rate is still slow, the field freezes on its last frame until the next activation.
- **Pauses:** `document.hidden`, window blur, `prefers-reduced-motion` (one static frame, never moves), the stars setting off, and the light theme. In each case the component renders nothing and every timer and listener is removed.
- **Density:** one star per 7 000 px² (about 300 on 1920 x 1080), split 55%, 30% and 15% across three depth layers. Radii 0.5, 0.9 and 1.3 px.
- **Motion:** drift toward the upper-left at 1.5, 3 and 5 px per second. Stars fade within 40 px of the window edges, so the wrap has no pop.
- **Alpha:** random per star within its layer's range: far 0.14 to 0.22, mid 0.18 to 0.27, near 0.22 to 0.32. Six bright stars on the near layer have a core alpha of 0.6 and a 12 px glow at 0.27. Each star twinkles on a slow sine (6 to 12 s period) computed inside the same redraw. The owner chose visible stars over the strict text-contrast cap that earlier builds used (0.15).
- **Contrast note:** the stars are decorative. A star under a text glyph may locally dip below 4.5:1 by design (see the contrast table); the owner chose visibility over a per-pixel text target.
- **Colour:** `--foreground` (white in dark) and `--star-warm` (`#fff4ea`) on about 15% of stars, read once per activation from the tokens.
- **Control:** the round star button in the rail footer. It is persisted as the `stars` setting (`on` or `off`, default on) and reports `aria-pressed`.
- **Layer:** `z-index: -2` inside the isolated shell, under the ambient haze (`-1`), the rail, the header and the content.

## Layout

A fixed 220px rail on the left, with transparent ground over the stars. A working field to its right, with content capped at 1120px and a 48px page margin. Onboarding is a single 640px sheet.

Density is still high by default: 40px controls, 15px body, 20px-radius result rows. Space is in fours, and the section step is the largest.

The Finder is the one two-region screen: the globe fills the field at rest and shrinks to a 380px column at the left when a search runs. Results are a ranked column of rows, not a grid.

Spanish and Vietnamese run up to 30% longer than English, so no control has a fixed width and labels wrap rather than truncate.

## Components

### Buttons
- **Primary:** pill, 40px (36px `sm`), `.ember-button` gradient, 1px inner top highlight. Black text in dark, white in light. One per screen region, naming its action. Press scales to 0.97 in 120ms.
- **Secondary:** pill, `rim` on a panel fill, ink text.
- **Quiet:** text only, Chart Grey, underline on hover.
- **Focus:** a 2px signal outline offset 2px, always visible.

### Chips and badges
- **Chip:** pill, 28px tall. Selected inverts to ink fill with a small ember dot on the leading edge.
- **Badge:** pill, shoal fill, hairline stroke, read-only.

### Inputs
- **Style:** 14px corners, 40px tall, panel fill, `rim`-less hairline stroke. Focus: a 2px signal ring, with a faint ember glow in dark mode.
- **Error:** signal stroke and a message that says what to do.

### Toggles and sliders
- **Toggle:** pill. On is the ember gradient track, with an ink thumb in light and a black thumb in dark (white measured 2.27:1 on the track).
- **Slider:** 4px track, thumb in ink, with an ember ring in dark mode.

### Navigation
- Rail items: 40px rows, 14px corners, Inter 14px. Active: `rim` on shoal, with a 3px ember dot on the left edge. Hover: shoal.
- Footer: three round 40px buttons with a rim: language, theme and stars.

### Result rows and lists
- A ranked row with a 28px-radius hover surface (20px in the list), the rank as a `.numeral-ember`, the university name in Title, a source count in Data type, and the fit values as pill badges. Selected rows take a rim and an ember dot.
- Table rows (My Unis) keep the ruled structure and take a shoal hover.
- Urgent deadlines: an ember pill (`.ember-button`) holding the days-left number.

### Fact line (signature)
Unchanged in behaviour. A 14px label in Chart Grey, the value in body text, and a Data-style source superscript. The popover is a rimmed 20px surface. The missing fact reads "Not found, check official site" in Chart Grey, with a dashed underline, and keeps its row height.

### The Globe
Ocean `#efefef` in light and `#060607` in dark, so the sphere glows against the stars. Land `#d9d9d9` in light and `#26262a` in dark. Graticule faint. Selected countries are filled with ember. Idle rotation at 0.35 degrees per second. The globe is a circle.

### Motion
State changes: 180ms, `cubic-bezier(0.2, 0, 0, 1)`. Press: 120ms scale. The panel glow fades in over 300ms on first paint, opacity only. The screen transition keeps the 8px slide and fade. Result rows arrive in rank order with a 24ms stagger capped at eight rows. Stars drift and twinkle. The globe fly-to and contraction keep their durations. `prefers-reduced-motion` removes transforms and keeps opacity.

## Do's and Don'ts

### Do
- **Do** use the four radii and no others.
- **Do** keep one `.panel-ember` per screen and one ember action per screen region.
- **Do** draw structure with hairlines and tonal steps first.
- **Do** design the missing-fact state as carefully as the present one.
- **Do** check contrast on both themes before adding a token, and include stars in the check where text sits over the ground.
- **Do** size controls to content so Spanish and Vietnamese wrap.

### Don't
- **Don't** add gradients outside the list in Gradients & Glow.
- **Don't** put a glow on light mode.
- **Don't** use a radius outside the shape lock, or a pill on a card.
- **Don't** use emoji as icons, flags or labels.
- **Don't** use Evidence Green for success.
- **Don't** animate anything the student did not cause, except the globe's idle rotation, the arrival of results and the stars.
- **Don't** draw the starfield in light mode, or over the content as a separate layer.

---
name: UniWorld
description: A working chart of where a student could study — real universities, real facts, sourced.
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
  ink-dark: "#ffffff"
  chart-grey-dark: "#8e8e93"
  background-dark: "#000000"
  panel-dark: "#0c0c0d"
  shoal-dark: "#161617"
  hairline-dark: "#39393c"
  land-dark: "#262628"
  signal-dark: "#ff6a2b"
  signal-deep-dark: "#ff8a4d"
  evidence-dark: "#5fbf8f"
  primary-text: "#ffffff"
  primary-text-dark: "#000000"
typography:
  display:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  prose:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Agrave Pro, Inter Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.01em"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
    fontFeature: "tnum"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  hair: "4px"
  tight: "8px"
  base: "12px"
  room: "16px"
  block: "24px"
  section: "32px"
  page: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.signal-deep}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.label}"
  button-quiet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chart-grey}"
    padding: "0 8px"
    height: "28px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
    typography: "{typography.label}"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
    typography: "{typography.body}"
  nav-item:
    backgroundColor: "{colors.background}"
    textColor: "{colors.chart-grey}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
    typography: "{typography.label}"
  nav-item-active:
    backgroundColor: "{colors.shoal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
---

# Design System: UniWorld

## Overview

**Creative North Star: "The Ember Chart"**

UniWorld is a working chart, not a poster of one. A chart earns trust by showing its sources, its survey dates, and the places where the soundings are unknown — the same discipline UniWorld promises when it refuses to invent a tuition figure. The chart is now a black-and-white instrument: paper and ink, or black and white on the lamp-off screen, with one ember. (This system was called "The Corrected Chart" before; the name changed with the palette.)

The surface is an instrument used at a desk, at night, on a laptop, often by a sixteen-year-old comparing three countries at once. So this is an **Operate** system: density and scanability first, expression spent in a few places — the globe, which is the one object allowed to be beautiful, and the ember, the one colour allowed to raise its voice. Everything else is greys, ink, and a hairline. Depth is tonal, not shadowed; structure is drawn with rules, not boxes; nothing is a rounded card floating on a gradient.

The existing scaffold is stock shadcn neutral: pure grey, Inter, `0.625rem` radii, equal-weight cards. It is the thing this document replaces, not the thing it documents. Three deliberate rejections: warm cream plus serif plus terracotta (the editorial template); a neon accent on near-black used everywhere (the landing-page template); and a grid of identical rounded cards with the same soft shadow on each (the SaaS template). UniWorld is a chart, and charts look like charts.

**Key Characteristics:**
- Monochrome ground: pure black in the dark theme, soft light grey on paper in the light theme, pure white panels, ink text.
- Exactly one warm colour, the ember, used for what needs the student now and in a few fixed places — never as decoration.
- Flat by default: 1px hairlines and tonal steps instead of shadows; one shadow exists, for layers that float.
- One face (Agrave Pro) at two weights, plus a mono for measured values; no display serif, no third family.
- Results are a ranked column of rows, never a grid of equal cards.
- Every fact carries its source or says it is missing. The missing state is designed, not hidden.
- Motion answers an action; nothing animates in on scroll.

## Colors

Monochrome first: black or light grey ground, white or pure-white panels, black or white ink, and greys for everything secondary. One colour is spent sparingly, the ember, which is a deep red-orange at its core and warms to peach at its edge.

### Primary
- **Ember Signal** (`#c53805` light, `#ff6a2b` dark): the only saturated colour on most screens. Filled primary buttons, the selected country on the globe, the active nav mark, the chip and radio tick, the focus ring, deadlines under 30 days, and the live "searching" dot. Roughly 5% of pixels, never more.
- **Ember Signal, Deep** (`#a82f03` light, `#ff8a4d` dark): pressed and hover state of the same control. It is a state, not a second accent.

### Ember Gradient (the reference's signature, used in two places only)
- **Ember** (`#b3210a` → `#ff5a1f` → `#f7b267`, from the bottom up): a gradient that runs deep red, orange, then warm peach. It appears as the search progress dot and the welcome glow in dark mode. Nowhere else.

### Secondary
- **Evidence Green** (`#2f7a56` light, `#5fbf8f` dark): a muted surveyor's green used only for evidence — the verified tick next to a sourced fact, the "official" source tag, the count of facts that passed the quote check. It never appears on a button, a badge of celebration, or a success toast.

### Neutral
- **Ink** (`#0a0a0a` light, `#ffffff` dark): all primary text, icons, and the 1px rules that do the structural work.
- **Background** (`#efefef` light, `#000000` dark): the app ground behind everything. Dark mode is pure black.
- **Panel** (`#ffffff` light, `#0c0c0d` dark): panels, inputs, and any surface that must read as a sheet laid on the ground.
- **Shoal** (`#f4f4f4` light, `#161617` dark): the second tonal step — table headers, hovered rows, the active nav field, inset sections.
- **Hairline** (`#c2c2c2` light, `#39393c` dark): every 1px rule and input stroke. Rules carry structure here; if a border is decorative, delete it.
- **Chart Grey** (`#636366` light, `#8e8e93` dark): secondary text, metadata, and the "Not found" state. Passes AA on paper, shoal, and ground in both themes.
- **Land** (`#d9d9d9` light, `#262628` dark): globe land, a neutral grey. Not a warm fill.

### Dark theme
The same instrument with the lamp off: black ground, near-black panels with a thin lighter rim along their top edge, white ink. The ember is the only colour. Dark mode carries the soft ember glow on primary buttons on hover and focus, and the welcome glow; nothing else glows.

### Measured contrast
Measured with WCAG 2.x relative luminance:

| pair | ratio | target |
|---|---|---|
| ink on background / panel / shoal (light) | 17.2 / 19.8 / 18.0 | 4.5:1 |
| chart grey on background / panel / shoal (light) | 5.2 / 6.0 / 5.4 | 4.5:1 |
| white on signal (light primary button) | 5.3 | 4.5:1 |
| ink on signal (dark primary button) | 7.4 | 4.5:1 |
| signal on panel (light, as text or outline) | 5.3 | 3:1 |
| signal on background (light, as text) | 4.6 | 4.5:1 |
| signal on panel (dark, as text or outline) | 6.8 | 3:1 |
| evidence on panel (light / dark) | 5.2 / 8.7 | 4.5:1 |
| hairline on background / panel (light) | 1.55 / 1.78 | 1.5:1 |
| hairline on panel / shoal (dark) | 1.70 / 1.57 | 1.5:1 |

### Named Rules
**The Ember Rule.** Ember marks what the student must act on now — the primary action on this screen, the country they selected, a deadline inside 30 days, the search in progress. Never a heading, never an icon colour, never a link. If two ember things compete on one screen, one of them is wrong. The ember gradient is limited to the two places listed above. The other two ember effects are the globe's atmosphere tint (dark) and the primary-button glow on hover and focus (dark); nothing else glows.

**The Evidence Rule.** Green means evidence, and only evidence: a fact that carries a source and a matching quote. It may not be used for "done", "success", or celebration — in this product the only thing worth celebrating is that something was verified.

**The Land Rule.** Land is a neutral grey fill on the globe, never a warm or "premium" surface. The palette stays monochrome apart from the ember.

## Typography

**Display Font:** Agrave Pro (with Inter Variable, sans-serif)
**Body Font:** Agrave Pro — one family across the whole app; only size and weight shift
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, monospace)

**Character:** Agrave Pro carries every word in the app. It is a narrow humanist sans with a high x-height and slightly clipped terminals — closer to chart lettering than to a UI grotesque, and it stays readable down to 12px labels, which is why it replaced the neutral scaffolding face rather than merely decorating headings. Only two cuts are installed (400 and 700), so hierarchy comes from size, case, and colour, not from a 500/600 middle range: `font-medium` resolves to 400 and `font-semibold` to 700, and no design may depend on an intermediate weight. IBM Plex Mono remains the instrument's readout — coordinates, counts, dates, currencies — and never speaks in sentences.

**Vietnamese:** Agrave Pro has no `ạ`/`ệ`/`ỏ` glyphs; `Inter Variable` sits second in the stack and supplies them, so Vietnamese text mixes faces at its diacritics. This is a known trade, not a bug to "fix" by swapping the face back.

### Hierarchy
- **Display** (600, `2.75rem`/1.04, tracking `-0.025em`, width 92%): one per screen at most — the onboarding welcome, the Finder's career question. Never inside a panel.
- **Headline** (600, `1.5rem`/1.2, tracking `-0.015em`): screen titles and career-card names.
- **Title** (600, `1.0625rem`/1.35): university names in rows, section titles inside panels, dialog titles.
- **Body** (400, `0.875rem`/1.55): the app default. Prose in onboarding, counselor, and detail pages uses `1rem`/1.6 at 68ch max.
- **Label** (500, `0.75rem`/1.2, tracking `0.01em`): buttons, nav, chips, form labels, table headers. Sentence case, always.
- **Data** (500, `0.75rem`/1.3, Plex Mono, `tnum`): deadlines, tuition figures, coordinates, result counts, the fit code, the "Last checked" date.

Line length: 68ch for prose, 90ch for table rows. Long-form (detail page, counselor replies) never exceeds 68ch regardless of window width.

### Named Rules
**The Measured Value Rule.** Mono is for values that were measured, counted, dated, or priced. The moment a sentence, a button, or a heading appears in mono, it reads as a terminal and the chart illusion dies.

**The No-Eyebrow Rule.** No tracked-out uppercase kicker above any heading, and no label that only announces the heading beneath it. Sections are separated by a hairline and space, the way a chart is, not by a small grey word.

**The Caps Rule.** Uppercase exists in exactly one form: inside a mono coordinate or ISO country code string (`58.35°N`, `EE`). Everywhere else, sentence case.

## Layout

A fixed 220px navigation rail on the left, a working field to its right that scrolls independently. The rail never moves, never collapses to icons, and never overlays content: the app is a desktop instrument and the window is its table (min 960×640, default 1200×800). At 960px the rail stays and the field reflows to one column.

Inside the field, content is capped at 1120px and aligned left with a 48px page margin — centred layouts are reserved for onboarding steps, which are a single question on an otherwise empty sheet, 640px wide, with the step's controls anchored at the bottom-left of that measure.

Density is high by default, because scanning twenty universities is the job: 36px controls, 14px body, 44px result rows, 24px panel padding. Space is a rhythm in fours — 4/8/12/16/24/32/48 — and the section step is the largest one; screens never stack more than three vertical sections.

The Finder is the one screen with a two-region layout: the globe occupies the field at rest and shrinks to a 380px column at the left when a search runs, so results read as a long ranked column to its right. Results are rows in a single column sorted by fit, each with a hairline separator — not a card grid. A grid implies equal weight; these universities are ranked.

Longer strings: Spanish and Vietnamese run up to 30% longer than English, so no control has a fixed width and every label wraps rather than truncates. Nav items and chips size to content; buttons have a 160px minimum, never a maximum.

## Elevation & Depth

Flat. Depth comes from tonal steps — background behind, panel on top, shoal inset — separated by 1px hairlines. Nothing has a drop shadow at rest. Dark panels add a 1px inner top highlight (`inset 0 1px 0 rgb(255 255 255 / 0.06)`) so the panel edge reads against black without a shadow. One shadow exists in the system, for the only things that may cover content: menus, dialogs, toasts, and the globe tooltip. It is ink-tinted and downward, never a grey blur halo. The dark panel rim (`--panel-rim`) applies only to `Panel`, the FactLine popover and the Combobox list, via `inset-shadow-(--panel-rim)`.

### Shadow Vocabulary
- **Floating layer** (`box-shadow: 0 12px 32px -16px rgb(0 0 0 / 0.35)`, dark `0.5`): popovers, dialogs, the combobox list, toasts.
- **Lifted globe** (`box-shadow: 0 24px 64px -32px rgb(0 0 0 / 0.45)`): behind the globe's canvas only, to separate the sphere from the ground.

### Named Rules
**The Flat Chart Rule.** A panel is flat unless it floats above another panel. If a shadow is doing work a hairline could do, the hairline wins.

## Shapes

Printed, not printed-out: 1px rules, 2px chip corners, 4px controls, 6px panels, and one circle — the globe — plus 20px circular country discs. No 16px-plus radii, no soft rounded rectangles standing in for hierarchy, no glass, no blur on panels (the welcome glow is a background layer, not a panel). Gradients are limited to the ember places named above.

Selected states are drawn, not filled wherever possible: a 3px ember dot on the left edge of a nav item, a 2px ember rule on the left edge of a row, an ember outline on a country, a 2px ember tick on a chip's leading edge. Sharp geometry is the chart's grammar; a selection should read as a mark made with a pen.

Country identity is a circular flag disc from the bundled SVG set — never an emoji flag, which renders as two letters on Linux and breaks the illusion on the first screenshot.

## Components

### Buttons
- **Shape:** 4px corners, 36px tall, 16px horizontal padding, 12px/500 label in sentence case.
- **Primary:** filled ember with the contrasting text (white on light, black on dark); one per screen region, naming its action ("Start onboarding", "Search 12 regions"). Never "Submit". In dark mode, hover and focus add the faint ember glow.
- **Hover / Press:** fill shifts to Ember Deep; 120ms colour transition. The dark-mode glow is the only extra.
- **Secondary:** Panel fill with a 1px Hairline stroke and ink text — the default for "Test connection", "Refresh", "Cancel".
- **Quiet:** text-only in Chart Grey, underline on hover, for tertiary actions inside rows ("Remove", "Save").
- **Focus:** a 1px ember rule offset 2px outside the control, always visible on keyboard focus; never removed for aesthetics.

### Chips
- **Style:** rectangular tickets, not pills — 2px corners, 1px Hairline stroke, Panel fill, 12px/500 label, 24px tall. Scope chips carry a mono country code when the chip is a country.
- **State:** selected chips invert to ink fill with panel text and gain a 2px ember tick on the leading edge. Filter chips show an ember tick only, keeping the label legible at 12px. In dark, the tick on the white selected chip measures 2.9:1, under the 3:1 graphical target; it is decorative, and the panel-coloured label (19.6:1) carries the state.
- **Carries:** career chips, continent chips, country scope chips, language badges, tuition badges. Language and tuition badges are read-only and use the shoal fill with a 1px hairline.

### Panels & Rows
- **Corner Style:** 6px.
- **Background:** Panel on Background; nested regions use Shoal.
- **Shadow Strategy:** none (see Elevation & Depth); dark panels take the 1px top rim only.
- **Border:** 1px Hairline on all four sides; a panel that sits flush to the field edge drops the border on that side instead of insetting.
- **Internal Padding:** 24px; 16px for dense table cells.
- **Result row:** 44px, rank in mono at the left, university name in Title, one line of body, fit code, source count, and a 1px separator below. Hover fills with Shoal and reveals the row's quiet actions; selected adds the 2px ember left rule.

### Inputs & Fields
- **Style:** Panel fill, 1px Hairline, 4px corners, 36px tall, ink text, Chart Grey placeholder.
- **Focus:** the Hairline turns ink and a 2px ember rule appears flush outside the field — the same focus mark as buttons, so focus always looks the same across the app.
- **Error:** 1px ember stroke plus a 12px message below in ember; the message states what to do, not that something is wrong.
- **Disabled:** Shoal fill, Chart Grey text, no stroke change.

### Navigation
- 220px rail on Background. In light mode a 1px right hairline separates it from the field; in dark mode there is no line, because black on black reads clean. Wordmark in Title weight with a mono "BETA" tag beside it — the tag is 10px Plex Mono, 1px hairline border, no fill.
- Items are 32px rows, 13px label, Chart Grey with a 16px Lucide icon at 0.85 opacity. Active item: ink text, Shoal fill, and a 3px ember dot on the left edge. Hover: Shoal fill, ink text, 120ms. No pills, no icon-only state.
- The language switcher sits at the bottom of the rail, as a quiet control with the current language shown in prose, not a flag.

### Fact Line (signature)
The product's central component, used everywhere a sourced fact appears: tuition, deadlines, language requirements, exam policy.
- A 14px label in Chart Grey, the value in ink body at `1rem` weight 500, and a mono source count superscript (`¹ ² ³`) after the value.
- Hover or focus on the superscript opens a small floating layer with the source tag ("official" in Evidence Green, "third-party" in Chart Grey), the quoted excerpt at 13px in a left-ruled block, and the URL as a quiet link.
- Missing facts are not hidden and not greyed into silence: the value slot reads "Not found — check official site" in Chart Grey with a 1px dashed underline, and the row keeps its height so a gap is legible as a gap. A screen with five missing facts should look honest, not broken.
- Never render a value without its superscript, and never render a superscript without a working URL.

### The Globe
Black ground in dark mode and light grey ground in light mode (the ocean is the app background), Land grey land, Hairline graticule every 30°, no labels at rest. The atmosphere is a faint ember tint in dark mode and a neutral grey haze in light mode. Idle auto-rotation at 0.35°/s. Hover lifts the country 2px and outlines it in ink with a tooltip naming country and known universities. Selected countries are filled and outlined in ember. A continent chip flies the camera in 900ms with an ease-in-out, then holds. On search, the globe contracts to its 380px column in 400ms and stays interactive — the student may still change scope mid-run while the ranked column fills. No texture, no warm or buff fill.

### Motion
180ms, `cubic-bezier(0.2, 0, 0, 1)` for state changes; 400–900ms only for the globe's fly-to and its contraction. Screen transitions keep the existing 8px horizontal slide and fade at 180ms. Result rows arrive in rank order with a 24ms stagger capped at eight rows, and are never re-animated when they re-sort. No scroll-triggered reveals, no looping decorative motion beyond the search dot's pulse, no confetti. `prefers-reduced-motion` removes all transforms and keeps opacity only.

## Do's and Don'ts

### Do:
- **Do** draw structure with 1px Hairline rules and the shoal tonal step; a new panel starts with a rule, not a shadow.
- **Do** keep every screen to one ember action and at most one ember mark per row.
- **Do** put a mono value next to any number a student might compare: tuition, deadline, distance-in-days, source count.
- **Do** design the missing-fact state as carefully as the present one: "Not found — check official site" in Chart Grey, dashed underline, row height preserved.
- **Do** let the globe be the only expressive object on the screen; around it, restraint.
- **Do** verify contrast on both themes before shipping a new token (body text ≥ 4.5:1, hairlines ≥ 1.5:1 against the surface they sit on).
- **Do** size controls to content so Spanish and Vietnamese strings wrap instead of truncate.

### Don't:
- **Don't** use gradients outside the two ember places (search dot, dark welcome glow). No gradient on the globe, on cards, or as a "subtle wash".
- **Don't** put the same soft shadow on many cards; that single habit is what makes an app read as generated.
- **Don't** use rounded-pill nav or buttons, glass/blur panels, or a 16px radius on a 44px row.
- **Don't** use emoji as icons, flags, or fit labels — the product spec's 🎯📊🗣💰 become the mono codes `CAR / ADM / LNG / CST` in a chip.
- **Don't** use Evidence Green for success, completion, or celebration; it means verified evidence and nothing else.
- **Don't** add decorative illustrations, mascots, or "friendly" blob shapes to empty states — an empty screen is a question with a next action, set in the same chart language.
- **Don't** animate anything the student did not cause, except the globe's idle rotation and the arrival of search results.

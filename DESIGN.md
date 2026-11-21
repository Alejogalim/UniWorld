---
name: UniWorld
description: A working chart of where a student could study — real universities, real facts, sourced.
colors:
  ink: "oklch(0.255 0.033 250)"
  chart-grey: "oklch(0.52 0.022 245)"
  pale-sea: "oklch(0.962 0.01 205)"
  chalk-paper: "oklch(0.995 0.003 205)"
  shoal: "oklch(0.935 0.014 210)"
  hairline: "oklch(0.88 0.013 215)"
  correction-magenta: "oklch(0.5 0.195 355)"
  correction-magenta-deep: "oklch(0.43 0.17 355)"
  surveyed-green: "oklch(0.505 0.085 168)"
  land-buff: "oklch(0.905 0.03 85)"
  night-watch: "oklch(0.205 0.024 245)"
  night-panel: "oklch(0.245 0.026 245)"
  night-ink: "oklch(0.94 0.01 220)"
  night-grey: "oklch(0.72 0.02 230)"
  correction-magenta-night: "oklch(0.7 0.19 355)"
  surveyed-green-night: "oklch(0.76 0.11 168)"
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
  pill: "9999px"
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
    backgroundColor: "{colors.correction-magenta}"
    textColor: "{colors.chalk-paper}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.correction-magenta-deep}"
    textColor: "{colors.chalk-paper}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.chalk-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.label}"
  button-quiet:
    backgroundColor: "{colors.chalk-paper}"
    textColor: "{colors.chart-grey}"
    padding: "0 8px"
    height: "28px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.chalk-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  chip:
    backgroundColor: "{colors.chalk-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
    typography: "{typography.label}"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk-paper}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  panel:
    backgroundColor: "{colors.chalk-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
    typography: "{typography.body}"
  nav-item:
    backgroundColor: "{colors.pale-sea}"
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

**Creative North Star: "The Corrected Chart"**

UniWorld is a working chart, not a poster of one. A nautical chart is the least decorative map there is: pale water, ink lines, land held in a single buff fill, and a margin full of corrections dated so the reader knows exactly what is current and what is stale. That last part is the whole product. A chart earns trust by showing its sources, its survey dates, and the places where the soundings are unknown — the same discipline UniWorld promises when it refuses to invent a tuition figure.

The surface is an instrument used at a desk, at night, on a laptop, often by a sixteen-year-old comparing three countries at once. So this is an **Operate** system: density and scanability first, expression spent in exactly two places — the globe, which is the one object allowed to be beautiful, and Correction Magenta, which is the one color allowed to raise its voice. Everything else is paper, ink, and a hairline. Depth is tonal, not shadowed; structure is drawn with rules, not boxes; nothing is a rounded card floating on a gradient.

The existing scaffold is stock shadcn neutral: pure grey, Inter, `0.625rem` radii, equal-weight cards. It is the thing this document replaces, not the thing it documents. Three deliberate rejections: warm cream plus serif plus terracotta (the editorial template); a neon accent on near-black (the landing-page template); and a grid of identical rounded cards with the same soft shadow on each (the SaaS template). UniWorld is a chart, and charts look like charts.

**Key Characteristics:**
- Cool pale-sea ground, chalk-white panels, deep ink text; one warm note (`land-buff`) reserved for land on the globe.
- Exactly one signal hue, used for what needs the student now — never as decoration.
- Flat by default: 1px hairlines and tonal steps instead of shadows; one shadow exists, for layers that float.
- One face (Agrave Pro) at two weights, plus a mono for measured values; no display serif, no third family.
- Results are a ranked column of rows, never a grid of equal cards.
- Every fact carries its source or says it is missing. The missing state is designed, not hidden.
- Motion answers an action; nothing animates in on scroll.

## Colors

A cool, low-chroma sea and paper ground with a single deep carmine signal — the palette of a chart table under a desk lamp, not of a sunset.

### Primary
- **Correction Magenta** (`oklch(0.5 0.195 355)`): the only saturated color on most screens. Filled primary buttons, the selected scope on the globe, the active nav rule, deadlines under 30 days, and the live "searching" pulse. Roughly 10% of pixels, never more.
- **Correction Magenta, Deep** (`oklch(0.43 0.17 355)`): pressed and hover state of the same control. It is a state, not a second accent.

### Secondary
- **Surveyed Green** (`oklch(0.505 0.085 168)`): a muted surveyor's green used only for evidence — the verified tick next to a sourced fact, the "official" source tag, the count of facts that passed the quote check. It never appears on a button, a badge of celebration, or a success toast.

### Tertiary
- **Land Buff** (`oklch(0.905 0.03 85)`): fill only, never text, never a border on UI chrome. It exists for land polygons in the globe and for the selected-country veil. It is the single warm note in a cold system and the reason the app does not read as clinical.

### Neutral
- **Deep Water Ink** (`oklch(0.255 0.033 250)`): all primary text, icons, and the 1px rules that do the structural work. A blue-black, never `#000`.
- **Pale Sea** (`oklch(0.962 0.01 205)`): the app ground behind everything.
- **Chalk Paper** (`oklch(0.995 0.003 205)`): panels, inputs, and any surface that must read as a sheet laid on the ground. Chalk white, not cream.
- **Shoal** (`oklch(0.935 0.014 210)`): the second tonal step — table headers, hovered rows, the active nav field, inset sections.
- **Hairline** (`oklch(0.88 0.013 215)`): every 1px rule and input stroke. Rules carry structure here; if a border is decorative, delete it.
- **Chart Grey** (`oklch(0.52 0.022 245)`): secondary text, metadata, and the "Not found" state. Passes AA on both paper and sea.

### Dark theme ("Night Watch")
The chart at night: a deep desaturated sea-blue ground, not black. Ground `night-watch`, panels `night-panel`, text `night-ink`, secondary `night-grey`. The signal hues lift to `correction-magenta-night` and `surveyed-green-night` so they keep AA contrast; land buff stays as a fill. Dark mode is the same chart with the lamp off — same rules, same restraint, no glow and no neon.

### Named Rules
**The Correction Rule.** Magenta is the chart's correction: it marks only what the student must act on now — the primary action on this screen, the scope they selected, a deadline inside 30 days. Never a heading, never an icon color, never a gradient stop. If two magenta things compete on one screen, one of them is wrong.

**The Evidence Rule.** Green means evidence, and only evidence: a fact that carries a source and a matching quote. It may not be used for "done", "success", or celebration — in this product the only thing worth celebrating is that something was verified.

**The Land Buff Rule.** Warm buff is land. Never a card, a highlight, or a "premium" surface, or the palette loses its one earth note and starts to read as template.

## Typography

**Display Font:** Agrave Pro (with Inter Variable, sans-serif)
**Body Font:** Agrave Pro — one family across the whole app; only size and weight shift
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, monospace)

**Character:** Agrave Pro carries every word in the app. It is a narrow humanist sans with a high x-height and slightly clipped terminals — closer to chart lettering than to a UI grotesque, and it stays readable down to 12px labels, which is why it replaced the neutral scaffolding face rather than merely decorating headings. Only two cuts are installed (400 and 700), so hierarchy comes from size, case, and color, not from a 500/600 middle range: `font-medium` resolves to 400 and `font-semibold` to 700, and no design may depend on an intermediate weight. IBM Plex Mono remains the instrument's readout — coordinates, counts, dates, currencies — and never speaks in sentences.

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

Inside the field, content is capped at 1120px and aligned left with a 48px page margin — centered layouts are reserved for onboarding steps, which are a single question on an otherwise empty sheet, 640px wide, with the step's controls anchored at the bottom-left of that measure.

Density is high by default, because scanning twenty universities is the job: 36px controls, 14px body, 44px result rows, 24px panel padding. Space is a rhythm in fours — 4/8/12/16/24/32/48 — and the section step is the largest one; screens never stack more than three vertical sections.

The Finder is the one screen with a two-region layout: the globe occupies the field at rest and shrinks to a 380px column at the left when a search runs, so results read as a long ranked column to its right. Results are rows in a single column sorted by fit, each with a hairline separator — not a card grid. A grid implies equal weight; these universities are ranked.

Longer strings: Spanish and Vietnamese run up to 30% longer than English, so no control has a fixed width and every label wraps rather than truncates. Nav items and chips size to content; buttons have a 160px minimum, never a maximum.

## Elevation & Depth

Flat. Depth comes from three tonal steps — pale sea behind, chalk paper on top, shoal inset — separated by 1px hairlines. Nothing has a drop shadow at rest. One shadow exists in the system, for the only things that may cover content: menus, dialogs, toasts, and the globe tooltip. It is ink-tinted and downward, never a grey blur halo.

### Shadow Vocabulary
- **Floating layer** (`box-shadow: 0 12px 32px -16px oklch(0.255 0.033 250 / 0.35)`): popovers, dialogs, the combobox list, toasts.
- **Lifted globe** (`box-shadow: 0 24px 64px -32px oklch(0.255 0.033 250 / 0.45)`): behind the globe's canvas only, to separate the sphere from the sea.

### Named Rules
**The Flat Chart Rule.** A panel is flat unless it floats above another panel. If a shadow is doing work a hairline could do, the hairline wins.

## Shapes

Printed, not printed-out: 1px rules, 2px chip corners, 4px controls, 6px panels, and one circle — the globe — plus 20px circular country discs. No 16px-plus radii, no soft rounded rectangles standing in for hierarchy, no glass, no blur, no gradient.

Selected states are drawn, not filled wherever possible: a 2px magenta rule on the left edge of a row or nav item, a magenta outline on a country, a 2px magenta tick on a chip's leading edge. Sharp geometry is the chart's grammar; a selection should read as a mark made with a pen.

Country identity is a circular flag disc from the bundled SVG set — never an emoji flag, which renders as two letters on Linux and breaks the illusion on the first screenshot.

## Components

### Buttons
- **Shape:** 4px corners, 36px tall, 16px horizontal padding, 12px/500 label in sentence case.
- **Primary:** filled Correction Magenta with Chalk Paper text; one per screen region, naming its action ("Start onboarding", "Search 12 regions"). Never "Submit".
- **Hover / Press:** fill shifts to Deep Magenta; no lift, no shadow, 120ms color transition only.
- **Secondary:** Chalk Paper fill with a 1px Hairline stroke and ink text — the default for "Test connection", "Refresh", "Cancel".
- **Quiet:** text-only in Chart Grey, underline on hover, for tertiary actions inside rows ("Remove", "Save").
- **Focus:** a 1px magenta rule offset 2px outside the control, always visible on keyboard focus; never removed for aesthetics.

### Chips
- **Style:** rectangular tickets, not pills — 2px corners, 1px Hairline stroke, Chalk Paper fill, 12px/500 label, 24px tall. Scope chips carry a mono country code when the chip is a country.
- **State:** selected chips invert to ink fill with paper text and gain a 2px magenta tick on the leading edge. Filter chips show a magenta tick only, keeping the label legible at 12px.
- **Carries:** career chips, continent chips, country scope chips, language badges, tuition badges. Language and tuition badges are read-only and use the shoal fill with no stroke.

### Panels & Rows
- **Corner Style:** 6px.
- **Background:** Chalk Paper on Pale Sea; nested regions use Shoal.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Hairline on all four sides; a panel that sits flush to the field edge drops the border on that side instead of insetting.
- **Internal Padding:** 24px; 16px for dense table cells.
- **Result row:** 44px, rank in mono at the left, university name in Title, one line of body, fit code, source count, and a 1px separator below. Hover fills with Shoal and reveals the row's quiet actions; selected adds the 2px magenta left rule.

### Inputs & Fields
- **Style:** Chalk Paper fill, 1px Hairline, 4px corners, 36px tall, ink text, Chart Grey placeholder.
- **Focus:** the Hairline turns ink and a 2px magenta rule appears flush outside the field — the same focus mark as buttons, so focus always looks the same across the app.
- **Error:** 1px magenta stroke plus a 12px message below in magenta; the message states what to do, not that something is wrong.
- **Disabled:** Shoal fill, Chart Grey text, no stroke change.

### Navigation
- 220px rail on Pale Sea, separated by a 1px right hairline. Wordmark in Title weight with a mono "BETA" tag beside it — the tag is 10px Plex Mono, 1px hairline border, no fill.
- Items are 32px rows, 13px label, Chart Grey with a 16px Lucide icon at 0.85 opacity. Active item: ink text, Shoal fill, and a 2px magenta rule on the left edge. Hover: Shoal fill, ink text, 120ms. No pills, no icon-only state.
- The language switcher sits at the bottom of the rail, as a quiet control with the current language shown in prose, not a flag.

### Fact Line (signature)
The product's central component, used everywhere a sourced fact appears: tuition, deadlines, language requirements, exam policy.
- A 14px label in Chart Grey, the value in ink body at `1rem` weight 500, and a mono source count superscript (`¹ ² ³`) after the value.
- Hover or focus on the superscript opens a small floating layer with the source tag ("official" in Surveyed Green, "third-party" in Chart Grey), the quoted excerpt at 13px in a left-ruled block, and the URL as a quiet link.
- Missing facts are not hidden and not greyed into silence: the value slot reads "Not found — check official site" in Chart Grey with a 1px dashed underline, and the row keeps its height so a gap is legible as a gap. A screen with five missing facts should look honest, not broken.
- Never render a value without its superscript, and never render a superscript without a working URL.

### The Globe
Pale Sea ocean, Land Buff land, Hairline graticule every 30°, no labels at rest. Idle auto-rotation at 0.35°/s. Hover lifts the country 2px and outlines it in ink with a tooltip naming country and known universities. Selected countries take a magenta outline and a 12% land-buff veil; a continent chip flies the camera in 900ms with an ease-in-out, then holds. On search, the globe contracts to its 380px column in 400ms and stays interactive — the student may still change scope mid-run while the ranked column fills.

### Motion
180ms, `cubic-bezier(0.2, 0, 0, 1)` for state changes; 400–900ms only for the globe's fly-to and its contraction. Screen transitions keep the existing 8px horizontal slide and fade at 180ms. Result rows arrive in rank order with a 24ms stagger capped at eight rows, and are never re-animated when they re-sort. No scroll-triggered reveals, no looping decorative motion, no confetti. `prefers-reduced-motion` removes all transforms and keeps opacity only.

## Do's and Don'ts

### Do:
- **Do** draw structure with 1px Hairline rules and the shoal tonal step; a new panel starts with a rule, not a shadow.
- **Do** keep every screen to one magenta action and at most one magenta mark per row.
- **Do** put a mono value next to any number a student might compare: tuition, deadline, distance-in-days, source count.
- **Do** design the missing-fact state as carefully as the present one: "Not found — check official site" in Chart Grey, dashed underline, row height preserved.
- **Do** let the globe be the only expressive object on the screen; around it, restraint.
- **Do** verify contrast on both themes before shipping a new token (body text ≥ 4.5:1, hairlines ≥ 1.5:1 against the surface they sit on).
- **Do** size controls to content so Spanish and Vietnamese strings wrap instead of truncate.

### Don't:
- **Don't** use gradients anywhere — not on the globe, not on cards, not as a "subtle wash". The chart has no weather.
- **Don't** put the same soft shadow on many cards; that single habit is what makes an app read as generated.
- **Don't** use rounded-pill nav or buttons, glass/blur panels, or a 16px radius on a 44px row.
- **Don't** use emoji as icons, flags, or fit labels — the product spec's 🎯📊🗣💰 become the mono codes `CAR / ADM / LNG / CST` in a chip.
- **Don't** use Surveyed Green for success, completion, or celebration; it means verified evidence and nothing else.
- **Don't** add decorative illustrations, mascots, or "friendly" blob shapes to empty states — an empty screen is a question with a next action, set in the same chart language.
- **Don't** animate anything the student did not cause, except the globe's idle rotation and the arrival of search results.

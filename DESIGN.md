---
name: UniWorld
description: A working chart of where a student could study, with real universities, real facts and sources, drawn over a night sky.
colors:
  ink: "#0a0a0a"
  chart-grey: "#636366"
  background: "#f7f6f4"
  panel: "#ffffff"
  shoal: "#f1efec"
  hairline: "#c2beb8"
  land: "#d9d9d9"
  signal: "#b53204"
  signal-deep: "#952903"
  evidence: "#2a7050"
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
  star-light: "#b8a596"
  star-warm-light: "#ff7a3d"
  globe-ocean: "#fbfaf8"
  primary-text: "#ffffff"
  primary-text-dark: "#000000"
typography:
  display:
    fontFamily: "Google Sans, Inter Variable, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Google Sans, Inter Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Google Sans, Inter Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Google Sans, Inter Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: "Google Sans, Inter Variable, system-ui, sans-serif"
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

UniWorld is still a working chart: real universities, real facts, a source on every value, and a visible gap where the soundings are unknown. The Ember Glow pass (plan 16) keeps that discipline and adds two things the owner asked for: soft, squircle-like surfaces with a light rim, and a faint, still starfield behind every screen. The chart sits on a night sky in dark mode and on warm paper under the same ember light in light mode: one atmosphere, two grounds (plan 26).

The surface is still an instrument used at a desk, often by a sixteen-year-old comparing three countries at once. So this is still an **Operate** system: scanning and density come first, and expression is spent in a few marked places: the globe, the one ember element per screen, the large numerals, and the stars. Everything else is ink, grey, a hairline and a soft surface.

Three rejections still stand: a warm cream and serif editorial template, a neon accent used everywhere, and a grid of identical rounded cards with the same shadow on each. The owner's brief changed one thing: surfaces may now be soft and gradient-rimmed, but only in the places listed under Gradients and Glow.

**Key Characteristics:**
- Ground: black with white stars in dark mode; soft off-white paper (`#f7f6f4`) with near-black stars (a few warm-brown) in light mode. Both carry the same static ember glow from the bottom centre.
- One warm colour, the ember. It marks what the student must act on now, and it glows in a few fixed places.
- Surfaces are soft: 28px cards with a 1px rim. Dark cards are a vertical gradient; light cards are white sheets with a 5% to 8% rim and a soft warm shadow.
- One face, Google Sans, in weights 400 to 700. Numerals are always tabular.
- Headlines are two-tone: grey body text with the key phrase in ink, used on the welcome headline and empty-state titles only.
- Results are still a ranked column of rows, never a grid of equal cards.
- Every fact carries its source or says it is missing. The missing state is designed, not hidden.
- Motion answers an action. The twinkling stars, the rare shooting star, the arrival of search results and the small light on the Shortlist status track are the only things that move without a cause.

## Colors

Monochrome first. Ember is the only colour, and it is spent in named places.

### Primary
- **Ember Signal** (`#b53204` light, `#ff6a2b` dark): the focus ring, the selected country, the search-in-progress dot, deadlines inside 30 days, the ember dot on a selected row or chip, and the ember text where the ember is itself the message. Roughly 5% of pixels.
- **Ember Signal, Deep** (`#952903` light, `#ff8a4d` dark): the pressed and hover state of signal text.
- **Primary button fill**: a vertical gradient, `#c4400b` to `#b83304` in light (white text) and `#ff8a3d` to `#ff5a1f` in dark (black text). It is a fill, not a second accent.

### Secondary
- **Evidence Green** (`#2a7050` light, `#5fbf8f` dark): verified evidence only: the official tag, the verified tick next to a sourced fact, and the verified count. Never a button, a celebration or a success toast.

### Neutral
- **Ink** (`#0a0a0a` light, `#ffffff` dark): primary text, icons, and the hairlines that do structural work.
- **Background** (`#f7f6f4` light, `#000000` dark): the ground behind everything.
- **Panel** (`#ffffff` light, `#0c0c0d` dark, with a `#151517` to `#0b0b0c` gradient in dark): sheets laid on the ground.
- **Shoal** (`#f1efec` light, `#161617` dark): the second tonal step: hover, the active nav item, inset regions, bubbles.
- **Hairline** (`#c2beb8` light, `#39393c` dark): every 1px rule and input stroke.
- **Chart Grey** (`#636366` light, `#8e8e93` dark): secondary text and metadata.
- **Land** (`#d9d9d9` light, `#26262a` dark): globe land.
- **Globe ocean** (`#fbfaf8` light, `#060607` dark): the globe sphere; the atmosphere is an ember rim in dark mode (ember mixed 85% into the ocean, shell altitude 0.2), and a soft peach ember rim in light mode (ember mixed 35%, altitude 0.12).
- **Star** (dark: `#ffffff`, and `#fff4ea` on about 15% of stars; light: near-black `#0a0a0a`, and warm-brown `#4a2c1e` on about 15%): the starfield. No other colour.

### Token table

| token | light | dark |
|---|---|---|
| `--background` | `#f7f6f4` | `#000000` |
| `--panel` / `--surface-fill` | `#ffffff` flat (as a one-colour gradient, so the rim can layer under it), with `--surface-shadow` | `#0c0c0d`, gradient `#151517` to `#0b0b0c` |
| `--shoal` | `#f1efec` | `#161617` |
| `--foreground` | `#0a0a0a` | `#ffffff` |
| `--chart-grey` | `#636366` | `#8e8e93` |
| `--hairline` | `#c2beb8` | `#39393c` |
| `--signal` / `--signal-deep` | `#b53204` / `#952903` | `#ff6a2b` / `#ff8a4d` |
| `--evidence` | `#2a7050` | `#5fbf8f` |
| `--ember-0` / `-1` / `-2` | `#b3210a` / `#ff5a1f` / `#f7b267` | same |
| `--ember-button-top` / `-bottom` | `#c4400b` / `#b83304` | `#ff8a3d` / `#ff5a1f` |
| `--ember-glow` | none (transparent) | ember-1 at 55% (focus ring and range thumb) |
| `.panel-ember` outer glow | ember-1 22% ring (1px), ember-1 at 30% (40px, spread -8px), ember-0 at 35% (48px, offset 14px down) | a 1px `--rim-top` ring, ember-1 at 45% (44px, spread -6px), ember-0 at 55% (60px, offset 14px down) |
| `--rim-top` / `--rim-bottom` | 5% black to 8% black | 16% white to 4% white |
| `--globe-ocean` | `#fbfaf8` | `#060607` |
| --surface-shadow | 0 1px 2px warm 5%, 0 6px 20px -8px warm 12% (rgb 64 32 12) | none |
| --star-base / --star-warm | #0a0a0a / #4a2c1e | #ffffff / #fff4ea |
| --star-alpha / --star-density | 0.9 / 1 | 1 / 1 |
| --star-twinkle-core / -glow | black at 60% / black at 14% | white at 60% / white at 27% |
| --star-shoot | #0a0a0a | #ffffff |
| `--land` | `#d9d9d9` | `#26262a` |

### Contrast
Measured with WCAG 2.x relative luminance. The full pair list is in `.plans/16-ui-glow-stars.md`, Builder notes. Summary:

| pair | ratio | target |
|---|---|---|
| ink on background / panel / shoal / glow peak (light) | 18.3 / 19.8 / 17.3 / 13.1 | 4.5:1 |
| chart grey on background / panel / shoal / glow peak (light) | 5.5 / 6.0 / 5.2 / 3.95 | 4.5:1 (peak residual) |
| signal text on background / panel / shoal / glow peak (light) | 5.7 / 6.1 / 5.4 / 4.05 | 4.5:1 (peak residual) |
| evidence on background / panel / shoal / glow peak (light) | 5.5 / 6.0 / 5.2 / 3.95 | 4.5:1 (peak residual) |
| white on primary button (light, both ends) / on signal | 5.1 to 6.0 / 6.1 | 4.5:1 |
| black on primary button (dark, both ends) | 6.7 to 9.0 | 4.5:1 |
| ink on dark card (top / bottom) | 18.2 / 19.7 | 4.5:1 |
| chart grey on dark card (top / bottom) | 5.6 / 6.0 | 4.5:1 |
| chart grey on the rendered dark ember glow (worst point, ember-0 at .35) | 4.75 | 4.5:1 |
| ember-2 numeral low stop on the glow | 6.4 to 8.5 | 3:1 |
| white on urgent pill (light) / black on urgent pill (dark) | 5.1 to 6.0 / 6.7 to 9.0 | 4.5:1 |
| hairline on background / panel / shoal (light) | 1.71 / 1.85 / 1.61 | 1.5:1 |
| hairline on card bottom (dark) | 1.71 | 1.5:1 |

The light glow peak is `#f9c7b4` (ember-1 at 30% over `#f7f6f4`, the bottom-centre point of the haze). Ink clears 4.5:1 on it. Chart grey (3.95:1), evidence (3.95:1) and signal text (4.05:1) fall short at that single point only: the glow fades to nothing 70% of the way out, so only text in the bottom-centre band is affected. This residual follows from the light haze opacity of 0.3 and is open for owner review.

Stars and text. A single star pixel under text is the worst case, and the result is not a clean pass:

| pair | ratio | target |
|---|---|---|
| ink text over a base star at alpha .15 (worst pixel) | 15.13 | 4.5:1 |
| chart grey text over a base star at alpha .15 (worst pixel) | 4.64 | 4.5:1 |
| chart grey text over a warm star (`#fff4ea`) at alpha .15 | 4.70 | 4.5:1 |
| chart grey text over a bright star's glow at .15 x .45 | 5.79 | 4.5:1 |
| chart grey text over a base star at alpha .30 (not used: rejected) | 2.63 | 4.5:1 |
| chart grey text over two stacked stars at .15 (worst pixel, overlapping layers) | 2.85 | 4.5:1 (residual) |
| chart grey text over a light-mode speck at its strongest (alpha .32 x .8) | 4.62 | 4.5:1 |
| chart grey text over a black star at alpha .288 on paper (strongest light star) | 2.83 | 4.5:1 (residual) |
| chart grey text over a warm-brown star (`#4a2c1e`) at alpha .288 on paper | 3.21 | 4.5:1 (residual) |
| chart grey text over a black twinkle core (alpha .6) on paper | 1.08 | 4.5:1 (residual, ten dots) |

The table above is the strict per-pixel view from plan 18, when every baked star was capped at alpha 0.15. The owner has since raised star alphas to 0.14 to 0.32 (bright cores 0.6) so the stars read as stars. Under those values chart-grey text can drop below 4.5:1 on a single star pixel, and two stacked stars are worse. This is accepted by design: the stars are decorative, sit behind the content, and cover a small share of the window. The measured figures are per pixel, not an average over a text run.

### Named Rules
**The Ember Rule.** Ember marks what the student must act on now: the primary action on the screen, the country they selected, a deadline inside 30 days, the search in progress, the one ember panel of the screen. Never a heading, never a link. If two ember things compete on one screen, one of them is wrong.

**The One Panel Rule.** Each screen has at most one `.panel-ember` surface. It is the screen's memorable element. Other panels are plain.

**The Evidence Rule.** Green means evidence only: a fact with a source and a matching quote. Never "done", "success" or celebration. One named exception (plan 36): the admitted seal, the 16px final node of a My universities status track, because the admission is the university's own decision. No other green on the track or the card.

**The Land Rule.** Land is a neutral grey fill on the globe, never warm.

## Typography

**Face:** Google Sans, the only family. `--font-sans`, `--font-heading` and `--font-mono` all resolve to the Google Sans stack. The latin, latin-ext and vietnamese subsets are bundled in `public/fonts/google-sans`, so Vietnamese diacritics render without a fallback face.

**Numerals:** `.font-mono` is the measured-value style. It is Google Sans with `font-variant-numeric: tabular-nums` and no tracking. Counts, days, scores and deadlines use it. Mono is no longer a different face.

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
| `--radius-control` | 14px | inputs, selects, textareas, comboboxes, rail nav rows, the chat composer's inner field, settings groups |
| `--radius-popover` | 20px | popovers, menus, the fact popover, chat bubbles, result rows on hover |

Circles are allowed for the globe, flag discs, dots and the profile initial in Settings. Nothing else: no 2px, 4px, 6px or 16px radius, and no other value. The legacy `rounded-sm/md/lg/xl` utilities map onto the four values.

## Surfaces & Depth

- **Panel (dark):** a vertical gradient `#151517` to `#0b0b0c`, with a 1px gradient rim (top 16% white, bottom 4% white). The rim is two background layers (`.rim`): the fill on the padding box and the rim gradient on the border box, so it keeps the radius. There is no mask and no pseudo-element. `.panel-ember` has no inner highlight.
- **Panel (light):** white, 28px, a 1px rim from 5% to 8% black, and a soft warm shadow (`--surface-shadow`). Inset panels (`Panel inset`) sit flat on shoal with no shadow. The chat composer pill takes the same shadow (`.lift`).
- **Rim:** `.rim` is a 1px gradient border on any element. It is used on panels, the active nav item, the selected program row, popovers and the composer. The rim gradient paints under the whole box, so a rim needs an opaque `--rim-fill` (`.surface`, or a `[--rim-fill:…]` class matching its background).
- **Shadow:** in dark, none at rest; in light, the soft `--surface-shadow` on white surfaces only. The one floating shadow (`--shadow-float`, warm in light) is for popovers, dialogs and the Atlas dock. The ember glow on `.panel-ember` is a named exception (below).
- **Flat by default:** structure is drawn with hairlines and tonal steps, not shadows.
- **Flat controls** (secondary buttons, the round footer buttons, the Toggle when off): a plain 1px `border-hairline` (`--hairline`, solid). Measured for the boundary: 1.82 / 1.70 / 1.57 on black, panel and shoal in dark; 1.55 / 1.78 / 1.62 on background, panel and shoal in light. The gradient rim stays on panels, popovers, the active nav row, the program row and the composer.

## Gradients & Glow

Gradients and glows are allowed in these places and nowhere else:

1. **Dark panel surface and rim.** Vertical gradients on `Panel` in dark mode only.
2. **Ember panel (`.panel-ember`).** The glow is outside the box only, and static: dark has a soft halo around the whole card (a 1px rim ring, ember-1 at 45% over 44px, ember-0 at 55% over 60px, offset 14px down). There is no inner wash and no fade-in. Light has a softer halo: a 1px ember-1 ring at 22%, ember-1 at 30% over 40px, ember-0 at 35% over 48px, offset 14px down. One per screen.
3. **Primary button (`.ember-button`).** A vertical gradient in both themes, and in dark a soft ember glow on hover and focus.
4. **Large numerals (`.numeral-ember`).** Ink to ember-2 (dark) or to signal (light) over the lower half of the glyph.
5. **Ambient haze (`.ambient-haze`).** One static glow behind the content and above the stars, never animated. Both themes glow from the bottom centre: `radial-gradient(60% 45% at 50% 100%, ember-1, transparent 70%)`. Dark: opacity 0.14. Light: opacity 0.3, a bit stronger so it reads on paper. Light peak about `#f9c7b4`.
6. **Toggle on, and the progress dot (`.ember-fill`).** Dark: the ember gradient. Light: flat signal.
7. **Globe atmosphere.** Dark: an ember rim on the sphere's edge (`mix(ocean, ember, 0.85)`, altitude 0.2). Light: a peach rim (`mix(ocean, ember, 0.35)`, altitude 0.12).
8. **Rail over the Atlas globe (`.app-rail--over-globe`).** A static horizontal wash, the ground colour at 70% to transparent, so the rail icons stay legible over the globe. Atlas only; never blurred, never animated.

Everything else is flat. Nothing that glows is animated.

## Starfield

Implemented in `src/ui/layout/Starfield.tsx` (one static canvas plus a few DOM elements) and `src/index.css` (`.star-field`, `.star-twinkles`, `.star-twinkle`, `.star-shoot`). Mounted once in `AppShell`.

- **Why this design:** the earlier CSS-tile starfield (animated, oversized layers) measured 9 fps in the real app on software WebKitGTK, against 62 fps with the stars hidden. Every full-window animated layer cost about 20 ms per frame in that compositor. A drifting canvas repaints the whole window on every frame, so the sky no longer drifts at all.
- **Method:** a single `<canvas>` fixed behind everything (`pointer-events: none`, `aria-hidden`, `contain: strict`). Its backing store is the viewport at device pixel ratio 1, so the CSS size equals the backing size. The stars are drawn once on mount and again after a 200 ms debounced resize. Nothing redraws on a timer or a frame loop.
- **Twinkles:** ten small absolutely positioned dots (`.star-twinkle`, 12 px: a sharp core of radius 1.3 px over a soft glow out to 6 px, colours from the tokens) in a fixed wrapper. Each animates only `opacity`, pulsing gently between 0.6 and 1, over 5 to 9 s with a random negative delay so they are staggered.
- **Shooting star:** one thin streak (`.star-shoot`, 80 by 1.5 px, rotated 25 degrees). Every 30 to 60 s, at random, it starts from a random point in the upper 60% of the window and moves 320 px along its angle over 900 ms, animating only `transform` and `opacity` through the Web Animations API. No timer runs while paused.
- **Pauses:** `document.hidden` or window blur freezes the twinkles (`is-paused` on the wrapper) and stops the shooting-star timer; focus or visibility resumes both. `prefers-reduced-motion` renders the static canvas only, with no twinkles and no shooting star. A theme change tears the sky down and draws it again with the new tokens.
- **Density:** one star per 7 000 px² (about 300 on 1920 x 1080), split 55%, 30% and 15% across three depth layers. Radii 0.5, 0.9 and 1.3 px. Light multiplies the count by `--star-density` (1, the same count as dark).
- **Alpha:** random per star within its layer's range: far 0.14 to 0.22, mid 0.18 to 0.27, near 0.22 to 0.32. The owner chose visible stars over the strict text-contrast cap that earlier builds used (0.15). Light multiplies every alpha by `--star-alpha` (0.9).
- **Contrast note:** the stars are decorative. A star under a text glyph may locally dip below 4.5:1 by design (see the contrast table); the owner chose visibility over a per-pixel text target.
- **Colour:** `--star-base` and `--star-warm` (about 15% of stars), read once per activation. Dark: white and `#fff4ea`. Light: near-black `#0a0a0a` specks, with warm-brown `#4a2c1e` on about 15%. The twinkles use `--star-twinkle-core` / `--star-twinkle-glow` (white in dark, black in light) and the shooting star fades to `--star-shoot` (white in dark, near-black in light).
- **Always on:** the stars are always drawn, in both themes. There is no toggle and no setting.
- **Layer:** `z-index: -2` inside the isolated shell, under the ambient haze (`-1`), the rail, the header and the content.

## Logo

- **Mark:** a thin ring with a thick arc along its lower half, round-capped, on a square ground (1024 px PNG and SVG). The arc fades from white or near-black at the top to ember at the bottom.
- **Two versions by theme:** the dark-ground mark (black ground, white arc, ember bottom) in dark theme, and the light-ground mark (#eeeeee ground, near-black arc, deep ember bottom) in light theme. `src/ui/layout/Logo.tsx` picks one from the resolved theme.
- **Files:** `src/assets/logo/uniworld-logo-{light,dark}.{svg,png}` are the square app-icon sources. The dark PNG is the source for the app icons in `src-tauri/icons/`. The in-app marks are `src/assets/logo/uniworld-mark-{light,dark}.svg`: transparent ground, cropped to the ring and arc, with no square.
- **Use:** the rail shows the mark at 28px in a 36px box, at the same spot in both states (rail padding 12px). Collapsed, the mark is the button that expands the rail; expanded, it sits before the wordmark. In the UI, use only the cropped marks; the square files are for app icons. It is decorative (`alt=""`, `aria-hidden`); the wordmark carries the name.
- **On the light ground:** the light mark reads on `#f7f6f4`: near-black arc 18.3:1, deep ember 10.1:1, ember tip 3.8:1, 45% ring 3.3:1.

## Layout

The rail is its own full-height column on the left: 284px expanded, 72px collapsed to an icon dock, with transparent ground over the stars. It sits above the content layer (position relative, z-index 10). On Atlas the globe runs under it and the rail takes `.app-rail--over-globe`: no hairline, and a static wash of the ground colour, 70% at its left edge fading to transparent at its right edge, so the rail and the map read as one scene. Never a backdrop blur there: the globe redraws every frame. Its top row holds the logo: expanded, the logo, the wordmark and a 36px collapse button (`PanelLeftClose`) on the right; collapsed, the logo alone with a 36px expand button (`PanelLeftOpen`) directly below it, which expands the rail. Nav rows follow, then the language and theme buttons at the foot. The width change animates over 200ms (none under reduced motion).

The working column sits to the right: a page title centered above the content on every screen except the counselor, which has no title and gives its full height to the page. Content is capped at 1120px with a 48px page margin. Onboarding is a single 640px sheet. Settings is a single centred 640px column of grouped lists.

Density is still high by default: 40px controls, 15px body, 20px-radius result rows. Space is in fours, and the section step is the largest.

Atlas is a full-window globe with one floating glass dock in the bottom-right corner. The globe canvas is fixed to the whole window and runs under the rail; globe.gl's globeOffset keeps the sphere centred on the working column (half the rail width, so it follows the rail between 72px and 284px), so the atmosphere never stops at the rail edge. The dock is a container (`@container`) sized clamp(min(100%, 320px), 32vw, 600px) wide and clamp(300px, 44vh, 480px) tall, with the page's 24px gap (16px under 640px, where it spans the row and takes half the screen height). Its tabs (Careers, Countries, Search) sit along the bottom; it opens on hover or focus from a pill and folds back into the pill 900ms after the pointer leaves. The surface is `.finder-glass`: the panel colour at about 60% over an 18px backdrop blur with 1.4 saturation, a hairline stroke, a 1px inner top highlight and the float shadow; no gradient and nothing animated on the blur. Every tab adapts to the dock's width with container queries, never viewport breakpoints: 12px padding below 480px, a two-column country list and a right-hand fit column on result rows from 560px. The Countries tab is one compact column with no headings or hints: the filter field ("Filter or click a country on the globe"), one sideways-scrolling row of region chips ("Whole world" first, scrollbar hidden, a 24px fade at the right edge), a row of removable selected-country chips (flag, name, ×) with a quiet Clear only when any are chosen, then the country list taking the rest of the height and scrolling inside itself. Content scrolls inside the dock; only those two chip rows scroll sideways. Results are a ranked column of rows, not a grid.

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
- Rail items: 40px rows (36px wide when collapsed, on the logo's left edge), 14px corners, Google Sans 14px. Active: `rim` on shoal, with a 3px ember dot on the left edge. Hover: shoal.
- Footer: two round 40px buttons with a rim: language and theme.

### Result rows and lists
- A ranked row with a 28px-radius hover surface (20px in the list), the rank as a `.numeral-ember`, the university name in Title, a source count in Data type, and the fit values as pill badges. Selected rows take a rim and an ember dot.
- Urgent deadlines: an ember pill (`.ember-button`) holding the days-left number.

### Shortlist (Uni Manager)
Implemented in `src/ui/screens/MyUnis.tsx` and `src/ui/screens/myUnis/` (`TrackedUniCard`, `TrackedUniEditor`, `StatusProgress`, `status.ts`).
- **Overview of independent cards**, nearest deadline first (`sortByDeadline`), then no deadline, then passed. Each card is wide and read-only: name and place top-left, deadline top-right (relative note: passed, urgent in signal, or a quiet day count), the facts through the middle, and the status track along the bottom. Every card keeps the standard panel rim and shadow whatever its status (plan 36): the status lives on the track alone, and an urgent deadline is already marked by the ember days-left pill, so the card adds no glow.
- **Status track** (`StatusProgress`, plans 35 and 36): considering, preparing, applied, waiting, then one shared final-outcome node (admitted, waitlisted or rejected); the editor shows the three pipeline stages plus the outcome chips. One accent, ember; everything else is ink, grey and a hairline.
  - **Geometry:** a straight 2px line centred on a 16px node slot (20px in the editor), from the first node's centre to the last. Completed part in full ink, the rest a hairline. Nodes on the 4px grid: completed 8px ink discs, current 12px ember (signal) disc, upcoming 8px hollow with a 1.5px chart-grey border, a reached outcome 16px. Filled nodes carry a 2px ring in the ground colour (`--track-ground`: the panel on the card, the page ground in the editor), so they sit on the line like beads on a wire.
  - **Labels:** 12px / 16px, centred under each node 8px below it, in equal-width columns. Current: ink, weight 600 (19.8 light, 19.55 dark). Completed: ink at 75% (9.3 / 11.0). Upcoming: chart grey (6.0 / 6.0). Labels wrap; they never truncate.
  - **Light travels along the track:** every 5 to 7 s (random per card) a soft ember light (`--ember-1`, a 32px tail at 40% with a brighter 8px core, peak opacity 0.7) slides from the first node to the current one, decelerating, and fades into it; it never passes the current step. ember-1 rather than signal so it reads on the ink line in light mode (6.35:1). The current node breathes: a 1px ember ring grows to 1.8x at opacity 0.4 and fades, every 3.6 to 4.4 s. Both are named exceptions to "nothing that glows is ever animated": tiny elements, transform and opacity only, per-card CSS timing, running only while the card is on screen and the window is visible. They stop once a final outcome is reached.
  - **Status change:** the completed line fills from the old node to the new one (500ms, scaleX), the new current node pops with a soft spring (from 0.6, little overshoot), and its label fades to ink (300ms, `cubic-bezier(0.2, 0, 0, 1)`). A card remembers (for the session) the status it last showed, so the change plays when the list returns from the editor.
  - **Outcomes:** the final node becomes a 16px solid disc with a 10px lucide glyph knocked out in the ground colour. Admitted: evidence green with a check (the only green, see the Evidence Rule). Waitlisted: ink with a pause glyph. Rejected: chart grey with an x, and the completed line, nodes and labels go chart grey too. On an actual change to admitted or waitlisted, one soft ember ring expands once around the final node (1400ms); rejected has no flourish. No sparks, no second accent.
  - **First paint:** on entering Shortlist each card's line draws in left to right once (600ms, 60ms stagger per card, capped at eight cards), the nodes following it.
- **Full editor** per university (`TrackedUniEditor`): a local draft of every field, saved in one update on Save, with the three-stage pipeline plus the outcome controls.

### Settings
- **One centred 640px column** under the page title. Sections are 32px apart.
- **Grouped lists.** Each section is a small heading (14px, weight 500, Chart Grey, sentence case, aligned with the row text) over one group: panel fill with `rim` and the soft light-mode shadow (`rim surface`), 14px corners (`--radius-control`), rows split by 1px hairlines (`divide-hairline`). No section description lines. A group may carry one short muted footer line (13px, Chart Grey).
- **Rows** are 48px minimum (52px with a 40px combobox): label in ink at 14px on the left, the control or value on the right; an optional one-line muted hint under the label, only where a control needs it. Rows wrap on narrow windows.
- **Profile** is one identity row: the initial in a 36px shoal circle, the name at weight 500, a muted line "program · residence (or citizenship) · languages", and Edit profile, the page's only primary button.
- **Segmented control** (`SegmentedControl`): a pill track on shoal with a hairline stroke; the chosen segment is a raised pill on the panel fill with a rim. A radiogroup: arrow keys move and select, Home/End jump, disabled options are skipped and explain themselves in a tooltip. Used for Theme and AI provider.
- **API keys:** one row per provider with a status dot and text: ember dot for "Connected" (a test passed this session) or "Saved", hairline dot for "Not set". "Manage" is a quiet disclosure button (`aria-expanded`) that reveals the key field, Save, Test connection and Remove inline under the row.
- **Buttons:** quiet everywhere, except Edit profile (primary), Save key and the delete confirm (secondary). The destructive Delete text and the delete confirm use signal text, not a fill.

### Fact line (signature)
Unchanged in behaviour. A 14px label in Chart Grey, the value in body text, and a Data-style source superscript. The popover is a rimmed 20px surface. The missing fact reads "Not found, check official site" in Chart Grey, with a dashed underline, and keeps its row height.

### The Globe
Ocean `#fbfaf8` in light and `#060607` in dark, so the sphere glows against the stars. Land `#d9d9d9` in light and `#26262a` in dark. Graticule faint. Selected countries are filled with ember. Idle rotation at 0.35 degrees per second. The globe is a circle.

### Motion
State changes: 180ms, `cubic-bezier(0.2, 0, 0, 1)`. Press: 120ms scale. The panel glow fades in over 300ms on first paint, opacity only. The screen transition keeps the 8px slide and fade. Result rows arrive in rank order with a 24ms stagger capped at eight rows. A few stars twinkle and a rare shooting star crosses; nothing drifts. The globe fly-to and contraction keep their durations. The status track (Shortlist) carries a travelling ember light and a breathing current node as CSS keyframes on tiny elements, paused off screen and while the window is hidden; its status-change fill (500ms) and node pop are state-driven (framer-motion). On the owner's Linux software-rendering path only small elements may animate, with transform and opacity: never a full-card or full-window animated layer, and no `requestAnimationFrame` loop. `prefers-reduced-motion` removes transforms and keeps opacity: on the status track no loops, no outcome ring, no draw-in, no pop, and the fill becomes a 250ms fade.

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
- **Don't** use a radius outside the shape lock, or a pill on a card.
- **Don't** use emoji as icons, flags or labels.
- **Don't** use Evidence Green for success.
- **Don't** animate anything the student did not cause, except the globe's idle rotation, the arrival of results and the stars.
- **Don't** draw the starfield over the content as a separate layer, and don't animate the glow.

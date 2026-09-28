# Large-screen scaling and centring for the terenceOS view

> Implementation spec, approved 2026-09-13. Written for a coding agent to follow
> exactly. Continues `stage1.md`–`stage4.md`. Scope: the OS view only
> (`index.html`, `assets/css/os.css`, `assets/js/os.js`). The traditional view
> (`classic.html`) already scales and is not touched.

## Context

On a 27" monitor the desktop opens with the terminal and profile left of centre, and
everything looks small. Measured before this work (OS view, fresh load):

| Screen | Terminal | Profile | Pair's share of desktop width | Offset from desktop centre | Body / hero font |
|---|---|---|---|---|---|
| 1440×900 | 662×600 | 400×661 | 88% | +50px | 15 / 56px |
| 1920×1080 | 680×600 | 400×661 | 64% | −181px | 15 / 56px |
| 2560×1440 | 680×600 | 400×661 | 47% | −501px | 15 / 56px |
| 3840×2160 | 680×600 | 400×661 | 30% | −1141px | 15 / 56px |

### Root causes

1. **No resolution scaling.** `os.css` has 295 px values and no rem. The only fluid
   value, `--fs-display: clamp(34px, 4.4vw, 56px)`, caps at ~1273px wide. The
   traditional view does scale (root font 14.4px → 25.6px → 28px), so the two views
   are also inconsistent with each other.
2. **Hard-capped window geometry in JS.** `bootDefaults()` in `assets/js/os.js`:
   terminal `Math.min(680, …)` × `Math.min(600, H - 120)`, profile `pw = 400` ×
   `Math.min(660, H - 96)`. Ten windows carry fixed px `data-w/h/x/y` in `index.html`.
3. **Left-anchored placement.** Both boot windows start at `x: left` with `left = 124`
   (just past the desktop shortcut column). Only `y` is centred. Independent of (1)
   and (2). The single-terminal fallback and every other window's default position
   (`data-x/y`, tuned for a 1230×866 desktop) have the same bias.

### Decisions (do not re-litigate)

| Question | Decision |
|---|---|
| Scale cap | **1.6×** — root font 25.6px, what the traditional view reaches at 2560×1440. One value; change it in one place. |
| Scale floor | **1×** — nothing gets smaller. Every screen up to 1440×900, and all phones, must render exactly as today. |
| Mechanism | Root font-size + rem, not CSS `zoom` (coordinate-space mismatch with `getBoundingClientRect`, breaks `100dvh`) and not `transform: scale` (blurry text, breaks fixed positioning and pointer maths). |
| Order | Stage 1 (centring) → Stage 2 (scaling) → Stage 3 (verification). Each stage is independently correct. |

### Constraints inherited from earlier stages

- No dependencies, no build step. All existing tests (`node tests/run.js`) keep passing.
- No horizontal overflow at any width; ≥44px touch targets on phones; reduced motion respected.
- Window dragging, resizing, maximizing, profile height-fitting, the palette and the view prompt must keep working at every scale.

---

## Before starting — record a geometry baseline

Needed to prove Stage 2 changes nothing at scale 1. With the site served locally
(`python3 -m http.server` from a scratch directory symlinking the repo), load the OS
view in same-origin iframes at **1440×900**, **1280×760**, **1100×800** and **390×844**
(phones via `<iframe>`; headless Chrome clamps windows to ≥500px), and record to a JSON
file in the scratchpad, for each size:

- bounding rects of `.systembar`, `.sidebar`, `.sidebar__card` (if visible), `.workspace`,
  `#terminal`, `#profile`, every `.dock__item`, every `.mobilenav .dock__item`;
- after opening each of `about`, `projects`, `experience`, `stack`, `contact`,
  `project-vicino` (one at a time, fresh page each): that window's rect;
- after opening the palette: `.palette__panel` rect;
- after `terenceView.write` is cleared and 3.5s pass: `.viewprompt__panel` rect;
- computed `font-size` of `html`, `body`, `.terminal .hero`, `.win__title`, `.launcher`,
  `.app-head h2`, `.profile h2`, `.palette__item b`, `.linkbtn`, `.dock__item`.

Keep the probe files in the scratchpad, never in the repo.

---

## Stage 1 — Centre the windows

**Goal:** boot windows and default window positions are centred on the desktop. At
screen sizes where the arrangement already fills the desktop, nothing moves.

### 1.1 Boot pair — `bootDefaults()` in `assets/js/os.js`

Replace the two `Object.assign` lines so both windows are placed from a centred origin:

```js
var groupW = tw + gap + pw;
var x0 = Math.max(left, Math.round((W - groupW) / 2));
Object.assign(term,    { x: x0,                y: …unchanged…, w: tw, h: th, placed: false });
Object.assign(profile, { x: x0 + tw + gap,     y: …unchanged…, w: pw, h: ph, placed: false });
```

`Math.max(left, …)` keeps the shortcut column clear. At 1440×900 and 1280×760 the
group already spans the free space, so `x0` resolves to `left` — pixel-identical.

### 1.2 Single-terminal fallback (narrow desktops, not phones)

Today the `else` branch opens the terminal at its `data-x=120`. Give it explicit,
centred geometry instead:

```js
var tw1 = Math.min(680, avail);
var th1 = Math.min(600, H - 120);
Object.assign(term, { x: Math.max(left, Math.round((W - tw1) / 2)),
  y: Math.max(24, Math.round((H - th1) / 2) - 20), w: tw1, h: th1, placed: false });
open('terminal', { moveFocus: false });
```

This *does* change layout between ~1000px and ~1300px wide (terminal was at x=120);
that change is intended and must be called out in QA.

### 1.3 Every other window's default position — `place()`

The `data-x/data-y` defaults were tuned for a 1230×866 desktop (the workspace at
1440×900). Treat them as positions on that reference desktop and shift the whole
arrangement to the centre of larger desktops. Never shift left/up (smaller desktops keep
today's positions; the existing clamp handles overflow):

```js
var DESIGN_DESKTOP = { w: 1230, h: 866 };   // workspace at 1440×900, where data-x/y were tuned
// in place(), before clamping:
var dx = Math.max(0, Math.round((maxW - DESIGN_DESKTOP.w) / 2));
var dy = Math.max(0, Math.round((maxH - DESIGN_DESKTOP.h) / 2));
var x = Math.max(16, Math.min(rec.x + dx, maxW - w - 16));
var y = Math.max(16, Math.min(rec.y + dy, maxH - h - 16));
```

Boot windows already carry absolute, centred `x/y` from 1.1/1.2 and must not be shifted
again: mark them with `rec.centred = true` in `bootDefaults()` and skip `dx/dy` when set.
Clear the flag when `View → Reset desktop` sets `placed = false` (it re-runs boot, which
sets it again).

### Acceptance — Stage 1

- Boot pair centre offset from the workspace centre is within ±2px at 1920×1080,
  2560×1440 and 3840×2160 (before Stage 2, sizes are still unscaled).
- At 1440×900 and 1280×760, every rect in the baseline is unchanged.
- Opening About / Projects / Experience on 2560×1440 lands them in the middle half of the
  desktop, not the top-left quarter.
- `node tests/run.js` passes.

---

## Stage 2 — One scale factor for the whole OS view

**Goal:** above 1440×900 the entire interface scales proportionally up to 1.6×; at or
below it, nothing changes.

### 2.1 The scale — `assets/css/os.css`

Add at the top of layer 1 (tokens), before `:root`:

```css
/* One scale for the whole interface. 16px at the 1440×900 reference (1.1111vw,
   1.7778vh), never smaller, up to 1.6× on large monitors. Everything below is in rem,
   so this single value scales type, spacing, windows and chrome together. */
html { font-size: clamp(16px, min(1.1111vw, 1.7778vh), 25.6px); }
```

`min()` of width and height ratios keeps ultrawide and portrait monitors from
over-scaling on their long axis.

### 2.2 Convert `os.css` from px to rem — by script, not by hand

Write a one-off Node script in the scratchpad (not committed) that rewrites
`assets/css/os.css`:

- Convert every `Npx` to `N/16 rem`, formatted without trailing zeros
  (`12.5px` → `0.78125rem`, `24px` → `1.5rem`). Values are /16 of numbers with at most
  one decimal, so results are exact.
- **Keep as px:**
  - `1px` and `2px` everywhere — hairline borders, focus outlines, outline offsets,
    shadow hairlines. They must stay crisp at any scale.
  - every value inside an `@media (…)` **condition** line (breakpoints are viewport px;
    rem there would resolve against 16px regardless and silently mislead). Values in the
    rule bodies inside media blocks **are** converted.
  - the `html { font-size: clamp(16px, …, 25.6px) }` declaration itself.
  - `0px` (e.g. `env(safe-area-inset-bottom, 0px)`).
- Print a summary: count converted, count kept, and every kept value with its line, for
  review.

After conversion, grep must show px only in the keep-list categories.

### 2.3 JS geometry — `assets/js/os.js`

Principle: **layout maths runs in design units (the 1440×900 reference); convert to
real CSS px only when writing styles or comparing with measured sizes.** Pointer deltas
(`clientX/Y`) and `offsetLeft/Width` are real px and stay real px.

Add near the top of the IIFE:

```js
/* Current interface scale: the root font size set in os.css, relative to 16px.
   1 at or below the 1440×900 reference, up to 1.6 on large monitors. */
var scale = 1;
function readScale() {
	scale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
}
function px(designUnits) { return Math.round(designUnits * scale); }
```

Call `readScale()` once before `document.querySelectorAll('.win').forEach(build)`.

Apply it at each geometry site:

| Function | Change |
|---|---|
| `place(rec)` | `maxW = workspace.clientWidth / scale`, `maxH = …clientHeight / scale`; keep all maths (including the Stage 1 `dx/dy`) in design units; write styles with `px(w)`, `px(h)`, `px(x)`, `px(y)`. |
| `bootDefaults()` | `W = workspace.clientWidth / scale`, `H = workspace.clientHeight / scale`. All constants (124, 20, 24, 860, 560, 400, 680, 600, 660, 120, 96, 20, 12) stay as written — they are design units. |
| `fitToContent(rec, H)` | `H` arrives in design units. Measure `natural` in real px, convert with `/ scale`, compute in design units, write with `px()`. |
| `toggleMax(app)` | insets `px(8)`; `width = workspace.clientWidth - px(16)`; `height = workspace.clientHeight - px(16) - px(70)`. |
| `startDrag` | `maxX = clientWidth - px(60)`, `maxY = clientHeight - px(40)`, left floor `-offsetWidth + px(120)`. |
| `startResize` | minimum `px(300)` × `px(180)`; edge margin `px(8)`. These must match the rem `min-width`/`min-height` on `.win`. |
| window `resize` handler | clamps `px(80)`, `px(40)`. |

**Scale changes at runtime** (browser window resized across the threshold, or moved to
another monitor). In the existing `resize` listener, before its current logic:

```js
var previous = scale;
readScale();
if (Math.abs(scale - previous) > 0.001 && !isPhone()) {
	var ratio = scale / previous;
	windows.forEach(function (rec) {
		if (!rec.placed) return;
		['left', 'top', 'width', 'height'].forEach(function (k) {
			var v = parseFloat(rec.el.style[k]);
			if (!isNaN(v)) rec.el.style[k] = Math.round(v * ratio) + 'px';
		});
		if (rec.max) { rec.max = false; toggleMax(rec.id); }
	});
}
```

so open windows keep their proportions and positions rather than jumping.

### Acceptance — Stage 2

- Root font-size is exactly `16px` at 1440×900, 1280×760, 1100×800 and 390px; `19.2px` at
  1920×1080; `25.6px` at 2560×1440 and 3840×2160.
- Every baseline value at 1440×900, 1280×760 and 390px matches after conversion
  (rects within ±1px for rounding; font sizes exact). 1100×800 matches except the
  terminal position intentionally changed in Stage 1.2.
- At 2560×1440, boot terminal and profile are 1.6× their 1440 sizes (capped values
  680×600 and 400×660 become ~1088×960 and 640×1056 before the height clamps), still
  centred within ±2px, and body text computes to 24px.
- `grep -o '[0-9.]\+px' assets/css/os.css` shows only keep-list values.

---

## Stage 3 — Verification

### 3.1 Browser QA (observed values, not assumed)

At **1280×760, 1440×900, 1920×1080, 2560×1440, 3840×2160** and **390px**:

1. Root font-size, body font-size, hero font-size.
2. Boot windows: sizes, centre offset from the workspace centre, and that neither overlaps
   the shortcut column or leaves the workspace.
3. No horizontal overflow (`scrollWidth === clientWidth`).
4. Open About, Projects, Experience, Stack, Contact, a project detail: each fully inside
   the workspace.

At **2560×1440** specifically (the scaled case):

5. Drag a window: it follows the pointer 1:1 (move by 200px of pointer → `left` changes by
   200px), and the title bar cannot be dragged fully off-screen.
6. Resize: minimum size is 480×288 real px (300×180 × 1.6).
7. Maximize and restore: fills the workspace minus scaled insets, restores exactly.
8. Profile height-fitting: quick links visible without scrolling.
9. Palette and view prompt: panel sizes scale; text scales; still centred.
10. Runtime scale change: open windows at 2560×1440, resize the viewport to 1440×900 →
    windows shrink proportionally and stay inside the workspace.
11. No-JS stacked document view renders and scales.
12. Screenshot 2560×1440 and 1440×900 for a visual read.

### 3.2 Tests — `tests/os.test.js`

Add a `large screens (stage 5)` block:

- `os.css` sets `html { font-size: clamp(16px, min(1.1111vw, 1.7778vh), 25.6px); }`.
- Only keep-list px remain in `os.css`: every `Npx` is `1px`, `2px`, `0px`, lives in an
  `@media` condition line, or is in the `html { font-size … }` declaration.
- `os.js` defines `readScale()` and `px()`, `place()` divides the workspace by `scale`,
  and `bootDefaults()` centres the pair (`Math.round((W - groupW) / 2)`).
- `DESIGN_DESKTOP` is `{ w: 1230, h: 866 }` and shifts are floored at 0.

Update any existing assertion that pinned a px value that is now rem (e.g. the
`.win__control::before { inset: -16px }` touch-target check becomes `-1rem`).

## Verification

`node tests/run.js` passes; the baseline comparison and the twelve QA checks are run with
results reported as measured values; temporary files live only in the scratchpad.

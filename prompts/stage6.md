# Stage 6 — Shutdown and boot transitions between the two views

> Implementation spec. Approved design: the mockup at
> https://claude.ai/artifact/Cn9NhAaXAztDQjV5sVEz3e (private to the owner).
> Work happens directly on `main`.

## Context

The site has two views, each its own page: the terenceOS desktop (`index.html`) and the
traditional page (`classic.html`). Stage 4 made switching between them a remembered
preference (`assets/js/view.js`, key `terenceos:view`). Today a switch is a plain
navigation: the page just changes.

This stage makes every **explicit** switch feel like the OS shutting down or starting up.

### Decisions already taken (do not re-litigate)

| Question | Decision |
|---|---|
| Leaving terenceOS (OS → traditional) | **Minimal** window (wordmark, status line, step caption, progress bar), ending in a **CRT line collapse**. |
| Entering terenceOS (traditional → OS) | **Boot log** window, which then expands to fill the screen and hands over to the desktop. |
| Duration | **2.6 s** each way (inside the requested 2–3 s). |
| Reduced motion | A **200 ms fade** out and in, no geometry. |
| Skipping | A click or any key during a transition skips to its end. |
| Branch | `main`. |

### Constraints inherited from earlier stages

- No frameworks, no build step, no dependencies. Vanilla HTML/CSS/JS on GitHub Pages.
- The two views' sources stay separate. Only small, explicitly shared modules are loaded by both pages (`view.js` today; this stage adds `transition.js` and `transition.css`).
- All storage access guarded with `try/catch`; features degrade, never break.
- Only **explicit** switches animate. The pre-paint redirect in `index.html`'s `<head>` (returning visitors with a stored `classic` preference) must stay instant.
- Without JavaScript, the switch links work exactly as they do today.
- Palette: the terenceOS tokens (`#080B0F`, `#0D1116`, `#11161A`, `#232A31`, `#303841`, `#E6E6E6`, `#A1A7AE`, `#7B8290`, `#A3E635`).

---

## The core problem, and the approach

Each view is its own document, so no single page can draw both. Every transition is
therefore **split at a handoff frame that both pages can draw identically**. The browser
changes page underneath that frame, so the seam does not show.

| Direction | Handoff frame | Outgoing page draws | Incoming page draws |
|---|---|---|---|
| OS → traditional | A dark screen with the Minimal window centred, fully opaque, progress at 0 | Collapse of the desktop into the window | Everything after: status steps, progress, CRT collapse, scrim lifting |
| traditional → OS | A full screen of `#080B0F`, nothing else | Open, boot log, expansion to full screen | The cover fading off the booted desktop |

A one-shot note in `sessionStorage` carries the handoff across:

```js
sessionStorage['terenceos:transition'] = JSON.stringify({ kind, at: Date.now(), apps })
// kind: 'shutdown' | 'boot' | 'fade'      apps: titles of the windows that were open (shutdown only)
```

The incoming page consumes (removes) the note and plays its half only if the note is
**under 5 s old**, so reload and Back never replay it. If storage is blocked there is no
note: the outgoing half still plays and the incoming page simply appears.

The incoming half continues from the handoff frame, not from wall-clock time: if the next
page is slow, the handoff frame just holds (browsers keep painting the old page until the
new one paints).

---

## Files

| File | Change |
|---|---|
| `assets/js/transition.js` | **New.** Shared by both pages. Owns both halves of both transitions. |
| `assets/css/transition.css` | **New.** Shared by both pages. The overlay, window and cover. |
| `assets/js/view.js` | `switchTo()` hands navigation to `terenceTransition.leave()` when present. |
| `index.html` | Link `transition.css` in `<head>`; load `transition.js` as the **first child of `<body>`**. |
| `classic.html` | Same two additions; add Geist and Geist Mono to its Google Fonts link. |
| `tests/transition.test.js` | **New.** |
| `tests/run.js` | Require the new test. |

### Why `transition.js` loads at the very start of `<body>`

The incoming half must be in the **first paint** of the arriving page, or the visitor sees a
flash of the bare page. A synchronous script as the first child of `<body>` runs before any
content is parsed, and `document.body` already exists, so it can mount the overlay before
anything paints. The preload scanner fetches it in parallel with the render-blocking CSS in
`<head>`, so it adds no meaningful latency. It must stay small and must not depend on
anything later in the page.

### Why Geist on the traditional page

The shutdown window is drawn by the OS page before the handoff and by `classic.html` after
it. Both must use the same faces or the text jumps at the seam. Google Fonts only downloads
a face when text uses it, so adding the families to `classic.html`'s font link costs nothing
until the overlay renders — and by then the files are usually cached from the OS page.

Add to `classic.html`'s existing `css2` URL: `family=Geist:wght@400;600&family=Geist+Mono:wght@400`.

---

## `assets/js/view.js`

`switchTo(view)` still writes the preference first. Then, instead of navigating directly:

```js
var href = VIEWS[view];
var tx = window.terenceTransition;
if (tx && tx.leave(view, href)) return true;   // the transition navigates when it is done
window.location.href = href;
return true;
```

`leave()` returns `false` when it declines (unknown direction, already running), and the
switch falls back to a plain navigation. `view.js` must keep working, and its tests keep
passing, when `terenceTransition` is absent.

---

## `assets/js/transition.js`

IIFE, `'use strict'`, one global: `window.terenceTransition = { leave: leave }`.

### Page detection

`onClassic = /(^|\/)classic\.html$/.test(location.pathname)` — the same test `view.js` uses.

### On load (runs at the top of `<body>`)

1. Read and remove the note (guarded). Ignore it if missing, malformed or ≥ 5000 ms old.
2. `kind === 'shutdown'` and on classic → `arriveShutdown(note.apps)`.
3. `kind === 'boot'` and on the OS page → `arriveBoot()`.
4. `kind === 'fade'` → `arriveFade()`.
5. Register a `pageshow` listener: when `event.persisted` (restored from the back/forward
   cache), tear down any overlay and undo any styles the transition set on the page, so Back
   never lands on a half-collapsed desktop.

### `leave(view, href)`

- If a transition is running, return `true` (swallow the repeat click).
- If reduced motion is on (`matchMedia('(prefers-reduced-motion: reduce)')`) → `leaveFade(href)`.
- On the OS page with `view === 'classic'` → `leaveShutdown(href)`.
- On classic with `view === 'os'` → `leaveBoot(href)`.
- Otherwise return `false`.

### Skipping

While any half runs, a capture-phase `keydown` and `pointerdown` listener on `window` calls
`preventDefault()` and `stopImmediatePropagation()` (so the OS shortcuts never see the key)
and skips:

- **Outgoing half:** remove the note and navigate immediately; the next page appears plainly.
- **Incoming half:** jump to the final state and tear down.

### The window

One builder used by both pages, so the handoff frame matches exactly:

```html
<div class="tx" aria-hidden="false">
  <div class="tx__backdrop"></div>
  <div class="tx__win" role="status" aria-label="Shutting down terenceOS | Starting terenceOS">
    <div class="tx__bar"><i></i><i></i><i></i><span class="tx__title">terenceOS — shutting down | starting up</span></div>
    <!-- shutdown: .tx__min (wordmark, status, step)   boot: .tx__log -->
    <div class="tx__prog"><b></b></div>
    <div class="tx__flash"></div>   <!-- shutdown only -->
  </div>
</div>
```

Window size, identical on both pages because it depends only on the viewport:
`width: clamp(300px, 44vw, 720px)`, `height: clamp(240px, min(44vh, 30.8vw), 460px)`, centred.
(At 1440×900 that is 634×396 — exactly the desktop's 16:10 shape scaled by 0.44.)
Type is in `px`/`vw` clamps, never `rem` — the two pages have different root font sizes.

### OS → traditional (`leaveShutdown`, then `arriveShutdown`)

Timeline in ms from the click. `eio` = `cubic-bezier(0.65, 0, 0.35, 1)`, `eo` = `cubic-bezier(0.22, 1, 0.36, 1)`.

On the **OS page**:

| t | What |
|---|---|
| 0 | Close the view prompt and palette if open; add `tx-running` to `<html>`. Record the titles of open windows (`.os .win:not([hidden])`, `data-title` up to ` — `). Mount the overlay with the window at opacity 0. |
| 0–450 | `.os` collapses into the window's rect: `transform: scale(s)` with the origin at the viewport centre, `clip-path: inset(… round r)` cropping to the window's aspect, `filter: brightness(0.7)`; `eio`. `s = windowWidth / viewportWidth`. Computed from `getBoundingClientRect()`, so it works for any aspect ratio and scroll position. |
| 350–550 | Window fades in over the shrunken desktop. |
| 550 | Write the note `{ kind: 'shutdown', at, apps }`, then `location.href = href`. |

On **classic.html** (continues from 550):

| t | What |
|---|---|
| 550 | Overlay mounted in the first paint: backdrop `#080B0F` at opacity 1, window fully visible, progress 0. |
| 550–850 | Backdrop 1 → 0.55 (`eo`): the traditional page fades up behind the window. |
| 780–1950 | Progress bar fills (`eio`). |
| 800–1850 | Step caption steps through: `closing <title>` for up to three recorded windows (fallback: `terminal`, `profile`), then `remembering your choice`, then `goodbye.` — evenly spaced. |
| 2000–2180 | CRT, part 1: window `scaleY` 1 → 0.006; the flash layer (`#E6E6E6`) 0 → 0.9. |
| 2180–2340 | CRT, part 2: `scaleX` 1 → 0; window hidden at the end. |
| 2150–2600 | Backdrop 0.55 → 0 (`eo`). |
| 2600 | Remove the overlay. The page is live. |

### Traditional → OS (`leaveBoot`, then `arriveBoot`)

On **classic.html**:

| t | What |
|---|---|
| 0 | Add `tx-running`; mount the overlay: backdrop 0, window opacity 0 at `scale(0.94)`. |
| 0–350 | Backdrop 0 → 0.55; window opacity 0 → 1, scale → 1 (`eo`). |
| 420–1480 | Log lines, 200 ms apart, `[ ok ]` tag appearing 120 ms after its line: `terenceOS v2026.1` · `[ ok ] reading preference · terenceos:view=os` · `[ ok ] mounting ~/projects` · `[ ok ] starting terminal` · `[ ok ] opening profile` · `ready.` |
| 400–1650 | Progress bar fills (`eio`). |
| 1700–1850 | Window contents fade out. |
| 1700–2150 | Window expands to the full viewport (top/left/width/height), radius → 0, border → transparent, background → `#080B0F` (`eio`). |
| 2150 | Write the note `{ kind: 'boot', at }`, then `location.href = href`. |

On **index.html** (continues from 2150):

| t | What |
|---|---|
| 2150 | A full-screen cover of `#080B0F` is mounted in the first paint. |
| on `DOMContentLoaded` | The desktop has booted under the cover (`os.js` has run). Cover opacity 1 → 0 over 400 ms (`eo`); `.os` scale 1.02 → 1 over 450 ms. Remove the cover at the end. |

### Reduced motion (`leaveFade`, `arriveFade`)

- Outgoing: `<body>` opacity 1 → 0 over 200 ms, write `{ kind: 'fade' }`, navigate.
- Incoming: `<body>` starts at opacity 0 (set before first paint), fades to 1 over 200 ms.
- No scale, no clip, no CRT.

### Accessibility

- The window carries `role="status"` and an `aria-label` naming what is happening.
- The overlay blocks pointer input while running (it covers the viewport).
- On completion nothing is left behind: no overlay, no inline styles, no `tx-*` classes.

---

## `assets/css/transition.css`

- `.tx`: `position: fixed; inset: 0; z-index: 2147483000;`.
- `.tx__backdrop`: `#080B0F`, full-bleed.
- `.tx__win`: `#0D1116`, `1px solid #303841`, radius `clamp(6px, 0.56vw, 10px)`, deep shadow, the size rule above, `transform-origin: 50% 50%`, flex column, `overflow: hidden`.
- `.tx__bar`: `#11161A`, bottom hairline `#232A31`, height `clamp(28px, 2.36vw, 40px)`, three `#303841` dots.
- `.tx__title`, `.tx__log`: Geist Mono, `clamp(11px, 0.95vw, 15px)`; log `line-height: 1.75`, `#A1A7AE`, `[ ok ]` and the first line in `#A3E635`, last line `#E6E6E6`.
- `.tx__min`: centred column. Wordmark: Geist 600, `clamp(22px, 2.1vw, 34px)`, preceded by a `#A3E635` dot. Status: `#E6E6E6`. Step: Geist Mono, `#7B8290`.
- `.tx__prog`: 3px track `#232A31`, fill `#A3E635`.
- `.tx__flash`: `#E6E6E6`, absolute, `opacity: 0`, `pointer-events: none`.
- `.tx-fade-in body { opacity: 0; }` for the reduced-motion arrival.
- All fonts with real fallbacks: `"Geist", "Inter", system-ui, sans-serif` and `"Geist Mono", "JetBrains Mono", ui-monospace, monospace`.

---

## Tests — `tests/transition.test.js`

Static and sandboxed, in the style of `tests/view.test.js`:

1. Both pages link `assets/css/transition.css` in `<head>` and load `assets/js/transition.js` as the **first element of `<body>`**.
2. `classic.html`'s font link includes Geist and Geist Mono.
3. `view.js`'s `switchTo()` defers to `terenceTransition.leave()` and still navigates when it is absent or returns `false` (sandbox).
4. The note: written with the right `kind`, consumed on arrival, ignored when ≥ 5000 ms old, and a blocked `sessionStorage` does not throw (sandbox with fake storage).
5. The reduced-motion branch exists and uses no transform.
6. A `pageshow` handler checks `persisted` and tears down.
7. Skipping: capture-phase `keydown` and `pointerdown` listeners are registered.
8. The pre-paint redirect in `index.html` is unchanged — returning visitors are not animated.
9. The copy is truthful: the boot log names only things the OS actually does on boot (`terminal` and `profile` open by default).

## Verification

- `node tests/run.js` passes.
- Chrome headless at 1440×900 and 390 px (iframe harness), both directions: capture frames at the timestamps above and confirm what they show; confirm the handoff frame on each side matches (same window rect to the pixel).
- Reduced motion (`--force-prefers-reduced-motion`): fade only.
- Back button after a switch: the restored page is clean.
- Skip: a key mid-transition lands on the destination page, clean.
- Pre-paint redirect: a stored `classic` preference still lands on `classic.html` instantly, with no overlay.
- No console errors on either page. No horizontal overflow.

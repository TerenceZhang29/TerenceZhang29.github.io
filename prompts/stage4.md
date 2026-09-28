# Dual-view portfolio: terenceOS desktop + traditional page

> Implementation spec, approved 2026-09-02. Written for a coding agent to follow
> exactly: every file, insertion point, code snippet and acceptance criterion is
> stated. Continues `stage1.md`–`stage3.md`.

## Context

`index.html` in the working tree is the terenceOS desktop (built over stages 1–3). The
`newlook` branch still holds the site as it was before that redesign: a conventional
scrolling portfolio, styled by `assets/css/main.css` and scaled by `assets/js/scale.js` —
both files still present and unmodified in the working tree, currently unreferenced.

The OS desktop is a strong first impression but it is not what every visitor wants. The
site should offer both views and let the visitor pick. Three seconds after landing on the
desktop, a first-time visitor is asked once whether they would prefer the traditional
view; the answer is remembered in the browser (no backend) and honoured on every later
visit; and from either view there is always an obvious way across.

### Decisions already taken (do not re-litigate)

| Question | Decision |
|---|---|
| Persistence | The choice is a lasting preference. `/` redirects to the traditional view **before first paint** when the preference is `classic`. |
| File layout | Sibling pages at the repo root: `index.html` (OS) and `classic.html` (traditional). No file moves. |
| Content parity | The traditional page is taken from `newlook` **as-is**, Sneaker Room link included. The only additions are a canonical tag and the link back to the OS. |

### Constraints inherited from earlier stages

- No frameworks, no build step, no new dependencies. Vanilla HTML/CSS/JS, served statically by GitHub Pages from the repo root (`CNAME` → `terencezhang.is-a.dev`).
- All `localStorage` access wrapped in `try/catch` — it throws in some contexts.
- Every interactive element: real `<button>`/`<a>`, accessible name, visible focus, ≥44px touch targets on phones, `prefers-reduced-motion` respected.
- No horizontal overflow at any width. No content invented — every fact must already exist on the page.
- Palette colours only: `#080B0F` `#0D1116` `#11161A` `#151A1F` `#232A31` `#303841` `#E6E6E6` `#A1A7AE` `#7B8290` `#A3E635` `#60A5FA` `#C084FC`.

---

## Stage 1 — Split the two views into separate sources

**Goal:** both pages exist and render correctly standalone. No shared code yet.

### 1.1 Create `classic.html` at the repo root

Write it from the branch verbatim:

```bash
git show newlook:index.html > classic.html
```

Keep everything: `<html lang="en" class="portfolio-root">`, `<body class="portfolio-page">`
(`assets/css/main.css` is scoped to those two classes), its Inter/JetBrains Mono/Manrope
font link, `assets/css/main.css`, `assets/js/scale.js`, and all content including the
Sneaker Room link in the contact section.

### 1.2 Two additions to `classic.html`

**a. Canonical tag** — in `<head>`, after the `<meta name="description">` line:

```html
<link rel="canonical" href="https://terencezhang.is-a.dev/" />
```

**b. The way back to the OS** — in `.site-header`, immediately after the existing
`<a class="header-resume" …>`:

```html
<a class="header-view" href="index.html?view=os">terenceOS <span aria-hidden="true">↗</span></a>
```

Style it by **extending the existing selectors** in `assets/css/main.css` rather than
writing new rules — add `.portfolio-page .header-view` to the selector lists on the two
rules that currently read:

- `.portfolio-page .site-header nav a, .portfolio-page .header-resume { … }` (~line 143)
- `.portfolio-page .site-header nav a:hover, .portfolio-page .header-resume:hover { … }` (~line 144)

and add `.portfolio-page .header-view { border-bottom: 1px solid var(--portfolio-border); padding-bottom: 0.25rem; }`
mirroring `.header-resume` (~line 145). In the `max-width: 700px` branch (~line 206),
confirm the header still fits with a fourth item; if it is tight, shorten the label to
`terenceOS` without the arrow at that width. Do not restructure the header.

### 1.3 Leave the OS view alone

`index.html`, `assets/css/os.css`, `assets/js/os.js` are, by definition, the OS view's
private source. **No file moves anywhere** — `assets/css/main.css`'s `@import` of
`fontawesome-all.min.css`, `assets/webfonts/` and `assets/css/images/overlay.png` all keep
resolving because nothing about their relative positions changes.

### Acceptance — Stage 1

- `/classic.html` renders the full traditional page: sticky header, hero with avatar, four-entry timeline, three project cards, contact band, footer.
- No 404s in the network log for that page (CSS, fonts, `scale.js`, avatar, project images).
- `/` still renders the OS desktop exactly as before.

---

## Stage 2 — The preference layer (no backend)

**Goal:** the browser remembers a view choice and honours it with no flash of the wrong page.

### 2.1 New shared module `assets/js/view.js`

The only file both pages load. Dependency-free IIFE, `'use strict'`, no globals other than
`window.terenceView`. Responsibilities:

```js
var KEY = 'terenceos:view';           // values: 'os' | 'classic'
function readView()                    // try localStorage → sessionStorage → memory; never throws
function writeView(v)                  // same ladder, best effort; never throws
function switchTo(view)                // writeView(view), then navigate:
                                       //   'classic' → location.href = 'classic.html'
                                       //   'os'      → location.href = 'index.html?view=os'
```

Storage ladder detail: `localStorage` first; on throw or absence fall back to
`sessionStorage`; on throw again keep the value in a module-level variable. This is what
makes the "ask once" promise degrade to "ask once per session" rather than break.

On load, the module also:

- **On `classic.html`**: binds `.header-view` → `switchTo('os')` (the `href` stays as the
  no-JS fallback; the handler calls `preventDefault()` first so the preference is written
  before navigating).
- **On `index.html`**: if `location.search` matches `[?&]view=os`, call `writeView('os')`
  and strip the query with `history.replaceState(null, '', location.pathname)`.

Export `window.terenceView = { read: readView, write: writeView, switchTo: switchTo }` so
`assets/js/os.js` can call it without duplicating storage logic.

Load order on `index.html`: `view.js` **before** `os.js` (os.js calls into it).

### 2.2 Pre-paint redirect — inline in `index.html`'s `<head>`

This cannot live in `view.js`, which loads at the end of `<body>`; that would paint the
desktop first. Add immediately after the existing
`<script>document.documentElement.classList.remove('no-js');</script>` line:

```html
<script>
	/* Honour a stored "traditional view" preference before anything paints.
	   Deliberately duplicated from assets/js/view.js: that file loads at the end
	   of <body>, far too late to avoid a flash of the desktop. */
	try {
		if (!/[?&]view=os/.test(location.search) &&
			localStorage.getItem('terenceos:view') === 'classic') {
			location.replace('classic.html' +
				(/^#(top|about|projects|experience|contact)$/.test(location.hash) ? location.hash : ''));
		}
	} catch (e) {}
</script>
```

The hash allowlist preserves deep links — those five ids exist as section anchors in
**both** views. Any other hash (`#profile`, `#stack`, `#project-vicino`, …) is OS-only and
is dropped on the way across.

### 2.3 Loop safety and no-JS

- `classic.html` **never** reads the preference for redirect purposes. Only `index.html`
  redirects, and only away from itself. State this in a comment on the inline script.
- With JavaScript off: no redirect, no prompt. `/` renders the existing no-js stacked
  document view; `classic.html` renders normally; its header link is a plain
  `href="index.html?view=os"` that works unaided.

### Acceptance — Stage 2

- With `localStorage['terenceos:view'] = 'classic'` set, loading `/` lands on `classic.html` with the OS never painted (assert `performance.getEntriesByType('paint')` on the OS page did not run, or simply that `document.querySelector('.os')` is absent on the final document).
- `/#projects` with that preference lands on `classic.html#projects`.
- `/#profile` with that preference lands on `classic.html` with no hash.
- `index.html?view=os` never redirects, writes `'os'`, and leaves the address bar at `/`.
- With storage throwing (simulate by stubbing `localStorage.getItem` to throw), no exception surfaces and the page renders normally.

---

## Stage 3 — The prompt, and switching from inside the OS

### 3.1 The prompt dialog (OS page only)

A visitor already on `classic.html` has made their choice, so the dialog exists only on
`index.html`.

**Markup** — in `index.html`, immediately after the `#palette` block:

```html
<div class="viewprompt" id="viewprompt" hidden>
	<div class="viewprompt__scrim" data-viewprompt-dismiss></div>
	<div class="viewprompt__panel" role="dialog" aria-modal="true"
		aria-labelledby="viewprompt-title" aria-describedby="viewprompt-body">
		<h2 id="viewprompt-title">Fancy a traditional view?</h2>
		<p id="viewprompt-body">Same content, laid out as a plain scrolling page — no windows,
			no terminal. You can switch back any time.</p>
		<div class="viewprompt__actions">
			<button type="button" id="viewprompt-yes">Yes, switch</button>
			<button type="button" id="viewprompt-no">No, stay in terenceOS</button>
		</div>
	</div>
</div>
```

**Styling** — in `assets/css/os.css`, next to the palette block, reusing its grammar:
`--surface` panel, `1px solid var(--border-strong)`, `--radius`, `--shadow-active`, the
`--t-open` timing, and the same scrim treatment as `.palette__scrim`. Centred, `max-width:
420px`, `width: calc(100vw - 32px)`. Primary button uses the `.linkbtn--primary` treatment
(green border/text on `--green-soft` hover), secondary is a plain `.linkbtn`. On phones
(`max-width: 720px`) the buttons stack full-width with `min-height: 44px`. The existing
`prefers-reduced-motion` block already neutralises the animation.

**Behaviour** — in `assets/js/os.js` (or a short `initViewPrompt()` in `view.js` called by
`os.js`; keep it in `os.js` so the shell owns its own modals):

- Fire `3000ms` after the `load` event, and only when `terenceView.read()` returns nothing.
- If `#palette` is open or a `.menu[data-open="true"]` is present at fire time, retry once
  after 2000ms rather than interrupting; if still busy, skip for this page load.
- **Yes** → `terenceView.switchTo('classic')`.
- **No** → `terenceView.write('os')`, close, restore focus. It never asks again.
- Accessibility, matching the palette implementation already in `os.js`: move focus to the
  "Yes" button on open, trap Tab inside the panel, `Esc` = No, restore focus to
  `document.activeElement` captured at open. Wire `Esc` into the existing layered Escape
  handler **above** the palette branch, so the dialog is the innermost layer.

### 3.2 Switching from inside the OS — three entry points, one path

All three route through `terenceView.switchTo('classic')`, so switching and remembering
can never disagree.

**a. View menu** — in `index.html`'s `#menu-view`, after the `data-action="palette"` item:

```html
<hr />
<button type="button" role="menuitem" data-action="classic"><svg class="icon"><use href="#i-file" /></svg>Switch to traditional view</button>
```

Handle it in the existing `.menu [data-action]` loop in `assets/js/os.js` (~line 409),
alongside `reset` / `close-all` / `palette`:

```js
if (btn.dataset.action === 'classic') { closeMenus(); terenceView.switchTo('classic'); return; }
```

**b. Command palette** — one entry in the `APPS` registry in `assets/js/os.js`; the palette
and `launch()` both read that registry, so no palette code changes:

```js
{ id: 'classic', name: 'Traditional view', sub: 'classic.html — plain scrolling page',
  icon: 'i-file', group: 'Files & links', keys: 'classic simple traditional plain switch view', view: 'classic' },
```

and one branch at the top of `launch()` (before the `copy` and `href` branches):

```js
if (app && app.view) return terenceView.switchTo(app.view) || true;
```

Note: `neofetch`'s "apps installed" count is `APPS.filter(a => !a.href && !a.copy).length` —
add `&& !a.view` so this entry is not counted as an installed application.

**c. Terminal** — in `COMMANDS` in `assets/js/os.js`:

```js
classic: function () { terenceView.switchTo('classic'); return 'switching to the traditional view'; },
```

Add `['classic', 'switch to the traditional view']` to the `help` table rows. Leave `ls`
alone (it lists files; this is a view, not a file). Keep it **out** of the `HIDDEN` array
so tab-completion and `did you mean` can find it.

### Acceptance — Stage 3

- First visit: nothing at 2.5s, dialog visible at 3.5s, focus on "Yes", Tab cycles within the panel, `Esc` closes as "No".
- Yes → `classic.html`, preference `classic`. Reload `/` → traditional page, no prompt.
- No → dialog closes, OS unchanged, preference `os`, no prompt on reload.
- Menu item, palette entry (`⌘K` → "classic") and the `classic` command each navigate and persist.
- `classic` appears in `help`; typing `clas` + Tab completes it.

---

## Stage 4 — Tests, QA, and recording the plan

### 4.1 Split the suite along the same seam as the source

| File | Covers |
|---|---|
| `tests/content.js` | One exported list of the facts **both** views must carry: the four roles with employers and date ranges, the three projects, résumé path, email, GitHub, LinkedIn, education and honours. Shared so the views cannot drift silently. |
| `tests/os.test.js` | Today's `tests/homepage.test.js`, renamed, importing the shared content list instead of its inline arrays. Everything else unchanged. |
| `tests/classic.test.js` | The traditional page: same shared content list, `assets/css/main.css` + `assets/js/scale.js` referenced, `.header-view` link present pointing at `index.html?view=os`, canonical tag present, and **no** redirect logic anywhere on the page. |
| `tests/view.test.js` | The switching layer: `terenceos:view` used consistently in `view.js` and the inline snippet; the inline snippet present in `index.html`, guarded by `try/catch`, excluding `?view=os`, and using the five-id hash allowlist; `?view=os` handled; prompt markup with `role="dialog"`/`aria-modal`/labelled; all three OS affordances present and routed through `switchTo`; `view.js` loaded before `os.js`. |
| `tests/run.js` | Requires the three test files so one command still runs everything. |

Delete `tests/homepage.test.js` after the rename.

### 4.2 Browser QA

Use the harness that has worked throughout: `python3 -m http.server 8899`, a temporary
probe copy of the page with an injected script, Chrome headless
(`--headless=new --virtual-time-budget=… --dump-dom`), results reported through
`document.title` (the `#probe` div gets shadowed by the script's own source in the dump).
Phone widths below 500px must be rendered through the 390px `<iframe>` harness, since
headless Chrome clamps its window to 500px.

Checks:

1. First visit at 1440×900: no dialog at 2.5s; dialog at 3.5s; **Yes** → `classic.html`, `localStorage['terenceos:view'] === 'classic'`.
2. Reload `/` with that preference → final document is the traditional page and `document.querySelector('.os')` is null.
3. Header link on `classic.html` → `/`, preference `os`, and no prompt after 4s.
4. **No** path: dialog closes, `.os` still present, preference `os`, no dialog on reload.
5. Menu item, palette entry, and `classic` command each land on `classic.html` with the preference written.
6. Deep links: `/#projects` + preference `classic` → `classic.html#projects`; `/#profile` → `classic.html` with no hash.
7. Loop check: loading `classic.html` directly with preference `classic` stays put.
8. Storage blocked (stub `localStorage.getItem`/`setItem` to throw): no uncaught error, dialog still appears, no redirect.
9. Mobile 390px, both views: `scrollWidth === clientWidth`, dialog buttons ≥44px tall, traditional page header not overflowing with its fourth link.
10. No-JS (strip both scripts into a temp copy): `/` renders the stacked document view; `classic.html` renders normally with a working header link.
11. Screenshot both views at 1440×900 and 390px, plus the dialog, for a visual read.

Delete every temporary probe/preview file before finishing.

### 4.3 Record the plan

Copy this document to `prompts/stage4.md`.

## Verification

`node tests/run.js` passes, the eleven QA checks above are executed and reported with
actual observed values (not assumed), and `git status` shows only the intended files:
`classic.html`, `assets/js/view.js`, `prompts/stage4.md`, the test split, and edits to
`index.html`, `assets/css/os.css`, `assets/css/main.css`, `assets/js/os.js`.

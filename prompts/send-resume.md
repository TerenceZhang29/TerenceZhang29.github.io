# Send my resume — email the résumé to a visitor on request

> Spec, written 2026-09-23. Nothing implemented yet. Continues `stage1.md`–`stage5.md`.
> Written for a coding agent to follow exactly: every file, command, record value and
> acceptance test is stated.

## Context

Both views link straight to `resume.pdf`, which serves anyone who wants to read it now.
This adds a second path for the visitor who would rather receive it: a **Send my resume**
button that asks for their email address and sends them a short intro with the résumé
attached. The side benefit is that Terence learns who asked.

The site is static on GitHub Pages, so this needs a server-side piece. Any API key shipped
to the browser is public and can be used to burn quota or send mail in Terence's name, so
the key lives in a Cloudflare Worker and the browser only ever submits one field.

### Verified before writing this (2026-09-23)

| Question | Finding |
|---|---|
| Can `terencezhang.is-a.dev` carry email records? | **No** — it holds a CNAME to `TerenceZhang29.github.io`, and is-a.dev's FAQ confirms a CNAME cannot share a record set. |
| Does that block sending? | **No.** Resend puts records on `send` and `resend._domainkey`, never the root. The CNAME is untouched and `from:` can still be `@terencezhang.is-a.dev`. |
| Does is-a.dev allow the nested records? | **Yes.** Nested subdomains register as dotted filenames; the repo already holds 95 `_dmarc.*`, 248 `_domainkey`, and 65 `send.*` files. `domains/send.abdulkareem.json` is this exact setup. Official guides exist for Zoho Mail and ImprovMX. |
| Can Resend attach the PDF without file handling? | **Yes** — attachments accept a `path` URL. `https://terencezhang.is-a.dev/files/Terence_Zhang_Resume.pdf` returns 200, `content-type: application/pdf`, `access-control-allow-origin: *`. 136KB against a 40MB limit. |
| Cost | Workers free: 100k req/day, 10ms CPU (CPU only — waiting on subrequests is free). Resend free: 3,000/month, 100/day. Turnstile free. **$0.** |

Sources: [Resend Cloudflare DNS guide](https://resend.com/docs/dashboard/domains/cloudflare) ·
[Resend attachments](https://resend.com/docs/dashboard/emails/attachments) ·
[is-a.dev FAQ](https://docs.is-a.dev/faq) ·
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) ·
[Rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

### Decisions assumed (each is a one-line change — correct before Stage 2)

| Decision | Assumed |
|---|---|
| Delivery | Cloudflare Worker + Resend, not client-only EmailJS (needs a paid plan and exposes a public key). |
| Attachment | **Both** — PDF attached *and* a link in the body, so a stripped attachment still leaves a way through. |
| Lead capture | **On** — a separate notification to `terencezhang829@gmail.com` with the requester's address. |
| Button placement | `contact.json` (OS view) and the contact band (traditional view). Not the profile card — it already carries `resume.pdf`. |
| Sending address | `Terence Zhang <resume@terencezhang.is-a.dev>`, `reply_to: terencezhang829@gmail.com`. |

### Constraints inherited from earlier stages

- No frameworks, no build step, no dependencies **in the site**. The Worker is a separate deployable with its own `package.json`; it never ships to Pages.
- Accessible by default: real `<button>`, labelled input, focus trap, Esc, visible focus, ≥44px touch targets, `prefers-reduced-motion`.
- No horizontal overflow at any width. Facts shared by both views live in `tests/content.js`.
- The existing direct `resume.pdf` link stays exactly where it is — it is the no-JS and failure fallback.

---

## Architecture

```
browser (static Pages)              Worker (Cloudflare)                Resend
──────────────────────              ───────────────────                ──────
click "Send my resume"
dialog: email + Turnstile
  │ POST { email, token, website }
  ├───────────────────────────────►
  │                                origin check (CORS)
  │                                honeypot → fake 200
  │                                email syntax → 400
  │                                rate limit by IP → 429
  │                                Turnstile verify → 403
  │                                subject/body/attachment fixed here
  │                                ├────────────────────────────────►  ✉ to visitor
  │                                ├────────────────────────────────►  ✉ notify Terence
  │ 200 { ok:true } / 4xx / 5xx    │◄────────────────────────────────
  │◄───────────────────────────────
"Sent — check your inbox"
(on failure: "Download it directly →")
```

The browser controls **only the recipient address**. Subject, body and attachment are
hardcoded in the Worker; there is no way to make this send arbitrary content to a third
party, which is what separates it from an open relay.

---

## Stage 1 — Domain and provider setup (no code)

**Do this first: the is-a.dev PR is reviewed by volunteers and may take days.**

1. Create a Resend account, add domain `terencezhang.is-a.dev`, copy the generated values.
2. Open one PR to [`is-a-dev/register`](https://github.com/is-a-dev/register) adding three
   files. **Do not modify `domains/terencezhang.json`.** Each needs the same `owner` block
   as the existing file (`TerenceZhang29` / `terencezhang829@gmail.com`).

`domains/send.terencezhang.json` — envelope sender and SPF:

```json
{
  "owner": { "username": "TerenceZhang29", "email": "terencezhang829@gmail.com" },
  "records": {
    "MX": [{ "priority": 10, "target": "feedback-smtp.us-east-1.amazonses.com" }],
    "TXT": "v=spf1 include:amazonses.com ~all"
  }
}
```

`domains/resend._domainkey.terencezhang.json` — DKIM (paste Resend's key verbatim):

```json
{
  "owner": { "username": "TerenceZhang29", "email": "terencezhang829@gmail.com" },
  "records": { "TXT": "p=<DKIM public key from Resend>" }
}
```

`domains/_dmarc.terencezhang.json` — DMARC, monitoring only to start:

```json
{
  "owner": { "username": "TerenceZhang29", "email": "terencezhang829@gmail.com" },
  "records": { "TXT": "v=DMARC1; p=none; rua=mailto:terencezhang829@gmail.com" }
}
```

Use the region Resend actually shows (`us-east-1` above is an example). Their guide says to
paste the host **without** the domain suffix, which is what the filenames encode.

3. While the PR is open, develop against Resend's onboarding sending domain so Stage 2 is
   not blocked. Switching later is a one-line `from:` change.
4. Create a Turnstile site (free) and note the site key (public, goes in the page) and the
   secret key (Worker secret).

### Acceptance — Stage 1

- `dig TXT resend._domainkey.terencezhang.is-a.dev` and `dig MX send.terencezhang.is-a.dev` return the expected values.
- Resend shows the domain **verified**.
- `https://terencezhang.is-a.dev/` still serves the site (the CNAME was not touched).

---

## Stage 2 — The Worker

A separate deployable, kept in this repo under `worker/` but never served by Pages.

```bash
npm create cloudflare@latest -- worker     # "Hello World" / JavaScript / no git
cd worker
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET
```

`worker/wrangler.jsonc`:

```jsonc
{
  "name": "resume-mailer",
  "main": "src/index.js",
  "compatibility_date": "2026-09-01",
  "vars": {
    "ALLOWED_ORIGIN": "https://terencezhang.is-a.dev",
    "RESUME_URL": "https://terencezhang.is-a.dev/files/Terence_Zhang_Resume.pdf",
    "FROM": "Terence Zhang <resume@terencezhang.is-a.dev>",
    "NOTIFY": "terencezhang829@gmail.com",
    "ENABLED": "true"
  },
  "ratelimits": [
    { "name": "SENDS", "namespace_id": "1001", "simple": { "limit": 3, "period": 60 } }
  ]
}
```

### Behaviour, in order

| Step | Rule | Response |
|---|---|---|
| 1 | `OPTIONS` → CORS preflight | 204 + CORS headers |
| 2 | Method not `POST` | 405 |
| 3 | `Origin` ≠ `ALLOWED_ORIGIN` | 403 |
| 4 | `ENABLED !== 'true'` (kill switch) | 503 `{ error: 'disabled' }` |
| 5 | `website` honeypot filled | **200 `{ ok: true }`** — look successful, send nothing |
| 6 | Email fails syntax check or > 254 chars | 400 `{ error: 'invalid-email' }` |
| 7 | `SENDS.limit({ key: ip })` fails | 429 `{ error: 'rate-limited' }` |
| 8 | Turnstile siteverify fails | 403 `{ error: 'failed-challenge' }` |
| 9 | Resend send fails | 502 `{ error: 'send-failed' }` |
| 10 | Otherwise | 200 `{ ok: true }`, then fire the notification (failure here must not fail the request) |

The visitor email: fixed subject `Terence Zhang — resume`, a short plain-text intro naming
the site, the attachment (`path: RESUME_URL`, filename `Terence_Zhang_Resume.pdf`) **and**
the same URL as a link in the body. `reply_to` is Terence's address.

CORS headers on every response: `Access-Control-Allow-Origin: <ALLOWED_ORIGIN>`,
`Access-Control-Allow-Headers: content-type`, `Access-Control-Allow-Methods: POST, OPTIONS`.

Never echo the submitted address back in an error message, and never log the full address
beyond Resend's own 30-day log retention.

**Rate limiting reality:** the built-in binding supports only 10s or 60s windows, so it
gives "3 per minute per IP" and nothing longer. That is enough to stop casual hammering.
A per-address daily cap needs Workers KV (free tier: 1,000 writes/day) — add it only if
abuse actually appears, as a `LIMITS` KV namespace keyed by a hash of the address.

### Tests — `worker/test/`

`node:test` with `fetch` stubbed; no network. One case per row of the table above, plus:
a valid request calls Resend exactly once with `to` equal to the submitted address; the
notification is a second call; a Resend 500 surfaces as 502; a notification failure still
returns 200.

### Acceptance — Stage 2

```bash
npx wrangler dev
curl -X POST localhost:8787 -H 'content-type: application/json' \
  -H 'Origin: https://terencezhang.is-a.dev' -d '{"email":"me@example.com","token":"test"}'
```

- Every row of the behaviour table reproduces by curl against `wrangler dev`.
- `npx wrangler deploy` publishes to `resume-mailer.<subdomain>.workers.dev`; the same curl works against it.
- A real send arrives with the PDF attached and readable.
- `npx wrangler tail` shows no unhandled exceptions.

---

## Stage 3 — Button and dialog, both views

### Shared module `assets/js/mailer.js`

Loaded by both pages, alongside `view.js`. Exposes nothing globally except
`window.terenceMailer = { open }`. Responsibilities:

- find every `[data-send-resume]` button and open the dialog on click;
- manage states `idle → sending → sent | error`, disabling the submit button while sending;
- validate the address client-side before POSTing (same regex as the Worker), showing the
  message inline and keeping focus in the field;
- `POST` JSON to the endpoint from `data-endpoint` on the dialog (one place to change it);
- focus trap, Esc to close, restore focus to the invoking button, `aria-live="polite"` on
  the status line so screen readers hear the result;
- on error, show the message **and** a direct `resume.pdf` link.

Turnstile: load `https://challenges.cloudflare.com/turnstile/v0/api.js` lazily when the
dialog first opens, so the script is not on every page load. If it fails to load, keep the
dialog usable and let the Worker reject — never leave the visitor stuck.

### Markup

- **OS view** (`index.html`): a `.linkbtn.linkbtn--primary` with `data-send-resume` in the
  `contact.json` window, above the existing email row. One dialog near `#viewprompt`,
  reusing that modal's grammar (`.viewprompt__scrim` treatment, `--surface`, `--radius`,
  `--shadow-active`, `--t-open`). New CSS block `.mailer` in `os.css`, **in rem** — the
  stage-5 test rejects stray px.
- **Traditional view** (`classic.html`): a `.button.primary` with `data-send-resume` in the
  contact band beside the email link, and its own `.mailer` block in `main.css` (px is fine
  there; that view does not rem-scale).

Copy: button **Send my resume**; dialog heading *Where should I send it?*; helper line
*"I'll send the PDF straight away. Your address is used once for that, and to let me know
you asked."*; submit **Send**; success *"Sent — check your inbox, and spam just in case."*

### No-JS and failure

Without JavaScript the button is not rendered as a control at all — it is an `<a>` pointing
at `/files/Terence_Zhang_Resume.pdf` which `mailer.js` upgrades to a dialog trigger on load.
That way the no-JS document stack (stage 3) keeps working and nothing dead-ends.

### Acceptance — Stage 3

- Dialog opens from both views, focus lands on the email field, Tab cycles inside, Esc closes and returns focus.
- Invalid address shows an inline message and never POSTs.
- Success and error states both render; the error state offers the direct download.
- 390px: dialog fits, no horizontal overflow, controls ≥44px.
- With JS disabled, the control is a plain link to the PDF.

---

## Stage 4 — Tests, QA and rollout

### Site tests

- `tests/mailer.test.js` — new suite in `tests/run.js`: both views carry a
  `[data-send-resume]` control and the dialog markup with `role="dialog"`/`aria-modal`;
  `mailer.js` is loaded after `view.js` in both; the endpoint appears exactly once
  (in `data-endpoint`); no API key or secret-looking string is present in any committed
  site file; the `resume.pdf` fallback link still exists.
- Existing suites keep passing unchanged.
- Mutation-check the new assertions the way stages 4–5 did: break each one deliberately in
  memory and confirm it fails.

### Browser QA (headless harness, `window.fetch` stubbed)

1. Happy path → "Sent" state, one POST, body is exactly `{ email, token, website }`.
2. Worker 429 → rate-limit message; 403 → challenge message; 502 → failure + download link.
3. Network rejection → failure state, no unhandled rejection.
4. Invalid addresses (`a@b`, empty, 300 chars) → no request made.
5. Double-click submit → exactly one request.
6. Esc, scrim click, and close button all dismiss and restore focus.
7. 390px and 2560×1440 (the scaled case) → dialog centred, no overflow, buttons ≥44px.
8. Both views, plus the no-JS fallback.

### Deliverability

Send to Gmail, Outlook and one corporate domain. Check inbox vs spam, that the attachment
opens, and that `Authentication-Results` shows `spf=pass` and `dkim=pass` with DKIM aligned
to `terencezhang.is-a.dev`. Watch the DMARC `rua` reports for a week before considering
`p=quarantine`.

### Operations

- **Kill switch:** `npx wrangler deploy --var ENABLED:false` disables sending in seconds;
  the dialog then shows the failure state with the download link.
- **Monitoring:** `wrangler tail` during rollout; Resend's dashboard for bounces and
  complaints. If bounce rate climbs, the address field is being abused — tighten to KV
  per-address limits.
- **Privacy:** addresses exist only in Resend's 30-day logs and Terence's notification
  inbox. The dialog says so in one line. Nothing is stored in this repo.

---

## Verification

`node tests/run.js` passes; the Worker's own suite passes; the eight browser QA checks are
run with observed values reported; a real end-to-end send arrives with a working attachment
and passing SPF/DKIM; `git status` shows only: `worker/**`, `assets/js/mailer.js`,
`tests/mailer.test.js`, `prompts/send-resume.md`, and edits to `index.html`,
`classic.html`, `assets/css/os.css`, `assets/css/main.css`, `tests/run.js`.

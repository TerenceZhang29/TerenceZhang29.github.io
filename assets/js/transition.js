/* ============================================================================
   View transitions — shared by the terenceOS desktop (index.html) and the
   traditional page (classic.html). Spec: prompts/stage6.md.
   ----------------------------------------------------------------------------
   Leaving terenceOS, the desktop collapses into a small window that shuts down
   over the traditional page. Entering it, a window boots over the traditional
   page, then grows into the desktop. About 2.6 s either way.

   Each view is its own page, so every transition is split at a frame both
   pages can draw identically — the shutdown window on dark ground going one
   way, a plain dark screen coming back — and the browser changes page
   underneath that frame. A one-shot note in sessionStorage tells the arriving
   page which half to play.

   Loaded as the FIRST element of <body> on both pages: the arriving half has
   to be in the page's first paint, and document.body already exists here.
   Keep it small and independent of anything later in the page.

   Only explicit switches animate (view.js hands them over via leave()). The
   pre-paint redirect in index.html's <head> stays instant.
   ========================================================================= */
(function () {
	'use strict';

	var NOTE = 'terenceos:transition';
	var FRESH = 5000; /* an older note is a reload or a Back, not a handoff */
	var EIO = 'cubic-bezier(0.65, 0, 0.35, 1)';
	var EO = 'cubic-bezier(0.22, 1, 0.36, 1)';

	/* Handoff times, in ms from the click. The arriving page starts from these. */
	var SHUTDOWN_HANDOFF = 550;
	var BOOT_HANDOFF = 2150;

	var root = document.documentElement;
	var onClassic = /(^|\/)classic\.html$/.test(window.location.pathname);
	var running = null;

	/* ---------------------------------------------------------------- note */

	function session() {
		try { return window.sessionStorage; } catch (e) { return null; }
	}

	function writeNote(kind, extra) {
		var s = session();
		if (!s) return;
		var note = { kind: kind, at: Date.now() };
		if (extra) for (var k in extra) note[k] = extra[k];
		try { s.setItem(NOTE, JSON.stringify(note)); } catch (e) { /* the next page just appears */ }
	}

	function dropNote() {
		var s = session();
		try { if (s) s.removeItem(NOTE); } catch (e) { /* nothing to drop */ }
	}

	/* Read once, then gone: a reload or a later Back never replays a transition. */
	function takeNote() {
		var s = session();
		if (!s) return null;
		try {
			var raw = s.getItem(NOTE);
			s.removeItem(NOTE);
			if (!raw) return null;
			var note = JSON.parse(raw);
			var age = Date.now() - (note && note.at);
			return age >= 0 && age < FRESH ? note : null;
		} catch (e) {
			return null;
		}
	}

	/* ------------------------------------------------------------- running */

	function reducedMotion() {
		try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
	}

	/* A click or any key skips to the end. Captured, so the desktop's own
	   shortcuts never see the key while it is shutting down. */
	function swallow(e) {
		if (!running) return;
		if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		running.skip();
	}

	function begin(skip) {
		running = { timers: [], anims: [], nodes: [], styles: [], skip: skip };
		root.classList.add('tx-running');
		window.addEventListener('keydown', swallow, true);
		window.addEventListener('pointerdown', swallow, true);
	}

	function later(ms, fn) {
		running.timers.push(setTimeout(fn, Math.max(0, ms)));
	}

	function anim(node, frames, options) {
		var opts = { fill: 'both' };
		for (var k in options) opts[k] = options[k];
		var a = node.animate(frames, opts);
		running.anims.push(a);
		return a;
	}

	/* Inline styles the transition sets on the page itself, so end() can put them back. */
	function setStyle(node, prop, value) {
		running.styles.push([node, prop, node.style[prop]]);
		node.style[prop] = value;
	}

	/* Leaves nothing behind: no overlay, no animations, no classes, no styles. */
	function end() {
		if (!running) return;
		var r = running;
		running = null;
		r.timers.forEach(clearTimeout);
		r.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* already gone */ } });
		r.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
		r.styles.reverse().forEach(function (s) { s[0].style[s[1]] = s[2]; });
		root.classList.remove('tx-running', 'tx-fade-in');
		window.removeEventListener('keydown', swallow, true);
		window.removeEventListener('pointerdown', swallow, true);
	}

	/* ------------------------------------------------------------- drawing */

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text) n.textContent = text;
		return n;
	}

	var BOOT_LOG = [
		{ text: 'terenceOS v2026.1', cls: 'head' },
		{ text: 'reading preference · terenceos:view=os', ok: true },
		{ text: 'mounting ~/projects', ok: true },
		{ text: 'starting terminal', ok: true },
		{ text: 'opening profile', ok: true },
		{ text: 'ready.', cls: 'last' }
	];

	/* The one window both pages draw, so the handoff frame matches exactly. */
	function mount(kind) {
		var shutdown = kind === 'shutdown';
		var ui = { tx: el('div', 'tx'), backdrop: el('div', 'tx__backdrop'), win: el('div', 'tx__win'), lines: [] };
		ui.win.setAttribute('role', 'status');
		ui.win.setAttribute('aria-label', shutdown ? 'Shutting down terenceOS' : 'Starting terenceOS');

		var bar = el('div', 'tx__bar');
		bar.appendChild(el('i'));
		bar.appendChild(el('i'));
		bar.appendChild(el('i'));
		bar.appendChild(el('span', 'tx__title', shutdown ? 'terenceOS — shutting down' : 'terenceOS — starting up'));

		var body;
		if (shutdown) {
			body = el('div', 'tx__body tx__min');
			body.appendChild(el('div', 'tx__mark', 'terenceOS'));
			body.appendChild(el('div', 'tx__status', 'Shutting down'));
			ui.step = body.appendChild(el('div', 'tx__step'));
		} else {
			body = el('div', 'tx__body tx__log');
			BOOT_LOG.forEach(function (line) {
				var row = el('div', line.cls);
				if (line.ok) {
					row.appendChild(el('span', 'ok', '[ ok ]'));
					row.appendChild(document.createTextNode(' ' + line.text));
				} else {
					row.textContent = line.text;
				}
				ui.lines.push(body.appendChild(row));
			});
		}

		var prog = el('div', 'tx__prog');
		ui.fill = prog.appendChild(el('b'));
		ui.parts = [bar, body, prog];
		ui.win.appendChild(bar);
		ui.win.appendChild(body);
		ui.win.appendChild(prog);
		if (shutdown) ui.flash = ui.win.appendChild(el('div', 'tx__flash'));

		ui.tx.appendChild(ui.backdrop);
		ui.tx.appendChild(ui.win);
		document.body.appendChild(ui.tx);
		running.nodes.push(ui.tx);
		return ui;
	}

	/* The plain dark screen the OS boots behind. */
	function mountCover() {
		var tx = el('div', 'tx');
		var cover = tx.appendChild(el('div', 'tx__backdrop'));
		cover.style.background = '#080B0F';
		document.body.appendChild(tx);
		running.nodes.push(tx);
		return cover;
	}

	/* Titles of the windows open right now, as the shutdown window names them. */
	function openApps() {
		var names = [];
		document.querySelectorAll('.os .win').forEach(function (w) {
			if (w.hidden) return;
			var title = (w.getAttribute('data-title') || '').split(' — ')[0];
			if (title && names.indexOf(title) < 0) names.push(title);
		});
		return names.slice(0, 3);
	}

	function whenReady(fn) {
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
		else fn();
	}

	/* ======================================== terenceOS → traditional */

	/* On the desktop: collapse it into the window, then hand over. */
	function leaveShutdown(href) {
		var os = document.querySelector('.os');
		if (!os) return false;
		var go = function () { window.location.href = href; };
		var apps = openApps();

		/* Layers outside the desktop would not collapse with it. */
		['palette', 'viewprompt'].forEach(function (id) {
			var n = document.getElementById(id);
			if (n) n.hidden = true;
		});

		begin(function () { dropNote(); go(); });
		var ui = mount('shutdown');
		ui.backdrop.style.opacity = '0'; /* here the page's own ground shows instead */

		/* Scale the desktop about the viewport's centre down to the window's width,
		   and crop it to the window's shape. Measured, so any aspect ratio and any
		   scroll position lands exactly on the window. */
		var vw = window.innerWidth, vh = window.innerHeight;
		var box = os.getBoundingClientRect();
		var w = ui.win.getBoundingClientRect();
		var s = w.width / vw;
		var ox = vw / 2 - box.left, oy = vh / 2 - box.top;
		var halfW = w.width / s / 2, halfH = w.height / s / 2;
		var inset = [oy - halfH, box.width - ox - halfW, box.height - oy - halfH, ox - halfW]
			.map(function (v) { return Math.max(0, v) + 'px'; }).join(' ');
		var radius = parseFloat(getComputedStyle(ui.win).borderTopLeftRadius) / s;

		setStyle(document.body, 'background', '#05070A');
		setStyle(os, 'backgroundColor', '#080B0F');
		setStyle(os, 'transformOrigin', ox + 'px ' + oy + 'px');
		anim(os, [
			{ transform: 'scale(1)', clipPath: 'inset(0px 0px 0px 0px round 0px)', filter: 'brightness(1)' },
			{ transform: 'scale(' + s + ')', clipPath: 'inset(' + inset + ' round ' + radius + 'px)', filter: 'brightness(0.7)' }
		], { duration: 450, easing: EIO });
		anim(ui.win, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 350 });

		later(SHUTDOWN_HANDOFF, function () { writeNote('shutdown', { apps: apps }); go(); });
		return true;
	}

	/* On the traditional page: the window arrives already on screen, finishes
	   shutting down, and powers off like an old monitor. */
	function arriveShutdown(apps) {
		begin(end);
		var ui = mount('shutdown');
		ui.backdrop.style.background = '#05070A';
		var at = function (t) { return t - SHUTDOWN_HANDOFF; };
		var span = at(2600);

		/* Fade the page up behind the window, hold, then lift the scrim. */
		anim(ui.backdrop, [
			{ opacity: 1, offset: 0, easing: EO },
			{ opacity: 0.55, offset: at(850) / span },
			{ opacity: 0.55, offset: at(2150) / span, easing: EO },
			{ opacity: 0, offset: 1 }
		], { duration: span });

		anim(ui.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
			{ delay: at(780), duration: 1170, easing: EIO });

		/* Collapse to a bright line, then to a point. */
		anim(ui.win, [
			{ transform: 'scale(1, 1)', offset: 0, easing: EIO },
			{ transform: 'scale(1, 0.006)', offset: 180 / 340, easing: EIO },
			{ transform: 'scale(0, 0.006)', offset: 1 }
		], { delay: at(2000), duration: 340 });
		anim(ui.flash, [{ opacity: 0 }, { opacity: 0.9 }], { delay: at(2000), duration: 180, easing: EIO });

		var names = (Array.isArray(apps) && apps.length ? apps : ['terminal', 'profile']).slice(0, 3);
		var steps = names.map(function (n) { return 'closing ' + n; })
			.concat(['remembering your choice', 'goodbye.']);
		steps.forEach(function (text, i) {
			later(at(800 + i * (1050 / (steps.length - 1))), function () { ui.step.textContent = text; });
		});

		later(span, end);
	}

	/* ======================================== traditional → terenceOS */

	/* On the traditional page: boot in a window, then grow it into a dark screen. */
	function leaveBoot(href) {
		var go = function () { window.location.href = href; };
		begin(function () { dropNote(); go(); });
		var ui = mount('boot');
		ui.backdrop.style.background = '#05070A';

		anim(ui.backdrop, [{ opacity: 0 }, { opacity: 0.55 }], { duration: 350, easing: EO });
		anim(ui.win, [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'scale(1)' }],
			{ duration: 350, easing: EO });

		ui.lines.forEach(function (row, i) {
			var t = i === ui.lines.length - 1 ? 1480 : 420 + i * 200;
			later(t, function () { row.classList.add('is-on'); });
			later(t + 120, function () { row.classList.add('is-ok'); });
		});
		anim(ui.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
			{ delay: 400, duration: 1250, easing: EIO });

		/* Empty the window, then grow it to the whole screen in the desktop's colour. */
		ui.parts.forEach(function (part) {
			anim(part, [{ opacity: 1 }, { opacity: 0 }], { delay: 1700, duration: 150 });
		});
		var w = ui.win.getBoundingClientRect();
		anim(ui.win, [
			{ width: w.width + 'px', height: w.height + 'px', borderRadius: getComputedStyle(ui.win).borderTopLeftRadius,
				backgroundColor: '#0D1116', borderColor: '#303841' },
			{ width: '100%', height: '100%', borderRadius: '0px', backgroundColor: '#080B0F', borderColor: 'rgba(48, 56, 65, 0)' }
		], { delay: 1700, duration: BOOT_HANDOFF - 1700, easing: EIO, fill: 'forwards' });

		later(BOOT_HANDOFF, function () { writeNote('boot'); go(); });
		return true;
	}

	/* On the desktop: it boots under a dark cover, which then lifts. */
	function arriveBoot() {
		begin(end);
		var cover = mountCover();
		whenReady(function () {
			if (!running) return; /* skipped already */
			anim(cover, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: EO });
			var os = document.querySelector('.os');
			if (os) anim(os, [{ transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 450, easing: EO });
			later(450, end);
		});
	}

	/* ======================================== reduced motion */

	function leaveFade(href) {
		var go = function () { window.location.href = href; };
		begin(function () { dropNote(); go(); });
		anim(document.body, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
		later(200, function () { writeNote('fade'); go(); });
		return true;
	}

	function arriveFade() {
		begin(end);
		root.classList.add('tx-fade-in');
		whenReady(function () {
			if (!running) return;
			var a = anim(document.body, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
			a.onfinish = end;
		});
	}

	/* ======================================== entry points */

	/* Called by view.js's switchTo() after the preference is written. Returns
	   true when it has taken over navigation, false to let view.js navigate. */
	function leave(view, href) {
		if (running) return true; /* a second click while one is playing */
		if (!document.body || !document.body.animate) return false;
		if (reducedMotion()) return leaveFade(href);
		if (!onClassic && view === 'classic') return leaveShutdown(href);
		if (onClassic && view === 'os') return leaveBoot(href);
		return false;
	}

	var note = takeNote();
	if (note && document.body && document.body.animate) {
		if (note.kind === 'fade') arriveFade();
		else if (note.kind === 'shutdown' && onClassic) arriveShutdown(note.apps);
		else if (note.kind === 'boot' && !onClassic) arriveBoot();
	}

	/* Back or Forward can restore a page from memory exactly as it was left —
	   mid-collapse. Put it back to normal. */
	window.addEventListener('pageshow', function (e) {
		if (e.persisted) end();
	});

	window.terenceTransition = { leave: leave };
})();

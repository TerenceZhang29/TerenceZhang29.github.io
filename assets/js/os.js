/* ============================================================================
   terenceOS — window manager, launcher, dock and terminal.
   ----------------------------------------------------------------------------
   One Window primitive drives every application. Each <section class="win">
   in the markup carries its own content plus the metadata the manager needs
   (data-app, data-title, data-icon, data-w/h/x/y); the chrome — title bar,
   controls, resize grip — is built here so window behaviour is defined once.

   Everything degrades gracefully: without JS the content is still in the DOM,
   and every application is reachable from the sidebar, the shortcuts and the
   dock as well as from the terminal.
   ========================================================================= */
(function () {
	'use strict';

	var PHONE = window.matchMedia('(max-width: 720px)');

	/* One registry behind the palette, the keyboard shortcuts, the dock labels
	   and the terminal, so every entry point resolves to the same application. */
	var APPS = [
		{ id: 'terminal', name: 'Terminal', sub: 'home — whoami, ls, help', icon: 'i-terminal', group: 'Applications', keys: 'home shell console' },
		{ id: 'profile', name: 'Profile', sub: 'whoami', icon: 'i-badge', group: 'Applications', keys: 'avatar portrait me photo who' },
		{ id: 'about', name: 'About', sub: 'about.txt', icon: 'i-user', group: 'Applications', keys: 'bio who education cornell' },
		{ id: 'projects', name: 'Projects', sub: '~/projects', icon: 'i-folder', group: 'Applications', keys: 'work portfolio' },
		{ id: 'experience', name: 'Experience', sub: 'experience.log', icon: 'i-briefcase', group: 'Applications', keys: 'jobs roles career vicino bili amazon millennium' },
		{ id: 'stack', name: 'Stack', sub: 'stack.json — system information', icon: 'i-layers', group: 'Applications', keys: 'skills tools languages' },
		{ id: 'contact', name: 'Contact', sub: 'contact.json', icon: 'i-mail', group: 'Applications', keys: 'email hire reach linkedin github' },
		{ id: 'project-vicino', name: 'Vicino AI Image Editor', sub: 'Product · AI', icon: 'i-box', group: 'Projects', keys: 'shopline image editing' },
		{ id: 'project-rent', name: 'Rent Calculator', sub: 'Tool · Web app', icon: 'i-box', group: 'Projects', keys: 'rent vercel' },
		{ id: 'project-clubby', name: 'Clubby', sub: 'Product · Community', icon: 'i-box', group: 'Projects', keys: 'campus clubs' },
		{ id: 'resume', name: 'Resume', sub: 'Terence_Zhang_Resume.pdf', icon: 'i-pdf', group: 'Files & links', keys: 'cv download pdf', href: '/files/Terence_Zhang_Resume.pdf', external: true },
		{ id: 'github', name: 'GitHub', sub: 'github.com/TerenceZhang29', icon: 'i-github', group: 'Files & links', keys: 'code repos', href: 'https://github.com/TerenceZhang29', external: true },
		{ id: 'linkedin', name: 'LinkedIn', sub: 'terence-hantian-zhang', icon: 'i-linkedin', group: 'Files & links', keys: 'profile', href: 'https://www.linkedin.com/in/terence-hantian-zhang/', external: true },
		{ id: 'classic', name: 'Traditional view', sub: 'classic.html — plain scrolling page', icon: 'i-file', group: 'Files & links', keys: 'classic simple traditional plain switch view', view: 'classic' },
		{ id: 'email', name: 'Copy email address', sub: 'terencezhang829@gmail.com', icon: 'i-mail', group: 'Files & links', keys: 'mail copy contact', copy: 'terencezhang829@gmail.com' }
	];

	/* Alt+1..6 — the six applications in sidebar order. Alt is used rather than
	   the browser-owned Cmd/Ctrl+number tab switching. */
	var QUICK = ['terminal', 'about', 'projects', 'experience', 'stack', 'contact'];

	function appById(id) {
		for (var i = 0; i < APPS.length; i += 1) { if (APPS[i].id === id) return APPS[i]; }
		return null;
	}

	/* The one place an application is "launched" from, whatever the entry point. */
	function launch(id) {
		var app = appById(id);
		if (app && app.view) return switchView(app.view);
		if (app && app.copy) return copyText(app.copy);
		if (app && app.href) {
			if (app.external) window.open(app.href, '_blank', 'noopener');
			else window.location.href = app.href;
			return true;
		}
		if (windows.has(id)) { open(id); return true; }
		return false;
	}

	/* Every way out of the OS goes through the shared view module, so switching
	   and remembering the choice can never disagree. If that module failed to
	   load, still get the visitor where they asked to go. */
	function switchView(view) {
		if (window.terenceView && window.terenceView.switchTo(view)) return true;
		window.location.href = view === 'classic' ? 'classic.html' : 'index.html';
		return true;
	}

	function copyText(text) {
		if (navigator.clipboard) navigator.clipboard.writeText(text);
		return true;
	}
	var workspace = document.querySelector('.workspace');
	var dock = document.getElementById('dock');
	var profileCard = document.querySelector('.sidebar__card');
	var windows = new Map(); /* app id -> record */
	var zTop = 10;
	var active = null;

	function isPhone() { return PHONE.matches; }

	function icon(id, cls) {
		return '<svg class="' + (cls || 'icon') + '" aria-hidden="true"><use href="#' + id + '" /></svg>';
	}

	/* ------------------------------------------------------------- windows */

	function build(el) {
		var app = el.dataset.app;
		var title = el.dataset.title || app;
		var bar = document.createElement('div');
		bar.className = 'win__bar';
		bar.innerHTML =
			'<div class="win__controls">' +
				'<button class="win__control" type="button" data-act="close" aria-label="Close ' + title + '"></button>' +
				'<button class="win__control" type="button" data-act="min" aria-label="Minimize ' + title + '"></button>' +
				'<button class="win__control" type="button" data-act="max" aria-label="Maximize ' + title + '"></button>' +
			'</div>' +
			'<p class="win__title">' + icon(el.dataset.icon || 'i-file') + '<span>' + title + '</span></p>';
		el.prepend(bar);

		var grip = document.createElement('div');
		grip.className = 'win__resize';
		el.append(grip);

		var rec = {
			id: app,
			el: el,
			bar: bar,
			grip: grip,
			title: title,
			iconId: el.dataset.icon || 'i-file',
			w: parseInt(el.dataset.w, 10) || 620,
			h: parseInt(el.dataset.h, 10) || 520,
			x: parseInt(el.dataset.x, 10) || 80,
			y: parseInt(el.dataset.y, 10) || 60,
			placed: false,
			open: false,
			min: false,
			max: false,
			dockItem: null
		};
		windows.set(app, rec);

		bar.addEventListener('pointerdown', function (e) {
			focus(app, { moveFocus: false });
			if (e.target.closest('.win__control')) return;
			startDrag(rec, e);
		});
		bar.addEventListener('dblclick', function (e) {
			if (!e.target.closest('.win__control')) toggleMax(app);
		});
		grip.addEventListener('pointerdown', function (e) { startResize(rec, e); });
		el.addEventListener('pointerdown', function () { focus(app, { moveFocus: false }); });
		el.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { close(app); }
		});
		bar.querySelectorAll('.win__control').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var act = btn.dataset.act;
				if (act === 'close') close(app);
				else if (act === 'min') minimize(app);
				else toggleMax(app);
			});
		});
	}

	function place(rec) {
		if (isPhone()) return;
		var maxW = workspace.clientWidth;
		var maxH = workspace.clientHeight;
		var w = Math.min(rec.w, maxW - 32);
		var h = Math.min(rec.h, maxH - 32);
		var x = Math.max(16, Math.min(rec.x, maxW - w - 16));
		var y = Math.max(16, Math.min(rec.y, maxH - h - 16));
		Object.assign(rec.el.style, { width: w + 'px', height: h + 'px', left: x + 'px', top: y + 'px' });
		rec.placed = true;
	}

	function open(app, opts) {
		var rec = windows.get(app);
		if (!rec) return;
		if (!rec.placed) place(rec);
		if (rec.open && !rec.min) { focus(app); return rec; }

		rec.el.hidden = false;
		rec.open = true;
		rec.min = false;
		clearTimeout(rec.closeTimer);
		rec.el.classList.remove('is-closing');
		rec.el.classList.add('is-opening');
		setTimeout(function () { rec.el.classList.remove('is-opening'); }, 200);

		addDockItem(rec);
		focus(app, opts);
		return rec;
	}

	function close(app) {
		var rec = windows.get(app);
		if (!rec || !rec.open) return;
		rec.el.classList.add('is-closing');
		rec.closeTimer = setTimeout(function () {
			rec.el.classList.remove('is-closing');
			rec.el.hidden = true;
		}, 120);
		rec.open = false;
		rec.min = false;
		if (rec.dockItem) { rec.dockItem.remove(); rec.dockItem = null; }
		if (active === app) active = null;
		syncChrome();
		focusTopmost();
	}

	function minimize(app) {
		var rec = windows.get(app);
		if (!rec || !rec.open) return;
		rec.min = true;
		rec.el.hidden = true;
		if (active === app) active = null;
		syncChrome();
		focusTopmost();
	}

	function toggleMax(app) {
		var rec = windows.get(app);
		if (!rec || isPhone()) return;
		if (rec.max) {
			Object.assign(rec.el.style, rec.restore);
			rec.max = false;
			rec.el.classList.remove('is-max');
		} else {
			rec.restore = { width: rec.el.style.width, height: rec.el.style.height, left: rec.el.style.left, top: rec.el.style.top };
			Object.assign(rec.el.style, {
				left: '8px', top: '8px',
				width: (workspace.clientWidth - 16) + 'px',
				height: (workspace.clientHeight - 16 - 70) + 'px'
			});
			rec.max = true;
			rec.el.classList.add('is-max');
		}
	}

	function focus(app, opts) {
		var rec = windows.get(app);
		if (!rec || !rec.open) return;
		if (rec.min) { rec.min = false; rec.el.hidden = false; }
		zTop += 1;
		rec.el.style.zIndex = zTop;
		active = app;
		syncChrome();
		if (!opts || opts.moveFocus !== false) {
			if (!rec.el.hasAttribute('tabindex')) rec.el.setAttribute('tabindex', '-1');
			var target = (app === 'terminal' && !isPhone() && input) ? input : rec.el;
			target.focus({ preventScroll: true });
		}
		/* The desktop's own URL stays clean; every other application is linkable. */
		history.replaceState(null, '', (rec.el.id && app !== 'terminal') ? '#' + rec.el.id : window.location.pathname);
	}

	function focusTopmost() {
		var best = null;
		windows.forEach(function (rec) {
			if (!rec.open || rec.min) return;
			var z = parseInt(rec.el.style.zIndex, 10) || 0;
			if (!best || z > (parseInt(best.el.style.zIndex, 10) || 0)) best = rec;
		});
		if (best) { active = best.id; syncChrome(); }
	}

	function closeAll() {
		windows.forEach(function (rec) { if (rec.open) close(rec.id); });
	}

	/* --------------------------------------------------------- dock + state */

	function addDockItem(rec) {
		if (rec.dockItem) return;
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'dock__item';
		btn.dataset.dock = rec.id;
		btn.dataset.tip = rec.title;
		btn.innerHTML = icon(rec.iconId) + '<span>' + rec.id.replace('project-', '') + '</span><span class="dock__indicator"></span>';
		btn.addEventListener('click', function () {
			if (active === rec.id && !rec.min) minimize(rec.id);
			else focus(rec.id);
		});
		dock.append(btn);
		rec.dockItem = btn;
	}

	function syncChrome() {
		windows.forEach(function (rec) {
			var isActive = rec.open && !rec.min && active === rec.id;
			rec.el.classList.toggle('is-active', isActive);
			if (rec.dockItem) {
				rec.dockItem.dataset.active = String(isActive);
				rec.dockItem.dataset.state = rec.min ? 'min' : 'open';
				rec.dockItem.setAttribute('aria-pressed', String(isActive));
				rec.dockItem.setAttribute('aria-label', rec.title + (rec.min ? ' (minimized)' : ''));
			}
		});
		document.querySelectorAll('.launcher[data-launch], .mobilenav [data-launch]').forEach(function (el) {
			var rec = windows.get(el.dataset.launch);
			if (!rec) return;
			var isActive = rec.open && !rec.min && active === rec.id;
			el.dataset.open = String(rec.open);
			el.dataset.active = String(isActive);
			el.setAttribute('aria-current', isActive ? 'true' : 'false');
		});
		/* The sidebar card is the profile window collapsed: exactly one of the
		   two is on screen, so closing or minimizing the window brings it back. */
		if (profileCard) {
			var profile = windows.get('profile');
			profileCard.hidden = !!(profile && profile.open && !profile.min);
		}
		buildWindowMenu();
	}

	function buildWindowMenu() {
		var menu = document.querySelector('[data-window-menu]');
		if (!menu) return;
		menu.innerHTML = '';
		var any = false;
		windows.forEach(function (rec) {
			if (!rec.open) return;
			any = true;
			var b = document.createElement('button');
			b.type = 'button';
			b.setAttribute('role', 'menuitem');
			b.innerHTML = icon(rec.iconId) + rec.title + (rec.min ? '<kbd>min</kbd>' : (active === rec.id ? '<kbd>active</kbd>' : ''));
			b.addEventListener('click', function () { focus(rec.id); closeMenus(); });
			menu.append(b);
		});
		if (!any) {
			menu.innerHTML = '<button type="button" role="menuitem" disabled>No open windows</button>';
		}
	}

	/* ---------------------------------------------------------- drag/resize */

	function startDrag(rec, e) {
		if (isPhone() || rec.max || e.button !== 0) return;
		var startX = e.clientX, startY = e.clientY;
		var originX = rec.el.offsetLeft, originY = rec.el.offsetTop;
		rec.bar.setPointerCapture(e.pointerId);

		function move(ev) {
			var x = originX + ev.clientX - startX;
			var y = originY + ev.clientY - startY;
			var maxX = workspace.clientWidth - 60;
			var maxY = workspace.clientHeight - 40;
			rec.el.style.left = Math.max(-rec.el.offsetWidth + 120, Math.min(x, maxX)) + 'px';
			rec.el.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
		}
		function up() {
			rec.bar.removeEventListener('pointermove', move);
			rec.bar.removeEventListener('pointerup', up);
			rec.bar.removeEventListener('pointercancel', up);
		}
		rec.bar.addEventListener('pointermove', move);
		rec.bar.addEventListener('pointerup', up);
		rec.bar.addEventListener('pointercancel', up);
	}

	function startResize(rec, e) {
		if (isPhone() || e.button !== 0) return;
		e.preventDefault();
		var startX = e.clientX, startY = e.clientY;
		var w0 = rec.el.offsetWidth, h0 = rec.el.offsetHeight;
		rec.grip.setPointerCapture(e.pointerId);

		function move(ev) {
			rec.el.style.width = Math.max(300, Math.min(w0 + ev.clientX - startX, workspace.clientWidth - rec.el.offsetLeft - 8)) + 'px';
			rec.el.style.height = Math.max(180, Math.min(h0 + ev.clientY - startY, workspace.clientHeight - rec.el.offsetTop - 8)) + 'px';
		}
		function up() {
			rec.grip.removeEventListener('pointermove', move);
			rec.grip.removeEventListener('pointerup', up);
			rec.grip.removeEventListener('pointercancel', up);
		}
		rec.grip.addEventListener('pointermove', move);
		rec.grip.addEventListener('pointerup', up);
		rec.grip.addEventListener('pointercancel', up);
	}

	/* -------------------------------------------------------------- menubar */

	function closeMenus() {
		document.querySelectorAll('.menu[data-open="true"]').forEach(function (m) { m.dataset.open = 'false'; });
		document.querySelectorAll('.menubar__item').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
	}

	function initMenubar() {
		document.querySelectorAll('.menubar__item').forEach(function (btn) {
			btn.addEventListener('click', function (e) {
				e.stopPropagation();
				var menu = document.getElementById(btn.dataset.menu);
				var wasOpen = menu.dataset.open === 'true';
				closeMenus();
				if (!wasOpen) {
					menu.dataset.open = 'true';
					menu.style.left = btn.getBoundingClientRect().left + 'px';
					btn.setAttribute('aria-expanded', 'true');
				}
			});
		});
		document.addEventListener('click', function (e) {
			if (!e.target.closest('.menu') && !e.target.closest('.menubar')) closeMenus();
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') closeMenus();
		});

		document.querySelectorAll('.menu [data-open]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				open(btn.dataset.open);
				if (btn.dataset.run) runCommand(btn.dataset.run);
				closeMenus();
			});
		});
		document.querySelectorAll('.menu [data-href]').forEach(function (btn) {
			btn.addEventListener('click', function () { window.open(btn.dataset.href, '_blank', 'noopener'); closeMenus(); });
		});
		document.querySelectorAll('.menu [data-copy]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var text = btn.dataset.copy;
				var label = btn.textContent;
				if (navigator.clipboard) {
					navigator.clipboard.writeText(text).then(function () {
						btn.textContent = 'Copied';
						setTimeout(function () { btn.textContent = label; }, 1200);
					});
				}
				closeMenus();
			});
		});
		document.querySelectorAll('.menu [data-action]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				if (btn.dataset.action === 'palette') { closeMenus(); openPalette(); return; }
				if (btn.dataset.action === 'classic') { closeMenus(); switchView('classic'); return; }
				if (btn.dataset.action === 'close-all') closeAll();
				if (btn.dataset.action === 'reset') { closeAll(); windows.forEach(function (r) { r.placed = false; }); bootDefaults(); }
				closeMenus();
			});
		});
	}

	/* ------------------------------------------------------ command palette */

	var palette = document.getElementById('palette');
	var paletteInput = document.getElementById('palette-input');
	var paletteList = document.getElementById('palette-list');
	var paletteEmpty = document.getElementById('palette-empty');
	var paletteItems = [];
	var paletteIndex = 0;
	var paletteReturn = null;

	function score(app, q) {
		if (!q) return 0;
		var hay = (app.name + ' ' + app.sub + ' ' + app.keys).toLowerCase();
		var name = app.name.toLowerCase();
		if (name.indexOf(q) === 0) return 0;
		if (name.indexOf(q) > -1) return 1;
		return hay.indexOf(q) > -1 ? 2 : -1;
	}

	function renderPalette() {
		var q = paletteInput.value.trim().toLowerCase();
		var hits = APPS
			.map(function (app) { return { app: app, s: score(app, q) }; })
			.filter(function (h) { return h.s > -1; });
		if (q) hits.sort(function (a, b) { return a.s - b.s; });

		paletteList.innerHTML = '';
		paletteItems = [];
		var group = null;

		hits.forEach(function (hit, i) {
			var app = hit.app;
			if (!q && app.group !== group) {
				group = app.group;
				var head = document.createElement('li');
				head.className = 'palette__group';
				head.setAttribute('role', 'presentation');
				head.textContent = group;
				paletteList.append(head);
			}
			var li = document.createElement('li');
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'palette__item';
			btn.id = 'palette-item-' + i;
			btn.setAttribute('role', 'option');
			var quick = QUICK.indexOf(app.id);
			var rec = windows.get(app.id);
			var badge = quick > -1 ? '<kbd>⌥' + (quick + 1) + '</kbd>'
				: (app.external ? '<kbd>↗</kbd>' : '');
			btn.innerHTML = icon(app.icon) +
				'<span><b>' + app.name + '</b><br><small>' + app.sub +
				(rec && rec.open ? (rec.min ? ' · minimized' : ' · open') : '') + '</small></span>' +
				badge + icon('i-arrow-right', 'icon go');
			btn.addEventListener('click', function () { runPaletteItem(app); });
			btn.addEventListener('mousemove', function () { selectPalette(paletteItems.indexOf(btn)); });
			li.append(btn);
			paletteList.append(li);
			paletteItems.push(btn);
		});

		paletteEmpty.hidden = paletteItems.length > 0;
		selectPalette(0);
	}

	function selectPalette(i) {
		if (!paletteItems.length) return;
		paletteIndex = (i + paletteItems.length) % paletteItems.length;
		paletteItems.forEach(function (el, n) { el.setAttribute('aria-selected', String(n === paletteIndex)); });
		var el = paletteItems[paletteIndex];
		paletteInput.setAttribute('aria-activedescendant', el.id);
		var box = paletteList.getBoundingClientRect();
		var r = el.getBoundingClientRect();
		if (r.bottom > box.bottom) paletteList.scrollTop += r.bottom - box.bottom;
		if (r.top < box.top) paletteList.scrollTop -= box.top - r.top;
	}

	function runPaletteItem(app) {
		closePalette({ restoreFocus: false });
		launch(app.id);
	}

	function openPalette() {
		if (!palette.hidden) return;
		paletteReturn = document.activeElement;
		palette.hidden = false;
		paletteInput.value = '';
		renderPalette();
		paletteInput.focus();
	}

	function closePalette(opts) {
		if (palette.hidden) return;
		palette.hidden = true;
		if ((!opts || opts.restoreFocus !== false) && paletteReturn && paletteReturn.focus) {
			paletteReturn.focus({ preventScroll: true });
		}
		paletteReturn = null;
	}

	function initPalette() {
		paletteInput.addEventListener('input', renderPalette);
		paletteInput.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowDown') { e.preventDefault(); selectPalette(paletteIndex + 1); }
			else if (e.key === 'ArrowUp') { e.preventDefault(); selectPalette(paletteIndex - 1); }
			else if (e.key === 'Enter') {
				e.preventDefault();
				var el = paletteItems[paletteIndex];
				if (el) el.click();
			}
		});
		palette.querySelector('[data-palette-close]').addEventListener('click', function () { closePalette(); });
		/* Focus must not escape the palette while it is modal. */
		palette.addEventListener('keydown', function (e) {
			if (e.key !== 'Tab') return;
			var focusables = [paletteInput].concat(paletteItems);
			var i = focusables.indexOf(document.activeElement);
			e.preventDefault();
			var next = e.shiftKey ? i - 1 : i + 1;
			if (next < 0) next = focusables.length - 1;
			if (next >= focusables.length) next = 0;
			focusables[next].focus();
			if (next > 0) selectPalette(next - 1);
		});
	}

	/* ------------------------------------------------------- view prompt */

	/* Asked once per browser: 3s after the page has loaded, and only when no view
	   preference is stored. Answering either way stores one, so it never returns. */
	var viewPrompt = document.getElementById('viewprompt');
	var viewPromptReturn = null;
	var PROMPT_DELAY = 3000;
	var PROMPT_RETRY = 2000;

	function promptIsOpen() { return !!viewPrompt && !viewPrompt.hidden; }

	function shellIsBusy() {
		return !palette.hidden || !!document.querySelector('.menu[data-open="true"]');
	}

	function openViewPrompt() {
		if (!viewPrompt || promptIsOpen()) return;
		viewPromptReturn = document.activeElement;
		viewPrompt.hidden = false;
		document.getElementById('viewprompt-yes').focus();
	}

	function closeViewPrompt() {
		if (!promptIsOpen()) return;
		viewPrompt.hidden = true;
		if (viewPromptReturn && viewPromptReturn.focus) viewPromptReturn.focus({ preventScroll: true });
		viewPromptReturn = null;
	}

	/* "No" is also what Escape and a click on the scrim mean. */
	function declineViewPrompt() {
		if (window.terenceView) window.terenceView.write('os');
		closeViewPrompt();
	}

	function initViewPrompt() {
		if (!viewPrompt || !window.terenceView) return;

		document.getElementById('viewprompt-yes').addEventListener('click', function () {
			switchView('classic');
		});
		document.getElementById('viewprompt-no').addEventListener('click', declineViewPrompt);
		viewPrompt.querySelector('[data-viewprompt-dismiss]').addEventListener('click', declineViewPrompt);

		/* Focus stays inside the dialog while it is modal. */
		viewPrompt.addEventListener('keydown', function (e) {
			if (e.key !== 'Tab') return;
			var buttons = [document.getElementById('viewprompt-yes'), document.getElementById('viewprompt-no')];
			var i = buttons.indexOf(document.activeElement);
			e.preventDefault();
			buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
		});

		if (window.terenceView.read()) return;

		function attempt(retriesLeft) {
			if (window.terenceView.read()) return; /* chose meanwhile, e.g. via the menu */
			if (shellIsBusy()) {
				/* Don't interrupt someone mid-palette or mid-menu; try once more. */
				if (retriesLeft > 0) setTimeout(function () { attempt(retriesLeft - 1); }, PROMPT_RETRY);
				return;
			}
			openViewPrompt();
		}

		function start() { setTimeout(function () { attempt(1); }, PROMPT_DELAY); }
		if (document.readyState === 'complete') start();
		else window.addEventListener('load', start);
	}

	/* --------------------------------------------------- keyboard shortcuts */

	function isTyping(el) {
		return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
	}

	function initShortcuts() {
		document.addEventListener('keydown', function (e) {
			if (promptIsOpen()) {
				if (e.key === 'Escape') { e.preventDefault(); declineViewPrompt(); }
				return;
			}
			/* Command palette */
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				if (palette.hidden) openPalette(); else closePalette();
				return;
			}
			/* Alt+1..6 jumps straight to an application */
			if (e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-6]$/.test(e.code)) {
				e.preventDefault();
				launch(QUICK[Number(e.code.slice(5)) - 1]);
				return;
			}
			if (e.key !== 'Escape') return;

			/* Escape unwinds one layer at a time, innermost first. */
			if (!palette.hidden) { closePalette(); return; }
			if (document.querySelector('.menu[data-open="true"]')) { closeMenus(); return; }
			if (document.activeElement === input && input.value) { input.value = ''; syncGhost(); return; }
			if (active) close(active);
		});
	}

	/* ------------------------------------------------------------- terminal */

	var log = document.getElementById('terminal-log');
	var form = document.getElementById('terminal-form');
	var input = document.getElementById('terminal-input');
	var ghostTyped = document.querySelector('.terminal__typed');
	var ghostSuggest = document.querySelector('.terminal__suggest');
	var history_ = [];
	var historyIndex = -1;
	var booted = Date.now();

	function el(tag, cls, text) {
		var node = document.createElement(tag);
		if (cls) node.className = cls;
		if (text !== undefined) node.textContent = text;
		return node;
	}

	/* Commands return a string, a DOM node, or null (no output). Nothing here
	   touches the network or anything outside this page — it is a menu with a
	   prompt in front of it, not a shell. */
	var COMMANDS = {
		help: function () {
			var wrap = document.createElement('div');
			wrap.append(el('p', 'out', 'available commands'));
			var list = el('div', 'terminal__cmds');
			[['profile', 'portrait, role and quick links'],
			 ['about', 'open about.txt'],
			 ['projects', 'browse ~/projects'],
			 ['experience', 'open experience.log'],
			 ['stack', 'system information (aka skills)'],
			 ['contact', 'open contact.json'],
			 ['resume', 'open resume.pdf in a new tab'],
			 ['whoami', 'who is behind this machine'],
			 ['classic', 'switch to the traditional view'],
			 ['ls', 'list everything in ~'],
			 ['clear', 'clear the terminal']].forEach(function (row) {
				var line = el('div', 'terminal__cmd');
				line.append(el('b', null, row[0]), el('span', null, row[1]));
				list.append(line);
			});
			wrap.append(list);
			var tip = el('p', 'tip');
			tip.append(document.createTextNode('tab completes · ↑↓ recalls history · ⌘K opens the command palette · '));
			tip.append(el('b', null, 'neofetch'));
			tip.append(document.createTextNode(' prints the system summary.'));
			wrap.append(tip);
			return wrap;
		},
		whoami: function () { return 'Terence Zhang — AI research engineer & software engineer. Cornell CS & Economics \'22, Cornell Tech MEng \'27.'; },
		profile: function () { open('profile'); return 'opening profile'; },
		classic: function () { switchView('classic'); return 'switching to the traditional view'; },
		about: function () { open('about'); return 'opening about.txt'; },
		projects: function () { open('projects'); return 'opening ~/projects'; },
		experience: function () { open('experience'); return 'opening experience.log'; },
		stack: function () { open('stack'); return 'opening stack.json'; },
		skills: function () { open('stack'); return 'opening stack.json'; },
		contact: function () { open('contact'); return 'opening contact.json'; },
		resume: function () { window.open('/files/Terence_Zhang_Resume.pdf', '_blank', 'noopener'); return 'opening resume.pdf in a new tab'; },
		/* Unlisted: the sneaker room is no longer advertised anywhere on the
		   desktop, but the command still opens it for anyone who goes looking. */
		sneakers: function () { window.location.href = '/sneakers.html'; return 'opening the sneaker room'; },
		ls: function () { return 'about.txt   projects/   experience.log   stack.json   contact.json   resume.pdf'; },
		pwd: function () { return '/home/terence'; },
		date: function () { return new Date().toString(); },
		uptime: function () {
			var mins = Math.floor((Date.now() - booted) / 60000);
			return 'up ' + (mins < 1 ? 'less than a minute' : mins + ' minute' + (mins === 1 ? '' : 's')) + ' — this session only; terenceOS keeps no state between visits.';
		},
		sudo: function () {
			return 'sudo: terence is not in the sudoers file. This machine is his — but the contact window is unlocked.';
		},
		neofetch: function () {
			var wrap = el('div', 'neofetch');
			wrap.append(el('pre', null, [
				'╭─────────────╮',
				'│ ●  ●  ●     │',
				'│             │',
				'│  terenceOS  │',
				'│  ~ $        │',
				'╰─────────────╯'
			].join('\n')));
			var dl = document.createElement('dl');
			[['user', 'terence'],
			 ['os', 'terenceOS v2026.1'],
			 ['shell', 'a very polite fake one'],
			 ['role', 'AI Research Engineer @ Vicino AI'],
			 ['studying', 'Cornell Tech MEng \'27'],
			 ['apps', APPS.filter(function (a) { return !a.href && !a.copy && !a.view; }).length + ' installed'],
			 ['uptime', COMMANDS.uptime().split(' — ')[0]]].forEach(function (row) {
				dl.append(el('dt', null, row[0]), el('dd', null, row[1]));
			});
			wrap.append(dl);
			return wrap;
		},
		clear: function () { log.innerHTML = ''; return null; }
	};

	/* The commands that stay out of help, completion and "did you mean". */
	var HIDDEN = ['sudo', 'neofetch', 'sneakers'];
	var COMMAND_NAMES = Object.keys(COMMANDS).filter(function (n) { return HIDDEN.indexOf(n) === -1; });

	function scrollTerminal() {
		var body = log.closest('.win__body');
		if (body) body.scrollTop = body.scrollHeight;
	}

	function echo(cmd, output, isError) {
		var block = el('div', 'terminal__block');
		var line = el('p', 'line');
		line.innerHTML = '<span class="prompt">terence@terenceOS</span>:<span class="path">~</span>$ ';
		line.append(document.createTextNode(cmd));
		block.append(line);
		if (output instanceof Node) {
			block.append(output);
		} else if (output !== null && output !== undefined) {
			block.append(el('p', 'line ' + (isError ? 'err' : 'out'), output));
		}
		log.append(block);
		scrollTerminal();
	}

	/* "command not found" should teach, not scold. */
	function notFound(cmd, name) {
		var block = el('div', 'terminal__block');
		var line = el('p', 'line');
		line.innerHTML = '<span class="prompt">terence@terenceOS</span>:<span class="path">~</span>$ ';
		line.append(document.createTextNode(cmd));
		block.append(line);
		block.append(el('p', 'line err', 'command not found: ' + name));

		var near = COMMAND_NAMES.filter(function (n) {
			return n.indexOf(name.slice(0, 2)) === 0 || n.indexOf(name) > -1;
		})[0];
		var help = el('p', 'line tip');
		if (near) {
			help.append(document.createTextNode('did you mean '));
			help.append(el('b', null, near));
			help.append(document.createTextNode('? Type '));
		} else {
			help.append(document.createTextNode('Type '));
		}
		help.append(el('b', null, 'help'));
		help.append(document.createTextNode(' to see available commands.'));
		block.append(help);
		log.append(block);
		scrollTerminal();
	}

	function completion(value) {
		var partial = value.toLowerCase();
		if (!partial || /\s/.test(value)) return '';
		var match = COMMAND_NAMES.filter(function (k) { return k.indexOf(partial) === 0; });
		return match.length === 1 ? match[0].slice(value.length) : '';
	}

	function syncGhost() {
		if (!ghostTyped) return;
		ghostTyped.textContent = input.value;
		ghostSuggest.textContent = completion(input.value);
	}

	function runCommand(raw) {
		var cmd = raw.trim();
		if (!cmd) return;
		history_.push(cmd);
		historyIndex = history_.length;
		var parts = cmd.split(/\s+/);
		var name = parts[0].toLowerCase();
		var arg = parts[1];
		if ((name === 'open' || name === 'cat' || name === 'cd') && arg) {
			name = arg.replace(/\.txt|\.log|\.json|[./]/g, '') || name;
		}
		if (name === 'sudo' && parts.length > 1) name = 'sudo';
		var fn = COMMANDS[name];
		if (!fn) { notFound(cmd, name); return; }
		var out = fn();
		if (name === 'clear') return;
		echo(cmd, out);
	}

	function initTerminal() {
		if (!form) return;
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			runCommand(input.value);
			input.value = '';
			syncGhost();
		});
		input.addEventListener('input', syncGhost);
		input.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (historyIndex > 0) { historyIndex -= 1; input.value = history_[historyIndex]; syncGhost(); }
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (historyIndex < history_.length - 1) { historyIndex += 1; input.value = history_[historyIndex]; }
				else { historyIndex = history_.length; input.value = ''; }
				syncGhost();
			} else if (e.key === 'Tab' || (e.key === 'ArrowRight' && input.selectionStart === input.value.length)) {
				var rest = completion(input.value);
				if (!rest) return;
				e.preventDefault();
				input.value += rest;
				syncGhost();
			}
		});
		var terminal = document.getElementById('terminal-surface');
		terminal.addEventListener('click', function (e) {
			if (window.getSelection().toString()) return;
			if (!e.target.closest('a, button')) input.focus();
		});
		syncGhost();
	}

	/* ---------------------------------------------------------------- boot */

	/* The profile is a fixed card rather than a scrolling document, so once it is
	   on screen its height is measured from its own content and it is re-centred:
	   the quick links stay above the fold at any window height that can hold them. */
	function fitToContent(rec, H) {
		if (!rec || !rec.open || isPhone()) return;
		var body = rec.el.querySelector('.win__body');
		var natural = body.scrollHeight + rec.bar.offsetHeight + 2;
		var h = Math.min(H - 40, natural);
		rec.el.style.height = h + 'px';
		rec.el.style.top = Math.max(16, Math.round((H - h) / 2) - 12) + 'px';
	}

	/* The desktop's opening arrangement: the terminal beside the profile card,
	   sized from the live workspace so the two never collide, with the shortcut
	   column on the left always left clear. Narrow desktops open the terminal
	   alone and leave the profile collapsed in the sidebar; phones stack both
	   full-screen with the profile in front. */
	function bootDefaults() {
		var term = windows.get('terminal');
		var profile = windows.get('profile');
		var W = workspace.clientWidth;
		var H = workspace.clientHeight;
		var left = 124;
		var gap = 20;
		var avail = W - left - 24;

		if (!isPhone() && avail >= 860 && H >= 560) {
			var pw = 400;
			var tw = Math.min(680, avail - gap - pw);
			var th = Math.min(600, H - 120);
			var ph = Math.min(660, H - 96);
			Object.assign(term, { x: left, y: Math.max(24, Math.round((H - th) / 2) - 20), w: tw, h: th, placed: false });
			Object.assign(profile, { x: left + tw + gap, y: Math.max(24, Math.round((H - ph) / 2) - 12), w: pw, h: ph, placed: false });
			open('terminal', { moveFocus: false });
			open('profile', { moveFocus: false });
			fitToContent(profile, H);
		} else if (isPhone()) {
			open('terminal', { moveFocus: false });
			open('profile', { moveFocus: false });
		} else {
			open('terminal', { moveFocus: false });
		}
	}

	/* Navigation is made of real links (#about, #projects, …) so it works
	   without JavaScript and supports open-in-new-tab; with the shell running
	   the click is intercepted and opens the window in place instead. */
	function initLaunchers() {
		document.addEventListener('click', function (e) {
			var el = e.target.closest('[data-launch]');
			if (!el) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
			e.preventDefault();
			launch(el.dataset.launch);
		});
	}

	/* Real client time, redrawn once a minute on the minute — no polling loop. */
	function initClock() {
		var clock = document.getElementById('clock');
		if (!clock) return;
		function tick() {
			var now = new Date();
			clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
		}
		tick();
	}

	/* Clicking bare desktop deactivates the current window, as a desktop does. */
	function initDesktop() {
		workspace.addEventListener('pointerdown', function (e) {
			if (e.target !== workspace && !e.target.closest('.shortcuts-wrap')) return;
			if (e.target.closest('.shortcut')) return;
			active = null;
			syncChrome();
		});
	}

	/* Deep links: /#projects, /#about, ... open (and raise) that application. */
	function appFromHash() {
		var id = window.location.hash.slice(1);
		if (!id || id === 'top') return null;
		var el = document.getElementById(id);
		return el && el.classList.contains('win') ? el.dataset.app : null;
	}

	document.querySelectorAll('.win').forEach(build);
	initMenubar();
	initTerminal();
	initLaunchers();
	initPalette();
	initViewPrompt();
	initShortcuts();
	initDesktop();
	initClock();

	var routed = appFromHash();
	if (routed) {
		/* The linked application is the point of the visit: the desktop is set
		   up behind it, then it is opened last so it lands on top and focused. */
		if (routed !== 'terminal') open('terminal', { moveFocus: false });
		open(routed);
	} else {
		bootDefaults();
		/* Landing on the desktop itself leaves a clean URL, even though the
		   profile window is the one that ends up focused. */
		history.replaceState(null, '', window.location.pathname);
	}
	window.addEventListener('hashchange', function () {
		var app = appFromHash();
		if (app) open(app);
	});
	syncChrome();

	/* Keep windows inside the workspace when it changes size, and re-place
	   them when crossing the phone breakpoint so the metaphor adapts. */
	var lastPhone = isPhone();
	window.addEventListener('resize', function () {
		if (isPhone() !== lastPhone) {
			lastPhone = isPhone();
			windows.forEach(function (rec) { rec.placed = false; rec.max = false; rec.el.classList.remove('is-max'); });
			if (!isPhone()) windows.forEach(function (rec) { if (rec.open) place(rec); });
			return;
		}
		if (isPhone()) return;
		windows.forEach(function (rec) {
			if (!rec.open || rec.min || rec.max) return;
			rec.el.style.left = Math.min(rec.el.offsetLeft, Math.max(0, workspace.clientWidth - 80)) + 'px';
			rec.el.style.top = Math.min(rec.el.offsetTop, Math.max(0, workspace.clientHeight - 40)) + 'px';
		});
	});
})();

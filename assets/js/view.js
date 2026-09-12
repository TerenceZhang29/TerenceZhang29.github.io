/* ============================================================================
   View preference — shared by the terenceOS desktop (index.html) and the
   traditional page (classic.html). The only script both views load.
   ----------------------------------------------------------------------------
   Remembers which view a visitor prefers, in the browser only: there is no
   backend. Storage degrades rather than breaks — localStorage, then
   sessionStorage, then memory — so "asked once, ever" becomes at worst
   "asked once this session" when site data is blocked.

   The pre-paint redirect on index.html cannot live here (this file loads at
   the end of <body>); it is a small inline copy in that page's <head> that
   must keep using the same KEY.

   Only index.html ever redirects, and only away from itself. classic.html
   never reads the preference to redirect, so the two pages cannot loop.
   ========================================================================= */
(function () {
	'use strict';

	var KEY = 'terenceos:view';
	var VIEWS = { os: 'index.html?view=os', classic: 'classic.html' };
	var memory = null;

	function store(kind) {
		try {
			var s = window[kind];
			/* Probing the accessor is not enough: Safari's private mode used to
			   expose localStorage and then throw on write. */
			s.setItem(KEY + ':probe', '1');
			s.removeItem(KEY + ':probe');
			return s;
		} catch (e) {
			return null;
		}
	}

	function readView() {
		var s = store('localStorage') || store('sessionStorage');
		try {
			var v = s ? s.getItem(KEY) : memory;
			return VIEWS.hasOwnProperty(v) ? v : null;
		} catch (e) {
			return VIEWS.hasOwnProperty(memory) ? memory : null;
		}
	}

	function writeView(view) {
		if (!VIEWS.hasOwnProperty(view)) return false;
		memory = view;
		var s = store('localStorage') || store('sessionStorage');
		try {
			if (s) s.setItem(KEY, view);
		} catch (e) { /* memory already holds it */ }
		return true;
	}

	/* Every "switch view" affordance goes through here, so switching and
	   remembering can never disagree. */
	function switchTo(view) {
		if (!writeView(view)) return false;
		window.location.href = VIEWS[view];
		return true;
	}

	var onClassic = /(^|\/)classic\.html$/.test(window.location.pathname);

	if (onClassic) {
		/* The link already works without JavaScript (its href carries ?view=os);
		   this just records the choice before leaving. */
		document.querySelectorAll('.header-view').forEach(function (link) {
			link.addEventListener('click', function (e) {
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
				e.preventDefault();
				switchTo('os');
			});
		});
	} else if (/[?&]view=os(&|$)/.test(window.location.search)) {
		/* Arrived from the traditional page's link: remember the choice, then
		   drop the query so the desktop keeps a clean URL. */
		writeView('os');
		history.replaceState(null, '', window.location.pathname + window.location.hash);
	}

	window.terenceView = { key: KEY, read: readView, write: writeView, switchTo: switchTo };
})();

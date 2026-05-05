/**
 * Scroll Reveal — Cinematic Premium Edition
 * Progressive enhancement: adds .cine-ready to <html> to activate CSS animations.
 * Content is always visible without JS. Animations are an enhancement.
 *
 * Supports:
 *   [data-reveal]          — Standard fade-up
 *   [data-reveal-stagger]  — Staggered children fade-up
 *   [data-cine-fade]       — Cinematic zoom-fade-in
 *   [data-cine-zoom]       — Dramatic scale-up entrance
 *   [data-cine-mask]       — Glass mask reveal
 *   [data-cine-hero]       — Hero staggered zoom-fade
 *   [data-cine-stagger]    — Cinematic staggered children
 *   [data-cine-slide-left] — Slide from left
 *   [data-cine-slide-right]— Slide from right
 *   [data-cine-tilt]       — 3D tilt reveal
 */
(function () {
  'use strict';

  var SELECTORS = [
    '[data-reveal]',
    '[data-reveal-stagger]',
    '[data-cine-fade]',
    '[data-cine-zoom]',
    '[data-cine-mask]',
    '[data-cine-hero]',
    '[data-cine-stagger]',
    '[data-cine-slide-left]',
    '[data-cine-slide-right]',
    '[data-cine-tilt]'
  ].join(',');

  var REVEAL_OFFSET = 60;
  var pendingElements = [];
  var scrollActive = false;
  var ticking = false;

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < ((window.innerHeight || document.documentElement.clientHeight) - REVEAL_OFFSET) && r.bottom > 0;
  }

  function reveal(el) {
    if (!el.classList.contains('revealed')) el.classList.add('revealed');
  }

  function scan() {
    for (var i = pendingElements.length - 1; i >= 0; i--) {
      if (inView(pendingElements[i])) {
        reveal(pendingElements[i]);
        pendingElements.splice(i, 1);
      }
    }
    if (pendingElements.length === 0 && scrollActive) {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('scroll', onScroll, true);
      scrollActive = false;
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { scan(); ticking = false; });
    }
  }

  function init() {
    var elements = document.querySelectorAll(SELECTORS);
    if (elements.length === 0) return;

    // Step 1: Activate animation CSS by adding .cine-ready to <html>
    // This is what makes [data-cine-*] elements transition from hidden → visible
    document.documentElement.classList.add('cine-ready');

    // Step 2: Immediately reveal hero (first element) for LCP
    reveal(elements[0]);

    // Step 3: Check remaining elements
    for (var i = 1; i < elements.length; i++) {
      if (inView(elements[i])) {
        // Already visible — stagger reveal with slight delay
        (function (el, d) {
          setTimeout(function () { reveal(el); }, d);
        })(elements[i], 80 + (i * 50));
      } else {
        pendingElements.push(elements[i]);
      }
    }

    // Step 4: IntersectionObserver for elements below the fold
    if ('IntersectionObserver' in window && pendingElements.length > 0) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            reveal(e.target);
            obs.unobserve(e.target);
            var idx = pendingElements.indexOf(e.target);
            if (idx > -1) pendingElements.splice(idx, 1);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

      pendingElements.forEach(function (el) { obs.observe(el); });
    }

    // Step 5: Scroll listener safety net (catches Lenis virtual scroll)
    if (pendingElements.length > 0) {
      scrollActive = true;
      window.addEventListener('scroll', onScroll, true);
      document.addEventListener('scroll', onScroll, true);

      // Periodic sweep for first 5 seconds
      var n = 0;
      var t = setInterval(function () {
        scan();
        if (++n > 20 || pendingElements.length === 0) clearInterval(t);
      }, 250);
    }
  }

  // Run init as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Failsafe: also hook load event
  window.addEventListener('load', function () {
    if (!document.documentElement.classList.contains('cine-ready')) {
      init();
    }
    // Final sweep after everything renders
    setTimeout(scan, 150);
  });
})();

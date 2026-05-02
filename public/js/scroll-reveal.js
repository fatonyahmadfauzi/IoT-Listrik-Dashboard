/**
 * Scroll Reveal — Cinematic Premium Edition
 * GPU-accelerated IntersectionObserver-based scroll animations.
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
 *
 * The first hero section is revealed immediately to avoid blocking LCP.
 * All animations fire only once (unobserved after reveal).
 */
(function () {
  'use strict';

  // All selectors that this observer should handle
  var SELECTORS = [
    '[data-reveal]',
    '[data-reveal-stagger]',
    '[data-cine-fade]',
    '[data-cine-zoom]',
    '[data-cine-mask]',
    '[data-cine-hero]',
    '[data-cine-stagger]',
    '[data-cine-slide-left]',
    '[data-cine-slide-right]'
  ].join(',');

  // Bail out on browsers without IO (very old)
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll(SELECTORS).forEach(function (el) {
      el.classList.add('revealed');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // animate only once
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  // Observe after DOM ready
  function init() {
    var elements = document.querySelectorAll(SELECTORS);
    elements.forEach(function (el, i) {
      // Instantly reveal the first element (hero) so LCP is not delayed
      if (i === 0) {
        el.classList.add('revealed');
      } else {
        observer.observe(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

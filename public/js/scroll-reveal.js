/**
 * Scroll Reveal — Antigravity-inspired scroll animations
 * Lightweight IntersectionObserver-based fade-up effect.
 */
(function () {
  'use strict';

  // Bail out on browsers without IO (very old)
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(function (el) {
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
    document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

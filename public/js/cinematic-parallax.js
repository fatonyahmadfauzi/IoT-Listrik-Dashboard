/**
 * Cinematic Parallax (GSAP + Lenis)
 * Adds professional scroll-linked parallax animations to the landing page.
 */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Lenis === "undefined" || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopMotion = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;

  if (reducedMotion || !desktopMotion) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const root = document.documentElement;
  let latestProgress = -1;

  const updatePageProgress = () => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    const rounded = Math.round(progress * 1000) / 1000;
    if (rounded !== latestProgress) {
      latestProgress = rounded;
      root.style.setProperty("--cine-scroll-progress", String(rounded));
    }
  };

  // 1. Initialize Lenis only on desktop-class pointer devices.
  // Mobile keeps native scroll so the header and browser gestures remain reliable.
  const lenis = new Lenis({
    duration: 0.95,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: "vertical",
    gestureDirection: "vertical",
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Keep ScrollTrigger in sync with Lenis
  lenis.on("scroll", () => {
    updatePageProgress();
    ScrollTrigger.update();
  });
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // 2. Setup GSAP MatchMedia for Responsive Performance.
  // Scroll-linked parallax stays off mobile to keep touch scrolling predictable.
  let mm = gsap.matchMedia();

  mm.add("(min-width: 1024px) and (pointer: fine)", () => {
    updatePageProgress();

    window.addEventListener("resize", updatePageProgress, { passive: true });

    document.querySelectorAll(".cine-scene").forEach((scene) => {
      ScrollTrigger.create({
        trigger: scene,
        start: "top 68%",
        end: "bottom 32%",
        toggleClass: { targets: scene, className: "is-cine-active" },
      });
    });

    // 3. Generic Data-Attribute Parallax Engine
    // Elements with data-parallax-y will scrub vertically on scroll
    const parallaxYElements = document.querySelectorAll("[data-parallax-y]");

    parallaxYElements.forEach((el) => {
      const yValue = Number(el.getAttribute("data-parallax-y")) || 0;

      gsap.to(el, {
        y: yValue,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom", // Animation starts when element top hits bottom of viewport
          end: "bottom top",   // Animation ends when element bottom hits top of viewport
          scrub: 0.85,         // Smooth scrubbing without feeling laggy
        },
      });
    });

    // 4. Custom Hero Section Fade & Sink
    // Makes the hero text/graphics fade out and push down slightly on scroll
    const heroSelectors = [".clean-hero-content", ".feat-hero-content", ".dl-hero-content"];
    const heroTriggers = [".clean-hero", ".feat-hero", ".dl-hero"];

    heroSelectors.forEach((selector, index) => {
      const content = document.querySelector(selector);
      const triggerSection = document.querySelector(heroTriggers[index]) || selector;
      if (content) {
        gsap.to(content, {
          y: 110,
          scale: 0.97,
          opacity: 0.18,
          ease: "none",
          scrollTrigger: {
            trigger: triggerSection,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    });

    return () => {
      window.removeEventListener("resize", updatePageProgress);
    };
  });
});

/**
 * Cinematic Parallax (GSAP + Lenis)
 * Adds professional Awwwards-style smooth scrolling and scroll-linked animations.
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Lenis for Smooth Scrolling
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing standard industry
    direction: "vertical",
    gestureDirection: "vertical",
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // 2. Connect Lenis to GSAP ScrollTrigger
  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // 3. Create Parallax Animations
  // We use GSAP matchMedia to only apply heavy parallax on larger screens (performance)
  let mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
    // Parallax Y (Vertical movement)
    const parallaxYElements = document.querySelectorAll("[data-parallax-y]");
    parallaxYElements.forEach((el) => {
      const yValue = el.getAttribute("data-parallax-y");
      
      gsap.to(el, {
        y: yValue,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom", // Animation starts when element top hits viewport bottom
          end: "bottom top",   // Ends when element bottom hits viewport top
          scrub: 1,            // 1 second smooth scrub delay
        },
      });
    });

    // Parallax Scale
    const parallaxScaleElements = document.querySelectorAll("[data-parallax-scale]");
    parallaxScaleElements.forEach((el) => {
      const scaleValue = el.getAttribute("data-parallax-scale");
      
      gsap.to(el, {
        scale: scaleValue,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    // Hero Custom Parallax (Moves background text or elements specifically)
    // Find the hero section and animate it specially
    const heroContent = document.querySelector(".clean-hero-content");
    if (heroContent) {
      gsap.to(heroContent, {
        y: 120, // Moves down slightly as user scrolls down
        opacity: 0.1, // Fades out
        ease: "none",
        scrollTrigger: {
          trigger: ".clean-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });
    }

    return () => {
      // Cleanup for mobile/desktop transitions
    };
  });
});

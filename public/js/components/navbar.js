class AppNavbar extends HTMLElement {
  connectedCallback() {
    // Detect PWA standalone mode (installed app)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      // ── PWA App Navbar ──────────────────────────────────────
      // Only shows app-related pages. Marketing pages are hidden
      // because they are not part of the installed PWA experience.
      this.innerHTML = `
        <header class="landing-nav-wrap">
          <nav class="landing-nav">
            <a href="/app/dashboard" class="landing-brand">
              <span>IoT Listrik Dashboard</span>
            </a>
            <button id="menuBtn" class="landing-menu-btn" aria-label="Toggle menu">
              <span class="material-symbols-rounded">menu</span>
            </button>
            <div id="navLinks" class="landing-links">
              <a href="/app/dashboard">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">dashboard</span>
                Dashboard
              </a>
              <a href="/app/history">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">history</span>
                Riwayat
              </a>
              <a href="/app/settings">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">settings</span>
                Pengaturan
              </a>
              <a href="/app/login" class="btn btn-primary btn-sm" id="pwaLogoutNav">
                <span class="material-symbols-rounded">logout</span>Keluar
              </a>
            </div>
          </nav>
        </header>
      `;
    } else {
      // ── Website / Browser Navbar ─────────────────────────────
      // Full marketing navigation — shown only in normal browser.
      this.innerHTML = `
        <header class="landing-nav-wrap">
          <nav class="landing-nav">
            <a href="/" class="landing-brand">
              <span>IoT Listrik Dashboard</span>
            </a>
            <button id="menuBtn" class="landing-menu-btn" aria-label="Toggle menu">
              <span class="material-symbols-rounded">menu</span>
            </button>
            <div id="navLinks" class="landing-links">
              <a href="/">Beranda</a>
              <a href="/features">Fitur</a>
              <a href="/downloads">Download</a>
              <a href="/app/login" class="btn btn-primary btn-sm">
                <span class="material-symbols-rounded">login</span>Get Started
              </a>
            </div>
          </nav>
        </header>
      `;
    }

    // ── Shared navbar interactions ────────────────────────────
    const menuBtn = this.querySelector("#menuBtn");
    const navLinks = this.querySelector("#navLinks");
    const navWrap = this.querySelector(".landing-nav-wrap");

    if (menuBtn && navLinks) {
      menuBtn.setAttribute("aria-expanded", "false");

      menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("open");
        const menuOpen = navLinks.classList.contains("open");

        navWrap?.classList.toggle("menu-open", menuOpen);
        navWrap?.classList.remove("nav-hidden");
        menuBtn.setAttribute("aria-expanded", String(menuOpen));

        const menuIcon = menuBtn.querySelector(".material-symbols-rounded");
        if (menuIcon) {
          menuIcon.textContent = menuOpen ? "close" : "menu";
        }
      });

      // Close menu when a link is clicked (mobile UX)
      navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("open");
          navWrap?.classList.remove("menu-open");
          menuBtn.setAttribute("aria-expanded", "false");

          const menuIcon = menuBtn.querySelector(".material-symbols-rounded");
          if (menuIcon) {
            menuIcon.textContent = "menu";
          }
        });
      });
    }

    // ── Scroll-aware show/hide (reflow-safe) ─────────────────
    // We cache scrollY from the passive scroll handler to avoid
    // forced reflows inside rAF. Reading window.scrollY inside
    // rAF after DOM writes triggers a synchronous layout.
    let lastScrollY = 0;
    let cachedScrollY = 0;
    let ticking = false;

    // This handler only reads scrollY — no DOM writes, no reflow.
    const onScroll = () => {
      cachedScrollY = window.scrollY; // fast, no reflow
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncNavbarState);
    };

    const syncNavbarState = () => {
      if (!navWrap) { ticking = false; return; }

      const currentScrollY = Math.max(cachedScrollY, 0);
      const menuOpen = navLinks?.classList.contains("open");

      // Always show when menu is open or near top
      if (menuOpen || currentScrollY <= 120) {
        navWrap.classList.remove("nav-hidden");
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      const delta = currentScrollY - lastScrollY;
      
      // Require a minimum scroll distance before triggering to prevent bounce/jitter
      if (Math.abs(delta) < 12) {
        ticking = false;
        return; 
      }

      if (delta > 0) {
        navWrap.classList.add("nav-hidden");
      } else {
        navWrap.classList.remove("nav-hidden");
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    // Initial sync — defer to rAF to avoid forced reflow during parse
    requestAnimationFrame(() => {
      cachedScrollY = window.scrollY;
      syncNavbarState();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

customElements.define("app-navbar", AppNavbar);

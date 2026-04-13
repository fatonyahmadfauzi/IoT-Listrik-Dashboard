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
            <a href="/dashboard" class="landing-brand">
              <span>IoT Listrik Dashboard</span>
            </a>
            <button id="menuBtn" class="landing-menu-btn" aria-label="Toggle menu">
              <span class="material-symbols-rounded">menu</span>
            </button>
            <div id="navLinks" class="landing-links">
              <a href="/dashboard">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">dashboard</span>
                Dashboard
              </a>
              <a href="/history">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">history</span>
                Riwayat
              </a>
              <a href="/settings">
                <span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;margin-right:4px;">settings</span>
                Pengaturan
              </a>
              <a href="/login" class="btn btn-primary btn-sm" id="pwaLogoutNav">
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
              <a href="/features.html">Fitur</a>
              <a href="/downloads">Download</a>
              <a href="/login" class="btn btn-primary btn-sm">
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
      menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("open");
      });

      // Close menu when a link is clicked (mobile UX)
      navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("open");
        });
      });
    }

    const syncNavbarState = () => {
      if (!navWrap) return;
      if (window.scrollY > 8) navWrap.classList.add("scrolled");
      else navWrap.classList.remove("scrolled");
    };

    syncNavbarState();
    window.addEventListener("scroll", syncNavbarState, { passive: true });
  }
}

customElements.define("app-navbar", AppNavbar);

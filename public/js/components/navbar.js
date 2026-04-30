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
              <a href="/features">Fitur</a>
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

    let lastScrollY = Math.max(window.scrollY || 0, 0);
    let ticking = false;

    const syncNavbarState = () => {
      if (!navWrap) return;

      const currentScrollY = Math.max(window.scrollY || 0, 0);
      const menuOpen = navLinks?.classList.contains("open");
      const scrollingDown = currentScrollY > lastScrollY + 4;
      const scrollingUp = currentScrollY < lastScrollY - 4;

      if (menuOpen || scrollingUp || currentScrollY <= 120) {
        navWrap.classList.remove("nav-hidden");
      } else if (scrollingDown) {
        navWrap.classList.add("nav-hidden");
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const requestNavbarSync = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncNavbarState);
    };

    syncNavbarState();
    window.addEventListener("scroll", requestNavbarSync, { passive: true });
  }
}

customElements.define("app-navbar", AppNavbar);

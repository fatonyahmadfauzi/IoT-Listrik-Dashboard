class AppNavbar extends HTMLElement {
  connectedCallback() {
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

    // Initialize Navbar interactions
    const menuBtn = this.querySelector("#menuBtn");
    const navLinks = this.querySelector("#navLinks");
    const navWrap = this.querySelector(".landing-nav-wrap");
    
    if (menuBtn && navLinks) {
      menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("open");
      });
    }

    const syncNavbarState = () => {
      if (!navWrap) return;
      if (window.scrollY > 8) navWrap.classList.add("scrolled");
      else navWrap.classList.remove("scrolled");
    };

    // Run once on load
    syncNavbarState();
    
    // Listen to scroll
    window.addEventListener("scroll", syncNavbarState, { passive: true });
  }
}

customElements.define('app-navbar', AppNavbar);

class AppNavbar extends HTMLElement{connectedCallback(){window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===!0?this.innerHTML=`
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
      `:this.innerHTML=`
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
      `;const s=this.querySelector("#menuBtn"),t=this.querySelector("#navLinks"),e=this.querySelector(".landing-nav-wrap");s&&t&&(s.setAttribute("aria-expanded","false"),s.addEventListener("click",()=>{t.classList.toggle("open");const a=t.classList.contains("open");e?.classList.toggle("menu-open",a),e?.classList.remove("nav-hidden"),s.setAttribute("aria-expanded",String(a));const n=s.querySelector(".material-symbols-rounded");n&&(n.textContent=a?"close":"menu")}),t.querySelectorAll("a").forEach(a=>{a.addEventListener("click",()=>{t.classList.remove("open"),e?.classList.remove("menu-open"),s.setAttribute("aria-expanded","false");const n=s.querySelector(".material-symbols-rounded");n&&(n.textContent="menu")})}));let d=0,r=0,i=!1,o=null;const c=()=>{i||(i=!0,requestAnimationFrame(u))},m=()=>{r=window.scrollY,c()},p=a=>{o=a.touches?.[0]?.clientY??null},h=a=>{const n=a.touches?.[0]?.clientY;if(!Number.isFinite(n)||!Number.isFinite(o))return;const l=o-n;Math.abs(l)>=8&&(l<0&&e?.classList.remove("nav-hidden"),r=window.scrollY,o=n,c())},u=()=>{if(!e){i=!1;return}const a=Math.max(r,0);if(t?.classList.contains("open")||a<=120){e.classList.remove("nav-hidden"),d=a,i=!1;return}const l=a-d;if(Math.abs(l)<12){i=!1;return}l>0?e.classList.add("nav-hidden"):e.classList.remove("nav-hidden"),d=a,i=!1};requestAnimationFrame(()=>{r=window.scrollY,u()}),window.addEventListener("scroll",m,{passive:!0}),window.addEventListener("touchstart",p,{passive:!0}),window.addEventListener("touchmove",h,{passive:!0})}}customElements.define("app-navbar",AppNavbar);

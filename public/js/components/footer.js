class AppFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<footer class="landing-footer">
      <div class="landing-footer-main">
        <div class="landing-footer-grid">

          <!-- Tentang Skripsi -->
          <div class="footer-col">
            <h5 class="footer-col-title">TENTANG SKRIPSI</h5>
            <p class="footer-col-desc">
              Alat Deteksi Kebocoran Arus Listrik Berbasis IoT dengan Notifikasi Real-Time di Perumahan Fontana Lake
            </p>
            <ul class="footer-col-links" style="margin-top: 10px;">
              <li><span style="opacity:.55;">Mahasiswa</span> &nbsp;Fatony Ahmad Fauzi</li>
              <li><span style="opacity:.55;">NPM</span> &nbsp;2021310132</li>
              <li><span style="opacity:.55;">Pembimbing</span> &nbsp;Dr. Ir. Saludin Muis, M.Kom.</li>
              <li><span style="opacity:.55;">Tahun</span> &nbsp;2026</li>
            </ul>
          </div>

          <!-- Navigasi -->
          <div class="footer-col">
            <h5 class="footer-col-title">NAVIGASI</h5>
            <ul class="footer-col-links">
              <li><a href="/">Beranda</a></li>
              <li><a href="/downloads">Unduhan Aplikasi</a></li>
              <li><a href="/pwa-simulator.html">PWA Simulator</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard" target="_blank" rel="noopener">Kode Sumber</a></li>
            </ul>
          </div>

          <!-- Institusi -->
          <div class="footer-col">
            <h5 class="footer-col-title">INSTITUSI</h5>
            <ul class="footer-col-links">
              <li><a href="https://binainsani.ac.id" target="_blank" rel="noopener">Universitas Bina Insani</a></li>
              <li><span style="opacity:.7;">Fakultas Informatika</span></li>
              <li><span style="opacity:.7;">Teknik Informatika (S1)</span></li>
              <li><span style="opacity:.7;">Kelas TI21C</span></li>
              <li><a href="https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/issues" target="_blank" rel="noopener">Laporkan Masalah</a></li>
            </ul>
          </div>

          <!-- Sosial & Repo -->
          <div class="footer-col">
            <h5 class="footer-col-title">SOSIAL & REPO</h5>
            <ul class="footer-col-links">
              <li>
                <a href="https://github.com/fatonyahmadfauzi" target="_blank" rel="noopener">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.8c1.02.005 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/fatonyahmadfauzi/" target="_blank" rel="noopener">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px;"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM6.89 20.45H3.78V9h3.11v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.22 0z"/></svg>
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases" target="_blank" rel="noopener">
                  <span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;margin-right:6px;">new_releases</span>
                  Rilis Versi
                </a>
              </li>
              <li>
                <a href="https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/blob/master/LICENSE" target="_blank" rel="noopener">
                  <span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;margin-right:6px;">gavel</span>
                  Lisensi MIT
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer Bottom -->
      <div class="landing-footer-bottom">
        <p class="footer-note">Karya ilmiah ini merupakan implementasi Skripsi S1 &mdash; Program Studi Teknik Informatika, Fakultas Informatika, Universitas Bina Insani, Bekasi. Sistem ini dikembangkan untuk tujuan akademis dan bukan produk komersial.</p>
        <p class="footer-copy">&copy; 2026 Fatony Ahmad Fauzi &nbsp;&middot;&nbsp; NPM 2021310132 &nbsp;&middot;&nbsp; Universitas Bina Insani &nbsp;&middot;&nbsp; MIT License</p>
      </div>
    </footer>
    `;
  }
}

customElements.define('app-footer', AppFooter);

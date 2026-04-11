import re

with open('public/downloads.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new main block
new_main = """    <main class="download-showcase-main">
      <section class="download-showcase-hero">
        <h1>Downloads</h1>
        <p>Aplikasi resmi dan alat bantu IoT Listrik Dashboard untuk seluruh platform.</p>
      </section>

      <div class="download-cards-container">
        <!-- 1. Android Section -->
        <article class="dl-major-platform android-dl">
          <div class="dl-card-content">
            <div class="dl-logo-wrapper">
              <span class="material-symbols-rounded">android</span>
            </div>
            <div class="dl-text">
              <h2>Android APK</h2>
              <p>Aplikasi native Android berbasis Kotlin dengan monitoring realtime, kontrol relay, dan notifikasi cepat.</p>
              <ul class="dl-req">
                <li><span class="material-symbols-rounded">check_circle</span> Android 8.0 (Oreo) atau lebih baru</li>
              </ul>
            </div>
            <div class="dl-action">
              <a href="/downloads/android/iot-listrik-dashboard.apk" download class="btn-giant btn-android">
                <span class="material-symbols-rounded">download</span> Download APK
              </a>
            </div>
          </div>
        </article>

        <!-- 2. Windows Section -->
        <article class="dl-major-platform windows-dl">
          <div class="dl-card-content dl-windows-content">
            <div class="dl-logo-wrapper">
              <span class="material-symbols-rounded">window</span>
            </div>
            <div class="dl-text">
              <h2>Windows Desktop</h2>
              <p>Aplikasi desktop berbasis Electron. Cocok untuk lingkungan laboratorium atau monitoring terpusat di PC secara terus-menerus.</p>
              <ul class="dl-req">
                <li><span class="material-symbols-rounded">check_circle</span> Windows 10/11</li>
              </ul>
            </div>
            
            <div class="windows-arch-grid">
              <div class="win-arch-card">
                <h4>Setup (64-Bit)</h4>
                <a href="/downloads/windows/iot-listrik-dashboard-setup-x64.exe" download class="btn-primary btn-dl-win"><span class="material-symbols-rounded">download</span> .exe (x64)</a>
              </div>
              <div class="win-arch-card">
                <h4>Setup (32-Bit)</h4>
                <a href="/downloads/windows/iot-listrik-dashboard-setup-ia32.exe" download class="btn-secondary btn-dl-win"><span class="material-symbols-rounded">download</span> .exe (x86)</a>
              </div>
              <div class="win-arch-card">
                <h4>Setup (ARM64)</h4>
                <a href="/downloads/windows/iot-listrik-dashboard-setup-arm64.exe" download class="btn-secondary btn-dl-win"><span class="material-symbols-rounded">download</span> .exe (ARM)</a>
              </div>
              <div class="win-arch-card">
                <h4>MSI Installer</h4>
                <a href="/downloads/windows/iot-listrik-dashboard-setup-x64.msi" download class="btn-secondary btn-dl-win"><span class="material-symbols-rounded">download</span> .msi (x64)</a>
              </div>
            </div>
          </div>
        </article>

        <!-- 3. Web PWA Section -->
        <article class="dl-major-platform pwa-dl">
          <div class="dl-card-content">
            <div class="dl-logo-wrapper">
              <span class="material-symbols-rounded">public</span>
            </div>
            <div class="dl-text">
              <h2>Web (PWA)</h2>
              <p>Akses dashboard langsung dari browser tanpa instalasi. Mendukung fitur instalasi Progressive Web App (PWA) untuk diletakkan di Homescreen / Desktop.</p>
            </div>
            <div class="dl-action">
              <a href="/login" class="btn-giant btn-pwa">
                <span class="material-symbols-rounded">open_in_new</span> Buka Dashboard
              </a>
            </div>
          </div>
        </article>

        <!-- 4. Terminal Section -->
        <section class="terminal-dl-section">
          <h3>Terminal / CLI Downloads</h3>
          <p>Mendukung instalasi senyap (silent installation) via baris perintah untuk environment lab.</p>
          <div class="terminal-grid">
            <div class="cmd-block-area">
              <div class="cmd-topbar">Windows PowerShell</div>
              <div class="cmd-code-row">
                <code class="cmd-code">Invoke-WebRequest -Uri "https://iot-listrik-dashboard.vercel.app/downloads/windows/iot-listrik-dashboard-setup-x64.exe" -OutFile "iot-listrik-dashboard.exe"</code>
                <button class="cmd-copy-btn" data-copy='Invoke-WebRequest -Uri "https://iot-listrik-dashboard.vercel.app/downloads/windows/iot-listrik-dashboard-setup-x64.exe" -OutFile "iot-listrik-dashboard.exe"'><span class="material-symbols-rounded">content_copy</span></button>
              </div>
            </div>
            
            <div class="cmd-block-area">
              <div class="cmd-topbar">Windows CMD / Linux (cURL)</div>
              <div class="cmd-code-row">
                <code class="cmd-code">curl -L -o "iot-listrik-dashboard-setup-x64.exe" "https://iot-listrik-dashboard.vercel.app/downloads/windows/iot-listrik-dashboard-setup-x64.exe"</code>
                <button class="cmd-copy-btn" data-copy='curl -L -o "iot-listrik-dashboard-setup-x64.exe" "https://iot-listrik-dashboard.vercel.app/downloads/windows/iot-listrik-dashboard-setup-x64.exe"'><span class="material-symbols-rounded">content_copy</span></button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>"""

# We need to replace everything from <main class="download-showcase-main"> to </main>
# and also remove the legacy powershell JS block at the bottom
new_content = re.sub(
    r'<main class="download-showcase-main">.*?</main>', 
    new_main, 
    content, 
    flags=re.DOTALL
)

# Replace the legacy script block at the bottom
legacy_script_pattern = r'<script>\s*\(function initWindowsDownloadCliUrls\(\) \{.*?(?=</script>)'
new_script = """<script>
      // Simple copy button handler
      const copyButtons = document.querySelectorAll('.cmd-copy-btn');
      copyButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
          const text = btn.getAttribute('data-copy');
          try {
            await navigator.clipboard.writeText(text);
            const icon = btn.querySelector('.material-symbols-rounded');
            icon.textContent = 'check';
            setTimeout(() => icon.textContent = 'content_copy', 2000);
          } catch (err) {
            console.error('Failed to copy', err);
          }
        });
      });"""

new_content = re.sub(legacy_script_pattern, new_script, new_content, flags=re.DOTALL)

with open('public/downloads.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

# Panduan AI Coding Assistant

## Konteks Proyek

Proyek ini adalah **sistem deteksi kebocoran arus listrik berbasis IoT** (Skripsi S1 Teknik Informatika).

**Multi-platform:** Web PWA · Android (Kotlin) · Windows (Electron) · Terminal CLI · ESP32 Firmware

---

## Arsitektur

```
ESP32 → Firebase RTDB → Web/Android/Electron/CLI clients
                      → Cloud Functions (opsional)
                      → Discord Notifier (backend-local)
```

## Struktur Folder Penting

| Folder | Isi |
|--------|-----|
| `public/` | Landing page & halaman publik (Vercel) |
| `public/app/` | PWA shell (auth-required pages) |
| `public/js/` | Vanilla JS modules |
| `public/css/` | Stylesheet (CSS variables di `style.css`) |
| `platforms/android/` | Android native (Kotlin/Gradle) |
| `platforms/electron/` | Windows desktop (Electron+React+TS) |
| `platforms/cli-node/` | Terminal UI Node.js |
| `platforms/cli-python/` | Terminal UI Python |
| `hardware/` | ESP32 firmware (C++ Arduino) |
| `backend-local/` | Local Discord notifier server |
| `functions/` | Firebase Cloud Functions |
| `scripts/` | Automation build/deploy scripts |
| `docs/` | Dokumentasi teknis |

## Konvensi Kode

- **Web**: Vanilla JS, tidak ada framework baru. CSS via variabel existing di `style.css`.
- **Import JS**: gunakan relative path (`./module.js`), bukan absolute.
- **Secrets**: TIDAK boleh di-hardcode. Gunakan Firebase `/settings` atau NVS ESP32.
- **Icons**: Gunakan Iconify (`iconify-icon` element) — bukan emoji.
- **PWA pages** masuk `public/app/`, halaman publik di `public/` root.
- **Version**: Update `app-version.json` root, lalu jalankan `scripts/sync-app-version.ps1`.

## File yang Tidak Boleh Dimodifikasi Tanpa Koordinasi

- `database.rules.json` — security rules RTDB
- `vercel.json` — routing & cache headers production
- `public/js/firebase-config.js` — konfigurasi Firebase client
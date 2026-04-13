# Scripts

Kumpulan automation script untuk build, release, dan deployment proyek.

> Semua script menggunakan `$PSScriptRoot` (PowerShell) atau `__dirname` (Node.js) sehingga  
> dapat dijalankan dari direktori manapun tanpa mengubah working directory.

---

## Kategori

### 🔨 Build

| File | Platform | Deskripsi |
|------|----------|-----------|
| `build-android-release.ps1` | Android | Build signed APK release via Gradle |
| `build-release-for-web.ps1` | Windows | Build semua artifact Windows (MSI/Setup/Portable) |
| `build-all-release.ps1` | All | Build Android + Windows sekaligus dengan version bump |
| `build-all-signed-selfsigned.ps1` | Windows | Build dengan self-signed certificate (testing) |
| `generate-android-keystore.ps1` | Android | Generate keystore `.jks` untuk signing APK |

### 🚀 Deploy & Release

| File | Deskripsi |
|------|-----------|
| `upload-release.ps1` | Upload artifact ke GitHub Releases (via `gh` CLI) |
| `deploy.sh` | Deploy Firebase (rules + functions) via Firebase CLI |

### 🛠️ Utilities

| File | Deskripsi |
|------|-----------|
| `sync-app-version.ps1` | Sinkronisasi `app-version.json` root → `public/` |
| `update-version.js` | Update nomor versi di `app-version.json` |
| `create_android_vectors.js` | Generate vector drawable Android dari SVG |
| `replace_downloads.py` | Update URL download di HTML berdasarkan `app-version.json` |
| `replace_emojis.js` | Migrasi emoji ke Iconify icon system |

---

## Workflow Release

```powershell
# 1. Update versi
node scripts\update-version.js 1.0.1

# 2. Sync ke public/
.\scripts\sync-app-version.ps1

# 3. Build semua platform
.\scripts\build-all-release.ps1 -NewVersion 1.0.1

# 4. Upload ke GitHub Releases
.\scripts\upload-release.ps1 -Version 1.0.1

# 5. Deploy web
npx vercel --prod
```

Lihat [docs/VERSION_MANAGEMENT.md](../docs/VERSION_MANAGEMENT.md) untuk detail lengkap.

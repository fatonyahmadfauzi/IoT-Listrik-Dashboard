# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi pada proyek **IoT Listrik Dashboard**!

> **Catatan:** Proyek ini adalah bagian dari Skripsi S1 Teknik Informatika — Universitas Bina Insani, 2026.  
> Kontribusi eksternal diterima untuk perbaikan bug, dokumentasi, dan peningkatan kompatibilitas.

---

## Cara Berkontribusi

### 1. Fork & Clone

```bash
git clone https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard.git
cd IoT-Listrik-Dashboard
```

### 2. Setup Environment

```bash
# Install dependencies root (Firebase Functions jika perlu)
cd functions && npm install

# Install dependencies backend-local (opsional)
cd backend-local && npm install
```

Lihat [README.md](README.md#setup-awal) untuk setup Firebase lengkap.

### 3. Buat Branch Baru

```bash
git checkout -b fix/nama-bug
# atau
git checkout -b feat/nama-fitur
```

### 4. Commit dengan Pesan Deskriptif

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah notifikasi WhatsApp
fix: perbaiki relay toggle di iOS Safari
docs: update setup ESP32 di README
refactor: pisahkan CSS dashboard ke file terpisah
```

### 5. Push dan Buat Pull Request

```bash
git push origin fix/nama-bug
```

Buka Pull Request ke branch `main` dengan deskripsi jelas tentang perubahan yang dilakukan.

---

## Standar Kode

### Web (HTML/CSS/JS)
- Gunakan **Vanilla JS** — tidak perlu framework baru.
- CSS menggunakan variabel yang sudah ada di `public/css/style.css` (jangan tambah warna baru sembarangan).
- Semua halaman PWA (auth-required) masuk ke `public/app/`, halaman publik di `public/`.

### Firmware (ESP32 / C++)
- Sertakan `config.example.h` jika ada perubahan pada `config.h`.
- Jangan hardcode kredensial — simpan di NVS atau Firebase `/settings`.

### Scripting
- PowerShell scripts: gunakan `$PSScriptRoot` untuk path relatif agar portable.
- Node.js scripts: tidak ada dependency baru tanpa alasan jelas.

---

## Yang Tidak Boleh Di-commit

```
*.jks             # Android keystore
*.pfx / *.pem     # Windows signing
*.env             # Environment secrets
serviceAccountKey.json
hardware/config.h # Berisi kredensial
public/downloads/ # Binary installer (gunakan GitHub Releases)
```

Semua sudah dikonfigurasi di `.gitignore`.

---

## Melaporkan Bug

Gunakan [GitHub Issues](https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/issues) dengan template:

```
**Deskripsi Bug:**
...

**Langkah Reproduksi:**
1. ...
2. ...

**Expected Behavior:**
...

**Screenshot / Log:**
...

**Environment:**
- OS: Windows 11 / Android 14 / iOS 17
- Browser: Chrome 124
- Versi App: 1.0.0
```

---

## Lisensi

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan dilisensikan di bawah [MIT License](LICENSE).

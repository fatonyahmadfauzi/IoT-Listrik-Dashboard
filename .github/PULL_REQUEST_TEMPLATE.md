## Deskripsi

<!-- Jelaskan perubahan yang dilakukan dan mengapa perlu dilakukan -->

## Jenis Perubahan

- [ ] Bug fix (perubahan non-breaking yang memperbaiki masalah)
- [ ] Fitur baru (perubahan non-breaking yang menambahkan fungsionalitas)
- [ ] Breaking change (fix atau fitur yang akan menyebabkan kode yang ada tidak berfungsi seperti sebelumnya)
- [ ] Pembaruan dokumentasi

## Platform yang Berubah

- [ ] Web PWA (`public/`)
- [ ] Android (`platforms/android/`)
- [ ] Windows Desktop (`platforms/electron/`)
- [ ] CLI (`platforms/cli-node/` atau `platforms/cli-python/`)
- [ ] Firmware ESP32 (`hardware/`)
- [ ] Backend / API (`api/` atau `backend-local/`)
- [ ] Dokumentasi

## Checklist

- [ ] Kode sudah diuji secara lokal
- [ ] Tidak ada credential atau file sensitif yang ikut di-commit (`.jks`, `.pfx`, `.env`, `serviceAccountKey.json`, `config.h`)
- [ ] Tidak ada binary besar di `public/downloads/` yang ikut di-commit
- [ ] Perubahan RTDB Security Rules sudah diuji di Firebase Rules Simulator (jika ada)
- [ ] `app-version.json` diperbarui jika ada perubahan versi

## Screenshot / Demo

<!-- Jika ada perubahan UI, sertakan screenshot sebelum dan sesudah -->

## Catatan untuk Reviewer

<!-- Hal-hal yang perlu diperhatikan reviewer, edge case, atau pertanyaan -->

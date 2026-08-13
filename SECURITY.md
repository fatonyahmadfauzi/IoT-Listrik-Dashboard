# Security Policy

## Versi yang Didukung

| Versi | Dukungan Keamanan |
|-------|------------------|
| 1.1.x | ✅ Aktif |
| 1.0.x | ⚠️ Perbaikan kritikal saja |
| < 1.0 | ❌ Tidak didukung |

---

## Melaporkan Kerentanan

**Jangan buka GitHub Issue publik untuk kerentanan keamanan.**

Kirimkan laporan secara privat ke:
📧 **fatonyahmadfauzi@gmail.com**

Sertakan informasi berikut:
- Deskripsi kerentanan dan dampak potensialnya
- Langkah reproduksi atau proof-of-concept
- Versi yang terpengaruh
- Saran perbaikan (jika ada)

Laporan akan direspons dalam **3–7 hari kerja**. Jika kerentanan dikonfirmasi, perbaikan akan dirilis secepat mungkin dan pelapor akan dicantumkan dalam catatan rilis (jika diinginkan).

---

## Lingkup

Kerentanan yang relevan untuk dilaporkan:

- Akses tidak sah ke Firebase Realtime Database
- Bypass Firebase Security Rules
- Eksposur kredensial atau API key
- Injeksi perintah relay dari luar yang tidak ter-autentikasi
- Kerentanan pada endpoint Vercel API (`/api/*.js`)
- XSS atau CSRF pada halaman admin web

Di luar lingkup (tidak perlu dilaporkan):

- Serangan yang membutuhkan akses fisik ke perangkat ESP32
- Self-signed certificate warning (by design)
- Firebase API key yang terekspos di `firebase-config.js` — ini adalah **public web API key** yang dibatasi domain di Google Cloud Console, bukan service account key

---

## Catatan Keamanan Penting

- File `backend-local/serviceAccountKey.json` **tidak pernah di-commit** ke repository — pastikan ini tetap demikian
- Batasi Firebase Web API key di **Google Cloud Console** berdasarkan HTTP referrer domain
- Batasi Android API key berdasarkan package name (`com.iot.listrik`) dan SHA-1 certificate fingerprint
- Endpoint Vercel admin memerlukan Firebase ID token + role `admin` dari RTDB — jangan hapus validasi ini
- Jangan gunakan akun `listrik.iot.device@gmail.com` untuk keperluan selain perangkat IoT

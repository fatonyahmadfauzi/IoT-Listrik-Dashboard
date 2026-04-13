# firebase-redirect/

Folder ini berisi halaman HTML minimal yang digunakan sebagai **Firebase Hosting fallback**.

## Tujuan

Proyek ini menggunakan **Vercel** sebagai deployment utama (`iot-listrik-dashboard.vercel.app`).  
Namun Firebase Hosting tetap dikonfigurasi di `firebase.json` (untuk deploy Firebase Database Rules dan Cloud Functions).

Karena Firebase Hosting memerlukan folder `public`, folder ini digunakan sebagai **redirect shim** — semua request ke Firebase Hosting domain akan langsung diteruskan ke URL Vercel.

## Cara Kerja

```
User → Firebase Hosting URL
     → index.html (meta refresh + JS redirect)
     → https://iot-listrik-dashboard.vercel.app
```

## File

- `index.html` — Halaman redirect otomatis ke Vercel production URL.

## Operasi

Folder ini di-deploy via:

```bash
npx firebase-tools deploy --only hosting
```

> **Catatan:** Deploy web utama tetap menggunakan `npx vercel --prod`.  
> Firebase Hosting hanya sebagai fallback jika domain Firebase diakses langsung.

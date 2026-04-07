# Local IoT Backend (FCM Trigger)

Sistem Pemicu (Trigger) *Push Notification* (FCM) ini diciptakan sebagai Backend Lokal alternatif karena blokir *Firebase Functions* (Membutuhkan langganan berbayar). Dengan ini, notifikasi ke Aplikasi Android IoT Anda tetap bekerja 100% sempurna melalui server lokal Node.js Anda (Laragon).

## 🚀 Langkah Instalasi & Persiapan

### 1. Download Service Account Key dari Firebase
Agar sistem lokal ini memiliki "Izin Dewa" untuk mengirim Notifikasi FCM ke Android, Anda memerlukan Kunci Rahasia Server.
1. Buka laman website [Firebase Console](https://console.firebase.google.com/).
2. Masuk ke project skripsi IoT Anda.
3. Klik Icon ⚙️ **Gear (Project Settings)** di pojok kiri atas -> Pilih **Project Settings**.
4. Pindah ke Tab **Service Accounts**.
5. Pastikan yang terpilih adalah `Node.js`.
6. Klik tombol biru **Generate New Private Key** (Buat Kunci Privat Baru).
7. Simpan dan Rename file yang terdownload (berformat .json) dengan nama: `serviceAccountKey.json`.
8. Pindahkan/Copy file `serviceAccountKey.json` tersebut langsung ke dalam foder `backend-local` ini.

### 2. Rename Environment File (.env)
Buka folder `backend-local` di File Explorer Laragon Anda.
1. Anda akan melihat file bernama `.env.example`.
2. Hapus kata `.example` sehingga namanya menjadi persis: `.env` saja.
3. Buka file `.env` tersebut menggunakan Notepad atau VSCode Anda. 
4. Pastikan URL `FIREBASE_DATABASE_URL` sudah tepat dan sesuai milik Anda.

### 3. Jalankan Server di Laragon!
Sekarang Anda siap melakukan *Demonstrasi Sidang*! Jika Anda sedang demo, pastikan CMD ini dibiarkan berjalan.
1. Buka **Terminal / CMD** di dalam Windows Anda atau bisa dari Laragon Terminal.
2. Navigasi ke folder ini:
   `cd "E:\Application\laragon\www\IoT Listrik Dashboard\backend-local"`
3. Mulai mesin komparasinya:
   `npm start`

Jika berhasil, Log Terminal Anda akan menuliskan:
```text
✅ Firebase Admin SDK Initialized Successfully!
🌐 Server (Health Endpoint) listening on http://localhost:3000
📡 Listening for database changes on /listrik/status ...
```

## 🧪 Cara Test Notifikasi
1. Pastikan Aplikasi Android Anda sedang **ditutup secara penuh** (Swipe kill dari recent apps). Layar Android Anda harus mati/terkunci.
2. Buka **Web Dashboard IoT** dari laptop Anda.
3. Ubah atau biarkan statusnya menjadi *DANGER*. (Bisa juga melalui tombol Demo Mode di Android yang dijalankan di hp asisten / teman).
4. Perhatikan Terminal Laragon Anda, server akan mencetak:
> `🚨 CRITICAL: Status is DANGER. Triggering FCM Push Alarm!`
5. Selang 1-2 detik, HP Android Anda akan bangun, bergetar kencang, layar menyala full merah, dan berteriak sirene panjang. Misi Berhasil! 🎉

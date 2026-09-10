# Local IoT Backend

Folder ini berisi backend lokal Node.js untuk fitur yang membutuhkan server berjalan terus-menerus di mesin lokal atau server pribadi. Backend ini dipakai sebagai alternatif praktis ketika Firebase Functions tidak dipakai untuk trigger real-time.

## Fungsi Utama

| File | Perintah | Fungsi |
|------|----------|--------|
| `server.js` | `npm start` | Health endpoint lokal, API baca `/listrik` dan `/logs`, serta trigger FCM untuk Android saat status berubah |
| `discord-notifier.js` | `npm run discord` | Notifikasi hardware utama ke Discord, Telegram, laporan harian Excel, dan command Telegram `/pause` `/resume` `/diagnostik` `/system_update` |
| `sim-notifier.js` | `npm run sim-notify` | Notifikasi khusus akun simulator pada path `/sim/{uid}` |
| `run-all.js` | `npm run start:all` | Menjalankan API lokal, notifier hardware, dan notifier simulator sekaligus |
| `seed-demo.js` | `npm run seed-demo` | Membuat data demo untuk pengujian lokal |

## Prasyarat

- Node.js 18+.
- Firebase Realtime Database aktif.
- File `serviceAccountKey.json` dari Firebase Console.
- File `.env` untuk `server.js`.

Jangan commit `serviceAccountKey.json` atau `.env`.

## Setup Service Account

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Masuk ke project IoT.
3. Buka **Project Settings** -> **Service Accounts**.
4. Pilih **Node.js**.
5. Klik **Generate New Private Key**.
6. Simpan file sebagai:

```text
backend-local/serviceAccountKey.json
```

## Setup Environment

Salin `.env.example` menjadi `.env` jika tersedia, lalu isi minimal:

```env
FIREBASE_DATABASE_URL=https://<PROJECT_ID>-default-rtdb.<REGION>.firebasedatabase.app
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
PORT=3000
ALLOWED_ORIGINS=https://iot-listrik-dashboard.vercel.app,http://localhost:3000,http://localhost:5173
```

Catatan: `server.js` membaca `FIREBASE_DATABASE_URL` dari `.env`. `ALLOWED_ORIGINS` membatasi website mana yang boleh mengakses API lokal dari browser. Notifier Discord/Simulator memakai `serviceAccountKey.json` dan konfigurasi project yang ada di file notifier.

## Install Dependency

```bash
cd backend-local
npm install
```

## Jalankan Semua Layanan (Direkomendasikan)

```bash
npm run start:all
```

Perintah tersebut menjalankan tiga proses sekaligus:

1. `server.js` untuk API lokal dan FCM.
2. `discord-notifier.js` untuk perangkat ESP32 fisik.
3. `sim-notifier.js` untuk akun simulator pada `/sim/{uid}`.

Tekan `Ctrl+C` satu kali untuk menghentikan seluruh proses.

## Jalankan Backend

### 1. API lokal + FCM trigger

```bash
npm start
```

Endpoint:

```text
GET http://localhost:3000/health
GET http://localhost:3000/api/listrik
GET http://localhost:3000/api/logs?limit=20
```

Saat `/listrik/status` berubah menjadi `DANGER`, backend mengirim FCM topic `iot_alarms` untuk Android.

### 2. Notifier hardware utama

```bash
npm run discord
```

Fitur:

- Membaca `/settings/discord` untuk webhook Discord.
- Membaca konfigurasi Telegram dan daftar penerima.
- Mengirim alert status, relay, monitoring, logs, device online/offline.
- Mengirim file laporan harian Excel ke Telegram dan Discord daily report jika ada data baru.
- Memproses command Telegram `/pause`, `/resume`, `/status`, `/diagnostik`, `/system_update`, `/firmware`, dan `/help` per Chat ID.
- Memeriksa GitHub Release firmware ESP32 setiap 30 menit dan mengirim notifikasi satu kali ke Telegram serta webhook Discord **Diagnostik Sistem** (fallback ke **Alerts**) ketika versi lebih baru dan asset firmware `.bin` tersedia. Perubahan kesehatan sistem dikirim ke webhook **Diagnostik Sistem** yang dikonfigurasi terpisah. Tidak ada pesan yang dikirim pada setiap perubahan angka telemetri.

### 3. Notifier simulator

```bash
npm run sim-notify
```

Dipakai untuk akun temp/simulator pada path:

```text
/sim/{uid}/listrik
/sim/{uid}/settings
/sim/{uid}/logs
```

Notifier simulator harus tetap terpisah dari data hardware utama agar alert simulator tidak masuk ke akun admin fisik.

## Test Cepat

1. Jalankan `npm start`.
2. Buka `http://localhost:3000/health`.
3. Ubah `/listrik/status` di RTDB menjadi `DANGER`.
4. Pastikan log terminal menampilkan trigger FCM.
5. Jalankan `npm run discord`.
6. Uji tombol **Test Kirim Pesan** di halaman `/telegram` dan `/discord`.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `serviceAccountKey.json` tidak ditemukan | Pastikan file ada langsung di folder `backend-local/` |
| `FIREBASE_DATABASE_URL is missing` | Isi `FIREBASE_DATABASE_URL` di `.env` |
| Telegram tidak menerima pesan | Pastikan bot token benar, Chat ID aktif, dan penerima tidak sedang `/pause` |
| Discord tidak menerima pesan | Pastikan Master Switch Discord aktif dan webhook URL valid |
| Alert simulator muncul di akun admin fisik | Jalankan `sim-notify` hanya untuk simulator dan pastikan path `/sim/{uid}` tidak tercampur dengan `/listrik` |
| Laporan harian tidak terkirim | Pastikan ada data monitoring pada tanggal tersebut dan webhook daily report/Telegram aktif |

## Channel Discord Diagnostik Sistem

Buat channel Discord `#diagnostik-sistem` hanya jika ingin memisahkan pesan kesehatan sistem dari `#alerts`. Buat webhook pada channel tersebut lalu simpan URL-nya sebagai `webhookDiagnostics` melalui halaman pengaturan Discord pada Web/PWA, Windows, atau Android.

Notifier mengirim pesan saat kondisi diagnostik berubah, misalnya PZEM error/berfungsi, ESP32 online/offline, LCD merespons/tidak terdeteksi, Wi-Fi berpindah kategori kualitas, heap menjadi rendah, atau status relay berubah. Nilai telemetri biasa tidak dikirim berulang ke channel ini.

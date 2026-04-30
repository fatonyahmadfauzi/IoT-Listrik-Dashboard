# Panduan Setup Discord Notification

> Discord Server IoT Listrik Dashboard: [discord.gg/WszeM4FVH6](https://discord.gg/WszeM4FVH6)

Integrasi Discord sekarang memakai dua jalur:

- **Discord Webhook** untuk mengirim notifikasi monitoring, relay, alert, laporan harian, dan log.
- **Discord Bot** untuk membaca status server, jumlah member/online/ban, serta ban/unban user dari admin UI.

Konfigurasi utama dilakukan dari halaman admin `/discord` atau `/app/discord` dan disimpan di Firebase Realtime Database pada `/settings/discord`.

---

## Struktur Channel Webhook

| Tujuan | Trigger | Isi Notifikasi |
|--------|---------|----------------|
| `alerts` | `DANGER`, `WARNING`, pulih `NORMAL`, device `ONLINE/OFFLINE` | Embed status kelistrikan dan kondisi perangkat |
| `relay` | Relay ON/OFF berubah | Status relay lama dan baru |
| `monitoring` | Snapshot data monitoring berkala | Arus, tegangan, daya, relay, frekuensi, power factor, energi, status |
| `daily-report` | Laporan harian tersedia | File Excel data monitoring 24 jam |
| `logs` | Entry baru pada `/logs` | Aktivitas sistem dan pengguna |

---

## Setup Webhook

1. Buka Discord Server.
2. Buat channel teks, misalnya `alerts`, `relay`, `monitoring`, `daily-report`, dan `logs`.
3. Untuk setiap channel: **Edit Channel** -> **Integrations** -> **Webhooks** -> **New Webhook**.
4. Salin Webhook URL.
5. Buka admin UI:

```text
https://iot-listrik-dashboard.vercel.app/discord
```

6. Isi URL webhook sesuai tujuan channel.
7. Aktifkan **Master Switch Notifikasi**.
8. Klik **Test Kirim Pesan** untuk memastikan webhook valid.

Webhook tidak perlu disimpan di source code. Semua URL dikelola dari Firebase melalui admin UI.

---

## Setup Discord Bot

Discord Bot diperlukan untuk fitur status server dan moderasi.

1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Buat aplikasi baru, lalu buka menu **Bot**.
3. Salin bot token.
4. Aktifkan intent yang dibutuhkan:
   - Server Members Intent
   - Presence Intent, jika ingin membaca jumlah online
5. Invite bot ke server dengan permission minimal:
   - View Channels
   - Send Messages
   - Read Message History
   - Ban Members, jika fitur ban/unban digunakan
6. Buka `/discord`, isi Bot Token dan Guild ID, lalu simpan.
7. Gunakan panel status untuk memeriksa koneksi bot, jumlah member, online, dan ban.

Fitur ban/unban memakai endpoint Vercel API:

- `/api/get-discord-bot-status`
- `/api/save-discord-bot-config`
- `/api/ban-discord-user`
- `/api/unban-discord-user`

---

## Jalankan Local Notifier

Notifier lokal membaca konfigurasi Discord dan Telegram dari RTDB secara real-time.

```bash
cd backend-local
npm install

# Hardware utama ESP32
npm run discord

# Simulator virtual PWA
npm run sim-notify
```

Fungsi notifier:

- Mengirim alert status, relay, monitoring, log, dan laporan harian ke Discord.
- Mengirim notifikasi yang sama ke Telegram jika Telegram aktif.
- Membaca command Telegram `/pause` dan `/resume` per Chat ID.
- Membuat laporan harian Excel dan mengirimnya hanya jika ada data baru pada hari tersebut.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Test webhook gagal | Pastikan URL webhook lengkap dan masih aktif |
| Master switch mati tapi notifikasi masih muncul | Restart `backend-local/discord-notifier.js` agar konfigurasi terbaru terbaca |
| Bot status error JSON | Pastikan Bot Token di env/admin UI satu baris, tanpa kutip tambahan atau karakter `{}` |
| Jumlah member/online tidak muncul | Aktifkan Server Members Intent dan Presence Intent di Developer Portal |
| Ban/unban gagal | Pastikan bot punya permission **Ban Members** dan role bot lebih tinggi dari user target |
| Laporan harian tidak terkirim | Pastikan webhook daily report/Telegram aktif dan ada data monitoring pada tanggal tersebut |

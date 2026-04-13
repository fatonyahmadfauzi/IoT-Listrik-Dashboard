# Panduan Setup Discord Notification

> 🔗 **Discord Server IoT Listrik Dashboard**: [discord.gg/WszeM4FVH6](https://discord.gg/WszeM4FVH6)  
> Join server untuk mendapatkan channel monitoring (alerts, relay, monitoring, logs) yang siap pakai.

Sistem notifikasi real-time IoT Listrik Dashboard diintegrasikan dengan Discord
melalui **4 channel terpisah** via Webhook URL.

---

## Struktur Channel Discord

| Channel | Trigger | Isi Notifikasi |
|---------|---------|----------------|
| `#⚡-alerts` | Status `BAHAYA` / `WARNING` / Recovery | Embed merah/kuning/hijau + data lengkap |
| `#🔌-relay` | Relay ON/OFF berubah | Status relay lama vs baru |
| `#📊-monitoring` | Update data (max 1x/5 menit) | Snapshot semua data listrik |
| `#📋-logs` | Log aktivitas baru (`/logs`) | Pesan log + pengguna + tipe |

---

## Langkah 1 — Buat Discord Server & Channel

1. Buat Server Discord (atau pakai yang sudah ada).
2. Buat 4 channel teks dengan nama bebas (contoh: `alerts`, `relay`, `monitoring`, `logs`).

---

## Langkah 2 — Buat Webhook per Channel

Untuk setiap channel:
1. Klik kanan channel → **Edit Channel** → **Integrations** → **Webhooks**
2. Klik **New Webhook** → beri nama (misal: "IoT Alerts Bot")
3. Klik **Copy Webhook URL**
4. Simpan URL tersebut (format: `https://discord.com/api/webhooks/xxxx/yyyy`)

---

## Langkah 3 — Simpan Webhook ke Firebase Secrets

> ⚠️ **JANGAN hardcode URL webhook di kode!** Gunakan Firebase Secrets agar aman.

Jalankan perintah berikut satu per satu (paste URL webhook saat diminta input):

```bash
firebase functions:secrets:set DISCORD_WEBHOOK_ALERTS
# paste URL webhook channel #alerts

firebase functions:secrets:set DISCORD_WEBHOOK_RELAY
# paste URL webhook channel #relay

firebase functions:secrets:set DISCORD_WEBHOOK_MONITORING
# paste URL webhook channel #monitoring

firebase functions:secrets:set DISCORD_WEBHOOK_LOGS
# paste URL webhook channel #logs
```

Verifikasi secret tersimpan:
```bash
firebase functions:secrets:list
```

---

## Langkah 4 — Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Atau hanya function tertentu:
```bash
firebase deploy --only functions:onStatusChanged
firebase deploy --only functions:onRelayChanged
firebase deploy --only functions:onListrikUpdated
firebase deploy --only functions:onNewLog
```

---

## Langkah 5 — Verifikasi

1. Simulasikan perubahan data di RTDB (misal ubah `/listrik/status` → `DANGER`)
2. Periksa channel Discord yang sesuai — embed notifikasi seharusnya muncul dalam 5-10 detik
3. Cek log function: `firebase functions:log`

---

## Contoh Tampilan Notifikasi Discord

### Channel `#⚡-alerts` (Status BAHAYA)
```
🔴 Status Kelistrikan: DANGER
⚠️ KEBOCORAN ARUS TERDETEKSI! Relay sedang diputuskan otomatis.

⚡ Arus        🔋 Tegangan   💡 Daya
15.2 A         220 V         3.344 W

🔌 Relay       📡 Frekuensi  📊 PF
OFF (Mati)     50 Hz         0.92

IoT Listrik Dashboard • 11/04/2026, 16.30.00
```

### Channel `#🔌-relay`
```
🪫 Relay DIMATIKAN
Relay listrik baru saja diubah ke posisi OFF.

Status Sebelumnya    Status Sekarang
ON                   OFF
```

---

## Update / Ubah Webhook URL

Jika Anda perlu mengganti URL webhook (misal server Discord ganti), cukup jalankan:
```bash
firebase functions:secrets:set DISCORD_WEBHOOK_ALERTS
# (input URL baru)

firebase deploy --only functions
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Notifikasi tidak muncul | Cek `firebase functions:log` untuk error |
| Error "Secret not found" | Jalankan ulang `firebase functions:secrets:set` |
| Discord menolak (401/403) | Webhook URL kadaluarsa, buat webhook baru |
| Monitoring terlalu jarang | Rate limit 5 menit aktif, normal |
| Monitoring terlalu sering | Tingkatkan threshold di `index.js` (default: 5 menit) |

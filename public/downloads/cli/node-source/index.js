#!/usr/bin/env node
// Node 18 bundled by pkg can emit a Fetch API ExperimentalWarning used internally
// by Firebase. Hide only that warning; application errors remain visible.
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  const message = typeof warning === "string" ? warning : String(warning?.message || warning || "");
  const warningType = typeof args[0] === "string" ? args[0] : String(warning?.name || "");
  if (warningType === "ExperimentalWarning" && /Fetch API/i.test(message)) return;
  return originalEmitWarning(warning, ...args);
};

const inquirer = require("inquirer");
const chalk = require("chalk");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getDatabase, ref, onValue, set, get, query, limitToLast, orderByKey, off } = require("firebase/database");
const os = require("os");

const LEGACY_SESSION_FILE = path.join(os.homedir(), ".iot-listrik-session.json");

const firebaseConfig = {
  apiKey: "AIzaSyBLr8oo64-ARn2TUuR6yj68Zi3MUR3qsRU",
  authDomain: "iot-listrik-dashboard.firebaseapp.com",
  databaseURL: "https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-listrik-dashboard",
  storageBucket: "iot-listrik-dashboard.firebasestorage.app",
  messagingSenderId: "690684049171",
  appId: "1:690684049171:web:b8953844f7512e69488ce6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const DEVICE_STALE_MS = 15000;
let pathPrefix = "";
let sessionTimeoutTimer = null;
let isTempSession = false;
let tempExpiresAt = null;
let currentRole = "user";
let presenceListrikRef = null;
let presenceConnRef = null;
let firebaseConnected = true;
let lastDeviceHeartbeatAt = 0;
let lastUpdatedMarker = null;
let lastSensorSignature = "";
let watchStartedAt = Date.now();
let latestListrikSnapshot = null;
let lastAdminResetMarker = null;
let headerTicker = null;

function isLikelyEpochMs(value) {
  return Number.isFinite(value) && value > 1e12;
}

function buildSensorSignature(d = {}) {
  return [
    Number(d?.arus ?? 0).toFixed(3),
    Number(d?.tegangan ?? 0).toFixed(1),
    Number(d?.daya_w ?? 0).toFixed(1),
    Number(d?.apparent_power ?? d?.daya ?? 0).toFixed(1),
    Number(d?.energi_kwh ?? 0).toFixed(4),
    Number(d?.frekuensi ?? 0).toFixed(2),
    Number(d?.power_factor ?? 0).toFixed(3),
    String(d?.status || "NORMAL"),
  ].join("|");
}

function registerDeviceHeartbeat(data) {
  const updatedAt = data?.updated_at != null ? Number(data.updated_at) : null;
  const sensorSignature = buildSensorSignature(data);
  let heartbeatDetected = false;

  if (Number.isFinite(updatedAt) && updatedAt > 0) {
    if (lastUpdatedMarker == null) {
      if (isLikelyEpochMs(updatedAt) && (Date.now() - updatedAt) <= DEVICE_STALE_MS) {
        heartbeatDetected = true;
      }
    } else if (updatedAt !== lastUpdatedMarker) {
      heartbeatDetected = true;
    }
    lastUpdatedMarker = updatedAt;
  } else if (lastSensorSignature && lastSensorSignature !== sensorSignature) {
    heartbeatDetected = true;
  }

  lastSensorSignature = sensorSignature;

  if (heartbeatDetected) {
    lastDeviceHeartbeatAt = Date.now();
  }
}

function currentConnectionLabel(now = Date.now()) {
  if (!firebaseConnected) return "Memulihkan...";
  if (!lastDeviceHeartbeatAt) {
    return (now - watchStartedAt) > DEVICE_STALE_MS ? "Device Offline" : "Memeriksa perangkat...";
  }
  return (now - lastDeviceHeartbeatAt) > DEVICE_STALE_MS ? "Device Offline" : "Connected";
}

function handleAdminResetNotice(data) {
  const resetByAdmin = !!data?.reset_by_admin;
  const resetAt = String(data?.reset_at || "").trim();
  if (!resetByAdmin || !resetAt) return;

  if (lastAdminResetMarker == null) {
    lastAdminResetMarker = resetAt;
    return;
  }
  if (lastAdminResetMarker === resetAt) return;

  lastAdminResetMarker = resetAt;
  const note = String(data?.reset_note || "Admin mengosongkan data realtime sensor perangkat IoT.");
  console.log(chalk.cyan(`\n[INFO] ${note}`));
}

function relayBlockedReason() {
  const label = currentConnectionLabel();
  if (label === "Device Offline") return "Perangkat offline. Relay fisik tidak menerima perintah.";
  if (label === "Memeriksa perangkat...") return "Sistem masih menunggu heartbeat perangkat.";
  if (label === "Memulihkan...") return "Koneksi cloud sedang dipulihkan.";
  return "Perangkat belum siap menerima perintah.";
}

function statusColor(status) {
  if (status === "NORMAL") return chalk.green.bold;
  if (status === "WARNING") return chalk.yellow.bold;
  if (status === "LEAKAGE") return chalk.red.bold; // status legacy
  if (status === "DANGER") return chalk.red.bold;
  return chalk.gray;
}

function startPresenceWatch() {
  if (presenceListrikRef) off(presenceListrikRef);
  if (presenceConnRef) off(presenceConnRef);

  lastDeviceHeartbeatAt = 0;
  lastUpdatedMarker = null;
  lastSensorSignature = "";
  latestListrikSnapshot = null;
  lastAdminResetMarker = null;
  watchStartedAt = Date.now();

  presenceListrikRef = ref(db, `${pathPrefix}/listrik`);
  onValue(presenceListrikRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    latestListrikSnapshot = data;
    registerDeviceHeartbeat(data);
    handleAdminResetNotice(data);
  });

  presenceConnRef = ref(db, ".info/connected");
  onValue(presenceConnRef, (snapshot) => {
    firebaseConnected = !!snapshot.val();
    if (firebaseConnected) {
      watchStartedAt = Date.now();
    }
  });
}

function stopPresenceWatch() {
  if (presenceListrikRef) {
    off(presenceListrikRef);
    presenceListrikRef = null;
  }
  if (presenceConnRef) {
    off(presenceConnRef);
    presenceConnRef = null;
  }
}

function renderLiveMonitoring(data) {
  printHeader(true);
  console.log(chalk.yellow("Memulai Live Stream Data Firebase..."));
  console.log(chalk.gray("Tekan 'q' atau 'Ctrl+C' kapan saja untuk kembali ke Menu Utama.\n"));

  const connection = currentConnectionLabel();
  const connectionColor =
    connection === "Connected"
      ? chalk.green
      : connection === "Memeriksa perangkat..."
        ? chalk.yellow
        : chalk.red;

  console.log(chalk.cyan.bold("=== Ringkasan Monitoring PZEM-004T ==="));
  console.log(`${chalk.blue("Sumber     :")} ${chalk.white(isTempSession ? "SIM" : "CLOUD")}`);
  console.log(`${chalk.blue("Koneksi    :")} ${connectionColor(connection)}`);

  if (!data) {
    console.log(chalk.gray("Belum ada data perangkat."));
    return;
  }

  const status = String(data.status || "NORMAL").toUpperCase();
  const arus = Number(data.arus ?? 0);
  const tegangan = Number(data.tegangan ?? 0);
  const energi = Number(data.energi_kwh ?? 0);
  const frekuensi = Number(data.frekuensi ?? 0);
  const pf = Number(data.power_factor ?? 0);
  const apparentPower = Number(data.apparent_power ?? data.daya ?? 0);
  const activePower = Number(data.daya_w ?? (pf > 0 ? apparentPower * pf : 0));

  const rawUpdatedAt = data.updated_at ?? data.timestamp ?? data.waktu;
  const updatedAtMs = Number(rawUpdatedAt);
  const waktuStr = Number.isFinite(updatedAtMs) && updatedAtMs > 1e12
    ? new Date(updatedAtMs).toLocaleString('id-ID')
    : "-";
  console.log(`${chalk.blue("Waktu      :")} ${chalk.white(waktuStr)}`);
  console.log(`${chalk.blue("Status     :")} ${statusColor(status)(status)}`);
  console.log(`${chalk.blue("Arus       :")} ${chalk.green(`${arus.toFixed(2)} A`)} ${chalk.gray("(PZEM-004T Meter)")}`);
  console.log(`${chalk.blue("Tegangan   :")} ${chalk.cyan(`${tegangan.toFixed(1)} V`)} ${chalk.gray("(PZEM-004T Meter)")}`);
  console.log(`${chalk.blue("Daya Aktif :")} ${chalk.yellow(`${activePower.toFixed(1)} W`)} ${chalk.gray("V x I x PF")}`);
  console.log(`${chalk.blue("Daya Semu  :")} ${chalk.white(`${apparentPower.toFixed(1)} VA`)} ${chalk.gray("V x I")}`);
  console.log(`${chalk.blue("Energi     :")} ${chalk.white(`${energi.toFixed(3)} kWh`)} ${chalk.gray("akumulasi meter")}`);
  console.log(`${chalk.blue("PF / Freq  :")} ${chalk.white(pf.toFixed(2))} / ${chalk.white(`${frekuensi.toFixed(1)} Hz`)}`);
  console.log(
    `${chalk.blue("Relay      :")} ${data.relay ? chalk.green("ON") : chalk.red("OFF")}`
  );
}

function handleSessionExpired() {
  console.clear();
  console.log(chalk.red.bold("\n[!] PERINGATAN SISTEM [!]"));
  console.log(chalk.yellow("Durasi sesi akun sementara (Demo) Anda telah habis (15 menit)."));
  console.log(chalk.gray("Anda akan di-logout secara otomatis.\n"));
  
  if (fs.existsSync(LEGACY_SESSION_FILE)) {
    fs.unlinkSync(LEGACY_SESSION_FILE);
  }
  process.exit(0);
}

function sessionCountdownLabel() {
  if (!isTempSession) return "";
  const remaining = tempExpiresAt ? Math.max(0, Math.ceil((tempExpiresAt - Date.now()) / 1000)) : 0;
  const countdown = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return `DEMO ${countdown} · SIM`;
}

function currentSessionBadge(liveCountdown = false) {
  if (isTempSession) {
    const text = liveCountdown ? sessionCountdownLabel().replace(' · SIM', '') : 'DEMO';
    return chalk.bgYellow.black(` ${text} `);
  }
  return currentRole === 'admin'
    ? chalk.bgYellow.black(' ADMIN ')
    : chalk.gray(' USER ');
}

function decoratePromptMessage(message) {
  const label = sessionCountdownLabel();
  return label ? `${message} ${chalk.yellow(`[${label}]`)}` : message;
}

function promptWithLiveCountdown(questions) {
  const isArray = Array.isArray(questions);
  const source = isArray ? questions : [questions];
  const baseMessages = source.map((question) => String(question.message || ''));
  const prepared = source.map((question, index) => ({
    ...question,
    message: decoratePromptMessage(baseMessages[index]),
  }));
  const promptPromise = inquirer.prompt(isArray ? prepared : prepared[0]);

  const refresh = () => {
    if (!isTempSession) return;
    const activePrompt = promptPromise.ui?.activePrompt;
    if (!activePrompt || activePrompt.status === 'answered') return;
    const index = Math.max(0, prepared.findIndex((question) => question.name === activePrompt.opt.name));
    activePrompt.opt.message = decoratePromptMessage(baseMessages[index] || '');
    try { activePrompt.render(); } catch (_) {}
  };

  const ticker = isTempSession ? setInterval(refresh, 1000) : null;
  return promptPromise.finally(() => {
    if (ticker) clearInterval(ticker);
  });
}

function stopHeaderTicker() {
  // Kompatibilitas dengan alur logout lama. Countdown sekarang dirender
  // oleh prompt aktif sehingga tidak menulis ke posisi terminal absolut.
}

function clearTerminal() {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  } else {
    console.clear();
  }
}

function printHeader(liveCountdown = false) {
  clearTerminal();
  console.log(chalk.cyan.bold("\nIoT Listrik Dashboard CLI"));
  console.log(chalk.gray("Pengembang: Fatony Ahmad Fauzi\n"));
  if (auth.currentUser) {
    console.log(`${currentSessionBadge(liveCountdown)} ${chalk.green(`[+] Terhubung sebagai: ${auth.currentUser.email}`)}\n`);
  }
}

/** Tampilan Live Monitoring */
async function runLiveMonitoring() {
  return new Promise((resolve) => {
    renderLiveMonitoring(latestListrikSnapshot);
    const renderTick = setInterval(() => {
      renderLiveMonitoring(latestListrikSnapshot);
    }, 1000);

    const onKeypress = (str, key) => {
      if (key && (key.name === 'q' || (key.ctrl && key.name === 'c'))) {
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        clearInterval(renderTick);
        resolve(); 
      }
    };
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);
  });
}

/** Hit API untuk mengubah Relay */
async function toggleRelay() {
  if (isTempSession || currentRole !== 'admin') {
    console.log(chalk.red("\nAkses ditolak: kontrol relay hanya tersedia untuk Admin."));
    await holdForEnter();
    return;
  }

  if (currentConnectionLabel() !== "Connected") {
    console.log(chalk.yellow(`\nPerintah relay diblokir: ${relayBlockedReason()}`));
    await holdForEnter();
    return;
  }

  const { confirmToggle } = await promptWithLiveCountdown([
    {
      type: "list",
      name: "confirmToggle",
      message: "Kontrol Relay Jarak Jauh:",
      choices: [
        { name: "Nyalakan Relay (Paksakan ON)", value: true },
        { name: "Matikan Relay (Paksakan OFF)", value: false },
        { name: "Batal", value: null },
      ]
    }
  ]);

  if (confirmToggle !== null) {
    try {
      await set(ref(db, `${pathPrefix}/commands/relay`), confirmToggle ? 1 : 0);
      console.log(chalk.green(`\nBerhasil mengirim perintah [${confirmToggle ? 'ON' : 'OFF'}] ke alat!`));
    } catch (e) {
      console.log(chalk.red(`\nGagal mengirim perintah:`), e.message);
    }
  }
  await holdForEnter();
}

/** Lihat Log / History Kejadian */
async function viewLogs() {
  printHeader();
  console.log(chalk.cyan("Memuat 20 log riwayat terakhir...\n"));
  try {
    const logQuery = query(ref(db, `${pathPrefix}/logs`), orderByKey(), limitToLast(20));
    const snap = await get(logQuery);

    if (snap.exists()) {
      const logs = snap.val();
      const entries = Object.values(logs).reverse();

      // Header: setiap sel diberi lebar tetap dan dipisahkan dua spasi.
      // Warna diterapkan SETELAH padding agar escape ANSI Chalk tidak merusak lebar kolom.
      const sep = ' | ';
      const w = { time: 19, load: 22, status: 13, relay: 5, source: 14, uptime: 10 };
      const fitCell = (value, width) => {
        const text = String(value ?? '');
        if (text.length <= width) return text.padEnd(width);
        if (width <= 1) return text.slice(0, width);
        return `${text.slice(0, width - 1)}…`;
      };
      const totalWidth = Object.values(w).reduce((sum, width) => sum + width, 0) + (sep.length * 5);
      console.log(
        chalk.cyan.bold([
          fitCell('Waktu', w.time),
          fitCell('Beban (A / V / W)', w.load),
          fitCell('Status', w.status),
          fitCell('Relay', w.relay),
          fitCell('Sumber Meter', w.source),
          fitCell('Uptime', w.uptime),
        ].join(sep))
      );
      console.log(chalk.gray('-'.repeat(totalWidth)));

      entries.forEach(item => {
        // Timestamp
        const rawWaktu = item.waktu ?? item.timestamp;
        let timeStr = '-';
        if (rawWaktu) {
          const ms = Number(rawWaktu);
          const parsed = Number.isFinite(ms) && ms > 1e12
            ? ms
            : Date.parse(String(rawWaktu));
          if (Number.isFinite(parsed)) {
            const date = new Date(parsed);
            const two = value => String(value).padStart(2, '0');
            timeStr = `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ` +
              `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
          }
        }

        // Nilai sensor
        const arus   = Number(item.arus   ?? 0);
        const teg    = Number(item.tegangan ?? 0);
        const pf     = Number(item.power_factor ?? 0.85);
        const appar  = Number(item.apparent_power ?? item.daya ?? arus * teg);
        const dayaW  = Number(item.daya_w ?? appar * pf);
        const loadStr = `${arus.toFixed(2)}A / ${teg.toFixed(1)}V / ${dayaW.toFixed(0)}W`;

        // Status
        const status = String(item.status || 'NORMAL').toUpperCase();
        const statusCell = statusColor(status)(fitCell(status, w.status));

        // Relay
        const relayRaw = item.relay;
        const relayOn  = relayRaw === true || Number(relayRaw) === 1;
        const relayText = relayOn ? 'ON' : 'OFF';
        const relayCell = relayOn
          ? chalk.green(fitCell(relayText, w.relay))
          : chalk.red(fitCell(relayText, w.relay));

        // Sumber Meter
        const meterSource = String(item.sensor_source ?? item.sensorSource ?? 'PZEM-004T').trim() || 'PZEM-004T';

        // Uptime
        const rawUptime = item.uptime_s ?? item.uptimeSeconds ?? item.uptime;
        const uptimeNum = Number(rawUptime);
        const uptimeStr = Number.isFinite(uptimeNum) && uptimeNum >= 0
          ? `${Math.floor(uptimeNum)} s`
          : '—';

        console.log([
          chalk.white(fitCell(timeStr, w.time)),
          chalk.yellow(fitCell(loadStr, w.load)),
          statusCell,
          relayCell,
          chalk.white(fitCell(meterSource, w.source)),
          chalk.gray(fitCell(uptimeStr, w.uptime)),
        ].join(sep));
      });

      console.log(chalk.gray('\n' + '-'.repeat(totalWidth)));
      console.log(chalk.gray(`${entries.length} entri ditampilkan.`));
    } else {
      console.log(chalk.gray("Belum ada catatan aktivitas."));
    }
  } catch (e) {
    console.log(chalk.red("Kesalahan saat mengambil data:", e.message));
  }
  await holdForEnter();
}

function formatFirmwareVersion(value) {
  const text = String(value || "Belum dilaporkan").trim();
  return text && /^v/i.test(text) ? text : (text ? `v${text}` : "Belum dilaporkan");
}

function wifiQuality(rssi) {
  if (!Number.isFinite(rssi) || rssi > 0) return "Belum dilaporkan";
  return `${rssi} dBm - ${rssi >= -60 ? "Sangat baik" : rssi >= -70 ? "Baik" : rssi >= -80 ? "Lemah" : "Sangat lemah"}`;
}

function diagnosticBadge(label, state) {
  if (state === "ok") return chalk.green.bold(label);
  if (state === "error") return chalk.red.bold(label);
  return chalk.yellow.bold(label);
}

function diagnosticTimestamp(data) {
  const raw = data?.updated_at ?? data?.timestamp ?? data?.waktu;
  const number = Number(raw);
  return Number.isFinite(number) && number > 1e12 ? number : 0;
}

function formatDiagnosticTime(epochMs) {
  if (!epochMs) return "Belum ada timestamp";
  const date = new Date(epochMs);
  const two = (value) => String(value).padStart(2, "0");
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

function printDiagnosticRow(label, value) {
  console.log(`${chalk.blue(String(label).padEnd(18))} : ${value}`);
}

async function checkLatestFirmware() {
  try {
    const response = await fetch("https://api.github.com/repos/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "iot-listrik-cli" },
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets.map((asset) => asset.name).filter(Boolean) : [];
    return { tag: release.tag_name || "Belum diperiksa", bin: assets.find((name) => /\.bin$/i.test(name)) || "", assets };
  } catch (error) {
    return { error: error.message || String(error), tag: "Gagal diperiksa", bin: "", assets: [] };
  }
}

async function viewDiagnostics() {
  let running = true;
  while (running) {
    printHeader(true);
    let data = latestListrikSnapshot;
    try {
      const snapshot = await get(ref(db, `${pathPrefix}/listrik`));
      if (snapshot.exists()) {
        data = snapshot.val();
        latestListrikSnapshot = data;
        registerDeviceHeartbeat(data);
      }
    } catch (error) {
      console.log(chalk.red(`Gagal membaca data diagnostik: ${error.message}`));
    }

    const connection = currentConnectionLabel();
    const connected = connection === "Connected";
    const updated = diagnosticTimestamp(data || {});
    const age = updated ? Math.max(0, Date.now() - updated) : Infinity;
    const online = connected && age <= DEVICE_STALE_MS;
    const meterOk = typeof data?.meter_ok === "boolean" ? data.meter_ok : String(data?.status || "").toUpperCase() !== "SENSOR_ERROR" && Number(data?.tegangan) > 1;
    const lcdReported = typeof data?.lcd_ok === "boolean";
    const lcdOk = data?.lcd_ok === true;
    const status = String(data?.status || "UNKNOWN").toUpperCase();
    const rssi = Number(data?.wifi_rssi);
    const heap = Number(data?.free_heap);
    const firmware = await checkLatestFirmware();
    const overallError = !connected || !online || !meterOk || (!isTempSession && lcdReported && !lcdOk);
    const overallWarn = !overallError && (!isTempSession && !lcdReported);

    console.log(chalk.cyan.bold("DIAGNOSTIK SISTEM IoT LISTRIK"));
    console.log(chalk.gray("Pemeriksaan bersifat read-only; tidak mengubah konfigurasi atau menyalakan beban.\n"));
    printDiagnosticRow("Koneksi cloud", diagnosticBadge(connected ? "TERHUBUNG" : "TERPUTUS", connected ? "ok" : "error"));
    printDiagnosticRow("Perangkat", diagnosticBadge(online ? "ONLINE" : "OFFLINE", online ? "ok" : "error"));
    printDiagnosticRow("Heartbeat", lastDeviceHeartbeatAt ? "AKTIF" : "Belum terdeteksi");
    printDiagnosticRow("Update terakhir", updated ? `${formatDiagnosticTime(updated)} (${Math.round(age / 1000)} detik lalu)` : "Belum ada timestamp");
    console.log();

    console.log(chalk.cyan.bold("Sensor dan perangkat"));
    printDiagnosticRow("PZEM-004T", diagnosticBadge(meterOk && online ? "BERFUNGSI" : "ERROR", meterOk && online ? "ok" : "error"));
    printDiagnosticRow("Status baca", diagnosticBadge(status, status === "NORMAL" ? "ok" : status === "WARNING" ? "warn" : "error"));
    printDiagnosticRow("Arus / tegangan", `${Number(data?.arus ?? 0).toFixed(2)} A / ${Number(data?.tegangan ?? 0).toFixed(1)} V`);
    printDiagnosticRow("ESP32 dan Wi-Fi", diagnosticBadge(online ? "ONLINE" : "OFFLINE", online ? "ok" : "error"));
    printDiagnosticRow("RSSI / kualitas", wifiQuality(rssi));
    printDiagnosticRow("Heap bebas", Number.isFinite(heap) && heap > 0 ? `${Math.round(heap / 1024)} KB` : "Belum dilaporkan");
    printDiagnosticRow("LCD I2C", diagnosticBadge(isTempSession ? "SIMULATOR" : lcdReported ? (lcdOk ? "I2C MERESPONS" : "ERROR") : "MENUNGGU DATA", isTempSession || lcdOk ? "ok" : lcdReported ? "error" : "warn"));
    printDiagnosticRow("LCD alamat", lcdOk && Number(data?.lcd_address) > 0 ? `0x${Number(data.lcd_address).toString(16).toUpperCase().padStart(2, "0")}` : isTempSession ? "Simulator" : "Tidak ditemukan");
    printDiagnosticRow("Relay", online ? (Number(data?.relay) === 1 ? "ON" : "OFF") : "Tidak diketahui");
    printDiagnosticRow("Buzzer", online ? "TERKONFIGURASI" : "Tidak diketahui");
    console.log();

    console.log(chalk.cyan.bold("Pemetaan Hardware"));
    console.log("  PZEM UART2   : RX GPIO16 <- PZEM TX; TX GPIO17 -> PZEM RX");
    console.log("  LCD I2C      : SDA GPIO21; SCL GPIO22");
    console.log("  Relay        : GPIO26");
    console.log("  Buzzer       : GPIO25");
    console.log();

    console.log(chalk.cyan.bold("Firmware Release"));
    printDiagnosticRow("Versi terpasang", formatFirmwareVersion(data?.firmware_version || "1.0.0"));
    printDiagnosticRow("Release terbaru", firmware.tag);
    printDiagnosticRow("Asset .bin", firmware.bin || "BELUM TERSEDIA");
    printDiagnosticRow("Board", data?.firmware_board || "esp32-dev-module");
    printDiagnosticRow("OTA", data?.firmware_ota_capable === true ? "AKTIF" : "BELUM AKTIF");
    if (firmware.error) console.log(chalk.yellow(`Catatan firmware: ${firmware.error}`));
    console.log(chalk.gray("Pembaruan firmware dilakukan melalui desktop/PC menggunakan USB."));
    console.log();
    printDiagnosticRow("Kesimpulan", diagnosticBadge(overallError ? "PERLU DIPERIKSA" : overallWarn ? "DATA BELUM LENGKAP" : "SEMUA NORMAL", overallError ? "error" : overallWarn ? "warn" : "ok"));

    const { next } = await promptWithLiveCountdown([{ type: "list", name: "next", message: "Diagnostik Sistem:", choices: [{ name: "[r] Refresh", value: "refresh" }, { name: "[b] Kembali", value: "back" }] }]);
    if (next === "back") running = false;
  }
}

/** Helper untuk menunggu input tekan Enter sebelum kembali ke menu */
async function holdForEnter() {
  await promptWithLiveCountdown([
    { type: "input", name: "lanjut", message: "Tekan Enter untuk kembali ke Menu Utama...", prefix: "" }
  ]);
}

function friendlyLoginError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  if (/invalid-credential|wrong-password|user-not-found|invalid_login_credentials/.test(`${code} ${message}`)) {
    return "Email atau password salah. Periksa kembali akun Anda.";
  }
  if (/invalid-email/.test(`${code} ${message}`)) {
    return "Format email tidak valid.";
  }
  if (/too-many-requests/.test(`${code} ${message}`)) {
    return "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.";
  }
  if (/user-disabled/.test(`${code} ${message}`)) {
    return "Akun ini telah dinonaktifkan.";
  }
  if (/network-request-failed|network|fetch failed|timeout|econn/.test(`${code} ${message}`)) {
    return "Tidak dapat terhubung ke Firebase. Periksa koneksi internet Anda.";
  }
  return "Login tidak berhasil. Periksa kredensial dan koneksi internet Anda.";
}

/** Fungsi Otentikasi Gatekeeper */
async function enforceLogin() {
  console.clear();
  console.log(chalk.cyan.bold("\nIoT Listrik Dashboard CLI"));
  console.log(chalk.gray("Otentikasi Diperlukan\n"));

  // Hapus session lama yang menyimpan password plaintext.
  if (fs.existsSync(LEGACY_SESSION_FILE)) {
    try {
      fs.unlinkSync(LEGACY_SESSION_FILE);
      console.log(chalk.yellow("Session lama dihapus karena menyimpan password plaintext. Silakan login manual.\n"));
    } catch (e) {
      console.log(chalk.red("Gagal menghapus session lama. Hapus manual file ~/.iot-listrik-session.json.\n"));
    }
  }

  // Manual Login
  let loggedIn = false;
  while (!loggedIn) {
    const { email, password } = await inquirer.prompt([
      { type: "input", name: "email", message: "Email:" },
      { type: "password", name: "password", message: "Password:" },
    ]);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await processUserClaims();
      startPresenceWatch();
      console.log(chalk.green("\nLogin berhasil!\n"));
      loggedIn = true;
    } catch (e) {
      console.log(chalk.red("\nLogin gagal:"), friendlyLoginError(e), "\n");
    }
  }
}

/** Memproses Custom Claims untuk Session Isolation */
async function processUserClaims() {
  const result = await auth.currentUser.getIdTokenResult(true);
  const isTemp = result.claims.isTempAccount === true || auth.currentUser.email?.trim().toLowerCase().startsWith('sim_') === true;
  const expiresAt = Number(result.claims.expiresAt || 0) || null;
  isTempSession = isTemp;
  tempExpiresAt = expiresAt;
  
  if (isTemp) {
    currentRole = "demo";
    pathPrefix = `sim/${auth.currentUser.uid}`;
    if (expiresAt) {
      const timeRemaining = expiresAt - Date.now();
      if (timeRemaining <= 0) {
        handleSessionExpired();
      } else {
        if (sessionTimeoutTimer) clearTimeout(sessionTimeoutTimer);
        sessionTimeoutTimer = setTimeout(handleSessionExpired, timeRemaining);
      }
    }
  } else {
    pathPrefix = "";
    try {
      const roleSnap = await get(ref(db, `users/${auth.currentUser.uid}/role`));
      currentRole = roleSnap.val() === "admin" ? "admin" : "user";
    } catch (error) {
      currentRole = "user";
      console.warn(chalk.yellow("Role akun tidak dapat diverifikasi; akses dibatasi sebagai User."));
    }
    if (sessionTimeoutTimer) {
      clearTimeout(sessionTimeoutTimer);
      sessionTimeoutTimer = null;
    }
  }
}

/** Logout Handler */
async function handleLogout() {
  const { logoutConfirm } = await promptWithLiveCountdown([
    { type: "confirm", name: "logoutConfirm", message: "Anda yakin ingin Keluar (Log out)?", default: false }
  ]);
  if (logoutConfirm) {
    if (fs.existsSync(LEGACY_SESSION_FILE)) {
      fs.unlinkSync(LEGACY_SESSION_FILE);
    }
    stopHeaderTicker();
    stopPresenceWatch();
    await signOut(auth);
    console.log(chalk.green("\nBerhasil Log out. Aplikasi akan ditutup."));
    process.exit(0);
  }
}

/** SIKLUS UTAMA / MAIN LOOP */
async function mainMenu() {
  // Wajib Auth di awal
  await enforceLogin();

  let isRunning = true;

  while (isRunning) {
    printHeader();
    
    const choices = [
      { name: "[1] Mengakses Live Monitoring", value: "live" },
      { name: "[2] Riwayat Log (20 entri)", value: "log" },
      { name: "[3] Diagnostik Sistem", value: "diagnostics" },
    ];
    if (currentRole === "admin" && !isTempSession) {
      choices.push({ name: "[4] Kontrol Relay Power", value: "relay" });
    }
    choices.push(
      { name: `[${currentRole === "admin" && !isTempSession ? 5 : 4}] Keluar Sesi (Logout)`, value: "logout" },
      { name: "[0] Matikan Aplikasi (Exit)", value: "exit" },
    );

    const { action } = await promptWithLiveCountdown([
      {
        type: "list",
        name: "action",
        message: "Pilih opsi:",
        choices,
        pageSize: 10
      }
    ]);

    switch (action) {
      case "live":
        await runLiveMonitoring();
        break;
      case "log":
        await viewLogs();
        break;
      case "diagnostics":
        await viewDiagnostics();
        break;
      case "relay":
        await toggleRelay();
        break;
      case "logout":
        await handleLogout();
        break;
      case "exit":
        console.log(chalk.gray("\nMenutup CLI dan menghentikan proses... Sampai jumpa!\n"));
        stopHeaderTicker();
        stopPresenceWatch();
        isRunning = false;
        process.exit(0);
        break;
    }
  }
}

mainMenu().catch(err => {
  console.error("Kesalahan fatal:", err);
  process.exit(1);
});

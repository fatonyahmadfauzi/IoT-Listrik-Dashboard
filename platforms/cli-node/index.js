#!/usr/bin/env node
const inquirer = require("inquirer");
const chalk = require("chalk");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getDatabase, ref, onValue, set, get, query, limitToLast, orderByKey, off } = require("firebase/database");
const os = require("os");

const SESSION_FILE = path.join(os.homedir(), ".iot-listrik-session.json");

const firebaseConfig = {
  apiKey: "AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc",
  authDomain: "monitoring-listrik-719b1.firebaseapp.com",
  databaseURL: "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "monitoring-listrik-719b1",
  storageBucket: "monitoring-listrik-719b1.firebasestorage.app",
  messagingSenderId: "115654600721",
  appId: "1:115654600721:web:6b971ee1c19be7e045a9b0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const DEVICE_STALE_MS = 15000;
let pathPrefix = "";
let sessionTimeoutTimer = null;
let presenceListrikRef = null;
let presenceConnRef = null;
let firebaseConnected = true;
let lastDeviceHeartbeatAt = 0;
let lastUpdatedMarker = null;
let lastSensorSignature = "";
let watchStartedAt = Date.now();
let latestListrikSnapshot = null;

function isLikelyEpochMs(value) {
  return Number.isFinite(value) && value > 1e12;
}

function buildSensorSignature(d = {}) {
  return [
    Number(d?.arus ?? 0).toFixed(3),
    Number(d?.tegangan ?? 0).toFixed(1),
    Number(d?.daya ?? d?.apparent_power ?? 0).toFixed(1),
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

function relayBlockedReason() {
  const label = currentConnectionLabel();
  if (label === "Device Offline") return "Perangkat offline. Relay fisik tidak menerima perintah.";
  if (label === "Memeriksa perangkat...") return "Sistem masih menunggu heartbeat perangkat.";
  if (label === "Memulihkan...") return "Koneksi cloud sedang dipulihkan.";
  return "Perangkat belum siap menerima perintah.";
}

function startPresenceWatch() {
  if (presenceListrikRef) off(presenceListrikRef);
  if (presenceConnRef) off(presenceConnRef);

  lastDeviceHeartbeatAt = 0;
  lastUpdatedMarker = null;
  lastSensorSignature = "";
  latestListrikSnapshot = null;
  watchStartedAt = Date.now();

  presenceListrikRef = ref(db, `${pathPrefix}/listrik`);
  onValue(presenceListrikRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    latestListrikSnapshot = data;
    registerDeviceHeartbeat(data);
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
  printHeader();
  console.log(chalk.yellow("Memulai Live Stream Data Firebase..."));
  console.log(chalk.gray("Tekan 'q' atau 'Ctrl+C' kapan saja untuk kembali ke Menu Utama.\n"));

  const connection = currentConnectionLabel();
  const connectionColor =
    connection === "Connected"
      ? chalk.green
      : connection === "Memeriksa perangkat..."
        ? chalk.yellow
        : chalk.red;

  console.log(chalk.cyan.bold("=== Data Realtime ==="));
  console.log(`${chalk.blue("Koneksi    :")} ${connectionColor(connection)}`);

  if (!data) {
    console.log(chalk.gray("Belum ada data perangkat."));
    return;
  }

  console.log(`${chalk.blue("Waktu      :")} ${data.timestamp || "-"}`);
  console.log(`${chalk.blue("Arus (A)   :")} ${chalk.white(data.arus || "0")}`);
  console.log(`${chalk.blue("Tegangan(V):")} ${chalk.white(data.tegangan || "0")}`);
  console.log(`${chalk.blue("Daya (VA)  :")} ${chalk.white(data.apparent_power || data.daya || "0")}`);

  let statusColor = chalk.green;
  if (data.status === "WARNING") statusColor = chalk.yellow;
  if (data.status === "DANGER") statusColor = chalk.red.bold;
  console.log(`${chalk.blue("Status     :")} ${statusColor(data.status || "-")}`);
  console.log(
    `${chalk.blue("Relay      :")} ${data.relay ? chalk.green("ON") : chalk.red("OFF")}`
  );
}

function handleSessionExpired() {
  console.clear();
  console.log(chalk.red.bold("\n[!] PERINGATAN SISTEM [!]"));
  console.log(chalk.yellow("Durasi sesi akun sementara (Demo) Anda telah habis (15 menit)."));
  console.log(chalk.gray("Anda akan di-logout secara otomatis.\n"));
  
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
  process.exit(0);
}

function printHeader() {
  console.clear();
  console.log(chalk.cyan.bold("\nIoT Listrik Dashboard CLI"));
  console.log(chalk.gray("Pengembang: Fatony Ahmad Fauzi\n"));
  
  if (auth.currentUser) {
    console.log(chalk.green(`[+] Terhubung sebagai: ${auth.currentUser.email}\n`));
  }
}

/** Tampilan Live Monitoring */
async function runLiveMonitoring() {
  return new Promise((resolve) => {
    renderLiveMonitoring(latestListrikSnapshot);
    const renderTick = setInterval(() => {
      renderLiveMonitoring(latestListrikSnapshot);
    }, 2500);

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
  if (currentConnectionLabel() !== "Connected") {
    console.log(chalk.yellow(`\nPerintah relay diblokir: ${relayBlockedReason()}`));
    await holdForEnter();
    return;
  }

  const { confirmToggle } = await inquirer.prompt([
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
      await set(ref(db, `${pathPrefix}/listrik/relay`), confirmToggle);
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
  console.log(chalk.cyan("Memuat 5 log riwayat terakhir...\n"));
  try {
    const logQuery = query(ref(db, `${pathPrefix}/logs`), orderByKey(), limitToLast(5));
    const snap = await get(logQuery);
    
    if (snap.exists()) {
      const logs = snap.val();
      Object.keys(logs).forEach(key => {
        const item = logs[key];
        const time = new Date(item.timestamp).toLocaleString();
        const typeStr = item.type === 'alert' ? chalk.red('[ALERT]') : chalk.green('[INFO]');
        console.log(`${chalk.gray(time)} ${typeStr} ${item.message}`);
      });
    } else {
      console.log(chalk.gray("Belum ada catatan aktivitas."));
    }
  } catch (e) {
    console.log(chalk.red("Kesalahan saat mengambil data:", e.message));
  }
  await holdForEnter();
}

/** Helper untuk menunggu input tekan Enter sebelum kembali ke menu */
async function holdForEnter() {
  await inquirer.prompt([
    { type: "input", name: "lanjut", message: "Tekan Enter untuk kembali ke Menu Utama...", prefix: "" }
  ]);
}

/** Fungsi Otentikasi Gatekeeper */
async function enforceLogin() {
  console.clear();
  console.log(chalk.cyan.bold("\nIoT Listrik Dashboard CLI"));
  console.log(chalk.gray("Otentikasi Diperlukan\n"));

  // Auto Login via session file
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      await signInWithEmailAndPassword(auth, session.email, session.password);
      await processUserClaims();
      startPresenceWatch();
      console.log(chalk.green(`Meresume sesi login untuk: ${session.email}...\n`));
      return true;
    } catch (e) {
      console.log(chalk.red("Sesi login otomatis tidak valid atau kedaluwarsa. Silakan login manual.\n"));
      fs.unlinkSync(SESSION_FILE);
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
      // Save session credentials permanently until manual Logout
      fs.writeFileSync(SESSION_FILE, JSON.stringify({ email, password }));
      loggedIn = true;
    } catch (e) {
      console.log(chalk.red("\nLogin gagal:"), e.message, "\n");
    }
  }
}

/** Memproses Custom Claims untuk Session Isolation */
async function processUserClaims() {
  const result = await auth.currentUser.getIdTokenResult(true);
  const isTemp = result.claims.isTempAccount === true;
  const expiresAt = result.claims.expiresAt;
  
  if (isTemp) {
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
    if (sessionTimeoutTimer) {
      clearTimeout(sessionTimeoutTimer);
      sessionTimeoutTimer = null;
    }
  }
}

/** Logout Handler */
async function handleLogout() {
  const { logoutConfirm } = await inquirer.prompt([
    { type: "confirm", name: "logoutConfirm", message: "Anda yakin ingin Keluar (Log out)?", default: false }
  ]);
  if (logoutConfirm) {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE); // Hapus session agar tidak auto-login
    }
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
    
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Pilih opsi:",
        choices: [
          { name: "[1] Mengakses Live Monitoring", value: "live" },
          { name: "[2] Catatan Log Terakhir", value: "log" },
          { name: "[3] Kontrol Relay Power", value: "relay" },
          { name: "[4] Keluar Sesi (Logout)", value: "logout" },
          { name: "[0] Matikan Aplikasi (Exit)", value: "exit" },
        ],
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
      case "relay":
        await toggleRelay();
        break;
      case "logout":
        await handleLogout();
        break;
      case "exit":
        console.log(chalk.gray("\nMenutup CLI dan menghentikan proses... Sampai jumpa!\n"));
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

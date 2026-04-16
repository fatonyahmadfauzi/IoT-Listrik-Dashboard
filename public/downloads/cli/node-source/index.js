#!/usr/bin/env node

// Global error handler untuk mencegah window terminal langsung tertutup otomatis di Windows (force close)
process.on('uncaughtException', (err) => {
  console.error("\n[CRITICAL ERROR] Aplikasi berhenti tiba-tiba:");
  console.error(err);
  console.log("\nProses dihentikan. Tekan Enter untuk keluar...");
  try {
    const fs = require('fs');
    const buffer = Buffer.alloc(1);
    fs.readSync(0, buffer, 0, 1, null);
  } catch (e) {}
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("\n[UNHANDLED PROMISE REJECTION] Promise yang ditolak:");
  console.error(reason);
  console.log("\nProses dihentikan. Tekan Enter untuk keluar...");
  try {
    const fs = require('fs');
    const buffer = Buffer.alloc(1);
    fs.readSync(0, buffer, 0, 1, null);
  } catch (e) {}
  process.exit(1);
});

// Bypass TLS/CA bundle mismatches in pkg environments that causes undici native fetch to fail
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Polyfill global fetch menggunakan node-fetch (penting untuk Firebase v10 di pkg/Node<18)
if (!globalThis.fetch) {
  const fetchPolyfill = require("node-fetch");
  globalThis.fetch = fetchPolyfill;
  globalThis.Headers = fetchPolyfill.Headers;
  globalThis.Request = fetchPolyfill.Request;
  globalThis.Response = fetchPolyfill.Response;
}

const inquirer = require("inquirer");
const chalk = require("chalk");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getDatabase, ref, onValue, set, get, query, limitToLast, orderByKey, off } = require("firebase/database");
const os = require("os");
const dns = require("dns");

// Memaksa Node.js menggunakan IPv4 terlebih dahulu
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
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

let pathPrefix = "";
let sessionTimeoutTimer = null;

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
    printHeader();
    console.log(chalk.yellow("Memulai Live Stream Data Firebase..."));
    console.log(chalk.gray("Tekan 'q' atau 'Ctrl+C' kapan saja untuk kembali ke Menu Utama.\n"));

    const listrikRef = ref(db, `${pathPrefix}/listrik`);
    let initialDraw = true;

    const onKeypress = (str, key) => {
      if (key && (key.name === 'q' || (key.ctrl && key.name === 'c'))) {
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        off(listrikRef); 
        resolve(); 
      }
    };
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);

    onValue(listrikRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      readline.cursorTo(process.stdout, 0, 8); 
      readline.clearScreenDown(process.stdout);

      console.log(chalk.cyan.bold("=== Data Realtime ==="));
      console.log(`${chalk.blue("Waktu      :")} ${data.timestamp || "-"}`);
      console.log(`${chalk.blue("Arus (A)   :")} ${chalk.white(data.arus || "0")}`);
      console.log(`${chalk.blue("Tegangan(V):")} ${chalk.white(data.tegangan || "0")}`);
      console.log(`${chalk.blue("Daya (VA)  :")} ${chalk.white(data.apparent_power || "0")}`);
      
      let statusColor = chalk.green;
      if (data.status === "WARNING") statusColor = chalk.yellow;
      if (data.status === "DANGER") statusColor = chalk.red.bold;
      console.log(`${chalk.blue("Status     :")} ${statusColor(data.status || "-")}`);

      console.log(
        `${chalk.blue("Relay      :")} ${data.relay ? chalk.green("ON") : chalk.red("OFF")}`
      );
      
      if (initialDraw) initialDraw = false;
    });
  });
}

/** Hit API untuk mengubah Relay */
async function toggleRelay() {
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
    const { email } = await inquirer.prompt([
      { type: "input", name: "email", message: "Email:" },
    ]);
    const cleanEmail = email.trim();

    // Deteksi akun temp untuk pesan informatif
    const isTempEmail = cleanEmail.endsWith("@iotlistrik.demo");
    if (isTempEmail) {
      console.log(chalk.yellow("\n[INFO] Akun demo terdeteksi. Password akan ditampilkan agar bisa diverifikasi.\n"));
    }

    const { password } = await inquirer.prompt([
      // Tampilkan password untuk akun demo agar bisa diverifikasi (akun demo tidak sensitif)
      // Gunakan type 'password' untuk akun non-demo
      {
        type: isTempEmail ? "input" : "password",
        name: "password",
        message: isTempEmail ? "Password (pastikan tidak ada spasi tersembunyi):" : "Password:",
      },
    ]);
    
    try {
      // Bersihkan semua whitespace tersembunyi di password (termasuk di tengah)
      const cleanPassword = password.replace(/[\s\u200B\u200C\u200D\uFEFF]/g, "").trim();
      
      if (isTempEmail && cleanPassword !== password.trim()) {
        console.log(chalk.yellow("[PERINGATAN] Spasi/karakter tersembunyi ditemukan di password dan sudah dibersihkan otomatis.\n"));
      }

      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      await processUserClaims();
      console.log(chalk.green("\nLogin berhasil!\n"));
      // Save session credentials permanently until manual Logout
      fs.writeFileSync(SESSION_FILE, JSON.stringify({ email: cleanEmail, password: cleanPassword }));
      loggedIn = true;
    } catch (e) {
      if (e.code === "auth/invalid-credential" && isTempEmail) {
        console.log(chalk.red("\n[!] Login gagal: Kredensial tidak valid untuk akun demo.\n"));
        console.log(chalk.yellow("Kemungkinan penyebab:"));
        console.log(chalk.gray("  1. Akun sudah expired (berlaku hanya 15 menit sejak dibuat)"));
        console.log(chalk.gray("  2. Password salah — cek ulang email, tidak ada typo?"));
        console.log(chalk.gray("  3. Akun sudah dihapus otomatis oleh sistem cleanup\n"));
        console.log(chalk.cyan("Solusi: Buat akun demo baru di:"));
        console.log(chalk.white("  https://iot-listrik-dashboard.vercel.app\n"));
      } else {
        console.log(chalk.red("\nLogin gagal:"), e.message, "\n");
      }
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
        isRunning = false;
        process.exit(0);
        break;
    }
  }
}

mainMenu().catch(async err => {
  console.error("Kesalahan fatal:", err);
  console.log("\nProses dihentikan. Tekan Enter untuk keluar...");
  await new Promise(r => process.stdin.once('data', r));
  process.exit(1);
});

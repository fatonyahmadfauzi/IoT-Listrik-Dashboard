import { db } from "./firebase-config.js";
import {
  initPage,
  populateSidebar,
  initSidebarToggle,
  logout,
  getDbPrefix,
  isTempAccount,
} from "./auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const STALE_MS = 20000;
let firebaseConnected = false;
let payload = {};
let renderTimer = null;
let stopInfo = null;
let stopData = null;
let firmwareRelease = null;
let firmwareOutputLines = [];
const GITHUB_RELEASE_API = "https://api.github.com/repos/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/latest";


const byId = (id) => document.getElementById(id);
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
const setPill = (id, label, state) => {
  const el = byId(id);
  if (!el) return;
  el.textContent = label;
  el.className = `diag-pill ${state}`;
};

function timestampOf(data) {
  for (const value of [data?.updated_at, data?.updatedAt, data?.timestamp]) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 1e12) return number;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function appendFirmwareOutput(message) {
  firmwareOutputLines.push(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}] ${message}`);
  firmwareOutputLines = firmwareOutputLines.slice(-40);
  setText("firmwareOutput", firmwareOutputLines.join("\n"));
}

function compareVersions(left, right) {
  const parse = (value) => String(value || "0").replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function setFirmwarePill(label, state) {
  const el = byId("firmwareOverall");
  if (!el) return;
  el.textContent = label;
  el.className = `diag-pill ${state}`;
}

function installedFirmwareVersion() {
  return String(payload.firmware_version || payload.firmwareVersion || "Belum dilaporkan").replace(/^v/i, "v");
}

function renderFirmware() {
  const installed = installedFirmwareVersion();
  const latest = firmwareRelease?.tag_name ? String(firmwareRelease.tag_name) : "Belum diperiksa";
  setText("firmwareInstalled", installed);
  setText("firmwareLatest", latest);
  setText("firmwareBoard", String(payload.firmware_board || "ESP32 Dev Module"));
  const firmwareAsset = firmwareRelease?.assets?.find((asset) => /\.bin$/i.test(asset.name || ""));
  setText("firmwareAsset", firmwareAsset ? firmwareAsset.name : "Belum tersedia di GitHub Release");
  const updateButton = byId("firmwareUpdate");
  // OTA tetap dikunci sampai firmware ESP32 menggunakan partisi OTA dan asset .bin tervalidasi.
  if (updateButton) { updateButton.disabled = true; updateButton.title = "Pembaruan firmware harus dilakukan melalui desktop/PC menggunakan USB; web/PWA hanya memeriksa versi."; }
  if (!firmwareRelease) {
    setFirmwarePill("BELUM DIPERIKSA", "warn");
    return;
  }
  if (!firmwareAsset) {
    setFirmwarePill("ASSET BELUM ADA", "warn");
    return;
  }
  if (compareVersions(installed, latest) < 0) setFirmwarePill("PEMBARUAN TERSEDIA", "warn");
  else setFirmwarePill("SUDAH TERBARU", "ok");
}

async function checkFirmwareRelease() {
  firmwareOutputLines = [];
  appendFirmwareOutput("Memeriksa release firmware GitHub...");
  setFirmwarePill("MEMERIKSA", "warn");
  try {
    const response = await fetch(GITHUB_RELEASE_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    firmwareRelease = await response.json();
    const releaseAssets = firmwareRelease.assets || [];
    const assets = releaseAssets.map((asset) => asset.name).join(", ") || "tidak ada asset";
    const manifestAsset = releaseAssets.find((asset) => String(asset.name).toLowerCase() === "firmware-manifest.json");
    const binaryAsset = releaseAssets.find((asset) => /\.bin$/i.test(asset.name || ""));
    appendFirmwareOutput(`Release terbaru: ${firmwareRelease.tag_name || "tanpa tag"}`);
    appendFirmwareOutput(`Asset release: ${assets}`);
    if (manifestAsset) {
      try {
        const manifestResponse = await fetch(manifestAsset.browser_download_url, { cache: "no-store" });
        if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
        const manifest = await manifestResponse.json();
        appendFirmwareOutput(`Manifest: versi ${manifest.version || "—"}, board ${manifest.board || "—"}`);
        appendFirmwareOutput(`SHA-256: ${manifest.sha256 || "belum dicantumkan"}`);
      } catch (manifestError) {
        appendFirmwareOutput(`Manifest tidak dapat dibaca: ${manifestError.message}`);
      }
    } else {
      appendFirmwareOutput("firmware-manifest.json belum tersedia pada release.");
    }
    if (!binaryAsset) appendFirmwareOutput("Belum ada file .bin firmware ESP32 pada release ini.");
    const otaReady = payload.firmware_ota_capable === true;
    appendFirmwareOutput(otaReady
      ? "Perangkat melaporkan partisi OTA aktif; pemasangan tetap dikunci sampai command OTA dan checksum selesai divalidasi."
      : "Perangkat belum memakai partition scheme OTA. Upload bootstrap OTA pertama harus dilakukan melalui USB.");
    appendFirmwareOutput("Pembaruan dilakukan melalui desktop/PC menggunakan USB. Web/PWA hanya memeriksa versi dan release.");
    renderFirmware();
  } catch (error) {
    firmwareRelease = null;
    setFirmwarePill("GAGAL DIPERIKSA", "error");
    appendFirmwareOutput(`Pemeriksaan gagal: ${error.message}`);
  }
}

function configuredPin(field, fallback) {
  const value = Number(payload[field]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function renderPinMap({ deviceOnline, meterOk, isSimulation }) {
  const pzemRx = configuredPin("pzem_rx_pin", 16);
  const pzemTx = configuredPin("pzem_tx_pin", 17);
  const lcdSda = configuredPin("lcd_sda_pin", 21);
  const lcdScl = configuredPin("lcd_scl_pin", 22);
  const relayPin = configuredPin("relay_pin", 26);
  const buzzerPin = configuredPin("buzzer_pin", 25);
  const metadataReported = ["pzem_rx_pin", "pzem_tx_pin", "relay_pin", "buzzer_pin"].every((field) => Number.isInteger(Number(payload[field])));

  setText("pinPzemPath", `ESP32 RX GPIO${pzemRx} ← PZEM TX · ESP32 TX GPIO${pzemTx} → PZEM RX`);
  setText("pinLcdPath", `SDA GPIO${lcdSda} · SCL GPIO${lcdScl}`);
  setText("pinRelayPath", `Output GPIO${relayPin}`);
  setText("pinBuzzerPath", `Output GPIO${buzzerPin}`);

  if (isSimulation) {
    setPill("pinPzemState", "SIMULATOR", "warn");
    setText("pinPzemNote", "Simulator tidak menggunakan jalur UART fisik.");
    setPill("pinLcdState", "SIMULATOR", "warn");
    setText("pinLcdNote", "Simulator tidak menggunakan jalur I2C fisik.");
    setPill("pinRelayState", Number(payload.relay) === 1 ? "SIM ON" : "SIM OFF", "warn");
    setPill("pinmapOverall", "MODE SIMULATOR", "warn");
    return;
  }

  if (!deviceOnline) {
    setPill("pinPzemState", "TIDAK DIKETAHUI", "error");
    setText("pinPzemNote", "Perangkat offline; respons UART tidak dapat diperiksa.");
  } else if (meterOk) {
    setPill("pinPzemState", "RESPONS VALID", "ok");
    setText("pinPzemNote", `PZEM menghasilkan pembacaan valid pada UART2 GPIO${pzemRx}/GPIO${pzemTx}.`);
  } else {
    setPill("pinPzemState", "TIDAK MERESPONS", "error");
    setText("pinPzemNote", `Komunikasi PZEM gagal pada jalur UART2 GPIO${pzemRx}/GPIO${pzemTx}; periksa TX/RX, level shifter, 5 V, dan GND.`);
  }

  if (typeof payload.lcd_ok !== "boolean") {
    setPill("pinLcdState", "MENUNGGU FIRMWARE", "warn");
    setText("pinLcdNote", `Firmware lama belum melaporkan hasil scan I2C pada GPIO${lcdSda}/GPIO${lcdScl}.`);
  } else if (payload.lcd_ok) {
    setPill("pinLcdState", "I2C MERESPONS", "ok");
    const address = Number(payload.lcd_address);
    setText("pinLcdNote", `LCD merespons pada SDA GPIO${lcdSda}, SCL GPIO${lcdScl}${address > 0 ? `, alamat 0x${address.toString(16).toUpperCase().padStart(2, "0")}` : ""}.`);
  } else {
    setPill("pinLcdState", "TIDAK TERDETEKSI", "error");
    setText("pinLcdNote", `Tidak ada respons LCD pada SDA GPIO${lcdSda}/SCL GPIO${lcdScl}; periksa VCC, GND, kabel, dan backpack.`);
  }

  setPill("pinRelayState", deviceOnline ? (Number(payload.relay) === 1 ? "LOGIS ON" : "LOGIS OFF") : "TIDAK DIKETAHUI", deviceOnline ? "warn" : "error");

  if (!deviceOnline || !meterOk || payload.lcd_ok === false) {
    setPill("pinmapOverall", "PERLU DIPERIKSA", "error");
  } else if (!metadataReported || typeof payload.lcd_ok !== "boolean") {
    setPill("pinmapOverall", "DATA BELUM LENGKAP", "warn");
  } else {
    setPill("pinmapOverall", "JALUR MERESPONS", "ok");
  }
}

function render() {
  const isSimulation = isTempAccount();
  renderFirmware();
  const updatedAt = timestampOf(payload);
  const age = updatedAt ? Date.now() - updatedAt : Infinity;
  const deviceOnline = firebaseConnected && age <= STALE_MS;
  const rawStatus = String(payload.status || "UNKNOWN").toUpperCase();
  const meterOk = typeof payload.meter_ok === "boolean"
    ? payload.meter_ok
    : rawStatus !== "SENSOR_ERROR" && Number(payload.tegangan) > 1;

  renderPinMap({ deviceOnline, meterOk, isSimulation });

  setPill("diagFirebase", firebaseConnected ? "TERHUBUNG" : "TERPUTUS", firebaseConnected ? "ok" : "error");
  setText("diagFirebaseDetail", firebaseConnected ? "Realtime Database terhubung" : "Koneksi Firebase terputus");
  setText("diagSource", isSimulation ? "Simulator" : String(payload.sensor_source || "PZEM-004T"));

  setPill("diagDevice", deviceOnline ? "ONLINE" : "OFFLINE", deviceOnline ? "ok" : "error");
  const rssi = Number(payload.wifi_rssi);
  if (Number.isFinite(rssi) && rssi <= 0) {
    const quality = rssi >= -60 ? "Sangat baik" : rssi >= -70 ? "Baik" : rssi >= -80 ? "Lemah" : "Sangat lemah";
    setText("diagWifi", `${rssi} dBm · ${quality}`);
  } else {
    setText("diagWifi", isSimulation ? "Tidak berlaku pada simulator" : "Menunggu firmware terbaru");
  }
  const heap = Number(payload.free_heap);
  setText("diagHeap", Number.isFinite(heap) && heap > 0 ? `${Math.round(heap / 1024)} KB` : "Menunggu firmware terbaru");

  setPill("diagMeter", meterOk && deviceOnline ? "BERFUNGSI" : "ERROR", meterOk && deviceOnline ? "ok" : "error");
  setText("diagMeterDetail", rawStatus === "UNKNOWN" ? "Belum ada data" : rawStatus);
  setText("diagElectrical", `${formatNumber(payload.arus, 2)} A / ${formatNumber(payload.tegangan, 1)} V`);

  let lcdState = "warn";
  if (isSimulation) {
    setPill("diagLcd", "TIDAK BERLAKU", "warn");
    setText("diagLcdAddress", "Simulator");
    setText("diagLcdNote", "Tidak menggunakan LCD fisik");
  } else if (typeof payload.lcd_ok !== "boolean") {
    setPill("diagLcd", "MENUNGGU DATA", "warn");
    setText("diagLcdAddress", "—");
    setText("diagLcdNote", "Upload firmware diagnostik terbaru");
  } else {
    lcdState = payload.lcd_ok ? "ok" : "error";
    setPill("diagLcd", payload.lcd_ok ? "TERDETEKSI" : "ERROR", lcdState);
    const address = Number(payload.lcd_address);
    setText("diagLcdAddress", address > 0 ? `0x${address.toString(16).toUpperCase().padStart(2, "0")}` : "Tidak ditemukan");
    setText("diagLcdNote", payload.lcd_ok ? "Modul merespons pada bus I2C" : "Periksa VCC, GND, SDA, SCL, dan backpack LCD");
  }

  const relay = Number(payload.relay) === 1 ? "ON" : "OFF";
  setPill("diagActuator", deviceOnline ? "STATUS LOGIS" : "TIDAK DIKETAHUI", deviceOnline ? "warn" : "error");
  setText("diagRelay", deviceOnline ? relay : "Tidak ada heartbeat");

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })
    : "Belum ada timestamp";
  setText("diagUpdated", `Pembaruan perangkat: ${updatedLabel}${Number.isFinite(age) ? ` · ${Math.max(0, Math.round(age / 1000))} detik lalu` : ""}`);

  let overall = { label: "SEMUA NORMAL", state: "ok" };
  if (!firebaseConnected || !deviceOnline || !meterOk || (!isSimulation && payload.lcd_ok === false)) {
    overall = { label: "PERLU DIPERIKSA", state: "error" };
  } else if (!isSimulation && typeof payload.lcd_ok !== "boolean") {
    overall = { label: "DATA BELUM LENGKAP", state: "warn" };
  }
  setPill("diagOverall", overall.label, overall.state);
}

function startFeeds() {
  stopInfo?.();
  stopData?.();
  stopInfo = onValue(ref(db, ".info/connected"), (snapshot) => {
    firebaseConnected = snapshot.val() === true;
    render();
  });
  stopData = onValue(ref(db, `${getDbPrefix()}/listrik`), (snapshot) => {
    payload = snapshot.val() || {};
    render();
  }, () => {
    payload = {};
    render();
  });
  if (renderTimer) clearInterval(renderTimer);
  renderTimer = setInterval(render, 5000);
}

initPage({
  onAuthed(user, role) {
    populateSidebar(user, role);
    initSidebarToggle();
    byId("logoutBtn")?.addEventListener("click", logout);
    byId("firmwareCheck")?.addEventListener("click", checkFirmwareRelease);
    startFeeds();
    checkFirmwareRelease();
  },
});

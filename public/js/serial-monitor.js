import { initPage, populateSidebar, initSidebarToggle, logout } from "./auth.js";

const baudSelect = document.getElementById("serialBaud");
const connectButton = document.getElementById("serialConnect");
const disconnectButton = document.getElementById("serialDisconnect");
const resetButton = document.getElementById("serialReset");
const clearButton = document.getElementById("serialClear");
const downloadButton = document.getElementById("serialDownload");
const terminal = document.getElementById("serialTerminal");
const searchInput = document.getElementById("serialSearch");
const filterSelect = document.getElementById("serialFilter");
const autoScroll = document.getElementById("serialAutoScroll");
const statusPill = document.getElementById("serialStatus");
const lineCount = document.getElementById("serialLineCount");
const errorCount = document.getElementById("serialErrorCount");
const notice = document.getElementById("serialSupportNotice");

let port = null;
let reader = null;
let readTask = null;
let keepReading = false;
let receivedDeviceData = false;
let noDataTimer = null;
let rawLines = [];
let errors = 0;
let portNavigationGuard = null;

function setStatus(label, state = "") {
  statusPill.textContent = label;
  statusPill.className = `tool-pill ${state}`;
}

function classify(line) {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("GAGAL") || upper.includes("FAILED") || upper.includes("TIDAK DAPAT") || upper.includes("401") || upper.includes("403")) return "ERROR";
  if (upper.includes("WARN") || upper.includes("PERINGATAN") || upper.includes("TERPUTUS")) return "WARNING";
  if (upper.includes("FIREBASE")) return "FIREBASE";
  if (upper.includes("PZEM") || upper.includes("MONITOR")) return "PZEM";
  if (upper.includes("LCD") || upper.includes("I2C")) return "LCD";
  if (upper.includes("RELAY")) return "RELAY";
  return "ALL";
}

function filteredLines() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;
  return rawLines.filter((entry) => {
    if (filter !== "ALL" && entry.type !== filter) return false;
    return !search || entry.text.toLowerCase().includes(search);
  });
}

function render() {
  const rows = filteredLines();
  terminal.innerHTML = rows.length
    ? rows.map((entry) => `<span class="terminal-${entry.type.toLowerCase()}">${entry.html}</span>`).join("\n")
    : '<span class="terminal-muted">Belum ada keluaran yang sesuai filter.</span>';
  lineCount.textContent = String(rawLines.length);
  errorCount.textContent = String(errors);
  if (autoScroll.checked) terminal.scrollTop = terminal.scrollHeight;
}

function addLine(text) {
  const clean = String(text).replace(/\r/g, "");
  if (!clean.trim()) return;
  const stamp = new Date().toLocaleTimeString("id-ID", { hour12: false });
  const fullText = `[${stamp}] ${clean}`;
  const type = classify(clean);
  if (type === "ERROR") errors += 1;
  rawLines.push({ text: fullText, type, html: fullText.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])) });
  if (rawLines.length > 2000) rawLines.splice(0, rawLines.length - 2000);
  render();
}

async function readLoop() {
  const decoder = new TextDecoder();
  let pending = "";
  keepReading = true;
  while (port?.readable && keepReading) {
    reader = port.readable.getReader();
    try {
      while (keepReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!receivedDeviceData && value?.byteLength) {
          receivedDeviceData = true;
          if (noDataTimer) clearTimeout(noDataTimer);
          noDataTimer = null;
          notice.classList.add("hidden");
          addLine(`[Serial] Data dari ESP32 mulai diterima (${value.byteLength} byte pertama).`);
        }
        pending += decoder.decode(value, { stream: true });
        const chunks = pending.split(/\n/);
        pending = chunks.pop() || "";
        chunks.forEach(addLine);
      }
    } catch (error) {
      if (keepReading) addLine(`[Serial] Gagal membaca port: ${error.message}`);
    } finally {
      reader.releaseLock();
      reader = null;
    }
  }
}

function showPortOpenHelp(error) {
  const rawMessage = String(error?.message || "Port tidak dapat dibuka.");
  const isBusy = /failed to open|access denied|busy|in use|networkerror/i.test(rawMessage);
  notice.classList.remove("hidden");
  notice.innerHTML = isBusy
    ? '<strong>Port COM sedang tidak tersedia.</strong><br>Tutup Arduino Serial Monitor, Serial Plotter, PlatformIO, PuTTY, atau aplikasi lain yang memakai COM. Setelah itu cabut-pasang kabel ESP32, tunggu port muncul kembali, muat ulang halaman, lalu pilih port yang benar.'
    : `<strong>Port gagal dibuka.</strong><br>${rawMessage}`;
  setStatus("PORT GAGAL DIBUKA", "error");
}

function installPortNavigationGuard() {
  if (portNavigationGuard) return;
  portNavigationGuard = async (event) => {
    const link = event.target.closest?.(".sidebar-nav a");
    if (!link || !port) return;
    const href = link.href;
    if (!href || href === window.location.href || link.target === "_blank") return;

    // Web Serial terikat pada dokumen ini. Tutup port secara tertib sebelum
    // berpindah halaman agar halaman tujuan tidak mendapatkan error
    // "The port is already open". Navigasi tetap memakai tab yang sama.
    event.preventDefault();
    event.stopImmediatePropagation();
    addLine(`[Serial] Menutup port sebelum membuka menu: ${link.textContent.trim()}`);
    const closed = await disconnect({ announce: false });
    if (closed) window.location.assign(href);
    else addLine("[Serial] Navigasi dibatalkan karena port belum berhasil ditutup.");
  };
  document.addEventListener("click", portNavigationGuard);
}

if ("serial" in navigator) {
  navigator.serial.addEventListener("disconnect", (event) => {
    if (event.target !== port) return;
    if (noDataTimer) clearTimeout(noDataTimer);
    noDataTimer = null;
    port = null;
    removePortNavigationGuard();
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    resetButton.disabled = true;
    setStatus("USB TERPUTUS", "error");
    addLine("[Serial] Perangkat USB terputus. Periksa kabel dan hubungkan kembali.");
  });
}

async function connect() {
  if (!("serial" in navigator)) {
    notice.classList.remove("hidden");
    notice.textContent = "Web Serial tidak didukung pada browser ini. Gunakan Google Chrome atau Microsoft Edge versi desktop melalui HTTPS. Android dan iOS dapat memakai Riwayat Log melalui Firebase, tetapi tidak dapat membaca port COM secara langsung.";
    setStatus("TIDAK DIDUKUNG", "error");
    return;
  }
  try {
    notice.classList.add("hidden");
    notice.textContent = "";
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: Number(baudSelect.value) });
    installPortNavigationGuard();
    connectButton.disabled = true;
    disconnectButton.disabled = false;
    resetButton.disabled = false;
    setStatus("TERHUBUNG", "ok");
    addLine(`[Serial] Port terhubung pada baud rate ${baudSelect.value}.`);
    receivedDeviceData = false;
    if (noDataTimer) clearTimeout(noDataTimer);
    noDataTimer = setTimeout(() => {
      if (port && !receivedDeviceData) {
        addLine("[Serial] Belum ada data dari ESP32. Pastikan COM benar dan baud rate 115200, lalu tekan tombol EN/RESET satu kali.");
        notice.classList.remove("hidden");
        notice.innerHTML = "<strong>Port terhubung, tetapi ESP32 belum mengirim data.</strong><br>Pastikan port COM yang dipilih adalah ESP32, baud rate 115200, lalu tekan tombol EN/RESET pada board satu kali. Jangan membuka Arduino Serial Monitor bersamaan.";
      }
    }, 7000);
    readTask = readLoop().finally(() => {
      readTask = null;
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      port = null;
      setStatus("BELUM TERHUBUNG");
      return;
    }
    addLine(`[Serial] Tidak dapat membuka port: ${error.message}`);
    showPortOpenHelp(error);
    try {
      if (port?.readable || port?.writable) await port.close();
    } catch (_) {}
    if (noDataTimer) clearTimeout(noDataTimer);
    noDataTimer = null;
    port = null;
    removePortNavigationGuard();
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    resetButton.disabled = true;
  }
}

async function disconnect(options = {}) {
  const announce = options.announce !== false;
  const activePort = port;
  keepReading = false;
  if (noDataTimer) clearTimeout(noDataTimer);
  noDataTimer = null;
  disconnectButton.disabled = true;
  resetButton.disabled = true;
  setStatus("MEMUTUSKAN", "pending");

  // Beberapa driver Web Serial tidak menyelesaikan cancel() dengan cepat.
  // Gunakan batas waktu agar UI tidak selamanya tertahan di MEMUTUSKAN.
  try {
    await Promise.race([
      reader?.cancel() || Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  } catch (_) {}
  try {
    await Promise.race([
      readTask || Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  } catch (_) {}
  try { reader?.releaseLock(); } catch (_) {}
  reader = null;
  readTask = null;

  let closed = true;
  try {
    if (activePort?.readable || activePort?.writable) {
      const result = await Promise.race([
        activePort.close().then(() => "closed"),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 1500)),
      ]);
      if (result === "timeout") throw new Error("driver tidak merespons saat port ditutup");
    }
  } catch (error) {
    closed = false;
    addLine(`[Serial] Port belum dapat ditutup: ${error.message}`);
  }

  if (closed) {
    port = null;
    removePortNavigationGuard();
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    resetButton.disabled = true;
    setStatus("TERPUTUS");
    if (announce) addLine("[Serial] Port diputuskan dengan aman.");
  } else {
    port = activePort;
    connectButton.disabled = true;
    disconnectButton.disabled = false;
    resetButton.disabled = false;
    setStatus("GAGAL DIPUTUSKAN", "error");
    notice.classList.remove("hidden");
    notice.innerHTML = "<strong>Driver COM tidak merespons proses pemutusan.</strong><br>Tutup tab Serial Monitor ini atau cabut-pasang kabel USB untuk melepaskan port secara paksa.";
  }
  return closed;
}
async function resetEsp32() {
  if (!port || !port.setSignals) {
    addLine("[Serial] Reset hardware tidak tersedia pada browser atau port belum terhubung.");
    return;
  }
  resetButton.disabled = true;
  addLine("[Serial] Mengirim pulsa reset ESP32 melalui RTS...");
  try {
    await port.setSignals({ requestToSend: true });
    await new Promise((resolve) => setTimeout(resolve, 120));
    await port.setSignals({ requestToSend: false });
    addLine("[Serial] Pulsa reset selesai. Menunggu keluaran boot ESP32...");
  } catch (error) {
    addLine(`[Serial] Reset ESP32 gagal: ${error.message}`);
  } finally {
    resetButton.disabled = !port;
  }
}
function clearTerminal() {
  rawLines = [];
  errors = 0;
  render();
}

function downloadTerminal() {
  const blob = new Blob([rawLines.map((entry) => entry.text).join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `serial-monitor-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (!("serial" in navigator)) {
  notice.classList.remove("hidden");
  notice.textContent = "Web Serial belum tersedia pada browser ini. Gunakan Chrome atau Edge desktop melalui HTTPS untuk membaca COM ESP32. Pada Android/PWA gunakan menu Riwayat Log untuk melihat data perangkat yang dikirim melalui Firebase.";
  setStatus("TIDAK DIDUKUNG", "error");
}
connectButton.addEventListener("click", connect);
disconnectButton.addEventListener("click", disconnect);
clearButton.addEventListener("click", clearTerminal);
downloadButton.addEventListener("click", downloadTerminal);
resetButton.addEventListener("click", resetEsp32);
searchInput.addEventListener("input", render);
filterSelect.addEventListener("change", render);
render();

initPage({
  onAuthed(user, role) {
    populateSidebar(user, role);
    initSidebarToggle();
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  },
});

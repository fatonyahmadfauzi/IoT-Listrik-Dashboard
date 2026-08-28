/**
 * app-header.js
 * Shared protected-app header: connection status, last update, and test notification.
 */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  requestNotificationPermission,
  sendNotification,
  showToast,
  initAudio,
} from "./notifications.js";

const DEVICE_STALE_MS = 15000;
const DASHBOARD_PATH = "/app/dashboard";

const endpointBadge = document.getElementById("endpointBadge");
const connStateText = document.getElementById("connStateText");
const heartbeatText = document.getElementById("heartbeatText");
const lastUpdated = document.getElementById("lastUpdated");
const alertPulse = document.getElementById("alertPulse");
const testNotifyBtn = document.getElementById("testNotifyBtn");

const mEndpointBadge = document.getElementById("mobileEndpointBadge");
const mConnStateText = document.getElementById("mobileConnStateText");
const mHeartbeatText = document.getElementById("mobileHeartbeatText");
const mLastUpdated = document.getElementById("mobileLastUpdated");
const mAlertPulse = document.getElementById("mobileAlertPulse");

let lastSeenAt = null;
let lastStatus = "NORMAL";
let firebaseConnected = true;
let stopListrik = null;
let stopConnected = null;
let renderTimer = null;
let sessionIsTemp = false;
let sessionPrefix = "";
let tempExpiresAt = null;
let demoCountdownTimer = null;

function formatTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function resolveUpdatedAt(payload) {
  const candidates = [
    payload?.updated_at,
    payload?.updatedAt,
    payload?.timestamp,
    payload?.lastSeen,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 1e12) return n;
  }
  return null;
}

function setBadge(label = "CLOUD") {
  const safeLabel = label === "SIM" || label === "LOCAL" || label === "FALLBACK" ? label : "CLOUD";
  const className = "ep-badge " + (safeLabel === "LOCAL" ? "ep-local" : safeLabel === "FALLBACK" ? "ep-fallback" : "ep-cloud");

  if (endpointBadge) {
    endpointBadge.textContent = safeLabel;
    endpointBadge.className = className;
  }
  if (mEndpointBadge) {
    mEndpointBadge.textContent = safeLabel;
    mEndpointBadge.className = className;
  }
}

function ensureDemoBadge(container, id) {
  if (!container) return null;
  let badge = document.getElementById(id);
  if (!badge) {
    // auth.js may already have created the shared badge. Reuse it so the
    // session indicator is rendered only once on every platform/page.
    badge = container.querySelector(".demo-session-badge, #demoSessionBadge, #mobileDemoSessionBadge");
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.id = id;
    badge.className = "ep-badge demo-session-badge";
    badge.style.cssText = "border-color:rgba(250,204,21,.45);background:rgba(250,204,21,.13);color:#fde68a;";
    container.prepend(badge);
  }
  return badge;
}

function renderDemoSessionBadge() {
  const desktopBadge = sessionIsTemp
    ? ensureDemoBadge(document.getElementById("connStrip"), "appHeaderDemoBadge")
    : document.getElementById("appHeaderDemoBadge");
  const mobileBadge = sessionIsTemp
    ? ensureDemoBadge(document.querySelector(".mobile-conn-strip"), "mobileAppHeaderDemoBadge")
    : document.getElementById("mobileAppHeaderDemoBadge");

  if (!sessionIsTemp) {
    desktopBadge?.remove();
    mobileBadge?.remove();
    if (demoCountdownTimer) clearInterval(demoCountdownTimer);
    demoCountdownTimer = null;
    return;
  }

  const render = () => {
    const remaining = Math.max(0, Number(tempExpiresAt || 0) - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const label = tempExpiresAt
      ? `DEMO ${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`
      : "DEMO";
    if (desktopBadge) desktopBadge.textContent = label;
    if (mobileBadge) mobileBadge.textContent = label;
  };
  render();
  if (demoCountdownTimer) clearInterval(demoCountdownTimer);
  demoCountdownTimer = setInterval(render, 1000);
}

function renderHeader() {
  if (!connStateText && !mConnStateText) return;

  const now = Date.now();
  const hasFreshHeartbeat =
    Number.isFinite(lastSeenAt) && lastSeenAt > 0 && now - lastSeenAt <= DEVICE_STALE_MS;

  setBadge(sessionIsTemp ? "SIM" : "CLOUD");
  renderDemoSessionBadge();

  let stateTxt = "";
  let hbTxt = "";

  if (!firebaseConnected) {
    stateTxt = "Memulihkan...";
    hbTxt = "Tanpa heartbeat";
  } else if (hasFreshHeartbeat) {
    stateTxt = "Device Online";
    hbTxt = "Heartbeat aktif";
  } else {
    stateTxt = "Device Offline";
    hbTxt = "Tanpa heartbeat";
  }

  if (connStateText) connStateText.textContent = stateTxt;
  if (mConnStateText) mConnStateText.textContent = stateTxt;

  if (heartbeatText) heartbeatText.textContent = hbTxt;
  if (mHeartbeatText) mHeartbeatText.textContent = hbTxt;

  const seenLabel = formatTime(lastSeenAt);
  const upTxt = seenLabel ? `Update terakhir: ${seenLabel}` : "Update terakhir: -";
  if (lastUpdated) lastUpdated.textContent = upTxt;
  if (mLastUpdated) mLastUpdated.textContent = upTxt;

  const risky = ["WARNING", "LEAKAGE", "DANGER", "SENSOR_ERROR"].includes(String(lastStatus).toUpperCase());
  if (alertPulse) alertPulse.classList.toggle("hidden", !risky);
  if (mAlertPulse) mAlertPulse.classList.toggle("hidden", !risky);
}

function startSharedHeaderFeed() {
  if (window.location.pathname.replace(/\/$/, "") === DASHBOARD_PATH) {
    renderHeader();
    return;
  }
  if (stopListrik || stopConnected) return;

  stopConnected = onValue(ref(db, ".info/connected"), (snap) => {
    firebaseConnected = snap.val() !== false;
    renderHeader();
  });

  stopListrik = onValue(ref(db, `${sessionPrefix}/listrik`), (snap) => {
    const payload = snap.val() || {};
    lastSeenAt = resolveUpdatedAt(payload);
    lastStatus = payload.status || "NORMAL";
    renderHeader();
  }, () => {
    firebaseConnected = false;
    renderHeader();
  });

  renderTimer = setInterval(renderHeader, 5000);
}

async function handleTestNotification() {
  try {
    initAudio({ fromGesture: true });
  } catch (_) {}

  const granted = await requestNotificationPermission();
  if (!granted) {
    showToast("Izin notifikasi belum aktif di browser atau PWA.", "warning", 3500);
    return;
  }

  sendNotification(
    "Test Notifikasi IoT",
    "Notifikasi browser/PWA aktif pada perangkat ini.",
    "/assets/icons/icon-192.png",
    "iot-test-notification",
  );
  showToast("Test notifikasi dikirim.", "success", 3000);
}

testNotifyBtn?.addEventListener("click", handleTestNotification);

if ((endpointBadge && connStateText) || (mEndpointBadge && mConnStateText)) {
  renderHeader();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (stopListrik) stopListrik();
      if (stopConnected) stopConnected();
      if (renderTimer) clearInterval(renderTimer);
      stopListrik = null;
      stopConnected = null;
      renderTimer = null;
      lastSeenAt = null;
      sessionIsTemp = false;
      tempExpiresAt = null;
      sessionPrefix = "";
      renderHeader();
      return;
    }
    try {
      const token = await user.getIdTokenResult(true);
      sessionIsTemp = token.claims?.isTempAccount === true || user.email?.trim().toLowerCase().startsWith("sim_");
      tempExpiresAt = Number(token.claims?.expiresAt || 0) || null;
    } catch (_) {
      sessionIsTemp = user.email?.trim().toLowerCase().startsWith("sim_") === true;
      tempExpiresAt = null;
    }
    sessionPrefix = sessionIsTemp ? `/sim/${user.uid}` : "";
    renderHeader();
    startSharedHeaderFeed();
  });
}

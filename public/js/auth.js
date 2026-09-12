/**
 * auth.js
 * ─────────────────────────────────────────────────────────────
 * Authentication state management and role-based page guards.
 * Import initPage() on every protected page.
 * ─────────────────────────────────────────────────────────────
 */

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { stopWebSiren } from "./notifications.js";

let _currentUser = null;
let _currentRole = null;
let _isTempAccount = false;
let _tempExpiryTimer = null;
let _tempCountdownTimer = null;
let _tempExpiresAt = null;
let _guestRedirectTimer = null;

const GUEST_REDIRECT_GRACE_MS = 1500;

/** Expose current user/role (read-only snapshot) */
function getCurrentUser() {
  return _currentUser;
}
function getCurrentRole() {
  return _currentRole;
}
function getCurrentUid() {
  return _currentUser?.uid || null;
}
function isTempAccount() {
  return _isTempAccount;
}

function getDbPrefix() {
  return _isTempAccount && _currentUser ? `/sim/${_currentUser.uid}` : "";
}

// ─── Role detection ──────────────────────────────────────────
/**
 * Fetch user role from /users/{uid}/role in RTDB.
 * Falls back to 'user' if no record exists.
 */
async function fetchRole(uid) {
  try {
    const snap = await get(ref(db, `/users/${uid}/role`));
    return snap.exists() ? snap.val() : "user";
  } catch {
    return "user";
  }
}

/**
 * Ensure user profile exists in /users/{uid}.
 * Called after first login / registration.
 */
async function ensureUserProfile(user, role = "user") {
  const profileRef = ref(db, `/users/${user.uid}`);
  const snap = await get(profileRef);
  if (!snap.exists()) {
    await update(profileRef, {
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      role,
      createdAt: new Date().toISOString(),
    });
  }
}

// ─── Page initializer ────────────────────────────────────────
/**
 * Initialize auth state listener.
 *
 * @param {object} callbacks
 *   onAuthed(user, role)   - called when authenticated
 *   onGuest()              - called when not authenticated (optional)
 *   redirectIfGuest        - redirect URL if not auth (default: auto detects /app/login or /simulator/login)
 *   requireAdmin           - if true, non-admin → redirect to dashboard
 */
function initPage(callbacks = {}) {
  const { onAuthed, onGuest, requireAdmin = false } = callbacks;

  const isSim = window.location.pathname.startsWith("/simulator/");
  const defaultRedirect = isSim ? "/simulator/login" : "/app/login";
  const redirectIfGuest = callbacks.redirectIfGuest || defaultRedirect;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (_guestRedirectTimer) {
        clearTimeout(_guestRedirectTimer);
        _guestRedirectTimer = null;
      }
      _currentUser = user;

      let token = null;
      try {
        // Jangan paksa refresh token pada setiap perpindahan halaman. Firebase
        // otomatis menyegarkan token bila diperlukan; force-refresh berulang
        // membuat sesi lebih rentan terhadap gangguan jaringan sesaat.
        token = await user.getIdTokenResult();
      } catch (error) {
        console.warn("[Auth] Gagal menyegarkan custom claims, memakai fallback email.", error);
      }
      _isTempAccount = !!token?.claims?.isTempAccount || user.email?.trim().toLowerCase().startsWith("sim_");
      _tempExpiresAt = Number(token?.claims?.expiresAt || 0) || null;

      // Fitur Auto Kick-Out Client Side (Client Timeout)
      if (_isTempAccount && _tempExpiresAt) {
        const timeLeft = _tempExpiresAt - Date.now();
        if (timeLeft <= 0) {
          // Sudah basi
          forceKickOutDemo();
          return;
        } else {
          // Set bom waktu JS
          if (_tempExpiryTimer) clearTimeout(_tempExpiryTimer);
          _tempExpiryTimer = setTimeout(() => {
            forceKickOutDemo();
          }, timeLeft);
        }
      }

      _currentRole = await fetchRole(user.uid);
      // Aktifkan kembali alarm saat user login
      try {
        localStorage.removeItem("iot_alarm_disable");
      } catch (_) {}

      // Akun demo/simulator hanya memakai data virtual. Jangan tampilkan atau buka
      // halaman yang membutuhkan perangkat fisik (diagnostik dan serial monitor).
      const currentPath = window.location.pathname.replace(/\/$/, "");
      if (_isTempAccount && ["/app/diagnostics", "/app/serial-monitor"].includes(currentPath)) {
        window.location.replace("/simulator/dashboard");
        return;
      }

      // Admin-only page guard (Simulator temp accounts bypass this for their own settings)
      const bypassAdminCheck = isSim && _isTempAccount;
      if (
        requireAdmin &&
        !bypassAdminCheck &&
        (_currentRole !== "admin" || _isTempAccount)
      ) {
        window.location.href = isSim
          ? "/simulator/dashboard"
          : "/app/dashboard";
        return;
      }

      if (typeof onAuthed === "function") {
        onAuthed(user, _currentRole);
      }
    } else {
      _currentUser = null;
      _currentRole = null;
      if (_tempExpiryTimer) clearTimeout(_tempExpiryTimer);
      if (_tempCountdownTimer) clearInterval(_tempCountdownTimer);
      _tempExpiresAt = null;

      if (typeof onGuest === "function") {
        onGuest();
      } else {
        // Beri waktu singkat untuk menghindari redirect akibat transisi state
        // ketika persistence browser baru dipulihkan atau jaringan tersendat.
        if (_guestRedirectTimer) clearTimeout(_guestRedirectTimer);
        _guestRedirectTimer = setTimeout(() => {
          _guestRedirectTimer = null;
          if (auth.currentUser) return;
          console.warn("[Auth] Sesi tidak ditemukan setelah inisialisasi.", {
            path: window.location.pathname,
            online: navigator.onLine,
          });
          window.location.replace(redirectIfGuest);
        }, GUEST_REDIRECT_GRACE_MS);
      }
    }
  });
}

// ─── Sidebar population ──────────────────────────────────────
/**
 * Populate the sidebar user badge and hide admin-only nav items
 * for non-admin users.
 * @param {object} user  - Firebase user
 * @param {string} role  - 'admin' | 'user'
 */
function populateSidebar(user, role) {
  const emailEl = document.getElementById("sidebarEmail");
  const avatarEl = document.getElementById("sidebarAvatar");
  const rolePill = document.getElementById("sidebarRole");
  const nav = document.querySelector(".sidebar-nav");

  if (nav && !nav.querySelector('a[href="/app/analytics"]')) {
    const historyLink = nav.querySelector('a[href="/app/history"]');
    const analyticsLink = document.createElement("a");
    analyticsLink.href = "/app/analytics";
    analyticsLink.className = "nav-item";
    analyticsLink.innerHTML = '<span class="material-symbols-rounded nav-icon">query_stats</span>Analytics';
    historyLink?.insertAdjacentElement("afterend", analyticsLink);
  }

  if (nav && !_isTempAccount && !nav.querySelector('a[href="/app/diagnostics"]')) {
    const analyticsLink = nav.querySelector('a[href="/app/analytics"]');
    const diagnosticsLink = document.createElement("a");
    diagnosticsLink.href = "/app/diagnostics";
    diagnosticsLink.className = "nav-item";
    diagnosticsLink.innerHTML = '<span class="material-symbols-rounded nav-icon">health_and_safety</span>Diagnostik';
    analyticsLink?.insertAdjacentElement("afterend", diagnosticsLink);
  }

  if (nav && !_isTempAccount && !nav.querySelector('a[href="/app/serial-monitor"]')) {
    const diagnosticsLink = nav.querySelector('a[href="/app/diagnostics"]');
    const serialLink = document.createElement("a");
    serialLink.href = "/app/serial-monitor";
    serialLink.className = "nav-item serial-monitor-nav";
    serialLink.title = "Buka Serial Monitor";
    serialLink.innerHTML = '<span class="material-symbols-rounded nav-icon">terminal</span>Serial Monitor';
    diagnosticsLink?.insertAdjacentElement("afterend", serialLink);
  // Serial Monitor membutuhkan Web Serial dan koneksi USB, sehingga hanya ditampilkan pada desktop/PC.
  if (!document.getElementById("serial-monitor-responsive-style")) {
    const style = document.createElement("style");
    style.id = "serial-monitor-responsive-style";
    style.textContent = "@media (max-width: 900px) { .serial-monitor-nav { display: none !important; } }";
    document.head.appendChild(style);
  }
  }

  if (_isTempAccount && nav) {
    nav.querySelectorAll('a[href="/app/diagnostics"], a[href="/app/serial-monitor"]').forEach((item) => item.remove());
  }

  const currentPath = window.location.pathname.replace(/\/$/, "");
  if (["/app/analytics", "/app/diagnostics", "/app/serial-monitor"].includes(currentPath)) {
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("href") === currentPath);
    });
  }

  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.email[0].toUpperCase();
  if (rolePill) {
    const isActuallyTemp = _isTempAccount || user.email.startsWith("sim_");
    if (isActuallyTemp) {
      rolePill.className = "role-pill user";
      const desktopStrip = document.getElementById("connStrip");
      const mobileStrip = document.querySelector(".mobile-conn-strip");
      const ensureDemoBadge = (container, id) => {
        if (!container) return null;
        let badge = document.getElementById(id);
        if (!badge) {
          badge = document.createElement("span");
          badge.id = id;
          badge.className = "ep-badge";
          badge.style.cssText = "border-color:rgba(250,204,21,.45);background:rgba(250,204,21,.13);color:#fde68a;";
          container.prepend(badge);
        }
        return badge;
      };
      const desktopDemoBadge = ensureDemoBadge(desktopStrip, "demoSessionBadge");
      const mobileDemoBadge = ensureDemoBadge(mobileStrip, "mobileDemoSessionBadge");
      const renderDemoCountdown = () => {
        const remaining = Math.max(0, Number(_tempExpiresAt || 0) - Date.now());
        const totalSeconds = Math.ceil(remaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const label = _tempExpiresAt
          ? `DEMO ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
          : "DEMO";
        rolePill.textContent = label;
        if (desktopDemoBadge) desktopDemoBadge.textContent = label;
        if (mobileDemoBadge) mobileDemoBadge.textContent = label;
      };
      renderDemoCountdown();
      if (_tempCountdownTimer) clearInterval(_tempCountdownTimer);
      _tempCountdownTimer = setInterval(renderDemoCountdown, 1000);
    } else {
      rolePill.textContent = role === "admin" ? "Admin" : "User";
      rolePill.className = `role-pill ${role}`;
    }
  }

  // Admin-only nav items are hidden by default in HTML to prevent screen flashing.
  // We only reveal them if the user is a true admin.
  if (role === "admin" && !_isTempAccount) {
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.classList.remove("hidden");
      el.style.display = "";
    });
  } else {
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.classList.add("hidden");
      el.style.display = "none";
    });
  }
}


// ─── Sidebar toggle (mobile) ─────────────────────────────────
function initSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburgerBtn");
  const navItems = document.querySelectorAll(".nav-item");

  function open() {
    sidebar?.classList.add("open");
    overlay?.classList.add("open");
    document.body.classList.add("sidebar-open");
  }
  function close() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  hamburger?.addEventListener("click", () => {
    if (isMobile()) {
      open();
    }
  });
  overlay?.addEventListener("click", close);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (isMobile()) close();
    });
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      close();
    }
  });
}

// ─── Logout ──────────────────────────────────────────────────
async function forceKickOutDemo() {
  try {
    stopWebSiren();
  } catch (_) {}
  try {
    localStorage.setItem("iot_alarm_disable", "1");
  } catch (_) {}
  await signOut(auth);

  Swal.fire({
    title: "Sesi Demo Berakhir!",
    text: "Waktu 15 menit simulator Anda telah habis. Seluruh data Anda di server simulasi akan dibersihkan dalam waktu dekat.",
    icon: "info",
    confirmButtonText: "Kembali",
    confirmButtonColor: "#3b82f6",
    background: "#1e293b",
    color: "#fff",
    allowOutsideClick: false,
  }).then(() => {
    window.location.href = "/simulator/login";
  });
}

async function logout() {
  try {
    stopWebSiren();
    localStorage.setItem("iot_alarm_disable", "1");
  } catch (_) {}
  await signOut(auth);

  const isSim = window.location.pathname.startsWith("/simulator/");
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  if (isSim) {
    window.location.href = "/simulator/login";
  } else if (isStandalone) {
    window.location.href = "/app/login";
  } else {
    window.location.href = "/";
  }
}

export {
  initPage,
  populateSidebar,
  initSidebarToggle,
  logout,
  ensureUserProfile,
  getCurrentUser,
  getCurrentRole,
  getCurrentUid,
  isTempAccount,
  getDbPrefix,
};

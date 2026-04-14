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
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { stopWebSiren } from "./notifications.js";

let _currentUser = null;
let _currentRole = null;
let _isTempAccount = false;
let _tempExpiryTimer = null;

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
    await set(profileRef, {
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
      _currentUser = user;

      const token = await user.getIdTokenResult();
      _isTempAccount = !!token.claims?.isTempAccount;

      // Fitur Auto Kick-Out Client Side (Client Timeout)
      if (_isTempAccount && token.claims?.expiresAt) {
        const timeLeft = token.claims.expiresAt - Date.now();
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

      if (typeof onGuest === "function") {
        onGuest();
      } else {
        window.location.href = redirectIfGuest;
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

  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.email[0].toUpperCase();
  if (rolePill) {
    const isActuallyTemp = _isTempAccount || user.email.startsWith("sim_");
    if (isActuallyTemp) {
      rolePill.textContent = "Temp Session";
      rolePill.className = "role-pill user";
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
  }
  function close() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("open");
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

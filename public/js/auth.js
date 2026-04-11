/**
 * auth.js
 * ─────────────────────────────────────────────────────────────
 * Authentication state management and role-based page guards.
 * Import initPage() on every protected page.
 * ─────────────────────────────────────────────────────────────
 */

import { auth, db }           from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get, set, serverTimestamp }
                               from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { stopWebSiren } from './notifications.js';

// ─── Internal state ──────────────────────────────────────────
let _currentUser = null;
let _currentRole = null;

/** Expose current user/role (read-only snapshot) */
function getCurrentUser() { return _currentUser; }
function getCurrentRole()  { return _currentRole; }

// ─── Role detection ──────────────────────────────────────────
/**
 * Fetch user role from /users/{uid}/role in RTDB.
 * Falls back to 'user' if no record exists.
 */
async function fetchRole(uid) {
  try {
    const snap = await get(ref(db, `/users/${uid}/role`));
    return snap.exists() ? snap.val() : 'user';
  } catch {
    return 'user';
  }
}

/**
 * Ensure user profile exists in /users/{uid}.
 * Called after first login / registration.
 */
async function ensureUserProfile(user, role = 'user') {
  const profileRef = ref(db, `/users/${user.uid}`);
  const snap = await get(profileRef);
  if (!snap.exists()) {
    await set(profileRef, {
      email:       user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role,
      createdAt:   new Date().toISOString(),
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
 *   redirectIfGuest        - redirect URL if not auth (default: '/login')
 *   requireAdmin           - if true, non-admin → redirect to dashboard
 */
function initPage(callbacks = {}) {
  const {
    onAuthed,
    onGuest,
    redirectIfGuest = '/login',
    requireAdmin    = false,
  } = callbacks;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      _currentUser = user;
      _currentRole = await fetchRole(user.uid);
      // Aktifkan kembali alarm saat user login
      try { localStorage.removeItem('iot_alarm_disable'); } catch (_) {}

      // Admin-only page guard
      if (requireAdmin && _currentRole !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }

      if (typeof onAuthed === 'function') {
        onAuthed(user, _currentRole);
      }
    } else {
      _currentUser = null;
      _currentRole = null;

      if (typeof onGuest === 'function') {
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
  const emailEl   = document.getElementById('sidebarEmail');
  const avatarEl  = document.getElementById('sidebarAvatar');
  const rolePill  = document.getElementById('sidebarRole');

  if (emailEl)  emailEl.textContent  = user.email;
  if (avatarEl) avatarEl.textContent = user.email[0].toUpperCase();
  if (rolePill) {
    rolePill.textContent  = role === 'admin' ? 'Admin' : 'User';
    rolePill.className    = `role-pill ${role}`;
  }

  // Hide admin-only nav items for regular users
  if (role !== 'admin') {
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.classList.add('hidden');
    });
  }
}

// ─── Sidebar toggle (mobile) ─────────────────────────────────
function initSidebarToggle() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const navItems  = document.querySelectorAll('.nav-item');

  function open()  { sidebar?.classList.add('open');  overlay?.classList.add('open'); }
  function close() { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  hamburger?.addEventListener('click', () => {
    if (isMobile()) {
      open();
    }
  });
  overlay?.addEventListener('click', close);

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (isMobile()) close();
    });
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      close();
    }
  });
}

// ─── Logout ──────────────────────────────────────────────────
async function logout() {
  // Matikan alarm siren web agar tidak masih bunyi setelah logout/redirect
  try {
    stopWebSiren();
    localStorage.setItem('iot_alarm_disable', '1');
  } catch (_) {}
  await signOut(auth);
  
  // Redirect ke /login jika di dalam PWA, ke / (Homepage) jika di browser biasa
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    window.location.href = '/login';
  } else {
    window.location.href = '/';
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
};

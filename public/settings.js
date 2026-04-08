/**
 * settings.js — Settings page (Admin only) — NO Firebase Functions required
 * ─────────────────────────────────────────────────────────────────────
 * User management tanpa Firebase Functions:
 *
 *   LIST   → baca /users dari RTDB langsung
 *   CREATE → pakai Secondary Firebase App (admin tidak ter-logout)
 *   DELETE → hapus /users/{uid} dari RTDB (Auth account tetap ada)
 *   ROLE   → tulis langsung ke /users/{uid}/role di RTDB
 *   RESET  → sendPasswordResetEmail() — kirim email ke user
 *
 * Tradeoff vs Functions:
 *  ✅ Tanpa Functions, tanpa Cloud APIs yang perlu diaktifkan
 *  ✅ Lebih simpel untuk thesis project
 *  ⚠️  Delete hanya menghapus RTDB profile, bukan Firebase Auth account
 *      (user masih bisa login tapi tidak punya role → dianggap unauthorized)
 *  ⚠️  Admin tidak bisa set password langsung — hanya bisa kirim reset email
 *  ⚠️  List user hanya menampilkan yang pernah login (ada di RTDB /users)
 * ─────────────────────────────────────────────────────────────────────
 */

import { db, auth, firebaseConfig }  from './firebase-config.js';
import { initPage, populateSidebar, initSidebarToggle, logout } from './auth.js';
import { showToast }      from './notifications.js';
import { ref, onValue, set, remove, get }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp, deleteApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ── DOM: System settings ──────────────────────────────────────
const inpThreshold    = document.getElementById('inpThreshold');
const inpSendInterval = document.getElementById('inpSendInterval');
const inpBuzzer       = document.getElementById('inpBuzzer');
const inpAutoCutoff   = document.getElementById('inpAutoCutoff');

// ── DOM: Calibration ─────────────────────────────────────────
const inpArusCal      = document.getElementById('inpArusCal');
const inpTeganganCal  = document.getElementById('inpTeganganCal');

// ── DOM: Telegram ─────────────────────────────────────────────
const inpBotToken     = document.getElementById('inpBotToken');
const inpChatId       = document.getElementById('inpChatId');

// ── DOM: Controls ─────────────────────────────────────────────
const saveBtn         = document.getElementById('saveSettingsBtn');
const saveStatus      = document.getElementById('saveStatus');

// ── DOM: Users ────────────────────────────────────────────────
const usersTbody      = document.getElementById('usersTbody');
const addUserBtn      = document.getElementById('addUserBtn');
const modalOverlay    = document.getElementById('addUserModal');
const formEmail       = document.getElementById('newEmail');
const formPassword    = document.getElementById('newPassword');
const formDisplayName = document.getElementById('newDisplayName');
const formRole        = document.getElementById('newRole');
const modalSubmit     = document.getElementById('modalSubmitBtn');
const modalCancel     = document.getElementById('modalCancelBtn');
const modalClose      = document.getElementById('modalClose');

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function setValidation(id, msg, ok) {
  const el = document.getElementById(id);
  if (!el) return ok;
  el.textContent = msg;
  el.className   = `validation-msg ${ok ? 'ok' : 'error'}`;
  return ok;
}

function clearValidations() {
  ['valThreshold','valSendInterval','valArusCal',
   'valTeganganCal','valBotToken','valChatId']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.className = 'validation-msg'; }
    });
}

function validateAll() {
  let valid = true;
  clearValidations();

  const threshold = parseFloat(inpThreshold?.value);
  if (isNaN(threshold) || threshold <= 0 || threshold > 200) {
    setValidation('valThreshold', 'Threshold harus antara 0.1 – 200 A', false);
    valid = false;
  } else { setValidation('valThreshold', 'Valid', true); }

  const interval = parseInt(inpSendInterval?.value);
  if (isNaN(interval) || interval < 500 || interval > 60000) {
    setValidation('valSendInterval', 'Interval harus antara 500 – 60000 ms', false);
    valid = false;
  } else { setValidation('valSendInterval', 'Valid', true); }

  const arusCal = parseFloat(inpArusCal?.value);
  if (isNaN(arusCal) || arusCal <= 0 || arusCal > 10) {
    setValidation('valArusCal', 'Harus antara 0.01 – 10', false);
    valid = false;
  } else { setValidation('valArusCal', 'Valid', true); }

  const tegCal = parseFloat(inpTeganganCal?.value);
  if (isNaN(tegCal) || tegCal <= 0 || tegCal > 2000) {
    setValidation('valTeganganCal', 'Harus antara 0.01 – 2000', false);
    valid = false;
  } else { setValidation('valTeganganCal', 'Valid', true); }

  const token = inpBotToken?.value.trim();
  if (token && !/^\d+:[A-Za-z0-9_-]{35,}$/.test(token)) {
    setValidation('valBotToken', 'Format token tidak valid', false);
    valid = false;
  }

  const chatId = inpChatId?.value.trim();
  if (chatId && !/^-?\d+$/.test(chatId)) {
    setValidation('valChatId', 'Chat ID harus angka', false);
    valid = false;
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS — LOAD & SAVE (Firebase RTDB langsung)
// ═══════════════════════════════════════════════════════════════

function loadSettings() {
  onValue(ref(db, '/settings'), (snap) => {
    const d = snap.val() || {};
    if (inpThreshold)    inpThreshold.value     = d.thresholdArus        ?? 10;
    if (inpSendInterval) inpSendInterval.value   = d.sendIntervalMs       ?? 2000;
    if (inpBuzzer)       inpBuzzer.checked        = d.buzzerEnabled        ?? true;
    if (inpAutoCutoff)   inpAutoCutoff.checked    = d.autoCutoffEnabled    ?? true;
    if (inpArusCal)      inpArusCal.value          = d.arusCalibration     ?? 1.000;
    if (inpTeganganCal)  inpTeganganCal.value      = d.teganganCalibration ?? 1.0;
    if (inpBotToken) {
      inpBotToken.value       = d.telegramBotToken ?? '';
      inpBotToken.placeholder = d.telegramBotToken
        ? '••• (tersimpan)'
        : '1234567890:ABCDEF...';
    }
    if (inpChatId) inpChatId.value = d.telegramChatId ?? '';
    if (saveStatus) {
      saveStatus.textContent = 'Settings dimuat dari Firebase';
      setTimeout(() => { if (saveStatus) saveStatus.textContent = ''; }, 3000);
    }
  });
}

async function saveSettings() {
  if (!validateAll()) {
    showToast('Periksa kembali nilai yang tidak valid', 'error');
    return;
  }
  const payload = {
    thresholdArus:       parseFloat(inpThreshold?.value    || 10),
    sendIntervalMs:      parseInt(inpSendInterval?.value   || 2000),
    buzzerEnabled:       inpBuzzer?.checked      ?? true,
    autoCutoffEnabled:   inpAutoCutoff?.checked  ?? true,
    arusCalibration:     parseFloat(inpArusCal?.value      || 1),
    teganganCalibration: parseFloat(inpTeganganCal?.value  || 1),
  };
  const token  = inpBotToken?.value.trim();
  const chatId = inpChatId?.value.trim();
  if (token)  payload.telegramBotToken = token;
  if (chatId) payload.telegramChatId   = chatId;

  try {
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Menyimpan...';
    await set(ref(db, '/settings'), payload);
    showToast('Settings tersimpan — ESP32 sinkron dalam ~10 detik', 'success');
    if (saveStatus) saveStatus.textContent = 'Disimpan ' + new Date().toLocaleTimeString('id-ID');
  } catch (err) {
    showToast('Gagal simpan: ' + err.message, 'error');
    if (saveStatus) saveStatus.textContent = 'Gagal';
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Simpan Semua Settings';
  }
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT — Tanpa Firebase Functions
// ═══════════════════════════════════════════════════════════════

/**
 * LIST USERS
 * Baca dari /users di RTDB (hanya user yang pernah login akan tampil).
 * User yang dibuat via "Tambah User" langsung ditulis ke /users juga.
 */
let usersUnsubscribe = null;

function loadUsers() {
  usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div>Memuat pengguna...
    </div></td></tr>`;

  if (usersUnsubscribe) usersUnsubscribe();

  usersUnsubscribe = onValue(ref(db, '/users'), (snap) => {
    if (!snap.exists()) {
      usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">
        Belum ada pengguna</td></tr>`;
      return;
    }
    const users = [];
    snap.forEach(child => users.push({ uid: child.key, ...child.val() }));
    renderUsers(users);
  }, (err) => {
    showToast('Gagal memuat users: ' + err.message, 'error');
  });
}

function renderUsers(users) {
  const currentUid = auth.currentUser?.uid;
  usersTbody.innerHTML = users.map(u => {
    const isMe  = u.uid === currentUid;
    const badge = u.role === 'admin'
      ? `<span class="role-pill admin">Admin</span>`
      : `<span class="role-pill user">User</span>`;
    return `<tr>
      <td data-label="Pengguna">
        <div style="font-weight:600;">${u.displayName || '—'}${isMe ? ' <span style="font-size:10px;color:var(--primary-light);">(kamu)</span>' : ''}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${u.email}</div>
      </td>
      <td data-label="Role">${badge}</td>
      <td data-label="Dibuat" class="text-sm text-muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}</td>
      <td data-label="Ubah Role">
        ${isMe ? '<span class="text-muted text-sm">—</span>' : `
        <select class="form-select" style="width:100px;padding:6px 10px;"
                onchange="changeRole('${u.uid}', this.value)">
          <option value="user"  ${u.role !== 'admin' ? 'selected' : ''}>User</option>
          <option value="admin" ${u.role === 'admin'  ? 'selected' : ''}>Admin</option>
        </select>`}
      </td>
      <td data-label="Aksi">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm"
                  onclick="sendResetEmail('${u.email}')"><span class='material-symbols-rounded'>mail</span>Reset PW</button>
          ${!isMe ? `<button class="btn btn-danger btn-sm"
                  onclick="deleteUser('${u.uid}','${u.email}')"><span class='material-symbols-rounded'>delete</span>Hapus</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── CHANGE ROLE ─────────────────────────────────────────────
window.changeRole = async (uid, role) => {
  try {
    await set(ref(db, `/users/${uid}/role`), role);
    showToast(`Role diubah ke "${role}"`, 'success');
  } catch (err) {
    showToast('Gagal ubah role: ' + err.message, 'error');
  }
};

// ─── DELETE USER (hapus RTDB profile saja) ───────────────────
window.deleteUser = async (uid, email) => {
  if (!confirm(
    `Hapus profile "${email}" dari sistem?\n\n` +
    `Akun Firebase Auth-nya tetap ada (bisa login ulang).\n` +
    `Untuk hapus permanen, gunakan Firebase Console → Authentication.`
  )) return;
  try {
    await remove(ref(db, `/users/${uid}`));
    showToast(`Profile "${email}" dihapus dari RTDB`, 'success');
    // Note: loadUsers listener akan otomatis update karena onValue
  } catch (err) {
    showToast('Gagal hapus: ' + err.message, 'error');
  }
};

// ─── SEND PASSWORD RESET EMAIL ────────────────────────────────
window.sendResetEmail = async (email) => {
  if (!confirm(`Kirim email reset password ke "${email}"?`)) return;
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`Email reset password terkirim ke "${email}"`, 'success');
  } catch (err) {
    const msgs = {
      'auth/user-not-found': 'Email tidak terdaftar di Firebase Auth',
      'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti',
    };
    showToast(msgs[err.code] || err.message, 'error');
  }
};

// ─── CREATE USER (secondary Firebase app — admin tidak ter-logout) ──
function openAddModal()  { modalOverlay?.classList.add('open');    formEmail?.focus(); }
function closeAddModal() { modalOverlay?.classList.remove('open'); }

addUserBtn?.addEventListener('click',   openAddModal);
modalCancel?.addEventListener('click',  closeAddModal);
modalClose?.addEventListener('click',   closeAddModal);
modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeAddModal(); });

modalSubmit?.addEventListener('click', async () => {
  const email       = formEmail?.value.trim();
  const password    = formPassword?.value;
  const displayName = formDisplayName?.value.trim();
  const role        = formRole?.value || 'user';

  if (!email || !password) { showToast('Email dan password wajib diisi', 'error'); return; }
  if (password.length < 8) { showToast('Password minimal 8 karakter', 'error'); return; }

  modalSubmit.disabled    = true;
  modalSubmit.textContent = 'Membuat akun...';

  // Pakai secondary app agar admin tidak ter-logout dari sesi utama
  let secondaryApp = null;
  try {
    secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);

    // Buat akun di Firebase Auth
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUid = cred.user.uid;

    // Atur display name
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    // Logout dari secondary app sebelum dihapus
    await signOut(secondaryAuth);

    // Tulis profile ke RTDB (menggunakan admin session utama)
    await set(ref(db, `/users/${newUid}`), {
      email,
      displayName: displayName || '',
      role,
      createdAt: new Date().toISOString(),
    });

    showToast(`Akun "${email}" berhasil dibuat`, 'success');
    closeAddModal();
    [formEmail, formPassword, formDisplayName].forEach(el => { if (el) el.value = ''; });
    if (formRole) formRole.value = 'user';
    // loadUsers() tidak perlu dipanggil manual — onValue listener auto-update

  } catch (err) {
    const msgs = {
      'auth/email-already-in-use': 'Email sudah terdaftar.',
      'auth/weak-password':        'Password terlalu lemah.',
      'auth/invalid-email':        'Format email tidak valid.',
    };
    showToast('Gagal: ' + (msgs[err.code] || err.message), 'error');
  } finally {
    if (secondaryApp) {
      try { await deleteApp(secondaryApp); } catch (_) {}
    }
    modalSubmit.disabled    = false;
    modalSubmit.textContent = 'Buat Akun';
  }
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
initPage({
  requireAdmin: true,
  onAuthed: (user, role) => {
    populateSidebar(user, role);
    initSidebarToggle();
    loadSettings();
    loadUsers();
    saveBtn?.addEventListener('click', saveSettings);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);
    [inpThreshold, inpSendInterval, inpArusCal, inpTeganganCal, inpBotToken, inpChatId]
      .forEach(el => el?.addEventListener('input', validateAll));
  },
});

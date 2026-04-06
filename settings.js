/**
 * settings.js — Settings page logic (Admin only)
 * ─────────────────────────────────────────────────────────────────────
 * Handles:
 *   A. System/sensor settings  → /settings in Firebase RTDB
 *   B. Telegram config         → /settings/telegramBotToken, telegramChatId
 *   C. Calibration             → /settings/arusCalibration, teganganCalibration
 *   D. Timing                  → /settings/sendIntervalMs
 *   E. User management         → via Firebase Functions (Admin SDK)
 *
 * Runtime Sync: All settings saved here are read periodically by the
 * ESP32 firmware (every ~10 s by default) without reflashing.
 * ─────────────────────────────────────────────────────────────────────
 */

import { db, functions }  from './firebase-config.js';
import { initPage, populateSidebar, initSidebarToggle, logout } from './auth.js';
import { showToast }      from './notifications.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { httpsCallable }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// ── Cloud Functions refs ──────────────────────────────────────
const fnListUsers     = httpsCallable(functions, 'listUsers');
const fnCreateUser    = httpsCallable(functions, 'createUser');
const fnDeleteUser    = httpsCallable(functions, 'deleteUser');
const fnSetUserRole   = httpsCallable(functions, 'setUserRole');
const fnResetPassword = httpsCallable(functions, 'resetUserPassword');

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
const resetModal      = document.getElementById('resetPwModal');
const resetUidInput   = document.getElementById('resetUid');
const resetPwInput    = document.getElementById('resetNewPw');
const resetSubmit     = document.getElementById('resetSubmitBtn');
const resetCancel     = document.getElementById('resetCancelBtn');

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

function setValidation(id, msg, ok) {
  const el = document.getElementById(id);
  if (!el) return true;
  el.textContent = msg;
  el.className   = `validation-msg ${ok ? 'ok' : 'error'}`;
  return ok;
}

function clearValidations() {
  ['valThreshold', 'valSendInterval', 'valArusCal',
   'valTeganganCal', 'valBotToken', 'valChatId']
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
    setValidation('valThreshold', '⚠ Threshold harus antara 0.1 – 200 A', false);
    valid = false;
  } else {
    setValidation('valThreshold', '✓ Valid', true);
  }

  const interval = parseInt(inpSendInterval?.value);
  if (isNaN(interval) || interval < 500 || interval > 60000) {
    setValidation('valSendInterval', '⚠ Interval harus antara 500 – 60000 ms', false);
    valid = false;
  } else {
    setValidation('valSendInterval', '✓ Valid', true);
  }

  const arusCal = parseFloat(inpArusCal?.value);
  if (isNaN(arusCal) || arusCal <= 0 || arusCal > 10) {
    setValidation('valArusCal', '⚠ Harus antara 0.01 – 10.000', false);
    valid = false;
  } else {
    setValidation('valArusCal', '✓ Valid', true);
  }

  const tegCal = parseFloat(inpTeganganCal?.value);
  if (isNaN(tegCal) || tegCal <= 0 || tegCal > 2000) {
    setValidation('valTeganganCal', '⚠ Harus antara 0.01 – 2000', false);
    valid = false;
  } else {
    setValidation('valTeganganCal', '✓ Valid', true);
  }

  // Telegram fields are optional — only validate format if non-empty
  const token = inpBotToken?.value.trim();
  if (token && !/^\d+:[A-Za-z0-9_-]{35,}$/.test(token)) {
    setValidation('valBotToken', '⚠ Format token tidak valid (contoh: 123456789:ABCDEF...)', false);
    valid = false;
  }

  const chatId = inpChatId?.value.trim();
  if (chatId && !/^-?\d+$/.test(chatId)) {
    setValidation('valChatId', '⚠ Chat ID harus berupa angka (contoh: -100123456789)', false);
    valid = false;
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════
// LOAD SETTINGS from Firebase /settings
// ═══════════════════════════════════════════════════════════════

function loadSettings() {
  onValue(ref(db, '/settings'), (snap) => {
    const d = snap.val() || {};

    if (inpThreshold)    inpThreshold.value    = d.thresholdArus        ?? 10;
    if (inpSendInterval) inpSendInterval.value  = d.sendIntervalMs       ?? 2000;
    if (inpBuzzer)       inpBuzzer.checked       = d.buzzerEnabled        ?? true;
    if (inpAutoCutoff)   inpAutoCutoff.checked   = d.autoCutoffEnabled    ?? true;
    if (inpArusCal)      inpArusCal.value         = d.arusCalibration     ?? 1.000;
    if (inpTeganganCal)  inpTeganganCal.value     = d.teganganCalibration ?? 1.0;

    // Telegram — always show placeholder, never clear an existing value
    // If token is already saved, show masked hint instead of raw value
    // (we get the actual stored value for display only)
    if (inpBotToken) {
      inpBotToken.value       = d.telegramBotToken ?? '';
      inpBotToken.placeholder = d.telegramBotToken
        ? '••• (tersimpan, isi ulang untuk mengubah)'
        : '1234567890:ABCDEF...';
    }
    if (inpChatId) {
      inpChatId.value = d.telegramChatId ?? '';
    }

    if (saveStatus) saveStatus.textContent = '✓ Settings dimuat dari Firebase';
    setTimeout(() => { if (saveStatus) saveStatus.textContent = ''; }, 3000);
  });
}

// ═══════════════════════════════════════════════════════════════
// SAVE SETTINGS to Firebase /settings
// ═══════════════════════════════════════════════════════════════

async function saveSettings() {
  if (!validateAll()) {
    showToast('Periksa kembali nilai yang tidak valid', 'error');
    return;
  }

  const payload = {
    thresholdArus:      parseFloat(inpThreshold?.value    || 10),
    sendIntervalMs:     parseInt(inpSendInterval?.value   || 2000),
    buzzerEnabled:      inpBuzzer?.checked      ?? true,
    autoCutoffEnabled:  inpAutoCutoff?.checked  ?? true,
    arusCalibration:    parseFloat(inpArusCal?.value      || 1),
    teganganCalibration:parseFloat(inpTeganganCal?.value  || 1),
  };

  // Only include Telegram fields if user typed something
  const token  = inpBotToken?.value.trim();
  const chatId = inpChatId?.value.trim();
  if (token)  payload.telegramBotToken = token;
  if (chatId) payload.telegramChatId   = chatId;

  try {
    saveBtn.disabled    = true;
    saveBtn.textContent = '⏳ Menyimpan...';
    if (saveStatus) saveStatus.textContent = '';

    await set(ref(db, '/settings'), payload);

    showToast('Settings berhasil disimpan ✅ — ESP32 akan sinkron dalam ~10 detik', 'success');
    if (saveStatus) {
      saveStatus.textContent = '✓ Disimpan ' + new Date().toLocaleTimeString('id-ID');
    }
  } catch (err) {
    showToast('Gagal simpan: ' + err.message, 'error');
    if (saveStatus) saveStatus.textContent = '✗ Gagal disimpan';
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = '💾 Simpan Semua Settings';
  }
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT (via Firebase Functions)
// ═══════════════════════════════════════════════════════════════

async function loadUsers() {
  usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div>Memuat pengguna...
    </div></td></tr>`;

  try {
    const result = await fnListUsers();
    renderUsers(result.data.users || []);
  } catch (err) {
    showToast('Gagal memuat users: ' + err.message, 'error');
    usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">Gagal memuat data</td></tr>`;
  }
}

function renderUsers(users) {
  if (users.length === 0) {
    usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">Belum ada pengguna</td></tr>`;
    return;
  }
  usersTbody.innerHTML = users.map(u => {
    const badge = u.role === 'admin'
      ? `<span class="role-pill admin">Admin</span>`
      : `<span class="role-pill user">User</span>`;
    return `<tr>
      <td>
        <div style="font-weight:600;">${u.displayName || '—'}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${u.email}</div>
      </td>
      <td>${badge}</td>
      <td class="text-sm text-muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}</td>
      <td>
        <select class="form-select" style="width:100px;padding:6px 10px;"
                onchange="changeRole('${u.uid}', this.value)">
          <option value="user"  ${u.role === 'user'  ? 'selected' : ''}>User</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm"
                  onclick="openResetModal('${u.uid}','${u.email}')">🔑 Reset PW</button>
          <button class="btn btn-danger btn-sm"
                  onclick="deleteUser('${u.uid}','${u.email}')">🗑️ Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.changeRole = async (uid, role) => {
  try {
    await fnSetUserRole({ uid, role });
    showToast(`Role diubah ke "${role}" ✅`, 'success');
  } catch (err) {
    showToast('Gagal ubah role: ' + err.message, 'error');
    loadUsers();
  }
};

window.deleteUser = async (uid, email) => {
  if (!confirm(`Hapus akun "${email}"? Aksi ini tidak dapat dibatalkan.`)) return;
  try {
    await fnDeleteUser({ uid });
    showToast(`Akun "${email}" dihapus`, 'success');
    loadUsers();
  } catch (err) {
    showToast('Gagal hapus: ' + err.message, 'error');
  }
};

// ── Add User Modal ─────────────────────────────────────────────
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

  try {
    modalSubmit.disabled    = true;
    modalSubmit.textContent = 'Membuat...';
    await fnCreateUser({ email, password, displayName, role });
    showToast(`Akun "${email}" berhasil dibuat ✅`, 'success');
    closeAddModal();
    loadUsers();
    [formEmail, formPassword, formDisplayName].forEach(el => { if (el) el.value = ''; });
    if (formRole) formRole.value = 'user';
  } catch (err) {
    showToast('Gagal buat user: ' + err.message, 'error');
  } finally {
    modalSubmit.disabled    = false;
    modalSubmit.textContent = 'Buat Akun';
  }
});

// ── Reset Password Modal ──────────────────────────────────────
window.openResetModal = (uid, email) => {
  if (resetUidInput) resetUidInput.value = uid;
  if (resetPwInput)  resetPwInput.value  = '';
  const lbl = document.getElementById('resetEmailLabel');
  if (lbl) lbl.textContent = email;
  resetModal?.classList.add('open');
  resetPwInput?.focus();
};
document.getElementById('resetModalClose')?.addEventListener('click', () => resetModal?.classList.remove('open'));
resetCancel?.addEventListener('click', () => resetModal?.classList.remove('open'));

resetSubmit?.addEventListener('click', async () => {
  const uid         = resetUidInput?.value;
  const newPassword = resetPwInput?.value;
  if (!uid || !newPassword) { showToast('Password wajib diisi', 'error'); return; }
  if (newPassword.length < 8) { showToast('Password minimal 8 karakter', 'error'); return; }
  try {
    resetSubmit.disabled    = true;
    resetSubmit.textContent = 'Mengubah...';
    await fnResetPassword({ uid, newPassword });
    showToast('Password berhasil diubah ✅', 'success');
    resetModal?.classList.remove('open');
  } catch (err) {
    showToast('Gagal ubah password: ' + err.message, 'error');
  } finally {
    resetSubmit.disabled    = false;
    resetSubmit.textContent = 'Simpan Password';
  }
});

// ═══════════════════════════════════════════════════════════════
// PAGE INIT
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

    // Real-time validation on input change
    [inpThreshold, inpSendInterval, inpArusCal, inpTeganganCal, inpBotToken, inpChatId]
      .forEach(el => el?.addEventListener('input', validateAll));
  },
});

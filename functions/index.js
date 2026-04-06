/**
 * functions/index.js
 * ─────────────────────────────────────────────────────────────
 * Firebase Cloud Functions v2 — Secure User CRUD via Admin SDK.
 * Semua fungsi memerlukan caller terautentikasi.
 * Hanya admin (role === 'admin' di RTDB /users/{uid}/role) yang
 * dapat memanggil fungsi manajemen user.
 *
 * Deploy: firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions }   = require("firebase-functions/v2");
const admin                  = require("firebase-admin");

// Inisialisasi Admin SDK
admin.initializeApp();
const db  = admin.database();
const auth = admin.auth();

// Set region (pilih yang terdekat: asia-southeast1 = Singapore)
setGlobalOptions({ region: "asia-southeast1" });

// ─── Helper: verifikasi admin ─────────────────────────────────
/**
 * Pastikan caller adalah pengguna terautentikasi dengan role 'admin'.
 * Throw HttpsError jika tidak memenuhi syarat.
 */
async function requireAdmin(context) {
  // Cek autentikasi
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login terlebih dahulu.");
  }

  const uid = context.auth.uid;

  // Cek role di RTDB
  const snap = await db.ref(`/users/${uid}/role`).get();
  if (!snap.exists() || snap.val() !== "admin") {
    throw new HttpsError("permission-denied", "Hanya admin yang dapat melakukan operasi ini.");
  }
}

// ─── listUsers ───────────────────────────────────────────────
/**
 * Ambil daftar semua user dari Firebase Auth + role dari RTDB.
 * Hanya dapat dipanggil oleh admin.
 *
 * @returns { users: Array<{ uid, email, displayName, role, createdAt }> }
 */
exports.listUsers = onCall(async (request) => {
  await requireAdmin(request);

  // Ambil semua user dari Auth (max 1000)
  const listResult = await auth.listUsers(1000);

  // Ambil semua role dari RTDB sekaligus
  const rolesSnap = await db.ref("/users").get();
  const rolesData = rolesSnap.exists() ? rolesSnap.val() : {};

  const users = listResult.users.map(u => ({
    uid:         u.uid,
    email:       u.email || "",
    displayName: u.displayName || u.email?.split("@")[0] || "—",
    role:        rolesData[u.uid]?.role || "user",
    createdAt:   rolesData[u.uid]?.createdAt || u.metadata.creationTime,
    disabled:    u.disabled,
  }));

  return { users };
});

// ─── createUser ──────────────────────────────────────────────
/**
 * Buat user baru di Firebase Authentication + profil di RTDB.
 * Hanya dapat dipanggil oleh admin.
 *
 * @param data { email, password, displayName, role }
 * @returns { uid, email, displayName, role }
 */
exports.createUser = onCall(async (request) => {
  await requireAdmin(request);

  const { email, password, displayName, role = "user" } = request.data;

  // Validasi input
  if (!email || !password) {
    throw new HttpsError("invalid-argument", "Email dan password wajib diisi.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password minimal 8 karakter.");
  }
  if (!["admin", "user"].includes(role)) {
    throw new HttpsError("invalid-argument", "Role harus 'admin' atau 'user'.");
  }

  // Buat user di Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
    });
  } catch (err) {
    throw new HttpsError("already-exists", `Gagal membuat user: ${err.message}`);
  }

  // Simpan profil di RTDB
  await db.ref(`/users/${userRecord.uid}`).set({
    email,
    displayName: displayName || email.split("@")[0],
    role,
    createdAt: new Date().toISOString(),
  });

  return {
    uid:         userRecord.uid,
    email,
    displayName: displayName || email.split("@")[0],
    role,
  };
});

// ─── deleteUser ──────────────────────────────────────────────
/**
 * Hapus user dari Firebase Auth dan RTDB.
 * Admin tidak dapat menghapus dirinya sendiri.
 *
 * @param data { uid }
 */
exports.deleteUser = onCall(async (request) => {
  await requireAdmin(request);

  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "UID diperlukan.");
  }

  // Cegah admin menghapus akun dirinya sendiri
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Anda tidak dapat menghapus akun Anda sendiri.");
  }

  // Hapus dari Auth
  await auth.deleteUser(uid);

  // Hapus dari RTDB
  await db.ref(`/users/${uid}`).remove();

  return { success: true, uid };
});

// ─── setUserRole ─────────────────────────────────────────────
/**
 * Ubah role user (admin/user).
 * Admin tidak dapat mengubah role dirinya sendiri.
 *
 * @param data { uid, role }
 */
exports.setUserRole = onCall(async (request) => {
  await requireAdmin(request);

  const { uid, role } = request.data;

  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID dan role diperlukan.");
  }
  if (!["admin", "user"].includes(role)) {
    throw new HttpsError("invalid-argument", "Role harus 'admin' atau 'user'.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Anda tidak dapat mengubah role diri sendiri.");
  }

  // Update role di RTDB
  await db.ref(`/users/${uid}/role`).set(role);

  return { success: true, uid, role };
});

// ─── resetUserPassword ───────────────────────────────────────
/**
 * Reset password user (oleh admin — set password baru langsung).
 * Alternatif: kirim email reset via sendPasswordResetEmail (dari client).
 *
 * @param data { uid, newPassword }
 */
exports.resetUserPassword = onCall(async (request) => {
  await requireAdmin(request);

  const { uid, newPassword } = request.data;

  if (!uid || !newPassword) {
    throw new HttpsError("invalid-argument", "UID dan password baru diperlukan.");
  }
  if (newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Password minimal 8 karakter.");
  }

  await auth.updateUser(uid, { password: newPassword });

  return { success: true };
});

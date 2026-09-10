const admin = require("firebase-admin");
const {
  ensureAdminApp,
  httpError,
  requireAdminRequest,
} = require("./live-reset");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  return value === "admin" ? "admin" : "user";
}

function normalizeName(value) {
  return String(value || "").trim().slice(0, 120);
}

const IOT_DEVICE_EMAIL = "listrik.iot.device@gmail.com";

function isDeviceAuthUser(userOrProfile) {
  return normalizeEmail(userOrProfile?.email) === IOT_DEVICE_EMAIL;
}

function isTemporaryAuthUser(user) {
  return user?.customClaims?.isTempAccount === true
    || String(user?.email || "").toLowerCase().startsWith("sim_")
    || String(user?.email || "").toLowerCase().endsWith("@iotlistrik.demo");
}

function serializeUser(uid, authUser, profile) {
  const authExists = Boolean(authUser);
  const profileExists = Boolean(profile);
  return {
    uid,
    email: String(profile?.email || authUser?.email || "").trim(),
    displayName: String(profile?.displayName || authUser?.displayName || "").trim(),
    role: normalizeRole(profile?.role),
    createdAt: profile?.createdAt || profile?.created_at || authUser?.metadata?.creationTime || "",
    authExists,
    profileExists,
    disabled: Boolean(authUser?.disabled),
    state: authExists && profileExists
      ? "SYNCED"
      : authExists
        ? "PROFILE_MISSING"
        : "AUTH_MISSING",
  };
}

async function listManagedUsers() {
  ensureAdminApp();
  const [authResult, profileSnap] = await Promise.all([
    admin.auth().listUsers(1000),
    admin.database().ref("/users").get(),
  ]);
  const profiles = profileSnap.val() || {};
  const authMap = new Map();
  authResult.users.forEach((user) => {
    if (!isTemporaryAuthUser(user) && !isDeviceAuthUser(user)) authMap.set(user.uid, user);
  });

  const managedProfileIds = Object.entries(profiles)
    .filter(([, profile]) => !isDeviceAuthUser(profile))
    .map(([uid]) => uid);
  const ids = new Set([...authMap.keys(), ...managedProfileIds]);
  return [...ids]
    .map((uid) => serializeUser(uid, authMap.get(uid) || null, profiles[uid] || null))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid, "id");
    });
}

async function createManagedUser(req) {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const displayName = normalizeName(req.body?.displayName);
  const role = normalizeRole(req.body?.role);

  if (email === IOT_DEVICE_EMAIL) throw httpError(400, "Akun ini khusus untuk autentikasi ESP32 dan tidak boleh dikelola sebagai akun pengguna.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Format email tidak valid.");
  if (password.length < 8) throw httpError(400, "Password minimal 8 karakter.");

  let authUser = null;
  let createdNow = false;
  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  if (authUser) {
    const existingProfile = await admin.database().ref(`/users/${authUser.uid}`).get();
    if (existingProfile.exists()) {
      throw httpError(409, "Email sudah terdaftar dan profil pengguna masih aktif.");
    }
  } else {
    authUser = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
      disabled: false,
      emailVerified: false,
    });
    createdNow = true;
  }

  try {
    await admin.database().ref(`/users/${authUser.uid}`).set({
      email,
      displayName: displayName || authUser.displayName || "",
      role,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      profileRecovered: !createdNow,
    });
  } catch (error) {
    // Hindari akun Auth yatim jika pembuatan baru berhasil tetapi penulisan profil gagal.
    if (createdNow) await admin.auth().deleteUser(authUser.uid).catch(() => {});
    throw error;
  }

  return {
    success: true,
    recovered: !createdNow,
    message: createdNow
      ? `Akun ${email} berhasil dibuat.`
      : `Akun ${email} sudah ada di Authentication; profil RTDB berhasil dipulihkan.`,
    user: serializeUser(authUser.uid, authUser, {
      email,
      displayName: displayName || authUser.displayName || "",
      role,
      createdAt: Date.now(),
    }),
  };
}

async function updateManagedRole(req) {
  const uid = String(req.body?.uid || "").trim();
  const role = normalizeRole(req.body?.role);
  if (!uid) throw httpError(400, "UID pengguna tidak valid.");

  let authUser = null;
  try { authUser = await admin.auth().getUser(uid); } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }
  const profileSnap = await admin.database().ref(`/users/${uid}`).get();
  const profile = profileSnap.val() || {};
  if (!authUser && !profileSnap.exists()) throw httpError(404, "Pengguna tidak ditemukan.");

  await admin.database().ref(`/users/${uid}`).update({
    email: profile.email || authUser?.email || "",
    displayName: profile.displayName || authUser?.displayName || "",
    role,
    createdAt: profile.createdAt || profile.created_at || admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    profileRecovered: !profileSnap.exists(),
  });
  return { success: true, message: `Role pengguna berhasil diubah menjadi ${role}.` };
}

async function deleteManagedAccount(req, adminUid) {
  const uid = String(req.body?.uid || "").trim();
  if (!uid) throw httpError(400, "UID pengguna tidak valid.");
  if (uid === adminUid) throw httpError(400, "Akun admin yang sedang digunakan tidak dapat dihapus.");

  let authExists = true;
  try {
    await admin.auth().getUser(uid);
  } catch (error) {
    if (error?.code === "auth/user-not-found") authExists = false;
    else throw error;
  }

  // Hapus akun Auth terlebih dahulu agar kredensial login benar-benar tidak berlaku.
  // Profil RTDB kemudian dibersihkan; bila gagal, profil akan terlihat sebagai AUTH_MISSING
  // dan dapat dibersihkan kembali tanpa menghidupkan akun login.
  if (authExists) await admin.auth().deleteUser(uid);
  await admin.database().ref(`/users/${uid}`).remove();

  return {
    success: true,
    message: authExists
      ? "Akun Firebase Authentication dan profil RTDB berhasil dihapus permanen."
      : "Profil RTDB sisa berhasil dihapus; akun Authentication sudah tidak ada.",
  };
}

async function deleteManagedProfile(req, adminUid) {
  const uid = String(req.body?.uid || "").trim();
  if (!uid) throw httpError(400, "UID pengguna tidak valid.");
  if (uid === adminUid) throw httpError(400, "Profil akun admin yang sedang digunakan tidak dapat dihapus.");
  await admin.database().ref(`/users/${uid}`).remove();
  return {
    success: true,
    message: "Profil RTDB berhasil dihapus. Akun Firebase Authentication tetap tersedia.",
  };
}

async function handleUserAdminAction(req) {
  const caller = await requireAdminRequest(req);
  const action = String(req.body?.action || "list").trim().toLowerCase();
  if (action === "list") return { success: true, message: "Daftar pengguna berhasil dimuat.", users: await listManagedUsers() };
  if (action === "create") return createManagedUser(req);
  if (action === "set_role") return updateManagedRole(req);
  if (action === "delete_profile") return deleteManagedProfile(req, caller.uid);
  if (action === "delete_account") return deleteManagedAccount(req, caller.uid);
  throw httpError(400, "Aksi manajemen pengguna tidak dikenali.");
}

module.exports = { handleUserAdminAction, listManagedUsers };

const {
  setCors,
  requestLiveResetOtp,
} = require("./_lib/live-reset");
const { handleUserAdminAction } = require("./_lib/user-admin");

export default async function handler(req, res) {
  if (!setCors(req, res)) {
    return res.status(403).json({ error: "Origin tidak diizinkan." });
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const action = String(req.body?.action || "").trim().toLowerCase();
    if (["list", "create", "set_role", "delete_profile", "delete_account"].includes(action)) {
      return res.status(200).json(await handleUserAdminAction(req));
    }
    // Kompatibilitas endpoint lama. Alur reset realtime saat ini memakai
    // konfirmasi nama project melalui /api/confirm-live-reset.
    return res.status(200).json(await requestLiveResetOtp(req));
  } catch (error) {
    return res.status(Number(error?.statusCode || 500)).json({
      error: error?.message || "Aksi admin gagal diproses.",
    });
  }
}

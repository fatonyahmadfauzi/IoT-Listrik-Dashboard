const {
  setCors,
  confirmMonitoringWipeOtp,
} = require("./_lib/live-reset");

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const result = await confirmMonitoringWipeOtp(req);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      error: error?.message || "Gagal menghapus semua data monitoring perangkat IoT.",
    });
  }
}

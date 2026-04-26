const { setCors } = require("./_lib/live-reset");
const {
  getTelegramBotProfile,
  testTelegramConfig,
} = require("./_lib/telegram-admin");

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
    const action = String(req.body?.action || req.query?.action || "").trim().toLowerCase();

    if (action === "profile") {
      const result = await getTelegramBotProfile(req);
      return res.status(200).json(result);
    }

    if (action === "test") {
      const result = await testTelegramConfig(req);
      return res.status(200).json(result);
    }

    return res.status(400).json({
      error: "Aksi Telegram tidak dikenal. Gunakan action='profile' atau action='test'.",
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      error: error?.message || "Gagal menjalankan aksi Telegram admin.",
    });
  }
}

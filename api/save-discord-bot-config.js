const {
  setCors,
} = require("./_lib/live-reset");
const {
  saveDiscordBotAdminConfig,
} = require("./_lib/discord-bot-admin");

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
    const result = await saveDiscordBotAdminConfig(req);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      error: error?.message || "Gagal menyimpan konfigurasi Discord Bot.",
    });
  }
}

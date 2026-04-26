const {
  ensureAdminApp,
  httpError,
  requireAdminRequest,
} = require("./live-reset");

function normalizeTelegramChatId(value) {
  const id = String(value ?? "").trim();
  return /^-?\d+$/.test(id) ? id : "";
}

function parseTelegramRecipients(...sources) {
  const recipients = [];
  const add = (value) => {
    const id = normalizeTelegramChatId(value);
    if (id && !recipients.includes(id)) recipients.push(id);
  };

  const visit = (source) => {
    if (source == null) return;
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === "object") {
      if ("chatId" in source || "telegramChatId" in source || "id" in source) {
        add(source.chatId ?? source.telegramChatId ?? source.id);
        return;
      }
      Object.entries(source)
        .filter(([key]) => !["name", "label", "displayName", "title"].includes(key))
        .forEach(([, value]) => visit(value));
      return;
    }
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return recipients;
}

function getRequestBody(req) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (typeof req?.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

async function callTelegram(token, method, payload = null) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const options = payload == null
    ? { method: "GET" }
    : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      };

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    const message = data?.description || `Telegram API ${method} gagal (${res.status})`;
    throw httpError(400, message);
  }

  return data?.result || null;
}

async function resolveTelegramConfig(req, { requireRecipients = false } = {}) {
  await requireAdminRequest(req);
  ensureAdminApp();

  const body = getRequestBody(req);
  const db = ensureAdminApp().database();
  const settingsSnap = await db.ref("/settings").get();
  const settings = settingsSnap.val() || {};

  const token = String(body.token || settings.telegramBotToken || settings?.telegram?.bot_token || "").trim();
  const recipients = parseTelegramRecipients(
    body.recipients,
    body.chatIds,
    body.chatId,
    settings.telegramRecipients,
    settings.telegramChatIds,
    settings.telegramChatId,
    settings?.telegram?.chat_id
  );

  if (!token) {
    throw httpError(400, "Bot Token Telegram belum diisi.");
  }

  if (requireRecipients && recipients.length === 0) {
    throw httpError(400, "Belum ada Chat ID / Group ID Telegram yang aktif.");
  }

  return { token, recipients, settings };
}

async function getTelegramBotProfile(req) {
  const { token } = await resolveTelegramConfig(req, { requireRecipients: false });
  const profile = await callTelegram(token, "getMe");

  const username = String(profile?.username || "").trim();
  const displayName = String(profile?.first_name || profile?.username || "Bot Telegram").trim();

  if (!username) {
    throw httpError(400, "Bot Telegram valid, tetapi username bot tidak ditemukan.");
  }

  return {
    ok: true,
    username,
    displayName,
    botUrl: `https://t.me/${username}`,
    botFatherUrl: "https://t.me/BotFather",
  };
}

async function testTelegramConfig(req) {
  const { token, recipients, settings } = await resolveTelegramConfig(req, { requireRecipients: true });
  if (settings?.telegramNotifyEnabled === false) {
    throw httpError(400, "Notifikasi Telegram sedang dimatikan. Aktifkan dulu jika ingin mengirim test.");
  }
  const profile = await callTelegram(token, "getMe");

  const username = String(profile?.username || "").trim();
  const displayName = String(profile?.first_name || profile?.username || "Bot Telegram").trim();
  const sentAt = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium",
  });

  const message =
    `🔔 <b>Test Notifikasi Telegram</b>\n` +
    `Bot: <b>${displayName}</b>${username ? ` (@${username})` : ""}\n` +
    `Tujuan aktif: <b>${recipients.length}</b>\n` +
    `Waktu: <b>${sentAt} WIB</b>\n\n` +
    `<i>IoT Listrik Dashboard berhasil terhubung ke Telegram.</i>`;

  const results = await Promise.allSettled(
    recipients.map(async (chatId) => {
      await callTelegram(token, "sendMessage", {
        chat_id: String(chatId),
        text: message,
        parse_mode: "HTML",
      });
      return chatId;
    })
  );

  const successCount = results.filter((item) => item.status === "fulfilled").length;
  if (successCount === 0) {
    throw httpError(400, "Gagal mengirim test ke semua tujuan Telegram. Periksa Bot Token dan Chat ID.");
  }

  return {
    ok: true,
    username,
    displayName,
    botUrl: username ? `https://t.me/${username}` : "",
    successCount,
    totalRecipients: recipients.length,
  };
}

module.exports = {
  getTelegramBotProfile,
  testTelegramConfig,
};

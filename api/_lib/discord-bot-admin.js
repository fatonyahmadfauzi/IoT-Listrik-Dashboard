const admin = require("firebase-admin");
const {
  ensureAdminApp,
  httpError,
  requireAdminRequest,
} = require("./live-reset");

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_BOT_CONFIG_PATH = "/admin_secure/discordBot";
const DISCORD_BOT_SUMMARY_PATH = "/settings/discordBotSummary";
const MAX_BAN_LIST_ITEMS = 100;

function normalizeDiscordSnowflake(value) {
  const raw = String(value ?? "").trim();
  return /^\d{5,}$/.test(raw) ? raw : "";
}

function maskDiscordToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return "";
  if (raw.length <= 10) return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`;
}

function normalizeBanReason(value) {
  return String(value ?? "").trim().slice(0, 512);
}

async function getDiscordBotConfig() {
  ensureAdminApp();
  const snap = await admin.database().ref(DISCORD_BOT_CONFIG_PATH).get();
  return snap.val() || {};
}

async function saveDiscordBotConfigRecord(payload) {
  ensureAdminApp();
  await admin.database().ref(DISCORD_BOT_CONFIG_PATH).update(payload);
}

async function saveDiscordBotSummary(summary) {
  ensureAdminApp();
  await admin.database().ref(DISCORD_BOT_SUMMARY_PATH).set(summary);
}

function buildDiscordHeaders(token, auditReason = "") {
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  if (auditReason) {
    headers["X-Audit-Log-Reason"] = encodeURIComponent(auditReason);
  }

  return headers;
}

async function discordApi(path, { token, method = "GET", body, auditReason = "", okStatuses = [200] } = {}) {
  if (!token) {
    throw httpError(400, "Discord Bot Token belum dikonfigurasi.");
  }

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method,
    headers: buildDiscordHeaders(token, auditReason),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!okStatuses.includes(response.status)) {
    let detail = "";
    try {
      detail = await response.text();
    } catch (_) {
      detail = "";
    }
    const message = detail || `Discord API mengembalikan HTTP ${response.status}.`;
    throw httpError(response.status, message);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function serializeBanEntry(entry) {
  const user = entry?.user || {};
  return {
    userId: String(user.id || "").trim(),
    username: String(user.username || "").trim(),
    globalName: String(user.global_name || "").trim(),
    displayName: String(user.global_name || user.username || "").trim(),
    discriminator: String(user.discriminator || "").trim(),
    avatarUrl: user.id && user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : "",
    reason: String(entry?.reason || "").trim(),
  };
}

async function fetchDiscordBanList({ token, guildId }) {
  const data = await discordApi(`/guilds/${guildId}/bans?limit=${MAX_BAN_LIST_ITEMS}`, {
    token,
    okStatuses: [200],
  });
  const bans = Array.isArray(data) ? data.map(serializeBanEntry) : [];
  return bans.filter((item) => item.userId);
}

async function fetchDiscordBotSnapshot(configOverride = null) {
  const config = configOverride || await getDiscordBotConfig();
  const token = String(config.token || "").trim();
  const guildId = normalizeDiscordSnowflake(config.guildId);

  if (!token || !guildId) {
    return {
      configured: false,
      tokenConfigured: Boolean(token),
      guildId,
      maskedToken: maskDiscordToken(token),
      guildName: "",
      botUser: null,
      memberCount: 0,
      onlineCount: 0,
      banCount: 0,
      bans: [],
      lastCheckedAt: 0,
    };
  }

  const [botUser, guild, bans] = await Promise.all([
    discordApi("/users/@me", { token, okStatuses: [200] }),
    discordApi(`/guilds/${guildId}?with_counts=true`, { token, okStatuses: [200] }),
    fetchDiscordBanList({ token, guildId }),
  ]);

  const now = Date.now();
  const snapshot = {
    configured: true,
    tokenConfigured: true,
    maskedToken: maskDiscordToken(token),
    guildId,
    guildName: String(guild?.name || "").trim(),
    guildIcon: guild?.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
      : "",
    botUser: botUser
      ? {
          id: String(botUser.id || "").trim(),
          username: String(botUser.username || "").trim(),
          globalName: String(botUser.global_name || "").trim(),
          displayName: String(botUser.global_name || botUser.username || "").trim(),
        }
      : null,
    memberCount: Number(guild?.approximate_member_count || guild?.member_count || 0),
    onlineCount: Number(guild?.approximate_presence_count || 0),
    banCount: bans.length,
    bans,
    lastCheckedAt: now,
  };

  await saveDiscordBotSummary({
    configured: snapshot.configured,
    tokenConfigured: snapshot.tokenConfigured,
    maskedToken: snapshot.maskedToken,
    guildId: snapshot.guildId,
    guildName: snapshot.guildName,
    botUser: snapshot.botUser,
    memberCount: snapshot.memberCount,
    onlineCount: snapshot.onlineCount,
    banCount: snapshot.banCount,
    lastCheckedAt: snapshot.lastCheckedAt,
  });

  return snapshot;
}

async function saveDiscordBotAdminConfig(req) {
  const { email } = await requireAdminRequest(req);
  const existing = await getDiscordBotConfig();

  const rawToken = String(req.body?.token ?? "").trim();
  const token = rawToken || String(existing.token || "").trim();
  const guildId = normalizeDiscordSnowflake(req.body?.guildId ?? existing.guildId ?? "");

  if (!token) throw httpError(400, "Discord Bot Token wajib diisi.");
  if (!guildId) throw httpError(400, "Guild / Server ID Discord tidak valid.");

  const snapshot = await fetchDiscordBotSnapshot({ token, guildId });

  await saveDiscordBotConfigRecord({
    token,
    guildId,
    updatedAt: Date.now(),
    updatedBy: email,
    guildName: snapshot.guildName,
    botUser: snapshot.botUser || null,
  });

  return {
    success: true,
    message: "Konfigurasi Discord Bot berhasil disimpan.",
    ...snapshot,
  };
}

async function getDiscordBotAdminStatus(req) {
  await requireAdminRequest(req);
  return fetchDiscordBotSnapshot();
}

async function banDiscordGuildUser(req) {
  const { email } = await requireAdminRequest(req);
  const config = await getDiscordBotConfig();
  const token = String(config.token || "").trim();
  const guildId = normalizeDiscordSnowflake(config.guildId);
  const userId = normalizeDiscordSnowflake(req.body?.userId);
  const reason = normalizeBanReason(req.body?.reason || `Banned by ${email} via IoT Listrik Dashboard`);

  if (!token || !guildId) {
    throw httpError(400, "Konfigurasi Discord Bot belum lengkap.");
  }
  if (!userId) {
    throw httpError(400, "Discord User ID tidak valid.");
  }

  await discordApi(`/guilds/${guildId}/bans/${userId}`, {
    token,
    method: "PUT",
    body: { delete_message_seconds: 0 },
    auditReason: reason,
    okStatuses: [204],
  });

  const snapshot = await fetchDiscordBotSnapshot({ token, guildId });
  return {
    success: true,
    message: `User ${userId} berhasil diban dari server Discord.`,
    ...snapshot,
  };
}

async function unbanDiscordGuildUser(req) {
  const { email } = await requireAdminRequest(req);
  const config = await getDiscordBotConfig();
  const token = String(config.token || "").trim();
  const guildId = normalizeDiscordSnowflake(config.guildId);
  const userId = normalizeDiscordSnowflake(req.body?.userId);
  const reason = normalizeBanReason(req.body?.reason || `Unbanned by ${email} via IoT Listrik Dashboard`);

  if (!token || !guildId) {
    throw httpError(400, "Konfigurasi Discord Bot belum lengkap.");
  }
  if (!userId) {
    throw httpError(400, "Discord User ID tidak valid.");
  }

  await discordApi(`/guilds/${guildId}/bans/${userId}`, {
    token,
    method: "DELETE",
    auditReason: reason,
    okStatuses: [204],
  });

  const snapshot = await fetchDiscordBotSnapshot({ token, guildId });
  return {
    success: true,
    message: `User ${userId} berhasil di-unban dari server Discord.`,
    ...snapshot,
  };
}

module.exports = {
  getDiscordBotAdminStatus,
  saveDiscordBotAdminConfig,
  banDiscordGuildUser,
  unbanDiscordGuildUser,
};

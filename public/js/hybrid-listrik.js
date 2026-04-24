/**
 * Cloud (Firebase RTDB) + optional local REST fallback.
 * Web cannot spawn processes — autoStartLocal is ignored here (Electron only).
 *
 * NOTE: Simulator/temp accounts ALWAYS use direct Firebase RTDB (bypass local REST)
 * because local server.js reads /listrik (admin path), not /sim/{uid}/listrik.
 */
import { loadClientConfig } from './client-config.js';
import { getDbPrefix, isTempAccount } from './auth.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const DEVICE_STALE_MS = 15000;

function trimBase(u) {
  return String(u || '').replace(/\/+$/, '');
}

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export function normalizeListrikPayload(d) {
  const arus = Number(d?.arus ?? 0);
  const teg = Number(d?.tegangan ?? 0);
  const pf = Number(d?.power_factor ?? d?.powerFactor ?? 0.85);
  const apparent = Number(d?.daya ?? arus * teg);
  const relayRaw = d?.relay;
  const relay = relayRaw === true || Number(relayRaw) === 1 ? 1 : 0;
  return {
    arus,
    tegangan: teg,
    daya: apparent,
    daya_w: apparent * pf,
    energi_kwh: Number(d?.energi_kwh ?? 0),
    frekuensi: Number(d?.frekuensi ?? 50),
    power_factor: pf,
    status: d?.status || 'NORMAL',
    relay,
    updated_at: d?.updated_at != null ? Number(d.updated_at) : null,
    reset_by_admin: !!d?.reset_by_admin,
    reset_at: d?.reset_at ?? null,
    reset_note: d?.reset_note ? String(d.reset_note) : '',
  };
}

function isLikelyEpochMs(value) {
  return Number.isFinite(value) && value > 1e12;
}

function buildSensorSignature(d) {
  return [
    Number(d?.arus ?? 0).toFixed(3),
    Number(d?.tegangan ?? 0).toFixed(1),
    Number(d?.daya ?? 0).toFixed(1),
    Number(d?.energi_kwh ?? 0).toFixed(4),
    Number(d?.frekuensi ?? 0).toFixed(2),
    Number(d?.power_factor ?? 0).toFixed(3),
    String(d?.status || 'NORMAL'),
  ].join('|');
}

/**
 * @param {import('firebase/database').Database} db
 * @param {object} handlers - { onData, onMeta }
 * @returns {function} dispose
 */
export function startHybridListrik(db, handlers) {
  let disposed = false;
  let pollTimer = null;
  let fbUnsub = null;
  let connUnsub = null;
  let fbConnected = true;
  let usingLocal = false;
  let lastDataReceivedTime = 0;
  let lastUpdatedMarker = null;
  let lastSensorSignature = '';
  let watchStartedAt = Date.now();

  const meta = (partial) => handlers.onMeta?.(partial);

  const isDeviceOffline = (now = Date.now()) => {
    const base = lastDataReceivedTime || watchStartedAt;
    return (now - base) > DEVICE_STALE_MS;
  };

  const getConnectionLabel = (backendOnline = fbConnected) => {
    if (!backendOnline) return 'Memulihkan...';
    if (!lastDataReceivedTime) {
      return isDeviceOffline() ? 'Device Offline' : 'Memeriksa perangkat...';
    }
    return isDeviceOffline() ? 'Device Offline' : 'Connected';
  };

  const registerDeviceHeartbeat = (payload) => {
    const updatedAt = payload?.updated_at != null ? Number(payload.updated_at) : null;
    const sensorSignature = buildSensorSignature(payload);
    let heartbeatDetected = false;

    if (Number.isFinite(updatedAt) && updatedAt > 0) {
      if (lastUpdatedMarker == null) {
        if (isLikelyEpochMs(updatedAt) && (Date.now() - updatedAt) <= DEVICE_STALE_MS) {
          heartbeatDetected = true;
        }
      } else if (updatedAt !== lastUpdatedMarker) {
        heartbeatDetected = true;
      }
      lastUpdatedMarker = updatedAt;
    } else if (lastSensorSignature && lastSensorSignature !== sensorSignature) {
      heartbeatDetected = true;
    }

    lastSensorSignature = sensorSignature;

    if (heartbeatDetected) {
      lastDataReceivedTime = Date.now();
    }

    return heartbeatDetected;
  };

  const pollRest = async (base, label) => {
    const cfg = loadClientConfig();
    const b = trimBase(base);
    if (!b) return false;
    const path = cfg.healthPath || '/health';
    const to = cfg.timeoutMs || 4000;
    await fetchJson(`${b}${path}`, to);
    const data = await fetchJson(`${b}/api/listrik`, to);
    if (disposed) return true;
    const payload = normalizeListrikPayload(data);
    registerDeviceHeartbeat(payload);
    handlers.onData(payload);
    const fallbackActive = label === 'LOCAL' && cfg.mode === 'AUTO' && cfg.autoFailover;
    meta({
      source: label,
      fallbackActive,
      connection: getConnectionLabel(true),
      endpointBadge: label === 'LOCAL' ? 'LOCAL' : 'CLOUD',
      lastDeviceSeenAt: lastDataReceivedTime || null,
    });
    usingLocal = label === 'LOCAL';
    return true;
  };

  const tick = async () => {
    if (disposed) return;
    const cfg = loadClientConfig();

    // Simulator/temp accounts: ALWAYS use Firebase directly.
    // Local server reads /listrik (admin path), not /sim/{uid}/listrik.
    if (isTempAccount()) {
      meta({
        source: 'CLOUD',
        connection: getConnectionLabel(fbConnected),
        endpointBadge: 'CLOUD',
        lastDeviceSeenAt: lastDataReceivedTime || null,
      });
      return;
    }

    try {
      if (cfg.mode === 'LOCAL') {
        await pollRest(cfg.localApiBase, 'LOCAL');
        return;
      }
      if (cfg.mode === 'PUBLIC' && cfg.publicApiBase) {
        await pollRest(cfg.publicApiBase, 'CLOUD');
        return;
      }
      if (cfg.mode === 'PUBLIC') {
        meta({
          source: 'CLOUD',
          connection: getConnectionLabel(fbConnected),
          endpointBadge: 'CLOUD',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
        return;
      }
      // AUTO
      if (!fbConnected && cfg.autoFailover) {
        try {
          await pollRest(cfg.localApiBase, 'LOCAL');
        } catch {
          meta({
            source: 'LOCAL',
            connection: 'Offline',
            fallbackActive: true,
            endpointBadge: 'FALLBACK',
            lastDeviceSeenAt: lastDataReceivedTime || null,
          });
        }
        return;
      }
      if (usingLocal && fbConnected) {
        usingLocal = false;
        meta({
          source: 'CLOUD',
          connection: getConnectionLabel(true),
          fallbackActive: false,
          endpointBadge: 'CLOUD',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
      }

      // Default auto
      if (fbConnected) {
        meta({
          source: 'CLOUD',
          connection: getConnectionLabel(true),
          endpointBadge: 'CLOUD',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
      }

    } catch (e) {
      if (cfg.mode === 'LOCAL') {
        meta({
          connection: 'Offline',
          source: 'LOCAL',
          endpointBadge: 'LOCAL',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
      }
    }
  };

  const startPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    const cfg = loadClientConfig();
    pollTimer = setInterval(tick, cfg.retryIntervalMs || 6000);
  };

  const attachFirebase = () => {
    const cfg = loadClientConfig();

    // Simulator/temp accounts: bypass local mode entirely, go straight to Firebase.
    // This ensures /sim/{uid}/listrik is subscribed, not local REST /api/listrik.
    const forceCloud = isTempAccount();

    if (!forceCloud && cfg.mode === 'LOCAL') {
      meta({ source: 'LOCAL', connection: 'Menghubungkan', endpointBadge: 'LOCAL' });
      tick();
      startPolling();
      return;
    }
    if (!forceCloud && cfg.mode === 'PUBLIC' && cfg.publicApiBase) {
      tick();
      startPolling();
      return;
    }

    const listrikRef = ref(db, getDbPrefix() + '/listrik');
    fbUnsub = onValue(
      listrikRef,
      (snap) => {
        const cfg2 = loadClientConfig();
        // For temp accounts, NEVER skip Firebase data — just render it.
        if (!forceCloud && cfg2.mode === 'AUTO' && cfg2.autoFailover && !fbConnected) return;
        const v = snap.val();
        if (!v) return;

        const payload = normalizeListrikPayload(v);
        registerDeviceHeartbeat(payload);
        handlers.onData(payload);
        meta({
          source: 'CLOUD',
          connection: getConnectionLabel(true),
          fallbackActive: false,
          endpointBadge: 'CLOUD',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
      },
      () => {
        meta({ connection: 'Memulihkan...', lastDeviceSeenAt: lastDataReceivedTime || null });
      }
    );

    const connRef = ref(db, '.info/connected');
    connUnsub = onValue(connRef, (snap) => {
      const c = !!snap.val();
      fbConnected = c;
      if (!c) {
        meta({ connection: 'Memulihkan...', lastDeviceSeenAt: lastDataReceivedTime || null });
      } else {
        usingLocal = false;
        watchStartedAt = Date.now();
        meta({
          connection: getConnectionLabel(true),
          source: 'CLOUD',
          fallbackActive: false,
          endpointBadge: 'CLOUD',
          lastDeviceSeenAt: lastDataReceivedTime || null,
        });
      }
    });

    startPolling();
    tick();
  };

  attachFirebase();

  return () => {
    disposed = true;
    if (pollTimer) clearInterval(pollTimer);
    if (typeof fbUnsub === 'function') {
      fbUnsub();
      fbUnsub = null;
    }
    if (typeof connUnsub === 'function') {
      connUnsub();
      connUnsub = null;
    }
  };
}

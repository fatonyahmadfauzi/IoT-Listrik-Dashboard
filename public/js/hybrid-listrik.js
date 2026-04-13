/**
 * Cloud (Firebase RTDB) + optional local REST fallback.
 * Web cannot spawn processes — autoStartLocal is ignored here (Electron only).
 */
import { loadClientConfig } from './client-config.js';
import { getDbPrefix } from './auth.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

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
  };
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
  let disconnectSince = 0;
  let usingLocal = false;

  const meta = (partial) => handlers.onMeta?.(partial);

  const pollRest = async (base, label) => {
    const cfg = loadClientConfig();
    const b = trimBase(base);
    if (!b) return false;
    const path = cfg.healthPath || '/health';
    const to = cfg.timeoutMs || 4000;
    await fetchJson(`${b}${path}`, to);
    const data = await fetchJson(`${b}/api/listrik`, to);
    if (disposed) return true;
    handlers.onData(normalizeListrikPayload(data));
    const fallbackActive = label === 'LOCAL' && cfg.mode === 'AUTO' && cfg.autoFailover;
    meta({
      source: label,
      fallbackActive,
      connection: 'Connected',
      endpointBadge: label === 'LOCAL' ? 'LOCAL' : 'CLOUD',
    });
    usingLocal = label === 'LOCAL';
    return true;
  };

  const tick = async () => {
    if (disposed) return;
    const cfg = loadClientConfig();
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
        meta({ source: 'CLOUD', connection: fbConnected ? 'Connected' : 'Reconnecting', endpointBadge: 'CLOUD' });
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
          });
        }
        return;
      }
      if (usingLocal && fbConnected) {
        usingLocal = false;
        meta({ fallbackActive: false, endpointBadge: 'CLOUD' });
      }
    } catch (e) {
      if (cfg.mode === 'LOCAL') {
        meta({ connection: 'Offline', source: 'LOCAL', endpointBadge: 'LOCAL' });
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
    if (cfg.mode === 'LOCAL') {
      meta({ source: 'LOCAL', connection: 'Reconnecting', endpointBadge: 'LOCAL' });
      tick();
      startPolling();
      return;
    }
    if (cfg.mode === 'PUBLIC' && cfg.publicApiBase) {
      tick();
      startPolling();
      return;
    }

    const listrikRef = ref(db, getDbPrefix() + '/listrik');
    fbUnsub = onValue(
      listrikRef,
      (snap) => {
        const cfg2 = loadClientConfig();
        if (cfg2.mode === 'AUTO' && cfg2.autoFailover && !fbConnected) return;
        const v = snap.val();
        if (!v) return;
        handlers.onData(normalizeListrikPayload(v));
        meta({
          source: 'CLOUD',
          connection: 'Connected',
          fallbackActive: false,
          endpointBadge: 'CLOUD',
        });
      },
      () => {
        meta({ connection: 'Reconnecting' });
      }
    );

    const connRef = ref(db, '.info/connected');
    connUnsub = onValue(connRef, (snap) => {
      const c = !!snap.val();
      fbConnected = c;
      if (!c) {
        if (!disconnectSince) disconnectSince = Date.now();
      } else {
        disconnectSince = 0;
        usingLocal = false;
        meta({ connection: 'Connected', source: 'CLOUD', fallbackActive: false, endpointBadge: 'CLOUD' });
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

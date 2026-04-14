import type { Database } from 'firebase/database';
import { ref, onValue } from 'firebase/database';
import { loadClientConfig } from './clientConfig';

function trimBase(u: string) {
  return String(u || '').replace(/\/+$/, '');
}

async function fetchJson(url: string, timeoutMs: number) {
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

export interface NormalizedListrik {
  arus: number;
  tegangan: number;
  daya: number;
  daya_w: number;
  energi_kwh: number;
  frekuensi: number;
  power_factor: number;
  status: string;
  relay: 0 | 1;
  updated_at: number | null;
}

export function normalizeListrikPayload(d: Record<string, unknown> | null): NormalizedListrik {
  const arus = Number(d?.arus ?? 0);
  const teg = Number(d?.tegangan ?? 0);
  const pf = Number(d?.power_factor ?? d?.powerFactor ?? 0.85);
  const apparent = Number(d?.daya ?? arus * teg);
  const relayRaw = d?.relay;
  const relay: 0 | 1 = relayRaw === true || Number(relayRaw) === 1 ? 1 : 0;
  return {
    arus,
    tegangan: teg,
    daya: apparent,
    daya_w: apparent * pf,
    energi_kwh: Number(d?.energi_kwh ?? 0),
    frekuensi: Number(d?.frekuensi ?? 50),
    power_factor: pf,
    status: String(d?.status || 'NORMAL'),
    relay,
    updated_at: d?.updated_at != null ? Number(d.updated_at) : null,
  };
}

export function startHybridListrik(
  db: Database,
  handlers: {
    prefix?: string;
    onData: (d: NormalizedListrik) => void;
    onMeta?: (m: Record<string, unknown>) => void;
  }
): () => void {
  let disposed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let fbUnsub: (() => void) | null = null;
  let connUnsub: (() => void) | null = null;
  let fbConnected = true;
  let usingLocal = false;

  const meta = (partial: Record<string, unknown>) => handlers.onMeta?.(partial);

  const pollRest = async (base: string, label: string) => {
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
        meta({
          source: 'CLOUD',
          connection: fbConnected ? 'Connected' : 'Reconnecting',
          endpointBadge: 'CLOUD',
        });
        return;
      }
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
    } catch {
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
      void tick();
      startPolling();
      return;
    }
    if (cfg.mode === 'PUBLIC' && cfg.publicApiBase) {
      void tick();
      startPolling();
      return;
    }

    const basePath = handlers.prefix ? `/${handlers.prefix}/listrik` : '/listrik';
    const listrikRef = ref(db, basePath);
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
      if (c) {
        usingLocal = false;
        meta({
          connection: 'Connected',
          source: 'CLOUD',
          fallbackActive: false,
          endpointBadge: 'CLOUD',
        });
      }
    });

    startPolling();
    void tick();
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

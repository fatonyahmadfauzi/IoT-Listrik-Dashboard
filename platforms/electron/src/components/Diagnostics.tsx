import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Gauge, Radio, RefreshCw, ScreenShare, XCircle } from 'lucide-react';
import { useDataStore } from '../lib/store';

function Badge({ state, label }: { state: 'ok' | 'warn' | 'error'; label: string }) {
  const styles = state === 'ok' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : state === 'error' ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-200';
  const Icon = state === 'ok' ? CheckCircle2 : state === 'error' ? XCircle : AlertTriangle;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${styles}`}><Icon className="h-3.5 w-3.5" />{label}</span>;
}
const num = (v: unknown, d: number, fallback = '—') => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : fallback;
const gpio = (v: unknown, fallback: number) => Number.isInteger(Number(v)) ? Number(v) : fallback;
const pinBadgeState = (label: string): 'ok' | 'warn' | 'error' => {
  if (label === 'RESPONS VALID' || label === 'I2C MERESPONS') return 'ok';
  if (label === 'TIDAK DIKETAHUI' || label === 'TIDAK MERESPONS' || label === 'TIDAK TERDETEKSI') return 'error';
  return 'warn';
};

export function Diagnostics() {
  const { currentData: data, connectionMeta } = useDataStore();
  const status = String(data?.status || 'UNKNOWN').toUpperCase();
  const connected = String(connectionMeta?.connection || '') === 'Connected';
  const firebaseConnected = connectionMeta?.firebaseConnected === true || (connectionMeta?.firebaseConnected == null && connected);
  const updated = Number(data?.updated_at || connectionMeta?.lastDeviceSeenAt || 0);
  const age = updated > 1e12 ? Date.now() - updated : Infinity;
  const online = connected && age <= 20000;
  const meterOk = typeof data?.meter_ok === 'boolean' ? data.meter_ok : status !== 'SENSOR_ERROR' && Number(data?.tegangan) > 1;
  const sensorError = status === 'SENSOR_ERROR';
  const [release, setRelease] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [output, setOutput] = useState('Belum ada pemeriksaan firmware.');
  const checkFirmware = async () => {
    setChecking(true); setOutput('Memeriksa release firmware GitHub...');
    try { const r = await fetch('https://api.github.com/repos/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/latest', { headers: { Accept: 'application/vnd.github+json' } }); if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`); const x = await r.json(); setRelease(x); setOutput(`Release terbaru: ${x.tag_name || '—'}\nAsset release: ${(x.assets || []).map((a: any) => a.name).join(', ') || 'tidak ada asset'}\nPembaruan firmware dilakukan melalui desktop/PC menggunakan USB. Web/PWA hanya memeriksa versi dan release.`); } catch (e) { setRelease(null); setOutput(`Pemeriksaan gagal: ${e instanceof Error ? e.message : String(e)}`); } finally { setChecking(false); }
  };
  const rssi = Number(data?.wifi_rssi);
  const wifiDetail = Number.isFinite(rssi) && rssi <= 0
    ? `${rssi} dBm · ${rssi >= -60 ? 'Sangat baik' : rssi >= -70 ? 'Baik' : rssi >= -80 ? 'Lemah' : 'Sangat lemah'}`
    : 'Menunggu firmware terbaru';
  const heap = Number(data?.free_heap);
  const heapDetail = Number.isFinite(heap) && heap > 0 ? `${Math.round(heap / 1024)} KB` : 'Menunggu firmware terbaru';
  const readingStatus = sensorError ? 'SENSOR_ERROR' : status === 'UNKNOWN' ? 'Belum ada data' : status;
  const firebaseDetail = firebaseConnected ? 'Realtime Database terhubung' : 'Koneksi Firebase terputus';
  const cards = [
    { icon: Gauge, title: 'PZEM-004T', state: online && meterOk ? 'ok' as const : 'error' as const, label: online && meterOk ? 'BERFUNGSI' : 'ERROR', description: 'Sensor tegangan, arus, daya, energi, frekuensi, dan faktor daya.', rows: [['Status pembacaan', readingStatus], ['Arus / tegangan', `${num(data?.arus, 2, '0.00')} A / ${num(data?.tegangan, 1, '0.0')} V`]] },
    { icon: Cpu, title: 'ESP32 dan Wi-Fi', state: online ? 'ok' as const : 'error' as const, label: online ? 'ONLINE' : 'OFFLINE', description: 'Heartbeat perangkat dan kekuatan koneksi terakhir.', rows: [['Wi-Fi', wifiDetail], ['Heap bebas', heapDetail]] },
    { icon: ScreenShare, title: 'LCD I2C', state: data?.lcd_ok === true ? 'ok' as const : data?.lcd_ok === false ? 'error' as const : 'warn' as const, label: data?.lcd_ok === true ? 'TERDETEKSI' : data?.lcd_ok === false ? 'ERROR' : 'MENUNGGU DATA', description: 'Memeriksa respons modul pada alamat I2C yang dilaporkan ESP32.', rows: [['Alamat', data?.lcd_ok === true ? `0x${gpio(data?.lcd_address, 0x27).toString(16).toUpperCase()}` : '—'], ['Catatan', data?.lcd_ok === true ? 'Modul merespons pada bus I2C' : data?.lcd_ok === false ? 'Periksa VCC, GND, SDA, SCL, dan backpack LCD' : 'Upload firmware diagnostik terbaru']] },
    { icon: Radio, title: 'Relay dan buzzer', state: online ? 'ok' as const : 'warn' as const, label: online ? 'STATUS LOGIS' : 'TIDAK DIKETAHUI', description: 'Menampilkan status logis terakhir; keberhasilan fisik perlu uji langsung.', rows: [['Relay logis', online ? (data?.relay ? 'ON' : 'OFF') : 'Tidak ada heartbeat'], ['Buzzer', 'Tidak dapat dipastikan jarak jauh']] },
    { icon: Database, title: 'Firebase', state: firebaseConnected ? 'ok' as const : 'error' as const, label: firebaseConnected ? 'TERHUBUNG' : 'TERPUTUS', description: 'Status koneksi aplikasi ke Realtime Database.', rows: [['Koneksi', firebaseDetail], ['Sumber data', String(data?.sensor_source || 'PZEM-004T')]] },
  ];
  const lcdError = data?.lcd_ok === false;
  const overall = !firebaseConnected || !online || !meterOk || sensorError || lcdError
    ? { state: 'error' as const, label: 'PERLU PEMERIKSAAN' }
    : { state: 'ok' as const, label: 'SEMUA NORMAL' };
  const firmwareAsset = release?.assets?.find((asset: any) => /\.bin$/i.test(asset.name || ''));
  const firmwareBadge = checking
    ? { state: 'warn' as const, label: 'MEMERIKSA' }
    : !release
      ? { state: 'warn' as const, label: 'BELUM DIPERIKSA' }
      : !firmwareAsset
        ? { state: 'warn' as const, label: 'ASSET BELUM ADA' }
        : { state: 'ok' as const, label: 'ASSET TERSEDIA' };
  const pinRows = useMemo(() => [
    ['PZEM-004T · UART2', `ESP32 RX GPIO${gpio(data?.pzem_rx_pin, 16)} ← PZEM TX · ESP32 TX GPIO${gpio(data?.pzem_tx_pin, 17)} → PZEM RX`, online && meterOk ? 'RESPONS VALID' : 'TIDAK DIKETAHUI', 'Perangkat offline atau pembacaan tidak valid; respons UART tidak dapat dipastikan.'],
    ['LCD 1602 · I2C', `SDA GPIO${gpio(data?.lcd_sda_pin, 21)} · SCL GPIO${gpio(data?.lcd_scl_pin, 22)}`, data?.lcd_ok === true ? 'I2C MERESPONS' : data?.lcd_ok === false ? 'TIDAK TERDETEKSI' : 'MENUNGGU', 'LCD merespons berdasarkan status yang dilaporkan firmware.'],
    ['Relay utama', `Output GPIO${gpio(data?.relay_pin, 26)}`, online ? 'STATUS LOGIS' : 'TIDAK DIKETAHUI', 'Firmware hanya mengetahui level output; kontak fisik memerlukan uji langsung.'],
    ['Buzzer', `Output GPIO${gpio(data?.buzzer_pin, 25)}`, 'TERKONFIGURASI', 'Firmware mengetahui perintah GPIO, tetapi tidak dapat memastikan suara secara fisik.'],
  ], [data, online, meterOk]);
  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300"><Activity className="h-4 w-4" /> Diagnostik Sistem</div><h3 className="text-xl font-black text-white">Pemeriksaan kesehatan perangkat</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Pemeriksaan ini membaca data terbaru dan status logis koneksi. Pemeriksaan tidak menyalakan beban atau memastikan kondisi fisik LCD, relay, dan buzzer.</p></div><Badge state={overall.state} label={overall.label} /></div><div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">Pembaruan perangkat: {updated > 1e12 ? `${new Date(updated).toLocaleString('id-ID')} · ${Math.max(0, Math.round(age / 1000))} detik lalu` : 'Belum ada timestamp'}</div></section>
    <section className="grid gap-4 xl:grid-cols-6 md:grid-cols-2">{cards.map(({ icon: Icon, title, state, label, description, rows }) => <article key={title} className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"><div className="mb-4 flex items-start justify-between gap-2"><div className="grid h-10 w-10 place-items-center rounded-lg border border-sky-400/25 bg-sky-500/10 text-sky-200"><Icon className="h-5 w-5" /></div><Badge state={state} label={label} /></div><h4 className="font-black text-white">{title}</h4><p className="mt-2 text-sm text-slate-400">{description}</p><dl className="mt-6 grid gap-3 border-t border-slate-800 pt-3 text-sm">{rows.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-4"><dt className="text-slate-500">{key}</dt><dd className="text-right font-bold text-slate-100">{value}</dd></div>)}</dl></article>)}</section>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4"><div><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300"><Activity className="h-4 w-4" /> Konfigurasi Hardware</div><h3 className="text-lg font-black text-white">Pemetaan Pin Firmware</h3><p className="mt-1 text-sm text-slate-400">Menampilkan GPIO yang diuji firmware dan hasil respons komponennya. Informasi ini tidak mendeteksi lokasi kabel pada GPIO lain secara otomatis.</p></div><Badge state={overall.state} label={overall.label} /></div><div className="mt-4 grid gap-3 md:grid-cols-2">{pinRows.map(([title, path, state, note]) => <article key={title} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-start justify-between gap-3"><div><strong className="block text-sm text-white">{title}</strong><code className="mt-1 block text-xs text-sky-200">{path}</code></div><Badge state={pinBadgeState(state)} label={state} /></div><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></article>)}</div></section>
    <section className="rounded-xl border border-slate-800 bg-amber-500/5 p-4 text-sm text-amber-100"><div className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Pin di atas adalah pin yang dikonfigurasi dan diuji dalam firmware, bukan hasil deteksi otomatis jalur kabel fisik.</span></div></section>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300"><ScreenShare className="h-4 w-4" /> Firmware Release</div><h3 className="text-lg font-black text-white">Pemeriksaan Firmware ESP32</h3><p className="mt-1 text-sm text-slate-400">Membandingkan versi perangkat dengan release GitHub. Pemeriksaan ini tidak mengubah firmware.</p></div><Badge state={firmwareBadge.state} label={firmwareBadge.label} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-xs text-slate-500">Versi terpasang</span><strong className="mt-1 block text-sm text-white">{data?.firmware_version || 'Belum dilaporkan'}</strong></div><div><span className="text-xs text-slate-500">Release GitHub</span><strong className="mt-1 block text-sm text-white">{release?.tag_name || 'Belum diperiksa'}</strong></div><div><span className="text-xs text-slate-500">Asset firmware</span><strong className="mt-1 block break-words text-sm text-white">{firmwareAsset?.name || 'Belum tersedia di GitHub Release'}</strong></div><div><span className="text-xs text-slate-500">Target board</span><strong className="mt-1 block text-sm text-white">{data?.firmware_board || 'ESP32 Dev Module'}</strong></div></div><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => void checkFirmware()} disabled={checking} className="flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 font-bold text-slate-200 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />Cek Versi Firmware</button><button disabled title="Update dilakukan melalui desktop/PC menggunakan USB" className="flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><ScreenShare className="h-4 w-4" />Update melalui Desktop/PC</button></div><pre className="mt-4 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-sky-500/20 bg-[#03070c] p-3 font-mono text-xs leading-6 text-slate-300">{output}</pre></section>
  </div>;
}

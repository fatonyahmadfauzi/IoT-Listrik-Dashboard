import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Link2Off, RefreshCw, Search, Trash2, Usb } from 'lucide-react';

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  setSignals?: (signals: { requestToSend?: boolean; dataTerminalReady?: boolean }) => Promise<void>;
};

type FilterType = 'ALL' | 'ERROR' | 'WARNING' | 'FIREBASE' | 'PZEM' | 'LCD' | 'RELAY';
type SerialLine = { text: string; type: FilterType };

declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPortLike>;
      addEventListener?: (name: string, fn: (event: { target: SerialPortLike }) => void) => void;
    };
  }
}

function classify(line: string): FilterType {
  const upper = line.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('GAGAL') || upper.includes('FAILED') || upper.includes('TIDAK DAPAT') || upper.includes('401') || upper.includes('403')) return 'ERROR';
  if (upper.includes('WARN') || upper.includes('PERINGATAN') || upper.includes('TERPUTUS')) return 'WARNING';
  if (upper.includes('FIREBASE')) return 'FIREBASE';
  if (upper.includes('PZEM') || upper.includes('[MONITOR]')) return 'PZEM';
  if (upper.includes('LCD') || upper.includes('I2C')) return 'LCD';
  if (upper.includes('RELAY')) return 'RELAY';
  return 'ALL';
}

const lineColor: Record<FilterType, string> = {
  ALL: 'text-slate-300', ERROR: 'text-red-300', WARNING: 'text-amber-200',
  FIREBASE: 'text-sky-300', PZEM: 'text-emerald-300', LCD: 'text-violet-300', RELAY: 'text-orange-300',
};

export function SerialMonitor() {
  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readTaskRef = useRef<Promise<void> | null>(null);
  const terminalRef = useRef<HTMLPreElement | null>(null);
  const mountedRef = useRef(true);
  const [lines, setLines] = useState<SerialLine[]>([]);
  const [baud, setBaud] = useState('115200');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const addLine = (line: string) => {
    if (!line.trim() || !mountedRef.current) return;
    const type = classify(line);
    const stamped = `[${new Date().toLocaleTimeString('id-ID', { hour12: false })}] ${line.replace(/\r/g, '')}`;
    setLines((old) => [...old.slice(-1999), { text: stamped, type }]);
  };

  const readLoop = async (active: SerialPortLike) => {
    const decoder = new TextDecoder();
    let pending = '';
    while (portRef.current === active && active.readable) {
      const reader = active.readable.getReader();
      readerRef.current = reader;
      try {
        while (portRef.current === active) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const chunks = pending.split(/\n/);
          pending = chunks.pop() || '';
          chunks.forEach(addLine);
        }
      } catch (error) {
        if (portRef.current === active) addLine(`[Serial] Gagal membaca port: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        try { reader.releaseLock(); } catch {}
        readerRef.current = null;
      }
    }
  };

  const connect = async () => {
    if (!navigator.serial || busy) {
      setNotice('Web Serial tidak tersedia. Gunakan aplikasi Windows pada komputer yang memiliki port USB.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const selected = await navigator.serial.requestPort();
      await selected.open({ baudRate: Number(baud) });
      portRef.current = selected;
      setConnected(true);
      addLine(`[Serial] Port terhubung pada baud rate ${baud}.`);
      readTaskRef.current = readLoop(selected);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLine(`[Serial] Tidak dapat membuka port: ${message}`);
      if (!/abort/i.test(message)) setNotice('Port gagal dibuka. Tutup Arduino Serial Monitor, Serial Plotter, PlatformIO, atau aplikasi lain yang memakai COM, kemudian coba kembali.');
    } finally { setBusy(false); }
  };

  const disconnect = async (announce = true) => {
    const active = portRef.current;
    if (!active) return true;
    setBusy(true);
    portRef.current = null;
    setConnected(false);
    try { await Promise.race([readerRef.current?.cancel() || Promise.resolve(), new Promise((resolve) => setTimeout(resolve, 800))]); } catch {}
    try { await Promise.race([readTaskRef.current || Promise.resolve(), new Promise((resolve) => setTimeout(resolve, 800))]); } catch {}
    try { readerRef.current?.releaseLock(); } catch {}
    readerRef.current = null;
    readTaskRef.current = null;
    try {
      if (active.readable || active.writable) await Promise.race([active.close(), new Promise((_, reject) => setTimeout(() => reject(new Error('driver COM tidak merespons')), 1500))]);
      if (announce) addLine('[Serial] Port diputuskan dengan aman.');
      setBusy(false);
      return true;
    } catch (error) {
      portRef.current = active;
      setConnected(true);
      addLine(`[Serial] Port belum dapat ditutup: ${error instanceof Error ? error.message : String(error)}`);
      setNotice('Driver COM tidak merespons proses pemutusan. Tutup aplikasi atau cabut-pasang kabel USB untuk melepaskan port.');
      setBusy(false);
      return false;
    }
  };

  const reset = async () => {
    const active = portRef.current;
    if (!active?.setSignals) { addLine('[Serial] Reset melalui RTS tidak didukung oleh adapter ini. Gunakan tombol EN/RESET.'); return; }
    try {
      addLine('[Serial] Mengirim pulsa reset ESP32 melalui RTS...');
      await active.setSignals({ requestToSend: true });
      await new Promise((resolve) => setTimeout(resolve, 120));
      await active.setSignals({ requestToSend: false });
      addLine('[Serial] Pulsa reset selesai. Menunggu keluaran boot ESP32...');
    } catch (error) { addLine(`[Serial] Reset gagal: ${error instanceof Error ? error.message : String(error)}`); }
  };

  useEffect(() => () => { mountedRef.current = false; void disconnect(false); }, []);

  const visible = useMemo(() => lines.filter((line) => {
    if (filter !== 'ALL' && line.type !== filter) return false;
    return !query.trim() || line.text.toLowerCase().includes(query.trim().toLowerCase());
  }), [lines, query, filter]);
  const errorCount = useMemo(() => lines.filter((line) => line.type === 'ERROR').length, [lines]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [visible, autoScroll]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([lines.map((line) => line.text).join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `serial-monitor-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300"><Usb className="h-4 w-4" /> USB Web Serial</div><h3 className="text-xl font-black text-white">Serial Monitor ESP32</h3><p className="mt-1 max-w-5xl text-sm leading-6 text-slate-400">Membaca keluaran mentah ESP32 melalui kabel USB. Saat berpindah menu, port ditutup dengan aman terlebih dahulu pada halaman yang sama. Hubungkan kembali port ketika kembali ke halaman ini. Tutup Arduino Serial Monitor karena satu port hanya dapat dipakai satu aplikasi.</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${connected ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>{connected ? 'TERHUBUNG' : 'BELUM TERHUBUNG'}</span></div>
    </section>
    {notice && <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{notice}</section>}
    <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2 xl:grid-cols-[160px_repeat(5,auto)] xl:items-end">
      <label className="grid gap-1 text-xs font-bold text-slate-400">Baud rate<select value={baud} onChange={(e) => setBaud(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"><option>9600</option><option>57600</option><option>115200</option><option>230400</option></select></label>
      <button onClick={connect} disabled={connected || busy} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 font-bold text-white disabled:opacity-40"><Usb className="h-4 w-4" />Hubungkan Port</button>
      <button onClick={() => void disconnect()} disabled={!connected || busy} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 font-bold text-slate-200 disabled:opacity-40"><Link2Off className="h-4 w-4" />Putuskan</button>
      <button onClick={reset} disabled={!connected || busy} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 font-bold text-slate-200 disabled:opacity-40"><RefreshCw className="h-4 w-4" />Reset ESP32</button>
      <button onClick={() => setLines([])} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 font-bold text-slate-200"><Trash2 className="h-4 w-4" />Bersihkan</button>
      <button onClick={download} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 font-bold text-slate-200"><Download className="h-4 w-4" />Unduh TXT</button>
    </section>
    <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 lg:grid-cols-[minmax(240px,1fr)_240px_auto] lg:items-end">
      <label className="grid gap-1 text-xs font-bold text-slate-400"><span>Cari keluaran</span><span className="flex items-center gap-2"><Search className="h-4 w-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Firebase, PZEM, LCD, error..." className="h-10 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none" /></span></label>
      <label className="grid gap-1 text-xs font-bold text-slate-400">Filter<select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"><option value="ALL">Semua keluaran</option><option value="ERROR">Error</option><option value="WARNING">Peringatan</option><option value="FIREBASE">Firebase</option><option value="PZEM">PZEM</option><option value="LCD">LCD / I2C</option><option value="RELAY">Relay</option></select></label>
      <label className="flex h-10 items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-sky-500" />Gulir otomatis</label>
    </section>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-black text-white">Keluaran serial</h4><p className="mt-1 text-xs text-slate-500">Format waktu ditambahkan oleh aplikasi; isi pesan berasal langsung dari ESP32.</p></div><div className="flex gap-2 text-xs text-slate-400"><span className="rounded-lg border border-slate-800 px-2.5 py-1"><b className="text-white">{lines.length}</b> baris</span><span className="rounded-lg border border-slate-800 px-2.5 py-1"><b className="text-white">{errorCount}</b> error</span></div></div>
      <pre ref={terminalRef} className="min-h-[430px] max-h-[62vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-sky-500/20 bg-[#03070c] p-4 font-mono text-xs leading-relaxed">{visible.length ? visible.map((line, index) => <span key={`${index}-${line.text}`} className={`block ${lineColor[line.type]}`}>{line.text}</span>) : <span className="text-slate-500">Belum ada keluaran yang sesuai filter.</span>}</pre>
    </section>
  </div>;
}

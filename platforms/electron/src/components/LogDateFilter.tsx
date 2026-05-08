import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

type DateFilterMode = 'all' | 'today' | '7d' | '30d' | 'date';

type LogLike = {
  timestamp?: number;
  waktu?: number;
  time?: number;
  created_at?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const presets: Array<{ key: DateFilterMode; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toTimestamp(log: LogLike) {
  const values = [log.timestamp, log.waktu, log.time, log.created_at];
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function dateKeyFromTimestamp(timestamp: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function getRange(mode: DateFilterMode, selectedDateKey: string) {
  const now = Date.now();
  if (mode === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (mode === '7d') return { start: startOfDay(now - 6 * DAY_MS), end: endOfDay(now) };
  if (mode === '30d') return { start: startOfDay(now - 29 * DAY_MS), end: endOfDay(now) };
  if (mode === 'date' && selectedDateKey) {
    const selected = new Date(`${selectedDateKey}T00:00:00`);
    const timestamp = selected.getTime();
    return { start: startOfDay(timestamp), end: endOfDay(timestamp) };
  }
  return null;
}

function formatDateLabel(dateKey: string) {
  if (!dateKey) return 'Tanggal belum dipilih';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Tanggal belum dipilih';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthLabel(monthKey: string) {
  const date = parseMonthKey(monthKey);
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export function useLogDateFilter<T extends LogLike>(logs: T[]) {
  const [mode, setMode] = useState<DateFilterMode>('all');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [monthKey, setMonthKey] = useState(monthKeyFromDate(new Date()));

  const decoratedLogs = useMemo(
    () =>
      logs.map((log) => {
        const timestamp = toTimestamp(log);
        return {
          log,
          timestamp,
          dateKey: dateKeyFromTimestamp(timestamp),
        };
      }),
    [logs]
  );

  const availableCounts = useMemo(() => {
    const counts = new Map<string, number>();
    decoratedLogs.forEach((entry) => {
      if (!entry.dateKey) return;
      counts.set(entry.dateKey, (counts.get(entry.dateKey) || 0) + 1);
    });
    return counts;
  }, [decoratedLogs]);

  const latestDateKey = useMemo(() => {
    const keys = [...availableCounts.keys()].sort();
    return keys.length ? keys[keys.length - 1] : '';
  }, [availableCounts]);

  useEffect(() => {
    if (latestDateKey && mode === 'all') {
      setMonthKey(latestDateKey.slice(0, 7));
    }
  }, [latestDateKey, mode]);

  useEffect(() => {
    if (mode === 'date' && selectedDateKey && !availableCounts.has(selectedDateKey)) {
      setSelectedDateKey('');
      setMode('all');
    }
  }, [availableCounts, mode, selectedDateKey]);

  const range = useMemo(() => getRange(mode, selectedDateKey), [mode, selectedDateKey]);

  const filteredLogs = useMemo(() => {
    if (!range) return logs;
    return decoratedLogs
      .filter((entry) => entry.timestamp >= range.start && entry.timestamp <= range.end)
      .map((entry) => entry.log);
  }, [decoratedLogs, logs, range]);

  const summary = useMemo(() => {
    if (mode === 'all') return `Semua data (${filteredLogs.length} log)`;
    if (mode === 'today') return `Hari ini (${filteredLogs.length} log)`;
    if (mode === '7d') return `7 hari terakhir (${filteredLogs.length} log)`;
    if (mode === '30d') return `30 hari terakhir (${filteredLogs.length} log)`;
    return `${formatDateLabel(selectedDateKey)} (${filteredLogs.length} log)`;
  }, [filteredLogs.length, mode, selectedDateKey]);

  return {
    mode,
    setMode,
    selectedDateKey,
    setSelectedDateKey,
    monthKey,
    setMonthKey,
    filteredLogs,
    availableCounts,
    summary,
  };
}

type LogDateFilterProps<T extends LogLike> = {
  title: string;
  subtitle: string;
  filter: ReturnType<typeof useLogDateFilter<T>>;
};

export function LogDateFilter<T extends LogLike>({ title, subtitle, filter }: LogDateFilterProps<T>) {
  const monthDate = parseMonthKey(filter.monthKey);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKeyFromTimestamp(Date.now());
  const leadingCells = Array.from({ length: firstDay });
  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
    return {
      day,
      dateKey,
      count: filter.availableCounts.get(dateKey) || 0,
      isToday: dateKey === todayKey,
      isSelected: filter.mode === 'date' && filter.selectedDateKey === dateKey,
    };
  });

  const shiftMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    filter.setMonthKey(monthKeyFromDate(next));
  };

  const selectDay = (dateKey: string, count: number) => {
    if (!count) return;
    filter.setSelectedDateKey(dateKey);
    filter.setMode('date');
  };

  return (
    <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-xl">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-sky-200">
            <CalendarDays className="h-4 w-4" />
            Filter Kalender
          </div>
          <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => filter.setMode(preset.key)}
                className={`h-10 rounded-lg border px-4 text-sm font-black transition ${
                  filter.mode === preset.key
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-100'
                    : 'border-slate-700 bg-slate-950/35 text-slate-300 hover:border-sky-500/45 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-slate-700/75 bg-slate-950/35 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Data aktif</p>
            <p className="mt-2 text-sm font-bold text-slate-100">{filter.summary}</p>
            <p className="mt-1 text-xs text-slate-500">
              Tanggal abu-abu tidak memiliki data dan tidak bisa dipilih.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/75 bg-slate-950/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-sky-500/45 hover:text-white"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-white">{formatMonthLabel(filter.monthKey)}</p>
              <input
                type="month"
                value={filter.monthKey}
                onChange={(event) => filter.setMonthKey(event.target.value || monthKeyFromDate(new Date()))}
                className="mt-2 h-9 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-xs font-bold text-slate-200 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-sky-500/45 hover:text-white"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-[0.06em] text-slate-500">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {leadingCells.map((_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {dayCells.map((cell) => (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!cell.count}
                onClick={() => selectDay(cell.dateKey, cell.count)}
                className={`min-h-11 rounded-lg border px-1 text-xs font-black transition ${
                  cell.isSelected
                    ? 'border-sky-300 bg-sky-500/35 text-white shadow-[0_0_18px_rgba(56,189,248,0.22)]'
                    : cell.count
                    ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-sky-500/55 hover:bg-sky-500/15'
                    : 'cursor-not-allowed border-slate-800 bg-slate-950/30 text-slate-700'
                }`}
              >
                <span>{cell.day}</span>
                {cell.count ? (
                  <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-sky-300" />
                ) : null}
                {cell.isToday && !cell.isSelected ? (
                  <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * date-filter.js
 * Shared log date/range filter for History and Analytics pages.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESETS = [
  { key: "all", label: "Semua" },
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toTimestamp(entry = {}) {
  const value = entry.waktu ?? entry.timestamp ?? entry.updated_at ?? entry.createdAt ?? entry.created_at;
  if (value === undefined || value === null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const localDate = parseLocalDateTime(value);
  if (localDate) return localDate;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLocalDateTime(value) {
  const match = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4}),?\s+(\d{1,2})[.:](\d{1,2})(?:[.:](\d{1,2}))?/);
  if (!match) return 0;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dateKeyFromTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!year || !month) return new Date();
  return new Date(year, month - 1, 1);
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDay(timestamp) {
  return startOfDay(timestamp) + DAY_MS - 1;
}

function formatDateLabel(dateKey) {
  if (!dateKey) return "Semua data";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMonthLabel(monthKey) {
  const date = parseMonthKey(monthKey);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function formatRangeLabel(range) {
  if (!range || range.mode === "all") return "Semua data tersedia";
  if (range.mode === "today") return "Hari ini";
  if (range.mode === "7d") return "7 hari terakhir";
  if (range.mode === "30d") return "30 hari terakhir";
  if (range.mode === "date") return formatDateLabel(range.dateKey);
  return "Periode terpilih";
}

function getRange(mode, selectedDateKey) {
  const now = Date.now();
  if (mode === "today") return { mode, start: startOfDay(now), end: endOfDay(now) };
  if (mode === "7d") return { mode, start: startOfDay(now - 6 * DAY_MS), end: endOfDay(now) };
  if (mode === "30d") return { mode, start: startOfDay(now - 29 * DAY_MS), end: endOfDay(now) };
  if (mode === "date" && selectedDateKey) {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    const start = new Date(year, month - 1, day).getTime();
    return { mode, dateKey: selectedDateKey, start, end: start + DAY_MS - 1 };
  }
  return { mode: "all", start: 0, end: Number.MAX_SAFE_INTEGER };
}

function decorateLogs(logs) {
  return logs
    .map((entry) => {
      const timestamp = toTimestamp(entry);
      return {
        entry,
        timestamp,
        dateKey: dateKeyFromTimestamp(timestamp),
      };
    })
    .filter((item) => item.timestamp > 0 && item.dateKey);
}

export function createLogDateFilter(options = {}) {
  const root = options.root;
  const onChange = typeof options.onChange === "function" ? options.onChange : () => {};
  if (!root) {
    return {
      setLogs: (logs = []) => onChange(logs, { mode: "all", label: "Semua data tersedia", count: logs.length }),
      getFilteredLogs: () => [],
    };
  }

  const title = root.dataset.title || "Filter Tanggal";
  const subtitle = root.dataset.subtitle || "Pilih periode untuk menyesuaikan grafik dan tabel.";
  let logs = [];
  let decorated = [];
  let mode = options.defaultMode || "all";
  let selectedDateKey = "";
  let monthKey = monthKeyFromDate(new Date());
  let availableCounts = new Map();
  let lastFiltered = [];

  root.innerHTML = `
    <div class="date-filter-header">
      <div>
        <span class="date-filter-eyebrow">Filter Data</span>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="date-filter-summary" data-date-summary>
        <strong>0 log</strong>
        <span>Belum ada tanggal aktif</span>
      </div>
    </div>
    <div class="date-filter-controls" aria-label="Filter cepat periode data">
      <div class="date-filter-presets">
        ${PRESETS.map((preset) => `<button type="button" class="date-filter-preset" data-date-preset="${preset.key}">${preset.label}</button>`).join("")}
      </div>
      <label class="date-filter-month">
        <span class="date-filter-month-label">Bulan</span>
        <span class="date-filter-month-shell">
          <span class="date-filter-month-text" data-date-month-label>${formatMonthLabel(monthKey)}</span>
          <span class="material-symbols-rounded date-filter-month-icon" aria-hidden="true">calendar_month</span>
          <input type="month" data-date-month aria-label="Pilih bulan data log" />
        </span>
      </label>
    </div>
    <div class="date-filter-calendar" data-date-calendar aria-label="Kalender tanggal data log"></div>
  `;

  const summaryEl = root.querySelector("[data-date-summary]");
  const monthInput = root.querySelector("[data-date-month]");
  const monthLabelEl = root.querySelector("[data-date-month-label]");
  const calendarEl = root.querySelector("[data-date-calendar]");
  const presetButtons = Array.from(root.querySelectorAll("[data-date-preset]"));

  function updateMonthControl() {
    if (monthInput && monthInput.value !== monthKey) monthInput.value = monthKey;
    if (monthLabelEl) monthLabelEl.textContent = formatMonthLabel(monthKey);
  }

  function rebuildAvailableDates() {
    availableCounts = new Map();
    decorated.forEach((item) => {
      availableCounts.set(item.dateKey, (availableCounts.get(item.dateKey) || 0) + 1);
    });

    if (!availableCounts.has(selectedDateKey)) selectedDateKey = "";

    const latest = decorated.reduce((newest, item) => (
      !newest || item.timestamp > newest.timestamp ? item : newest
    ), null);
    if (latest && !monthInput.value) monthKey = latest.dateKey.slice(0, 7);
    updateMonthControl();
  }

  function currentFiltered() {
    const range = getRange(mode, selectedDateKey);
    if (range.mode === "all") return logs.slice();
    return logs.filter((entry) => {
      const timestamp = toTimestamp(entry);
      return timestamp >= range.start && timestamp <= range.end;
    });
  }

  function updateSummary(filtered) {
    if (!summaryEl) return;
    const activeDays = availableCounts.size;
    const range = getRange(mode, selectedDateKey);
    summaryEl.innerHTML = `
      <strong>${filtered.length} log</strong>
      <span>${formatRangeLabel(range)} · ${activeDays} tanggal berdata</span>
    `;
  }

  function renderPresets() {
    presetButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.datePreset === mode);
      button.setAttribute("aria-pressed", String(button.dataset.datePreset === mode));
    });
  }

  function renderCalendar() {
    if (!calendarEl) return;

    updateMonthControl();
    const monthDate = parseMonthKey(monthKey);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = dateKeyFromTimestamp(Date.now());
    const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const cells = [];

    weekDays.forEach((day) => {
      cells.push(`<span class="date-filter-weekday">${day}</span>`);
    });

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<span class="date-filter-day placeholder" aria-hidden="true"></span>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
      const count = availableCounts.get(dateKey) || 0;
      const hasData = count > 0;
      const isSelected = mode === "date" && selectedDateKey === dateKey;
      const isToday = todayKey === dateKey;

      cells.push(`
        <button
          type="button"
          class="date-filter-day ${hasData ? "has-data" : "no-data"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}"
          data-date-key="${dateKey}"
          ${hasData ? "" : "disabled"}
          aria-label="${hasData ? `${formatDateLabel(dateKey)}, ${count} log` : `${formatDateLabel(dateKey)}, tidak ada data`}"
        >
          <span>${day}</span>
          ${hasData ? `<small>${count}</small>` : ""}
        </button>
      `);
    }

    calendarEl.innerHTML = cells.join("");
  }

  function apply() {
    renderPresets();
    renderCalendar();
    lastFiltered = currentFiltered();
    updateSummary(lastFiltered);
    onChange(lastFiltered, {
      mode,
      selectedDateKey,
      monthKey,
      label: formatRangeLabel(getRange(mode, selectedDateKey)),
      count: lastFiltered.length,
      activeDays: availableCounts.size,
    });
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.datePreset || "all";
      selectedDateKey = "";
      apply();
    });
  });

  monthInput?.addEventListener("change", () => {
    monthKey = monthInput.value || monthKeyFromDate(new Date());
    updateMonthControl();
    renderCalendar();
  });

  calendarEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date-key]");
    if (!button || button.disabled) return;
    selectedDateKey = button.dataset.dateKey;
    mode = "date";
    apply();
  });

  return {
    setLogs(nextLogs = []) {
      logs = Array.isArray(nextLogs) ? nextLogs.slice() : [];
      decorated = decorateLogs(logs);
      rebuildAvailableDates();
      apply();
    },
    getFilteredLogs() {
      return lastFiltered.slice();
    },
    getState() {
      return { mode, selectedDateKey, monthKey, activeDays: availableCounts.size };
    },
  };
}

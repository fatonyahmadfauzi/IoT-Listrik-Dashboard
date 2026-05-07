/**
 * charts.js
 * ─────────────────────────────────────────────────────────────
 * Chart.js realtime sliding-window chart with zoom/pan support.
 * Requires:
 *   - chart.js (loaded via CDN in HTML)
 *   - chartjs-plugin-zoom (wraps hammerjs)
 * ─────────────────────────────────────────────────────────────
 */

const MAX_POINTS = 30; // number of visible data points in realtime mode

// ─── Chart Colors ────────────────────────────────────────────
const COLORS = {
  green:  { border: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  blue:   { border: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  yellow: { border: '#fcd34d', bg: 'rgba(252,211,77,0.10)' },
  purple: { border: '#a78bfa', bg: 'rgba(167,139,250,0.09)' },
  cyan:   { border: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  orange: { border: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
};

/**
 * Build Chart.js defaults for dark theme.
 */
function applyDarkDefaults() {
  Chart.defaults.color           = '#94a3b8';
  Chart.defaults.borderColor     = 'rgba(255,255,255,0.07)';
  Chart.defaults.font.family     = "'JetBrains Mono', 'Inter', monospace";
  Chart.defaults.font.size       = 12;
}

/**
 * Create the main realtime monitoring chart.
 * @param {HTMLCanvasElement} canvas
 * @returns {Chart}
 */
function createRealtimeChart(canvas) {
  applyDarkDefaults();

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label:           'Arus (A)',
          data:            [],
          borderColor:     COLORS.green.border,
          backgroundColor: COLORS.green.bg,
          borderWidth:     2,
          tension:         0.4,
          fill:            true,
          pointRadius:     3,
          pointHoverRadius:6,
          yAxisID:         'yA',
        },
        {
          label:           'Tegangan (V)',
          data:            [],
          borderColor:     COLORS.blue.border,
          backgroundColor: COLORS.blue.bg,
          borderWidth:     2,
          tension:         0.4,
          fill:            true,
          pointRadius:     3,
          pointHoverRadius:6,
          yAxisID:         'yV',
        },
        {
          label:           'Daya Aktif (W)',
          data:            [],
          borderColor:     COLORS.yellow.border,
          backgroundColor: COLORS.yellow.bg,
          borderWidth:     2,
          tension:         0.4,
          fill:            false,
          pointRadius:     2,
          pointHoverRadius:5,
          yAxisID:         'yP',
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 300 },
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', boxWidth: 14, padding: 16 },
        },
        tooltip: {
          backgroundColor: 'rgba(13,20,36,0.95)',
          borderColor:     'rgba(255,255,255,0.12)',
          borderWidth:     1,
          padding:         12,
          callbacks: {
            label: ctx => {
              const u = ctx.datasetIndex === 0 ? ' A' : ctx.datasetIndex === 1 ? ' V' : ' W';
              return ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}${u}`;
            },
          },
        },
        // Zoom/pan plugin config (requires chartjs-plugin-zoom)
        zoom: {
          pan:  { enabled: true, mode: 'x' },
          zoom: {
            wheel:  { enabled: true },
            pinch:  { enabled: true },
            mode:   'x',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxRotation: 0, maxTicksLimit: 8 },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        yA: {
          type:     'linear',
          position: 'left',
          beginAtZero: true,
          title:    { display: true, text: 'Arus (A)', color: COLORS.green.border },
          ticks:    { color: COLORS.green.border },
          grid:     { color: 'rgba(255,255,255,0.05)' },
        },
        yV: {
          type:     'linear',
          position: 'right',
          beginAtZero: true,
          title:    { display: true, text: 'Tegangan (V)', color: COLORS.blue.border },
          ticks:    { color: COLORS.blue.border },
          grid:     { drawOnChartArea: false },
        },
        yP: {
          type:     'linear',
          position: 'right',
          offset:   true,
          beginAtZero: true,
          title:    { display: true, text: 'Daya Aktif (W)', color: COLORS.yellow.border },
          ticks:    { color: COLORS.yellow.border },
          grid:     { drawOnChartArea: false },
        },
      },
    },
  });
}

/**
 * Create the secondary realtime chart for slower/supporting electrical metrics.
 * Kept separate from the main chart because kWh, PF, Hz, and VA use very
 * different scales.
 * @param {HTMLCanvasElement} canvas
 * @returns {Chart}
 */
function createRealtimeDetailChart(canvas) {
  applyDarkDefaults();

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label:           'Energi (kWh)',
          data:            [],
          borderColor:     COLORS.purple.border,
          backgroundColor: COLORS.purple.bg,
          borderWidth:     2,
          tension:         0.35,
          fill:            false,
          pointRadius:     2,
          pointHoverRadius:5,
          yAxisID:         'yKwh',
        },
        {
          label:           'Power Factor',
          data:            [],
          borderColor:     COLORS.green.border,
          backgroundColor: COLORS.green.bg,
          borderWidth:     2,
          tension:         0.35,
          fill:            false,
          pointRadius:     2,
          pointHoverRadius:5,
          yAxisID:         'yPf',
        },
        {
          label:           'Frekuensi (Hz)',
          data:            [],
          borderColor:     COLORS.cyan.border,
          backgroundColor: COLORS.cyan.bg,
          borderWidth:     2,
          tension:         0.35,
          fill:            false,
          pointRadius:     2,
          pointHoverRadius:5,
          yAxisID:         'yHz',
        },
        {
          label:           'Apparent (VA)',
          data:            [],
          borderColor:     COLORS.orange.border,
          backgroundColor: COLORS.orange.bg,
          borderWidth:     2,
          tension:         0.35,
          fill:            false,
          pointRadius:     2,
          pointHoverRadius:5,
          yAxisID:         'yVa',
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 250 },
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', boxWidth: 14, padding: 14 },
        },
        tooltip: {
          backgroundColor: 'rgba(13,20,36,0.95)',
          borderColor:     'rgba(255,255,255,0.12)',
          borderWidth:     1,
          padding:         12,
          callbacks: {
            label: ctx => {
              const units = [' kWh', '', ' Hz', ' VA'];
              const decimals = ctx.datasetIndex === 0 ? 3 : ctx.datasetIndex === 1 ? 2 : 1;
              return ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(decimals)}${units[ctx.datasetIndex]}`;
            },
          },
        },
        zoom: {
          pan:  { enabled: true, mode: 'x' },
          zoom: {
            wheel:  { enabled: true },
            pinch:  { enabled: true },
            mode:   'x',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxRotation: 0, maxTicksLimit: 8 },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        yKwh: {
          type:     'linear',
          position: 'left',
          beginAtZero: true,
          title:    { display: true, text: 'Energi (kWh)', color: COLORS.purple.border },
          ticks:    { color: COLORS.purple.border },
          grid:     { color: 'rgba(255,255,255,0.05)' },
        },
        yPf: {
          type:     'linear',
          position: 'right',
          min:      0,
          max:      1,
          title:    { display: true, text: 'PF', color: COLORS.green.border },
          ticks:    { color: COLORS.green.border },
          grid:     { drawOnChartArea: false },
        },
        yHz: {
          type:     'linear',
          position: 'right',
          offset:   true,
          suggestedMin: 45,
          suggestedMax: 65,
          title:    { display: true, text: 'Hz', color: COLORS.cyan.border },
          ticks:    { color: COLORS.cyan.border },
          grid:     { drawOnChartArea: false },
        },
        yVa: {
          type:     'linear',
          position: 'left',
          display:  false,
          beginAtZero: true,
          grid:     { drawOnChartArea: false },
        },
      },
    },
  });
}

/**
 * Push a new data point to the realtime chart.
 * Maintains a sliding window of MAX_POINTS.
 * @param {Chart}  chart
 * @param {string} label  - time label (HH:MM:SS)
 * @param {number} arus   - current (A)
 * @param {number} tegangan - voltage (V)
 * @param {number} dayaW    - active power (W)
 */
function pushRealtimeData(chart, label, arus, tegangan, dayaW) {
  const data = chart.data;

  // Trim to sliding window
  if (data.labels.length >= MAX_POINTS) {
    data.labels.shift();
    data.datasets[0].data.shift();
    data.datasets[1].data.shift();
    data.datasets[2].data.shift();
  }

  data.labels.push(label);
  data.datasets[0].data.push(arus);
  data.datasets[1].data.push(tegangan);
  data.datasets[2].data.push(Number(dayaW) || 0);

  chart.update('none'); // 'none' = no animation → smoother realtime feel
}

/**
 * Push supporting electrical metrics to the secondary realtime chart.
 * @param {Chart} chart
 * @param {string} label
 * @param {object} d
 */
function pushRealtimeDetailData(chart, label, d) {
  const data = chart.data;

  if (data.labels.length >= MAX_POINTS) {
    data.labels.shift();
    data.datasets.forEach((dataset) => dataset.data.shift());
  }

  data.labels.push(label);
  data.datasets[0].data.push(Number(d?.energi_kwh) || 0);
  data.datasets[1].data.push(Number(d?.power_factor) || 0);
  data.datasets[2].data.push(Number(d?.frekuensi) || 0);
  data.datasets[3].data.push(Number(d?.daya) || 0);

  chart.update('none');
}

/**
 * Load history data into the chart (replaces all current data).
 * @param {Chart}   chart
 * @param {Array}   logs  - array of { waktu, arus, tegangan }
 */
function loadHistoryIntoChart(chart, logs) {
  chart.data.labels           = logs.map(l => new Date(l.waktu).toLocaleTimeString('id-ID'));
  chart.data.datasets[0].data = logs.map(l => Number(l.arus));
  chart.data.datasets[1].data = logs.map(l => Number(l.tegangan));
  chart.data.datasets[2].data = logs.map((l) => {
    const a = Number(l.arus);
    const v = Number(l.tegangan);
    const pf = Number(l.power_factor ?? 0.85);
    return Number(l.daya_w ?? l.active_power ?? a * v * pf);
  });
  chart.update();
}

/**
 * Reset zoom/pan back to default view.
 * @param {Chart} chart
 */
function resetChartZoom(chart) {
  if (chart.resetZoom) chart.resetZoom();
}

export {
  createRealtimeChart,
  createRealtimeDetailChart,
  pushRealtimeData,
  pushRealtimeDetailData,
  loadHistoryIntoChart,
  resetChartZoom,
};

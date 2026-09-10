const { spawn } = require('child_process');
const path = require('path');

const cwd = __dirname;
const services = [
  { name: 'backend', file: 'server.js' },
  { name: 'notifier-hardware', file: 'discord-notifier.js' },
  { name: 'notifier-simulator', file: 'sim-notifier.js' },
];

let stopping = false;
const children = services.map(({ name, file }) => {
  const child = spawn(process.execPath, [path.join(cwd, file)], {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`[start:all] ${name} berhenti (code=${code ?? '-'}, signal=${signal ?? '-'}).`);
    stopAll(code || 1);
  });

  child.on('error', (error) => {
    console.error(`[start:all] Gagal menjalankan ${name}: ${error.message}`);
    stopAll(1);
  });

  return child;
});

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log('[start:all] Backend API, notifier hardware, dan notifier simulator berjalan bersamaan.');
console.log('[start:all] Tekan Ctrl+C untuk menghentikan semua layanan.');

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  dialog,
  nativeImage,
} from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

const isDev = process.env.NODE_ENV === 'development';

// Store for settings
const store = new Store();

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let localServerChild: ChildProcess | null = null;

// Single instance lock (prevent double app + double tray)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Create main window
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    icon: join(__dirname, '../build/icon.ico'),
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (store.get('startMinimized', false)) {
      mainWindow?.hide();
    } else {
      mainWindow?.show();
    }
  });

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle minimize
  mainWindow.on('minimize', () => {
    mainWindow?.hide();
  });
}

// Create tray
function createTray(): void {
  // Guard: should only be created once
  if (tray) return;

  const iconPath = join(__dirname, '../build/icon.ico');
  const fs = require('fs');
  let trayIcon = nativeImage.createEmpty();

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
    // Validasi ukuran dan format
    if (trayIcon.isEmpty()) {
      console.warn(
        'Tray icon found but failed to load. Pastikan file .ico valid (256x256 px, 32-bit, <256KB).'
      );
    }
  } else {
    console.warn('Tray icon not found at', iconPath);
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Run at Startup',
      type: 'checkbox',
      checked: store.get('runAtStartup', false) as boolean,
      click: (menuItem) => {
        const checked = menuItem.checked;
        store.set('runAtStartup', checked);
        app.setLoginItemSettings({
          openAtLogin: checked,
          path: process.execPath,
        });
      },
    },
    {
      label: 'Enable Notifications',
      type: 'checkbox',
      checked: store.get('enableNotifications', true) as boolean,
      click: (menuItem) => {
        store.set('enableNotifications', menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('IoT Listrik Dashboard');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// IPC handlers
ipcMain.handle('show-notification', async (_, { title, body }) => {
  if (store.get('enableNotifications', true)) {
    const notification = new Notification({
      title,
      body,
      icon: join(__dirname, '../build/icon.ico'),
    });

    notification.show();

    return new Promise((resolve) => {
      notification.on('click', () => {
        mainWindow?.show();
        mainWindow?.focus();
        resolve('clicked');
      });
      notification.on('close', () => resolve('closed'));
    });
  }
});

ipcMain.handle('get-settings', () => {
  return {
    runAtStartup: store.get('runAtStartup', false),
    enableNotifications: store.get('enableNotifications', true),
    startMinimized: store.get('startMinimized', false),
  };
});

ipcMain.handle('set-settings', (_, settings) => {
  Object.keys(settings).forEach((key) => {
    store.set(key, settings[key]);
  });

  if (settings.runAtStartup !== undefined) {
    app.setLoginItemSettings({
      openAtLogin: settings.runAtStartup,
      path: process.execPath,
    });
  }
});

ipcMain.handle(
  'local-server:start',
  async (_, opts: { cwd: string; command: string }) => {
    try {
      if (localServerChild && !localServerChild.killed) {
        return { ok: true as const };
      }
      const cwd = opts.cwd || process.cwd();
      const command = opts.command || 'node server.js';
      localServerChild = spawn(command, [], {
        cwd,
        shell: true,
        windowsHide: true,
        detached: false,
      });
      localServerChild.on('exit', () => {
        localServerChild = null;
      });
      localServerChild.stdout?.on('data', (d) =>
        console.log('[local-server]', d.toString())
      );
      localServerChild.stderr?.on('data', (d) =>
        console.error('[local-server]', d.toString())
      );
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || String(e) };
    }
  }
);

ipcMain.handle('local-server:stop', async () => {
  if (localServerChild && !localServerChild.killed) {
    localServerChild.kill();
    localServerChild = null;
  }
  return { ok: true as const };
});

ipcMain.handle('local-server:status', async () => ({
  running: !!(localServerChild && !localServerChild.killed),
}));

// App event handlers
app.whenReady().then(() => {
  createTray();
  createWindow();

  // Set startup
  app.setLoginItemSettings({
    openAtLogin: store.get('runAtStartup', false) as boolean,
    path: process.execPath,
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox(
    'Error',
    `An unexpected error occurred: ${error.message}`
  );
});

process.on('unhandledRejection', (reason: any, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox(
    'Unhandled Rejection',
    `An unexpected promise rejection occurred: ${reason?.message || String(reason)}`
  );
});

// Auto-updater (optional). Disable in portable mode because it fails.
if (!isDev && !process.env.PORTABLE_EXECUTABLE_DIR) {
  try {
    autoUpdater.checkForUpdatesAndNotify().catch(e => console.error('Updater error:', e));
  } catch (e) {
    console.error('Updater init error:', e);
  }
}

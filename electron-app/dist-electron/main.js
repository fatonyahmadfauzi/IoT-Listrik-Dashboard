"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const electron_store_1 = __importDefault(require("electron-store"));
const electron_updater_1 = require("electron-updater");
const isDev = process.env.NODE_ENV === 'development';
// Store for settings
const store = new electron_store_1.default();
// Global references
let mainWindow = null;
let tray = null;
// Single instance lock (prevent double app + double tray)
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
// Create main window
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
        },
        icon: (0, path_1.join)(__dirname, '../build/icon.ico'),
        show: false, // Don't show until ready
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        if (store.get('startMinimized', false)) {
            mainWindow?.hide();
        }
        else {
            mainWindow?.show();
        }
    });
    // Handle close to tray
    mainWindow.on('close', (event) => {
        if (!electron_1.app.isQuitting) {
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
function createTray() {
    // Guard: should only be created once
    if (tray)
        return;
    const iconPath = (0, path_1.join)(__dirname, '../build/icon.ico');
    const fs = require('fs');
    let trayIcon = electron_1.nativeImage.createEmpty();
    if (fs.existsSync(iconPath)) {
        trayIcon = electron_1.nativeImage.createFromPath(iconPath);
        // Validasi ukuran dan format
        if (trayIcon.isEmpty()) {
            console.warn('Tray icon found but failed to load. Pastikan file .ico valid (256x256 px, 32-bit, <256KB).');
        }
    }
    else {
        console.warn('Tray icon not found at', iconPath);
    }
    tray = new electron_1.Tray(trayIcon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
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
            checked: store.get('runAtStartup', false),
            click: (menuItem) => {
                const checked = menuItem.checked;
                store.set('runAtStartup', checked);
                electron_1.app.setLoginItemSettings({
                    openAtLogin: checked,
                    path: process.execPath,
                });
            },
        },
        {
            label: 'Enable Notifications',
            type: 'checkbox',
            checked: store.get('enableNotifications', true),
            click: (menuItem) => {
                store.set('enableNotifications', menuItem.checked);
            },
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                electron_1.app.isQuitting = true;
                electron_1.app.quit();
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
electron_1.ipcMain.handle('show-notification', async (_, { title, body }) => {
    if (store.get('enableNotifications', true)) {
        const notification = new electron_1.Notification({
            title,
            body,
            icon: (0, path_1.join)(__dirname, '../build/icon.ico'),
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
electron_1.ipcMain.handle('get-settings', () => {
    return {
        runAtStartup: store.get('runAtStartup', false),
        enableNotifications: store.get('enableNotifications', true),
        startMinimized: store.get('startMinimized', false),
    };
});
electron_1.ipcMain.handle('set-settings', (_, settings) => {
    Object.keys(settings).forEach((key) => {
        store.set(key, settings[key]);
    });
    if (settings.runAtStartup !== undefined) {
        electron_1.app.setLoginItemSettings({
            openAtLogin: settings.runAtStartup,
            path: process.execPath,
        });
    }
});
// App event handlers
electron_1.app.whenReady().then(() => {
    createTray();
    createWindow();
    // Set startup
    electron_1.app.setLoginItemSettings({
        openAtLogin: store.get('runAtStartup', false),
        path: process.execPath,
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.app.on('before-quit', () => {
    electron_1.app.isQuitting = true;
});
// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    electron_1.dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Auto-updater (optional)
if (!isDev) {
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
}

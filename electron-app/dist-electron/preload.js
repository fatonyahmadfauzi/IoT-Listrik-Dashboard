"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', { title, body }),
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    setSettings: (settings) => electron_1.ipcRenderer.invoke('set-settings', settings),
    onNotificationClick: (callback) => electron_1.ipcRenderer.on('notification-click', callback),
    removeNotificationClick: (callback) => electron_1.ipcRenderer.removeListener('notification-click', callback),
});

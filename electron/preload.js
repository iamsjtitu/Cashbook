const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => {
    const { app } = require('@electron/remote') || {};
    return app?.getVersion() || '1.0.0';
  },
  platform: process.platform
});

// Log that preload script has loaded
console.log('Staff Manager - Preload script loaded');

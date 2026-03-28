const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => {
    const { app } = require('@electron/remote') || {};
    return app?.getVersion() || '1.0.0';
  },
  platform: process.platform,
  
  // Data Folder APIs
  getDataFolder: () => ipcRenderer.invoke('get-data-folder'),
  selectDataFolder: () => ipcRenderer.invoke('select-data-folder'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  
  // Auto Backup APIs
  getAutoBackupSettings: () => ipcRenderer.invoke('get-auto-backup-settings'),
  setAutoBackupSettings: (settings) => ipcRenderer.invoke('set-auto-backup-settings', settings),
  
  // Backup File APIs
  saveBackupToFolder: (data) => ipcRenderer.invoke('save-backup-to-folder', data),
  getBackupFiles: () => ipcRenderer.invoke('get-backup-files'),
  readBackupFile: (filepath) => ipcRenderer.invoke('read-backup-file', filepath),
  
  // Event listeners
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  onPerformAutoBackup: (callback) => ipcRenderer.on('perform-auto-backup', () => callback())
});

// Log that preload script has loaded
console.log('Staff Manager - Preload script loaded');

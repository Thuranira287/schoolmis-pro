/**
 * School MIS Pro - Electron Preload Script
 * 
 * Provides secure bridge between renderer and main process.
 * Only whitelisted APIs are exposed to the web app.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  exportBackup: (data) => ipcRenderer.invoke('export-backup', data),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Menu events
  onMenuExportBackup: (callback) => {
    ipcRenderer.on('menu-export-backup', callback);
    return () => ipcRenderer.removeListener('menu-export-backup', callback);
  },
  onMenuImportBackup: (callback) => {
    ipcRenderer.on('menu-import-backup', callback);
    return () => ipcRenderer.removeListener('menu-import-backup', callback);
  },
  
  // Platform detection
  getPlatform: () => process.platform,
  isElectron: () => true,
  
  // File operations
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', { filename, data }),
  openFile: () => ipcRenderer.invoke('open-file'),
});

// Expose minimal Node APIs if needed (be cautious!)
contextBridge.exposeInMainWorld('nodeAPI', {
  platform: process.platform,
  arch: process.arch,
});

console.log('[Preload] Security context initialized');

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Initialize electron-store for persistent settings
const store = new Store({
  name: 'staff-manager-config',
  defaults: {
    dataFolder: '',
    autoBackup: {
      enabled: false,
      frequency: 'daily',
      lastBackup: null
    }
  }
});

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: 'Staff Manager - Attendance & Salary System',
    backgroundColor: '#ffffff',
    show: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    const dataFolder = store.get('dataFolder');
    if (!dataFolder) {
      promptFolderSelection();
    } else {
      checkAutoBackup();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Select Data Folder',
          click: () => promptFolderSelection()
        },
        {
          label: 'Open Data Folder',
          click: () => {
            const folder = store.get('dataFolder');
            if (folder && fs.existsSync(folder)) {
              shell.openPath(folder);
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'No Folder Set',
                message: 'Data folder not set. Please select a folder first.'
              });
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => checkForUpdates()
        },
        { type: 'separator' },
        {
          label: 'About Staff Manager',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Staff Manager',
              message: 'Staff Manager v' + app.getVersion(),
              detail: 'Attendance & Salary Management System\n\nDesigned by: https://www.9x.design\nContact: +91 72059 30002'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Prompt user to select data folder
function promptFolderSelection() {
  dialog.showOpenDialog(mainWindow, {
    title: 'Select Data Folder (Backup यहाँ save होगा)',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder'
  }).then((result) => {
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      store.set('dataFolder', selectedPath);
      
      const backupsPath = path.join(selectedPath, 'StaffManager_Backups');
      if (!fs.existsSync(backupsPath)) {
        fs.mkdirSync(backupsPath, { recursive: true });
      }
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Folder Selected',
        message: 'Data folder set successfully!',
        detail: `Path: ${selectedPath}\n\nBackups will be saved in: StaffManager_Backups subfolder`
      });
      
      mainWindow.webContents.send('folder-selected', selectedPath);
    }
  });
}

// Check and perform auto-backup
function checkAutoBackup() {
  const autoBackup = store.get('autoBackup');
  if (!autoBackup.enabled) return;
  
  const lastBackup = autoBackup.lastBackup ? new Date(autoBackup.lastBackup) : null;
  const now = new Date();
  
  let shouldBackup = false;
  
  if (!lastBackup) {
    shouldBackup = true;
  } else if (autoBackup.frequency === 'daily') {
    shouldBackup = (now - lastBackup) > 24 * 60 * 60 * 1000;
  } else if (autoBackup.frequency === 'weekly') {
    shouldBackup = (now - lastBackup) > 7 * 24 * 60 * 60 * 1000;
  }
  
  if (shouldBackup) {
    mainWindow.webContents.send('perform-auto-backup');
  }
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `New version ${info.version} available!`,
    detail: 'Download and install now?',
    buttons: ['Download', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'No Updates',
    message: 'You are using the latest version!',
    detail: 'Current version: ' + app.getVersion()
  });
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.setProgressBar(progress.percent / 100);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow.setProgressBar(-1);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded!',
    detail: 'App will restart to install.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
});

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Could not check for updates',
      detail: err.message
    });
  });
}

// IPC Handlers
ipcMain.handle('get-data-folder', () => store.get('dataFolder'));

ipcMain.handle('select-data-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Data Folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    store.set('dataFolder', selectedPath);
    
    const backupsPath = path.join(selectedPath, 'StaffManager_Backups');
    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }
    return selectedPath;
  }
  return null;
});

ipcMain.handle('get-auto-backup-settings', () => store.get('autoBackup'));

ipcMain.handle('set-auto-backup-settings', (event, settings) => {
  store.set('autoBackup', settings);
  return true;
});

ipcMain.handle('save-backup-to-folder', async (event, backupData) => {
  const dataFolder = store.get('dataFolder');
  if (!dataFolder) return { success: false, error: 'No data folder set' };
  
  const backupsPath = path.join(dataFolder, 'StaffManager_Backups');
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Backup_${timestamp}.json`;
  const filepath = path.join(backupsPath, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    
    const autoBackup = store.get('autoBackup');
    autoBackup.lastBackup = new Date().toISOString();
    store.set('autoBackup', autoBackup);
    
    return { success: true, path: filepath, filename };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-backup-files', async () => {
  const dataFolder = store.get('dataFolder');
  if (!dataFolder) return [];
  
  const backupsPath = path.join(dataFolder, 'StaffManager_Backups');
  if (!fs.existsSync(backupsPath)) return [];
  
  try {
    return fs.readdirSync(backupsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupsPath, f));
        return {
          name: f,
          path: path.join(backupsPath, f),
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('read-backup-file', async (event, filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return { success: true, data: JSON.parse(content) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-folder', (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup (production only)
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Auto-update check failed:', err.message);
      });
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

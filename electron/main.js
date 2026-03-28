const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize electron-store for persistent settings
const store = new Store({
  name: 'staff-manager-config',
  defaults: {
    dataFolder: '',
    autoBackup: {
      enabled: false,
      frequency: 'daily', // daily, weekly
      lastBackup: null
    }
  }
});

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
    // Load from built React app
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check if data folder is set, if not prompt user
    const dataFolder = store.get('dataFolder');
    if (!dataFolder) {
      promptFolderSelection();
    } else {
      // Check auto-backup on startup
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
          label: 'About Staff Manager',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Staff Manager',
              message: 'Staff Manager v' + app.getVersion(),
              detail: 'Attendance & Salary Management System\n\nSalary Calculation: Monthly ÷ 30 days\nHalf Day: Daily Rate ÷ 2\n\nBuilt with Electron'
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
      
      // Create backups subfolder
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
      
      // Notify renderer
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
    // More than 24 hours since last backup
    shouldBackup = (now - lastBackup) > 24 * 60 * 60 * 1000;
  } else if (autoBackup.frequency === 'weekly') {
    // More than 7 days since last backup
    shouldBackup = (now - lastBackup) > 7 * 24 * 60 * 60 * 1000;
  }
  
  if (shouldBackup) {
    // Notify renderer to perform backup
    mainWindow.webContents.send('perform-auto-backup');
  }
}

// IPC Handlers for communication with renderer
ipcMain.handle('get-data-folder', () => {
  return store.get('dataFolder');
});

ipcMain.handle('select-data-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Data Folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    store.set('dataFolder', selectedPath);
    
    // Create backups subfolder
    const backupsPath = path.join(selectedPath, 'StaffManager_Backups');
    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }
    
    return selectedPath;
  }
  return null;
});

ipcMain.handle('get-auto-backup-settings', () => {
  return store.get('autoBackup');
});

ipcMain.handle('set-auto-backup-settings', (event, settings) => {
  store.set('autoBackup', settings);
  return true;
});

ipcMain.handle('save-backup-to-folder', async (event, backupData) => {
  const dataFolder = store.get('dataFolder');
  if (!dataFolder) {
    return { success: false, error: 'No data folder set' };
  }
  
  const backupsPath = path.join(dataFolder, 'StaffManager_Backups');
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Backup_${timestamp}.json`;
  const filepath = path.join(backupsPath, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    
    // Update last backup time
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
    const files = fs.readdirSync(backupsPath)
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
    
    return files;
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

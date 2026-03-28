const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// Auto-updater config
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const store = new Store({
  name: 'staff-manager-config',
  defaults: {
    dataFolder: '',
    autoBackup: { enabled: false, frequency: 'daily', lastBackup: null }
  }
});

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 550,
    height: 650,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: 'Staff Manager - Data Selection',
    backgroundColor: '#00000000',
    show: false
  });

  // First show folder selection
  mainWindow.loadFile(path.join(__dirname, 'folder-select.html'));
  
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function loadMainApp() {
  // Resize window for main app
  mainWindow.setSize(1400, 900);
  mainWindow.setMinimumSize(1024, 700);
  mainWindow.setResizable(true);
  mainWindow.center();
  
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, 'build', 'index.html'),
      path.join(app.getAppPath(), 'build', 'index.html'),
      path.join(process.resourcesPath, 'app', 'build', 'index.html')
    ];
    
    let indexPath = null;
    for (const p of possiblePaths) {
      console.log('Checking path:', p, 'Exists:', fs.existsSync(p));
      if (fs.existsSync(p)) {
        indexPath = p;
        break;
      }
    }
    
    if (indexPath) {
      console.log('Loading from:', indexPath);
      mainWindow.loadFile(indexPath);
      // Enable DevTools for debugging
      mainWindow.webContents.openDevTools();
    } else {
      // Show error with all tried paths
      const errorHtml = `
        <html>
        <body style="font-family:Arial;padding:40px;background:#1a1a2e;color:#fff;">
          <h1 style="color:#ff6b35;">Build Files Not Found</h1>
          <p>Could not locate index.html</p>
          <h3>Tried paths:</h3>
          <ul>
            ${possiblePaths.map(p => `<li>${p}</li>`).join('')}
          </ul>
          <h3>Debug Info:</h3>
          <ul>
            <li>__dirname: ${__dirname}</li>
            <li>app.getAppPath(): ${app.getAppPath()}</li>
            <li>resourcesPath: ${process.resourcesPath}</li>
            <li>isPackaged: ${app.isPackaged}</li>
          </ul>
        </body>
        </html>
      `;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    }
  }
  
  // Setup menu
  setupMenu();
}

function setupMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Change Data Folder',
          click: () => {
            // Go back to folder selection
            mainWindow.setSize(550, 650);
            mainWindow.setResizable(false);
            mainWindow.center();
            mainWindow.loadFile(path.join(__dirname, 'folder-select.html'));
          }
        },
        {
          label: 'Open Data Folder',
          click: () => {
            const folder = store.get('dataFolder');
            if (folder && fs.existsSync(folder)) shell.openPath(folder);
            else dialog.showMessageBox(mainWindow, { type: 'warning', message: 'Data folder not set' });
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
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdates().catch(err => {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Update Error',
                message: 'Could not check for updates',
                detail: err.message
              });
            });
          }
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
  ]);
  Menu.setApplicationMenu(menu);
}

// Initialize database with selected folder
function initDatabase(folderPath) {
  // Set the data folder path for database
  process.env.STAFF_MANAGER_DATA = folderPath;
  db = require('./database');
  db.initDbPath(folderPath);
}

// IPC Handlers for folder selection
ipcMain.handle('selectFolder', async (_, type) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: type === 'new' ? 'Create New Data Folder' : 'Select Existing Data Folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: type === 'new' ? 'Create Here' : 'Select'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('getDataFolder', () => store.get('dataFolder'));

ipcMain.handle('setDataFolder', (_, folder) => {
  store.set('dataFolder', folder);
  initDatabase(folder);
  return true;
});

ipcMain.handle('loadMainApp', () => {
  loadMainApp();
  return true;
});

// Database IPC Handlers
ipcMain.handle('auth:login', async (_, password) => {
  if (!db) return false;
  return await db.checkPassword(password);
});

ipcMain.handle('auth:changePassword', async (_, current, newPass) => {
  if (!db) return { success: false };
  return await db.changePassword(current, newPass);
});

ipcMain.handle('staff:getAll', async () => db ? await db.getAllStaff() : []);
ipcMain.handle('staff:getById', async (_, id) => db ? await db.getStaffById(id) : null);
ipcMain.handle('staff:create', async (_, data) => db ? await db.createStaff(data) : null);
ipcMain.handle('staff:update', async (_, id, data) => db ? await db.updateStaff(id, data) : null);
ipcMain.handle('staff:delete', async (_, id) => db ? await db.deleteStaff(id) : null);

ipcMain.handle('attendance:getByDate', async (_, date) => db ? await db.getAttendanceByDate(date) : []);
ipcMain.handle('attendance:getByStaffMonth', async (_, staffId, month) => db ? await db.getAttendanceByStaffAndMonth(staffId, month) : []);
ipcMain.handle('attendance:mark', async (_, data) => db ? await db.markAttendance(data) : null);
ipcMain.handle('attendance:bulkMark', async (_, records) => db ? await db.bulkMarkAttendance(records) : []);

ipcMain.handle('transactions:getByMonth', async (_, month) => db ? await db.getTransactionsByMonth(month) : { transactions: [] });
ipcMain.handle('transactions:create', async (_, data) => db ? await db.createTransaction(data) : null);

ipcMain.handle('parties:getAll', async () => db ? await db.getAllParties() : []);
ipcMain.handle('parties:getLeaf', async () => db ? await db.getLeafParties() : []);
ipcMain.handle('parties:create', async (_, data) => db ? await db.createParty(data) : null);
ipcMain.handle('parties:update', async (_, id, data) => db ? await db.updateParty(id, data) : null);
ipcMain.handle('parties:delete', async (_, id) => {
  if (!db) return { error: 'Database not initialized' };
  try { return await db.deleteParty(id); } 
  catch (e) { return { error: e.message }; }
});
ipcMain.handle('parties:getLedger', async (_, id) => db ? await db.getPartyLedger(id) : null);

ipcMain.handle('advances:getAll', async () => db ? await db.getAllAdvances() : []);
ipcMain.handle('advances:create', async (_, data) => db ? await db.createAdvance(data) : null);

ipcMain.handle('salary:calculate', async (_, staffId, month) => db ? await db.calculateSalary(staffId, month) : null);
ipcMain.handle('salary:pay', async (_, data) => db ? await db.paySalary(data) : null);

ipcMain.handle('chitFunds:getAll', async () => db ? await db.getAllChitFunds() : []);
ipcMain.handle('chitFunds:create', async (_, data) => db ? await db.createChitFund(data) : null);
ipcMain.handle('chitFunds:addEntry', async (_, chitId, data) => db ? await db.addChitEntry(chitId, data) : null);

ipcMain.handle('interest:getAll', async () => db ? await db.getAllInterestAccounts() : []);
ipcMain.handle('interest:create', async (_, data) => db ? await db.createInterestAccount(data) : null);

ipcMain.handle('expenseCategories:getAll', async () => db ? await db.getExpenseCategories() : []);
ipcMain.handle('expenseCategories:add', async (_, name) => db ? await db.addExpenseCategory(name) : null);

ipcMain.handle('financialYears:getAll', async () => db ? await db.getFinancialYears() : []);
ipcMain.handle('financialYears:getActive', async () => db ? await db.getActiveFY() : null);

ipcMain.handle('settings:get', async () => db ? await db.getSettings() : {});
ipcMain.handle('settings:save', async (_, data) => db ? await db.saveSettings(data) : null);

ipcMain.handle('reports:expenses', async (_, month) => db ? await db.getExpensesSummary(month) : {});
ipcMain.handle('reports:profitLoss', async () => db ? await db.getProfitLoss() : {});

ipcMain.handle('backup:export', async () => db ? await db.exportAllData() : {});
ipcMain.handle('backup:import', async (_, data) => db ? await db.importAllData(data) : null);

ipcMain.handle('backup:saveToFile', async (_, backupData) => {
  const dataFolder = store.get('dataFolder');
  if (!dataFolder) return { success: false, error: 'No folder set' };
  
  const backupsPath = path.join(dataFolder, 'Backups');
  if (!fs.existsSync(backupsPath)) fs.mkdirSync(backupsPath, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Backup_${timestamp}.json`;
  const filepath = path.join(backupsPath, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    return { success: true, path: filepath, filename };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:getFiles', async () => {
  const dataFolder = store.get('dataFolder');
  if (!dataFolder) return [];
  
  const backupsPath = path.join(dataFolder, 'Backups');
  if (!fs.existsSync(backupsPath)) return [];
  
  try {
    return fs.readdirSync(backupsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupsPath, f));
        return { name: f, path: path.join(backupsPath, f), size: stats.size, created: stats.birthtime };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) { return []; }
});

ipcMain.handle('backup:readFile', async (_, filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return { success: true, data: JSON.parse(content) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('folder:getData', () => store.get('dataFolder'));
ipcMain.handle('folder:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Data Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('dataFolder', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});
ipcMain.handle('folder:open', (_, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

ipcMain.handle('autoBackup:get', () => store.get('autoBackup'));
ipcMain.handle('autoBackup:set', (_, settings) => { store.set('autoBackup', settings); return true; });

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `New version ${info.version} available!`,
    detail: 'Download and install now?',
    buttons: ['Download', 'Later']
  }).then((result) => {
    if (result.response === 0) autoUpdater.downloadUpdate();
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
  if (mainWindow) mainWindow.setProgressBar(progress.percent / 100);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.setProgressBar(-1);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded!',
    detail: 'App will restart to install.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup (only in packaged app)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Auto-update check failed:', err.message);
      });
    }, 5000);
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

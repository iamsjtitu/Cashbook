const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const db = require('./database');

// Initialize electron-store for app settings
const store = new Store({
  name: 'staff-manager-config',
  defaults: {
    dataFolder: '',
    autoBackup: { enabled: false, frequency: 'daily', lastBackup: null }
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

  // Always load local build in packaged app, dev server only when explicitly set
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load local build from resources
    let indexPath;
    if (process.resourcesPath) {
      indexPath = path.join(process.resourcesPath, 'build', 'index.html');
    } else {
      indexPath = path.join(__dirname, 'build', 'index.html');
    }
    
    console.log('Loading:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // Try alternate path
      const altPath = path.join(__dirname, 'build', 'index.html');
      mainWindow.loadFile(altPath).catch(err2 => {
        mainWindow.loadURL(`data:text/html,<h1>Error loading app</h1><p>${err.message}</p><p>Tried: ${indexPath}</p><p>Alt: ${altPath}</p>`);
      });
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
          label: 'Open Data Folder',
          click: () => {
            const dataPath = path.join(app.getPath('userData'), 'StaffManagerData');
            if (fs.existsSync(dataPath)) {
              shell.openPath(dataPath);
            } else {
              shell.openPath(app.getPath('userData'));
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
              detail: 'Attendance & Salary Management System\n\nDesigned by: https://www.9x.design\nContact: +91 72059 30002'
            });
          }
        }
      ]
    }
  ];

  Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

// ============ IPC HANDLERS ============

// Auth
ipcMain.handle('auth:login', async (_, password) => {
  return await db.checkPassword(password);
});

ipcMain.handle('auth:changePassword', async (_, current, newPass) => {
  return await db.changePassword(current, newPass);
});

// Staff
ipcMain.handle('staff:getAll', async () => await db.getAllStaff());
ipcMain.handle('staff:getById', async (_, id) => await db.getStaffById(id));
ipcMain.handle('staff:create', async (_, data) => await db.createStaff(data));
ipcMain.handle('staff:update', async (_, id, data) => await db.updateStaff(id, data));
ipcMain.handle('staff:delete', async (_, id) => await db.deleteStaff(id));

// Attendance
ipcMain.handle('attendance:getByDate', async (_, date) => await db.getAttendanceByDate(date));
ipcMain.handle('attendance:getByStaffMonth', async (_, staffId, month) => await db.getAttendanceByStaffAndMonth(staffId, month));
ipcMain.handle('attendance:mark', async (_, data) => await db.markAttendance(data));
ipcMain.handle('attendance:bulkMark', async (_, records) => await db.bulkMarkAttendance(records));

// Transactions (Cash Book)
ipcMain.handle('transactions:getByMonth', async (_, month) => await db.getTransactionsByMonth(month));
ipcMain.handle('transactions:create', async (_, data) => await db.createTransaction(data));

// Parties (Ledger)
ipcMain.handle('parties:getAll', async () => await db.getAllParties());
ipcMain.handle('parties:getLeaf', async () => await db.getLeafParties());
ipcMain.handle('parties:create', async (_, data) => await db.createParty(data));
ipcMain.handle('parties:update', async (_, id, data) => await db.updateParty(id, data));
ipcMain.handle('parties:delete', async (_, id) => {
  try {
    return await db.deleteParty(id);
  } catch (e) {
    return { error: e.message };
  }
});
ipcMain.handle('parties:getLedger', async (_, id) => await db.getPartyLedger(id));

// Advances
ipcMain.handle('advances:getAll', async () => await db.getAllAdvances());
ipcMain.handle('advances:create', async (_, data) => await db.createAdvance(data));

// Salary
ipcMain.handle('salary:calculate', async (_, staffId, month) => await db.calculateSalary(staffId, month));
ipcMain.handle('salary:pay', async (_, data) => await db.paySalary(data));

// Chit Fund
ipcMain.handle('chitFunds:getAll', async () => await db.getAllChitFunds());
ipcMain.handle('chitFunds:create', async (_, data) => await db.createChitFund(data));
ipcMain.handle('chitFunds:addEntry', async (_, chitId, data) => await db.addChitEntry(chitId, data));

// Interest/Byaj
ipcMain.handle('interest:getAll', async () => await db.getAllInterestAccounts());
ipcMain.handle('interest:create', async (_, data) => await db.createInterestAccount(data));

// Expense Categories
ipcMain.handle('expenseCategories:getAll', async () => await db.getExpenseCategories());
ipcMain.handle('expenseCategories:add', async (_, name) => await db.addExpenseCategory(name));

// Financial Year
ipcMain.handle('financialYears:getAll', async () => await db.getFinancialYears());
ipcMain.handle('financialYears:getActive', async () => await db.getActiveFY());

// Settings
ipcMain.handle('settings:get', async () => await db.getSettings());
ipcMain.handle('settings:save', async (_, data) => await db.saveSettings(data));

// Reports
ipcMain.handle('reports:expenses', async (_, month) => await db.getExpensesSummary(month));
ipcMain.handle('reports:profitLoss', async () => await db.getProfitLoss());

// Backup
ipcMain.handle('backup:export', async () => await db.exportAllData());
ipcMain.handle('backup:import', async (_, data) => await db.importAllData(data));

ipcMain.handle('backup:saveToFile', async (_, backupData) => {
  const dataFolder = store.get('dataFolder') || app.getPath('userData');
  const backupsPath = path.join(dataFolder, 'StaffManager_Backups');
  
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }
  
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
  const dataFolder = store.get('dataFolder') || app.getPath('userData');
  const backupsPath = path.join(dataFolder, 'StaffManager_Backups');
  
  if (!fs.existsSync(backupsPath)) return [];
  
  try {
    return fs.readdirSync(backupsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupsPath, f));
        return { name: f, path: path.join(backupsPath, f), size: stats.size, created: stats.birthtime };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('backup:readFile', async (_, filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return { success: true, data: JSON.parse(content) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Folder operations
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

// Auto backup settings
ipcMain.handle('autoBackup:get', () => store.get('autoBackup'));
ipcMain.handle('autoBackup:set', (_, settings) => {
  store.set('autoBackup', settings);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

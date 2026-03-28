const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Check if running in Electron
  isElectron: true,
  
  // Folder Selection (for startup screen)
  selectFolder: (type) => ipcRenderer.invoke('selectFolder', type),
  getDataFolder: () => ipcRenderer.invoke('getDataFolder'),
  setDataFolder: (folder) => ipcRenderer.invoke('setDataFolder', folder),
  loadMainApp: () => ipcRenderer.invoke('loadMainApp'),
  
  // Auth
  login: (password) => ipcRenderer.invoke('auth:login', password),
  changePassword: (current, newPass) => ipcRenderer.invoke('auth:changePassword', current, newPass),
  
  // Staff
  getStaff: () => ipcRenderer.invoke('staff:getAll'),
  getStaffById: (id) => ipcRenderer.invoke('staff:getById', id),
  createStaff: (data) => ipcRenderer.invoke('staff:create', data),
  updateStaff: (id, data) => ipcRenderer.invoke('staff:update', id, data),
  deleteStaff: (id) => ipcRenderer.invoke('staff:delete', id),
  
  // Attendance
  getAttendanceByDate: (date) => ipcRenderer.invoke('attendance:getByDate', date),
  getAttendanceByStaffMonth: (staffId, month) => ipcRenderer.invoke('attendance:getByStaffMonth', staffId, month),
  markAttendance: (data) => ipcRenderer.invoke('attendance:mark', data),
  bulkMarkAttendance: (records) => ipcRenderer.invoke('attendance:bulkMark', records),
  
  // Transactions (Cash Book)
  getTransactionsByMonth: (month) => ipcRenderer.invoke('transactions:getByMonth', month),
  createTransaction: (data) => ipcRenderer.invoke('transactions:create', data),
  
  // Parties (Ledger)
  getParties: () => ipcRenderer.invoke('parties:getAll'),
  getLeafParties: () => ipcRenderer.invoke('parties:getLeaf'),
  createParty: (data) => ipcRenderer.invoke('parties:create', data),
  updateParty: (id, data) => ipcRenderer.invoke('parties:update', id, data),
  deleteParty: (id) => ipcRenderer.invoke('parties:delete', id),
  getPartyLedger: (id) => ipcRenderer.invoke('parties:getLedger', id),
  
  // Advances
  getAdvances: () => ipcRenderer.invoke('advances:getAll'),
  createAdvance: (data) => ipcRenderer.invoke('advances:create', data),
  
  // Salary
  calculateSalary: (staffId, month) => ipcRenderer.invoke('salary:calculate', staffId, month),
  paySalary: (data) => ipcRenderer.invoke('salary:pay', data),
  
  // Chit Fund
  getChitFunds: () => ipcRenderer.invoke('chitFunds:getAll'),
  createChitFund: (data) => ipcRenderer.invoke('chitFunds:create', data),
  addChitEntry: (chitId, data) => ipcRenderer.invoke('chitFunds:addEntry', chitId, data),
  
  // Interest/Byaj
  getInterestAccounts: () => ipcRenderer.invoke('interest:getAll'),
  createInterestAccount: (data) => ipcRenderer.invoke('interest:create', data),
  
  // Expense Categories
  getExpenseCategories: () => ipcRenderer.invoke('expenseCategories:getAll'),
  addExpenseCategory: (name) => ipcRenderer.invoke('expenseCategories:add', name),
  
  // Financial Year
  getFinancialYears: () => ipcRenderer.invoke('financialYears:getAll'),
  getActiveFY: () => ipcRenderer.invoke('financialYears:getActive'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),
  
  // Reports
  getExpensesSummary: (month) => ipcRenderer.invoke('reports:expenses', month),
  getProfitLoss: () => ipcRenderer.invoke('reports:profitLoss'),
  
  // Backup
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: (data) => ipcRenderer.invoke('backup:import', data),
  saveBackupToFile: (data) => ipcRenderer.invoke('backup:saveToFile', data),
  getBackupFiles: () => ipcRenderer.invoke('backup:getFiles'),
  readBackupFile: (filepath) => ipcRenderer.invoke('backup:readFile', filepath),
  
  // Folder operations
  openFolder: (path) => ipcRenderer.invoke('folder:open', path),

  // Auto backup
  getAutoBackupSettings: () => ipcRenderer.invoke('autoBackup:get'),
  setAutoBackupSettings: (settings) => ipcRenderer.invoke('autoBackup:set', settings)
});

console.log('Staff Manager - Electron Preload Loaded');

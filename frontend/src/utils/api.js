// API Layer - Works with both Electron (IPC) and Browser (HTTP)

const isElectron = () => typeof window !== 'undefined' && window.electronAPI?.isElectron;

// HTTP base URL (for browser/web mode)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API_BASE = `${BACKEND_URL}/api`;

// Helper for HTTP requests
const http = {
  get: async (url) => {
    const res = await fetch(`${API_BASE}${url}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url, data) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  put: async (url, data) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (url) => {
    const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// Unified API object
const api = {
  // Auth
  login: async (password) => {
    if (isElectron()) {
      return window.electronAPI.login(password);
    }
    const res = await http.post('/auth/login', { password });
    return res.success;
  },
  
  changePassword: async (current, newPass) => {
    if (isElectron()) {
      return window.electronAPI.changePassword(current, newPass);
    }
    return http.post('/auth/change-password', { current_password: current, new_password: newPass });
  },

  // Staff
  getStaff: async () => {
    if (isElectron()) return window.electronAPI.getStaff();
    return http.get('/staff');
  },
  
  getStaffById: async (id) => {
    if (isElectron()) return window.electronAPI.getStaffById(id);
    return http.get(`/staff/${id}`);
  },
  
  createStaff: async (data) => {
    if (isElectron()) return window.electronAPI.createStaff(data);
    return http.post('/staff', data);
  },
  
  updateStaff: async (id, data) => {
    if (isElectron()) return window.electronAPI.updateStaff(id, data);
    return http.put(`/staff/${id}`, data);
  },
  
  deleteStaff: async (id) => {
    if (isElectron()) return window.electronAPI.deleteStaff(id);
    return http.delete(`/staff/${id}`);
  },

  // Attendance
  getAttendanceByDate: async (date) => {
    if (isElectron()) return window.electronAPI.getAttendanceByDate(date);
    return http.get(`/attendance?date=${date}`);
  },
  
  getAttendanceByStaffMonth: async (staffId, month) => {
    if (isElectron()) return window.electronAPI.getAttendanceByStaffMonth(staffId, month);
    return http.get(`/attendance/staff/${staffId}?month=${month}`);
  },
  
  markAttendance: async (data) => {
    if (isElectron()) return window.electronAPI.markAttendance(data);
    return http.post('/attendance', data);
  },
  
  bulkMarkAttendance: async (records) => {
    if (isElectron()) return window.electronAPI.bulkMarkAttendance(records);
    return http.post('/attendance/bulk', { records });
  },

  // Transactions (Cash Book)
  getTransactionsByMonth: async (month) => {
    if (isElectron()) return window.electronAPI.getTransactionsByMonth(month);
    return http.get(`/cashbook?month=${month}`);
  },
  
  createTransaction: async (data) => {
    if (isElectron()) return window.electronAPI.createTransaction(data);
    return http.post('/cashbook', data);
  },

  // Parties (Ledger)
  getParties: async () => {
    if (isElectron()) return window.electronAPI.getParties();
    return http.get('/parties');
  },
  
  getLeafParties: async () => {
    if (isElectron()) return window.electronAPI.getLeafParties();
    return http.get('/parties/leaf');
  },
  
  createParty: async (data) => {
    if (isElectron()) return window.electronAPI.createParty(data);
    return http.post('/parties', data);
  },
  
  updateParty: async (id, data) => {
    if (isElectron()) return window.electronAPI.updateParty(id, data);
    return http.put(`/parties/${id}`, data);
  },
  
  deleteParty: async (id) => {
    if (isElectron()) return window.electronAPI.deleteParty(id);
    return http.delete(`/parties/${id}`);
  },
  
  getPartyLedger: async (id) => {
    if (isElectron()) return window.electronAPI.getPartyLedger(id);
    return http.get(`/parties/${id}/ledger`);
  },

  // Advances
  getAdvances: async () => {
    if (isElectron()) return window.electronAPI.getAdvances();
    return http.get('/advances');
  },
  
  createAdvance: async (data) => {
    if (isElectron()) return window.electronAPI.createAdvance(data);
    return http.post('/advances', data);
  },

  // Salary
  calculateSalary: async (staffId, month) => {
    if (isElectron()) return window.electronAPI.calculateSalary(staffId, month);
    return http.get(`/salary/calculate/${staffId}?month=${month}`);
  },
  
  paySalary: async (data) => {
    if (isElectron()) return window.electronAPI.paySalary(data);
    return http.post('/salary/pay', data);
  },

  // Chit Fund
  getChitFunds: async () => {
    if (isElectron()) return window.electronAPI.getChitFunds();
    return http.get('/chit-funds');
  },
  
  createChitFund: async (data) => {
    if (isElectron()) return window.electronAPI.createChitFund(data);
    return http.post('/chit-funds', data);
  },
  
  addChitEntry: async (chitId, data) => {
    if (isElectron()) return window.electronAPI.addChitEntry(chitId, data);
    return http.post(`/chit-funds/${chitId}/entries`, data);
  },

  // Interest/Byaj
  getInterestAccounts: async () => {
    if (isElectron()) return window.electronAPI.getInterestAccounts();
    return http.get('/interest-accounts');
  },
  
  createInterestAccount: async (data) => {
    if (isElectron()) return window.electronAPI.createInterestAccount(data);
    return http.post('/interest-accounts', data);
  },

  // Expense Categories
  getExpenseCategories: async () => {
    if (isElectron()) return window.electronAPI.getExpenseCategories();
    return http.get('/expense-categories');
  },
  
  addExpenseCategory: async (name) => {
    if (isElectron()) return window.electronAPI.addExpenseCategory(name);
    return http.post('/expense-categories', { name });
  },

  // Financial Year
  getFinancialYears: async () => {
    if (isElectron()) return window.electronAPI.getFinancialYears();
    return http.get('/financial-years');
  },
  
  getActiveFY: async () => {
    if (isElectron()) return window.electronAPI.getActiveFY();
    return http.get('/financial-years/active');
  },

  // Settings
  getSettings: async () => {
    if (isElectron()) return window.electronAPI.getSettings();
    return http.get('/settings');
  },
  
  saveSettings: async (data) => {
    if (isElectron()) return window.electronAPI.saveSettings(data);
    return http.post('/settings', data);
  },

  // Reports
  getExpensesSummary: async (month) => {
    if (isElectron()) return window.electronAPI.getExpensesSummary(month);
    return http.get(`/reports/expenses?month=${month}`);
  },
  
  getProfitLoss: async () => {
    if (isElectron()) return window.electronAPI.getProfitLoss();
    return http.get('/reports/profit-loss');
  },

  // Backup
  exportBackup: async () => {
    if (isElectron()) return window.electronAPI.exportBackup();
    return http.get('/backup/export');
  },
  
  importBackup: async (data) => {
    if (isElectron()) return window.electronAPI.importBackup(data);
    return http.post('/backup/restore', data);
  },
  
  saveBackupToFile: async (data) => {
    if (isElectron()) return window.electronAPI.saveBackupToFile(data);
    return { success: false, error: 'Not supported in browser' };
  },
  
  getBackupFiles: async () => {
    if (isElectron()) return window.electronAPI.getBackupFiles();
    return [];
  },
  
  readBackupFile: async (filepath) => {
    if (isElectron()) return window.electronAPI.readBackupFile(filepath);
    return { success: false, error: 'Not supported in browser' };
  },

  // Folder operations (Electron only)
  getDataFolder: async () => {
    if (isElectron()) return window.electronAPI.getDataFolder();
    return '';
  },
  
  selectDataFolder: async () => {
    if (isElectron()) return window.electronAPI.selectDataFolder();
    return null;
  },
  
  openFolder: async (path) => {
    if (isElectron()) return window.electronAPI.openFolder(path);
    return false;
  },

  // Auto backup (Electron only)
  getAutoBackupSettings: async () => {
    if (isElectron()) return window.electronAPI.getAutoBackupSettings();
    return { enabled: false, frequency: 'daily', lastBackup: null };
  },
  
  setAutoBackupSettings: async (settings) => {
    if (isElectron()) return window.electronAPI.setAutoBackupSettings(settings);
    return false;
  }
};

export { api, isElectron };
export default api;

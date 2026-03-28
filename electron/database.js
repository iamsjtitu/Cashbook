const Datastore = require('nedb-promises');
const path = require('path');
const { app } = require('electron');

let dbPath;

// Initialize database path
function initDbPath(customPath = null) {
  dbPath = customPath || path.join(app.getPath('userData'), 'StaffManagerData');
  // Reset db so it reinitializes with new path
  db = {};
}

// Create datastores
let db = {};

function getDb() {
  if (!dbPath) initDbPath();
  
  if (!db.staff) {
    db = {
      staff: Datastore.create({ filename: path.join(dbPath, 'staff.db'), autoload: true }),
      attendance: Datastore.create({ filename: path.join(dbPath, 'attendance.db'), autoload: true }),
      transactions: Datastore.create({ filename: path.join(dbPath, 'transactions.db'), autoload: true }),
      parties: Datastore.create({ filename: path.join(dbPath, 'parties.db'), autoload: true }),
      advances: Datastore.create({ filename: path.join(dbPath, 'advances.db'), autoload: true }),
      salaryPayments: Datastore.create({ filename: path.join(dbPath, 'salary_payments.db'), autoload: true }),
      chitFunds: Datastore.create({ filename: path.join(dbPath, 'chit_funds.db'), autoload: true }),
      chitEntries: Datastore.create({ filename: path.join(dbPath, 'chit_entries.db'), autoload: true }),
      interestAccounts: Datastore.create({ filename: path.join(dbPath, 'interest_accounts.db'), autoload: true }),
      interestEntries: Datastore.create({ filename: path.join(dbPath, 'interest_entries.db'), autoload: true }),
      expenseCategories: Datastore.create({ filename: path.join(dbPath, 'expense_categories.db'), autoload: true }),
      financialYears: Datastore.create({ filename: path.join(dbPath, 'financial_years.db'), autoload: true }),
      settings: Datastore.create({ filename: path.join(dbPath, 'settings.db'), autoload: true }),
      appSettings: Datastore.create({ filename: path.join(dbPath, 'app_settings.db'), autoload: true })
    };
  }
  return db;
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============ STAFF OPERATIONS ============
async function getAllStaff() {
  const db = getDb();
  return await db.staff.find({}).sort({ name: 1 });
}

async function getStaffById(id) {
  const db = getDb();
  return await db.staff.findOne({ id });
}

async function createStaff(data) {
  const db = getDb();
  const staff = {
    id: generateId(),
    name: data.name,
    phone: data.phone || '',
    monthly_salary: data.monthly_salary || 0,
    joining_date: data.joining_date || new Date().toISOString().split('T')[0],
    is_active: true,
    created_at: new Date().toISOString()
  };
  await db.staff.insert(staff);
  return staff;
}

async function updateStaff(id, data) {
  const db = getDb();
  await db.staff.update({ id }, { $set: data });
  return await db.staff.findOne({ id });
}

async function deleteStaff(id) {
  const db = getDb();
  await db.staff.remove({ id });
  return { success: true };
}

// ============ ATTENDANCE OPERATIONS ============
async function getAttendanceByDate(date) {
  const db = getDb();
  return await db.attendance.find({ date });
}

async function getAttendanceByStaffAndMonth(staffId, month) {
  const db = getDb();
  return await db.attendance.find({ 
    staff_id: staffId, 
    date: { $regex: new RegExp(`^${month}`) }
  });
}

async function markAttendance(data) {
  const db = getDb();
  const existing = await db.attendance.findOne({ staff_id: data.staff_id, date: data.date });
  
  if (existing) {
    await db.attendance.update({ id: existing.id }, { $set: { status: data.status } });
    return await db.attendance.findOne({ id: existing.id });
  } else {
    const attendance = {
      id: generateId(),
      staff_id: data.staff_id,
      date: data.date,
      status: data.status,
      created_at: new Date().toISOString()
    };
    await db.attendance.insert(attendance);
    return attendance;
  }
}

async function bulkMarkAttendance(records) {
  const results = [];
  for (const record of records) {
    const result = await markAttendance(record);
    results.push(result);
  }
  return results;
}

// ============ TRANSACTIONS (CASH BOOK) ============
async function getTransactionsByMonth(month) {
  const db = getDb();
  const transactions = await db.transactions.find({ 
    date: { $regex: new RegExp(`^${month}`) }
  }).sort({ date: 1, created_at: 1 });
  
  // Calculate opening balance
  const setting = await db.settings.findOne({ key: 'cash_opening_balance' });
  const openingBalance = setting?.value || 0;
  
  // Get previous months transactions
  const allTxns = await db.transactions.find({});
  let prevBalance = openingBalance;
  
  for (const txn of allTxns) {
    if (txn.date < `${month}-01`) {
      if (txn.transaction_type === 'credit') {
        prevBalance += txn.amount;
      } else {
        prevBalance -= txn.amount;
      }
    }
  }
  
  const totalCredit = transactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  
  return {
    opening_balance: prevBalance,
    transactions,
    total_credit: totalCredit,
    total_debit: totalDebit,
    closing_balance: prevBalance + totalCredit - totalDebit
  };
}

async function createTransaction(data) {
  const db = getDb();
  const txn = {
    id: generateId(),
    date: data.date,
    amount: data.amount,
    transaction_type: data.transaction_type,
    party_id: data.party_id || null,
    category: data.category || null,
    payment_mode: data.payment_mode || 'cash',
    description: data.description || '',
    reference_type: data.reference_type || null,
    reference_id: data.reference_id || null,
    created_at: new Date().toISOString()
  };
  await db.transactions.insert(txn);
  
  // Update party balance if party_id exists
  if (data.party_id) {
    const party = await db.parties.findOne({ id: data.party_id });
    if (party) {
      const balanceChange = data.transaction_type === 'debit' ? data.amount : -data.amount;
      await db.parties.update({ id: data.party_id }, { 
        $set: { current_balance: (party.current_balance || 0) + balanceChange }
      });
    }
  }
  
  return txn;
}

// ============ PARTIES (LEDGER) ============
async function getAllParties() {
  const db = getDb();
  return await db.parties.find({}).sort({ name: 1 });
}

async function getLeafParties() {
  const db = getDb();
  const allParties = await db.parties.find({});
  const parentIds = new Set(allParties.filter(p => p.parent_party_id).map(p => p.parent_party_id));
  return allParties.filter(p => !parentIds.has(p.id));
}

async function createParty(data) {
  const db = getDb();
  const openingBal = data.balance_type === 'credit' ? -(data.opening_balance || 0) : (data.opening_balance || 0);
  const party = {
    id: generateId(),
    name: data.name,
    phone: data.phone || '',
    address: data.address || '',
    opening_balance: data.opening_balance || 0,
    current_balance: openingBal,
    account_head: data.account_head || null,
    parent_party_id: data.parent_party_id || null,
    created_at: new Date().toISOString()
  };
  await db.parties.insert(party);
  return party;
}

async function updateParty(id, data) {
  const db = getDb();
  const party = await db.parties.findOne({ id });
  if (!party) return null;
  
  const updateData = { ...data };
  if (data.opening_balance !== undefined) {
    const diff = data.opening_balance - (party.opening_balance || 0);
    updateData.current_balance = (party.current_balance || 0) + diff;
  }
  
  await db.parties.update({ id }, { $set: updateData });
  return await db.parties.findOne({ id });
}

async function deleteParty(id) {
  const db = getDb();
  const txnCount = await db.transactions.count({ party_id: id });
  if (txnCount > 0) {
    throw new Error('Cannot delete party with transactions');
  }
  await db.parties.remove({ id });
  return { success: true };
}

async function getPartyLedger(partyId) {
  const db = getDb();
  const party = await db.parties.findOne({ id: partyId });
  if (!party) return null;
  
  // Get sub-ledgers if any
  const subLedgers = await db.parties.find({ parent_party_id: partyId });
  const partyIds = [partyId, ...subLedgers.map(s => s.id)];
  
  const transactions = await db.transactions.find({ party_id: { $in: partyIds } }).sort({ date: 1 });
  
  let balance = party.opening_balance || 0;
  const entries = transactions.map(txn => {
    const debit = txn.transaction_type === 'debit' ? txn.amount : 0;
    const credit = txn.transaction_type === 'credit' ? txn.amount : 0;
    balance += debit - credit;
    return {
      date: txn.date,
      description: txn.description,
      payment_mode: txn.payment_mode,
      debit,
      credit,
      balance
    };
  });
  
  return {
    party,
    sub_ledgers: subLedgers,
    opening_balance: party.opening_balance || 0,
    current_balance: party.current_balance || 0,
    entries
  };
}

// ============ ADVANCES ============
async function getAllAdvances() {
  const db = getDb();
  return await db.advances.find({}).sort({ date: -1 });
}

async function createAdvance(data) {
  const db = getDb();
  const advance = {
    id: generateId(),
    staff_id: data.staff_id,
    amount: data.amount,
    date: data.date,
    note: data.note || '',
    created_at: new Date().toISOString()
  };
  await db.advances.insert(advance);
  
  // Create transaction
  const staff = await db.staff.findOne({ id: data.staff_id });
  await createTransaction({
    date: data.date,
    amount: data.amount,
    transaction_type: 'debit',
    category: 'salary',
    payment_mode: data.payment_mode || 'cash',
    description: `Advance - ${staff?.name || 'Staff'}`,
    reference_type: 'advance',
    reference_id: advance.id
  });
  
  return advance;
}

// ============ SALARY ============
async function calculateSalary(staffId, month) {
  const db = getDb();
  const staff = await db.staff.findOne({ id: staffId });
  if (!staff) return null;
  
  const attendance = await db.attendance.find({ 
    staff_id: staffId, 
    date: { $regex: new RegExp(`^${month}`) }
  });
  
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const halfDays = attendance.filter(a => a.status === 'half_day').length;
  const absentDays = attendance.filter(a => a.status === 'absent').length;
  
  const dailyRate = staff.monthly_salary / 30;
  const effectiveDays = presentDays + (halfDays * 0.5);
  const earned = dailyRate * effectiveDays;
  
  // Get advances for this month
  const advances = await db.advances.find({ 
    staff_id: staffId, 
    date: { $regex: new RegExp(`^${month}`) }
  });
  const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);
  
  // Check if already paid
  const existingPayment = await db.salaryPayments.findOne({ staff_id: staffId, month });
  
  return {
    staff,
    month,
    monthly_salary: staff.monthly_salary,
    daily_rate: dailyRate,
    present_days: presentDays,
    half_days: halfDays,
    absent_days: absentDays,
    effective_days: effectiveDays,
    earned_salary: Math.round(earned),
    advance_deduction: totalAdvance,
    net_payable: Math.round(earned) - totalAdvance,
    is_paid: !!existingPayment,
    payment: existingPayment
  };
}

async function paySalary(data) {
  const db = getDb();
  const payment = {
    id: generateId(),
    staff_id: data.staff_id,
    month: data.month,
    amount: data.amount,
    payment_mode: data.payment_mode || 'cash',
    paid_date: data.paid_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  await db.salaryPayments.insert(payment);
  
  // Create transaction
  const staff = await db.staff.findOne({ id: data.staff_id });
  await createTransaction({
    date: payment.paid_date,
    amount: data.amount,
    transaction_type: 'debit',
    category: 'salary',
    payment_mode: data.payment_mode || 'cash',
    description: `Salary ${data.month} - ${staff?.name || 'Staff'}`,
    reference_type: 'salary',
    reference_id: payment.id
  });
  
  return payment;
}

// ============ CHIT FUND ============
async function getAllChitFunds() {
  const db = getDb();
  const chits = await db.chitFunds.find({}).sort({ name: 1 });
  
  for (const chit of chits) {
    const entries = await db.chitEntries.find({ chit_fund_id: chit.id });
    chit.total_paid = entries.reduce((sum, e) => sum + e.amount, 0) + (chit.opening_amount_paid || 0);
    chit.total_dividend = entries.reduce((sum, e) => sum + (e.dividend || 0), 0);
    chit.paid_months = entries.length + (chit.opening_paid_installments || 0);
  }
  
  return chits;
}

async function createChitFund(data) {
  const db = getDb();
  const chit = {
    id: generateId(),
    name: data.name,
    total_amount: data.total_amount,
    monthly_emi: data.monthly_emi,
    total_months: data.total_months,
    start_date: data.start_date,
    opening_paid_installments: data.opening_paid_installments || 0,
    opening_amount_paid: data.opening_amount_paid || 0,
    is_active: true,
    created_at: new Date().toISOString()
  };
  await db.chitFunds.insert(chit);
  return chit;
}

async function addChitEntry(chitId, data) {
  const db = getDb();
  const entry = {
    id: generateId(),
    chit_fund_id: chitId,
    month: data.month,
    amount: data.amount,
    dividend: data.dividend || 0,
    payment_mode: data.payment_mode || 'cash',
    note: data.note || '',
    created_at: new Date().toISOString()
  };
  await db.chitEntries.insert(entry);
  
  // Create transaction
  const chit = await db.chitFunds.findOne({ id: chitId });
  await createTransaction({
    date: new Date().toISOString().split('T')[0],
    amount: data.amount,
    transaction_type: 'debit',
    category: 'chit_fund',
    payment_mode: data.payment_mode || 'cash',
    description: `Chit Fund EMI - ${chit?.name || 'Chit'} (${data.month})`,
    reference_type: 'chit_entry',
    reference_id: entry.id
  });
  
  return entry;
}

// ============ INTEREST/BYAJ ============
async function getAllInterestAccounts() {
  const db = getDb();
  const accounts = await db.interestAccounts.find({}).sort({ created_at: -1 });
  
  for (const acc of accounts) {
    const entries = await db.interestEntries.find({ account_id: acc.id });
    acc.total_interest = entries.reduce((sum, e) => sum + e.interest_amount, 0);
    acc.entries = entries;
  }
  
  return accounts;
}

async function createInterestAccount(data) {
  const db = getDb();
  const account = {
    id: generateId(),
    party_id: data.party_id,
    principal_amount: data.principal_amount,
    interest_rate: data.interest_rate,
    start_date: data.start_date,
    note: data.note || '',
    is_active: true,
    created_at: new Date().toISOString()
  };
  await db.interestAccounts.insert(account);
  return account;
}

// ============ EXPENSE CATEGORIES ============
async function getExpenseCategories() {
  const db = getDb();
  const categories = await db.expenseCategories.find({});
  const defaults = ['rent', 'utilities', 'office', 'transport', 'food', 'other'];
  const customCats = categories.map(c => c.name);
  return [...defaults, ...customCats];
}

async function addExpenseCategory(name) {
  const db = getDb();
  await db.expenseCategories.insert({ id: generateId(), name, created_at: new Date().toISOString() });
  return { success: true };
}

// ============ FINANCIAL YEAR ============
async function getFinancialYears() {
  const db = getDb();
  let years = await db.financialYears.find({}).sort({ start_date: -1 });
  
  if (years.length === 0) {
    // Create default FY
    const now = new Date();
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const defaultFY = {
      id: generateId(),
      name: `${fyStart}-${(fyStart + 1).toString().slice(2)}`,
      start_date: `${fyStart}-04-01`,
      end_date: `${fyStart + 1}-03-31`,
      is_active: true,
      created_at: new Date().toISOString()
    };
    await db.financialYears.insert(defaultFY);
    years = [defaultFY];
  }
  
  return years;
}

async function getActiveFY() {
  const db = getDb();
  let fy = await db.financialYears.findOne({ is_active: true });
  if (!fy) {
    const years = await getFinancialYears();
    fy = years[0];
  }
  return fy;
}

// ============ SETTINGS ============
async function getSettings() {
  const db = getDb();
  return await db.settings.findOne({ type: 'app_settings' }) || {};
}

async function saveSettings(data) {
  const db = getDb();
  await db.settings.update(
    { type: 'app_settings' },
    { $set: { ...data, type: 'app_settings', updated_at: new Date().toISOString() }},
    { upsert: true }
  );
  return { success: true };
}

// ============ AUTH ============
async function checkPassword(password) {
  const db = getDb();
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  
  let setting = await db.appSettings.findOne({ key: 'app_password' });
  if (!setting) {
    const defaultHash = crypto.createHash('sha256').update('1234').digest('hex');
    await db.appSettings.insert({ key: 'app_password', value: defaultHash });
    setting = { value: defaultHash };
  }
  
  return hash === setting.value;
}

async function changePassword(currentPassword, newPassword) {
  const db = getDb();
  const crypto = require('crypto');
  
  const isValid = await checkPassword(currentPassword);
  if (!isValid) return { success: false, error: 'Current password incorrect' };
  
  const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
  await db.appSettings.update({ key: 'app_password' }, { $set: { value: newHash }});
  return { success: true };
}

// ============ BACKUP ============
async function exportAllData() {
  const db = getDb();
  return {
    backup_date: new Date().toISOString(),
    version: '1.0',
    data: {
      staff: await db.staff.find({}),
      attendance: await db.attendance.find({}),
      transactions: await db.transactions.find({}),
      parties: await db.parties.find({}),
      advances: await db.advances.find({}),
      salaryPayments: await db.salaryPayments.find({}),
      chitFunds: await db.chitFunds.find({}),
      chitEntries: await db.chitEntries.find({}),
      interestAccounts: await db.interestAccounts.find({}),
      interestEntries: await db.interestEntries.find({}),
      expenseCategories: await db.expenseCategories.find({}),
      financialYears: await db.financialYears.find({}),
      settings: await db.settings.find({}),
      appSettings: await db.appSettings.find({})
    }
  };
}

async function importAllData(backupData) {
  const db = getDb();
  const data = backupData.data || backupData.collections;
  
  for (const [key, records] of Object.entries(data)) {
    if (db[key] && Array.isArray(records)) {
      await db[key].remove({}, { multi: true });
      for (const record of records) {
        delete record._id;
        await db[key].insert(record);
      }
    }
  }
  
  return { success: true };
}

// ============ REPORTS ============
async function getExpensesSummary(month) {
  const db = getDb();
  const transactions = await db.transactions.find({
    transaction_type: 'debit',
    category: { $exists: true, $ne: null },
    date: { $regex: new RegExp(`^${month}`) }
  });
  
  const byCategory = {};
  for (const txn of transactions) {
    const cat = txn.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + txn.amount;
  }
  
  return {
    month,
    total_expenses: transactions.reduce((sum, t) => sum + t.amount, 0),
    by_category: byCategory
  };
}

async function getProfitLoss() {
  const db = getDb();
  const parties = await db.parties.find({});
  
  const income = parties
    .filter(p => p.account_head?.includes('income'))
    .reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  
  const expenses = parties
    .filter(p => p.account_head?.includes('expense'))
    .reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  
  return {
    total_income: income,
    total_expenses: expenses,
    net_profit: income - expenses
  };
}

module.exports = {
  initDbPath,
  getDb,
  // Staff
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  // Attendance
  getAttendanceByDate,
  getAttendanceByStaffAndMonth,
  markAttendance,
  bulkMarkAttendance,
  // Transactions
  getTransactionsByMonth,
  createTransaction,
  // Parties
  getAllParties,
  getLeafParties,
  createParty,
  updateParty,
  deleteParty,
  getPartyLedger,
  // Advances
  getAllAdvances,
  createAdvance,
  // Salary
  calculateSalary,
  paySalary,
  // Chit Fund
  getAllChitFunds,
  createChitFund,
  addChitEntry,
  // Interest
  getAllInterestAccounts,
  createInterestAccount,
  // Expense Categories
  getExpenseCategories,
  addExpenseCategory,
  // Financial Year
  getFinancialYears,
  getActiveFY,
  // Settings
  getSettings,
  saveSettings,
  // Auth
  checkPassword,
  changePassword,
  // Backup
  exportAllData,
  importAllData,
  // Reports
  getExpensesSummary,
  getProfitLoss
};

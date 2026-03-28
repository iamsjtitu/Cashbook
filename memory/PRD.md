# Staff Manager - Complete Business & Accounting Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- **Everything Connected to Cash Book** - All transactions from all modules auto-link to Cash Book

## Unified Cash Book System

### All Modules Auto-Connected

| Module | Action | Cash Book Entry |
|--------|--------|-----------------|
| **Salary** | Pay Salary | DEBIT (category: salary) |
| **Advance** | Give Advance | DEBIT (category: salary) |
| **Byaj** | Add to Cash Book | DEBIT (category: interest_paid) |
| **Chit Fund** | Pay EMI | DEBIT (category: chit_fund) |
| **Chit Fund** | Lift (Uthao) | CREDIT |
| **Party Ledger** | Transaction | DEBIT/CREDIT |
| **Expenses** | Add Expense | DEBIT (with category) |

### Cash Book Page Design
- **Left Side**: Entry form (always visible)
  - Credit/Debit toggle (Green/Red)
  - Amount input
  - Party dropdown (+ New Party inline)
  - Category dropdown (Debit mode)
  - Payment Mode buttons (Cash/UPI/Bank)
- **Right Side**: Transaction list
  - Today/Week/Month filters
  - All entries from all modules
  - Category, Party, Mode columns

### Salary Page
- Calculate Salary button
- Salary Slip with breakdown
- **Pay Salary button** → Opens modal
  - Shows: Total Earned, Advance Deduction, Net Payable
  - Auto-creates Cash Book Debit entry

### Chit Fund Page
- Simple dropdown to select chit
- Monthly entry with:
  - Month dropdown (paid months marked ✓)
  - EMI Paid
  - Is Mahine Mila (Dividend)
  - Auto-calculate Effective Cost
- Lift (Uthao) option
- Net Profit summary

## API Endpoints

### Salary
- `POST /api/salary/pay` - Pay salary (auto Cash Book)
- `GET /api/salary/{staff_id}/{month}` - Calculate salary
- `GET /api/salary/payments/{month}` - Get payments list

### Advance
- `POST /api/advances` - Create advance (auto Cash Book)
- `GET /api/advances` - List advances

### Cash Book
- `GET /api/cashbook/{date}` - Daily transactions
- `GET /api/cashbook/monthly/{month}` - Monthly transactions
- `POST /api/transactions` - Manual entry

### Chit Fund
- `POST /api/chit-funds/{id}/monthly-entry` - EMI (auto Cash Book)
- `POST /api/chit-funds/{id}/lift` - Lift (auto Cash Book credit)

## Testing Status
- Backend: 100% (iteration 17)
- Frontend: 100% (all features working)

## Implementation Complete (December 2025)

### Done
- [x] Staff management (CRUD, Attendance, Salary)
- [x] 30-day salary calculation
- [x] Unified Cash Book (central ledger)
- [x] Auto-link: Salary → Cash Book
- [x] Auto-link: Advance → Cash Book
- [x] Auto-link: Byaj → Cash Book
- [x] Auto-link: Chit Fund → Cash Book
- [x] Party Ledger with balance tracking
- [x] Expense category tracking
- [x] Chit Fund dividend system
- [x] P&L Statement (auto from Cash Book + Ledger hierarchy)
- [x] Balance Sheet (auto from all modules + Ledger hierarchy)
- [x] Financial Year (April-March) filtering
- [x] **Password-only Login** (No username, default: 1234)
- [x] **Password Change** option in Admin dropdown
- [x] **Auto-Refresh** toggle (Manual/Auto 30s)
- [x] **Electron Auto-Updater** (main.js + GitHub Actions workflow)
- [x] **Bulk Attendance Marking** (All Staff Today + Fill Unmarked)
- [x] **PDF Export** (Staff, Attendance, Cash Book, Salary Slip, Ledger Master)
- [x] **Excel Export** (Staff, Attendance, Cash Book, Ledger Master)
- [x] **Receipt Printing** (Salary & Advance payments)
- [x] **Account Head (Category) System** - Ledgers categorized as Current Asset, Fixed Asset, Direct Expense, etc.
- [x] **Sub-Ledger Hierarchy** - Parent Ledger option for creating sub-ledgers
- [x] **Custom Expense Categories** - Create/delete custom expense categories
- [x] **Expenses Page in Navigation** - Now visible in main menu
- [x] **Parent Ledger Aggregation** - Parent shows all sub-ledger transactions
- [x] **Leaf Parties API** - Cash Book entry form only shows leaf ledgers (no parents)
- [x] **Auto-create Parent Ledgers:**
  - Staff → "Staff Advances" (Current Asset)
  - Chit Fund → "Chit Fund Investment" (Current Asset)
  - Interest/Byaj → "Byaj (Interest) Receivable" (Current Asset)
- [x] **Cash Book Party Filter** - Filter transactions by party
- [x] **Party Page Tabs:**
  - "Ledger Master" - Shows only leaf ledgers with PARENT column
  - "Parent Ledger" - Shows only parent ledgers with SUB-LEDGERS count
- [x] **Ledger Master Filters:**
  - Search by name
  - From Date - To Date filter with Clear
  - Excel and PDF export
- [x] **Chit Fund Opening Balance:**
  - Opening installments paid (पहले से paid)
  - Opening amount paid
  - Profit calculation (Expected - Actual = Profit So Far)
  - Edit Opening button
- [x] **Dashboard Page** (March 2026):
  - Whole-app summary: Staff count, Attendance today, Cash Balance
  - Ledger stats: Total Ledgers, Debtors, Creditors
  - Chit Fund: Active chits, Investment, Dividend
  - Byaj Receivable, Monthly Expenses, Net Profit/Loss
  - Recent Transactions widget
  - Quick Actions grid
- [x] **Settings Page** (March 2026):
  - Header/Footer customization (Company Name, Address, Phone, Footer Text)
  - Live preview of header/footer
  - Backup Download (exports all data as JSON)
  - Backup Restore (uploads JSON to restore data)
- [x] **Individual Ledger PDF Export** (March 2026):
  - PDF button in Party Ledger modal
  - Exports specific party's "len den" statement
- [x] **Edit Ledger** (March 2026):
  - Full edit option: Name, Account Head, Parent, Phone, Address, Opening Balance
  - Warning shown when changing Account Head (affects P&L/Balance Sheet)
- [x] **Electron Folder Selection & Auto Backup** (March 2026):
  - First launch: Data folder select karo
  - Backup files usi folder mein save honge (StaffManager_Backups subfolder)
  - Auto Backup: Daily/Weekly automatic backup option
  - Saved Backups list: See and restore from any previous backup

## Account Head System (New)
Ledgers can now be categorized with Account Heads:

| Account Head | Type | Appears In |
|--------------|------|------------|
| Current Asset (चालू संपत्ति) | Asset | Balance Sheet - Assets |
| Fixed Asset (स्थायी संपत्ति) | Asset | Balance Sheet - Assets |
| Current Liability (चालू देनदारी) | Liability | Balance Sheet - Liabilities |
| Long Term Liability (दीर्घकालिक देनदारी) | Liability | Balance Sheet - Liabilities |
| Capital (पूंजी) | Capital | Balance Sheet - Capital |
| Direct Income (प्रत्यक्ष आय) | Income | P&L - Income |
| Indirect Income (अप्रत्यक्ष आय) | Income | P&L - Income |
| Direct Expense (प्रत्यक्ष खर्च) | Expense | P&L - Expenses |
| Indirect Expense (अप्रत्यक्ष खर्च) | Expense | P&L - Expenses |

### Backlog (Future)
- [ ] Multi-user support
- [ ] Mobile app
- [ ] Cloud backup

## User Language
- Primary: Hindi / Hinglish
- All labels have Hindi translations

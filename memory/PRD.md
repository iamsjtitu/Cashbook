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
- Backend: 100% (15/15 tests passed - iteration 12)
- Frontend: 100% (All features verified)

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
- [x] P&L Statement (auto from Cash Book)
- [x] Balance Sheet (auto from all modules)
- [x] Financial Year (April-March) filtering
- [x] **Password-only Login** (No username, default: 1234)
- [x] **Password Change** option in Admin dropdown
- [x] **Auto-Refresh** toggle (Manual/Auto 30s)
- [x] **Electron Auto-Updater** (main.js + GitHub Actions workflow)
- [x] Database cleared for fresh testing

### Backlog (P2)
- [ ] PDF Export (Reports download)
- [ ] Excel Export
- [ ] Receipt Printing

## User Language
- Primary: Hindi / Hinglish
- All labels have Hindi translations

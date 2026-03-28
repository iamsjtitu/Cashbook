# Staff Manager - Complete Business & Accounting Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- **Simplified Accounting System** (User rejected complex double-entry vouchers):
  - Daily Cash Book
  - Party Ledger with Opening Balances
  - Expenses tracking by category
  - Byaj (Interest) calculation on 30-day monthly basis
  - Chit Fund tracking with Cash Book auto-link
  - **Auto-generated P&L Statement** (from Cash Book transactions)
  - **Auto-generated Balance Sheet** (from Cash Book, Party Ledger, Advances, Chit Fund)
  - Financial Year (April-March) filtering
  - Opening Balances for Cash and Parties
- Electron Desktop App with `.exe` on GitHub push

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Desktop**: Electron wrapper with auto-update
- **CI/CD**: GitHub Actions for `.exe` builds

## Code Structure
```
/app/
├── backend/
│   ├── server.py           # All FastAPI endpoints (~2200 lines)
│   └── tests/              # Pytest test files
├── frontend/
│   └── src/
│       ├── App.js          # Main router (12 tabs)
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── StaffList.jsx
│       │   ├── Attendance.jsx
│       │   ├── SalaryCalculator.jsx
│       │   ├── CashBook.jsx         # With Opening Balance
│       │   ├── PartyLedger.jsx      # With Opening Balance Edit
│       │   ├── InterestByaj.jsx
│       │   ├── Expenses.jsx
│       │   ├── AccountingReports.jsx
│       │   ├── ChitFund.jsx
│       │   ├── ProfitLossStatement.jsx  # With FY/Month filter
│       │   └── BalanceSheet.jsx
│       └── components/ui/
├── electron/
└── .github/workflows/
```

## Core Features Implemented

### Staff Management
- Add/Edit/Delete staff members
- Fields: name, phone, joining date, monthly salary

### Attendance Tracking
- Calendar-based attendance marking
- Status: Present (P), Absent (A), Half-Day (H)

### Salary Calculator (30-day basis)
- Formula: Daily Rate = Monthly Salary ÷ 30
- Half Day = Daily Rate ÷ 2
- Advance auto-deduction

### Simplified Accounting System

#### 1. Daily Cash Book
- Credit (Jama) and Debit (Udhar) entries
- Payment modes: Cash, UPI, Bank Transfer
- **Opening Balance** - Set FY start cash balance
- Daily/Monthly summaries

#### 2. Party Ledger
- Track parties (debtors/creditors)
- **Opening Balance** - Set and edit per party
- Auto-update balance on transactions
- View full ledger with running balance

#### 3. Expenses
- Categories: Salary, Rent, Electricity, Supplies, etc.
- Auto-link to Cash Book

#### 4. Byaj (Interest) System
- 30-day monthly basis: 1 Month = 30 Days
- Formula: Principal × Monthly Rate × Months / 100
- One-click add to Cash Book + Party Ledger

#### 5. Chit Fund
- Track chit fund investments
- Pay Installment → Auto DEBIT to Cash Book
- Mark Won → Auto CREDIT to Cash Book

#### 6. P&L Statement (Auto-Generated)
- **Income**: Sum of Credit transactions
- **Expenses**: Sum of Debit transactions by category
- **Net Profit/Loss**: Income - Expenses
- **Filters**: Monthly / Financial Year

#### 7. Balance Sheet (Auto-Generated)
- **Assets**: Cash Balance + Debtors + Advances + Chit Fund Investment + Interest Receivable
- **Liabilities**: Creditors + Salaries Payable
- **Capital (Net Worth)**: Assets - Liabilities
- Always balanced by definition

#### 8. Financial Year Support
- April-March (Indian standard)
- FY Selector in header
- Filter reports by FY

## API Endpoints

### Financial Year
- `GET /api/financial-years` - List all FYs
- `GET /api/financial-years/active` - Get active FY
- `PUT /api/financial-years/{id}/activate` - Set active FY

### Cash Book
- `GET /api/cashbook/{date}` - Daily cash book
- `GET /api/cashbook/monthly/{month}` - Monthly summary
- `GET /api/cashbook/opening-balance` - Get opening balance
- `POST /api/cashbook/opening-balance` - Set opening balance

### Reports
- `GET /api/reports/simple-profit-loss?month=YYYY-MM&fy={id}` - P&L
- `GET /api/reports/simple-balance-sheet?fy={id}` - Balance Sheet

## What's Been Implemented (December 2025)
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Advance tracking with deduction
- [x] Daily Cash Book with Opening Balance
- [x] Party Ledger with Opening Balance Edit
- [x] Byaj system (30-day monthly basis)
- [x] Chit Fund tracking with Cash Book auto-link
- [x] Expenses by category
- [x] Auto-generated P&L Statement
- [x] Auto-generated Balance Sheet
- [x] Financial Year (April-March) filtering
- [x] FY Selector in header
- [x] Opening Balances (Cash + Parties)
- [x] Electron desktop app setup
- [x] GitHub Actions for .exe build

## Testing Status
- Backend: 100% (45+ tests across multiple test files)
- Frontend: 100% (All 12 pages functional)

## Navigation Tabs (12)
1. Dashboard
2. Staff
3. Attendance
4. Salary
5. Cash Book
6. Party Ledger
7. Byaj
8. Expenses
9. Reports
10. Chit Fund
11. P&L
12. Balance Sheet

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation (30-day basis)
- ✅ Advance tracking
- ✅ Cash Book with Opening Balance
- ✅ Party Ledger with Opening Balance
- ✅ Byaj (30-day monthly basis)
- ✅ Chit Fund with Cash Book integration
- ✅ Simplified P&L & Balance Sheet
- ✅ Financial Year filtering
- ✅ Electron desktop app setup

### P1 (Important)
- [ ] Electron Auto-Update capability
- [ ] Export reports as PDF
- [ ] Export reports as Excel
- [ ] Receipt/Invoice printing

### P2 (Nice to have)
- [ ] Multiple organizations support
- [ ] Staff photo upload
- [ ] Email reports
- [ ] Data backup to cloud
- [ ] GST/Tax calculation

## Technical Notes

### Key Formulas
- **Salary Daily Rate**: Monthly Salary ÷ 30
- **Interest**: Principal × Monthly Rate × (Days/30) ÷ 100
- **Net Profit**: Total Income - Total Expenses
- **Net Worth**: Total Assets - Total Liabilities

### Financial Year
- Format: April-March (Indian standard)
- Current: 2025-26 (April 2025 - March 2026)

### Opening Balance
- Cash: Stored in settings collection
- Party: Stored per party, affects current_balance

## User Language
- Primary: Hindi / Hinglish
- UI labels include Hindi translations in parentheses

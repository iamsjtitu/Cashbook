# Staff Manager - Complete Business & Accounting Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- **Complete Proper Accounting System** with:
  - Chart of Accounts (Asset, Liability, Capital, Income, Expense)
  - Double Entry Voucher System (Payment, Receipt, Journal, Contra, Sales, Purchase)
  - Financial Year: April-March (Indian standard)
  - Opening Balances import
  - Trial Balance
  - Profit & Loss Statement
  - Balance Sheet
- Byaj (Interest) calculation on 30-day monthly basis
- Chit Fund tracking with Cash Book auto-link
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
│   ├── server.py           # All FastAPI endpoints
│   └── tests/              # Pytest test files
├── frontend/
│   └── src/
│       ├── App.js          # Main router (15 tabs)
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── StaffList.jsx
│       │   ├── Attendance.jsx
│       │   ├── SalaryCalculator.jsx
│       │   ├── CashBook.jsx
│       │   ├── PartyLedger.jsx
│       │   ├── InterestByaj.jsx
│       │   ├── Expenses.jsx
│       │   ├── AccountingReports.jsx
│       │   ├── ChitFund.jsx
│       │   ├── ChartOfAccounts.jsx    # NEW
│       │   ├── JournalEntry.jsx       # NEW
│       │   ├── TrialBalance.jsx       # NEW
│       │   ├── ProfitLossStatement.jsx # NEW
│       │   └── BalanceSheet.jsx       # NEW
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

### Proper Accounting System (NEW!)

#### 1. Chart of Accounts (खाता तालिका)
- **5 Account Types**: Asset, Liability, Capital, Income, Expense
- **11 Sub-Types**: 
  - Assets: Current Asset, Fixed Asset
  - Liabilities: Current Liability, Long-term Liability
  - Capital: Owner's Capital, Drawings, Retained Earnings
  - Income: Direct Income, Indirect Income
  - Expense: Direct Expense, Indirect Expense
- **30 Default Accounts** created automatically
- Account codes: 1xxx=Assets, 2xxx=Liabilities, 3xxx=Capital, 4xxx=Income, 5xxx=Expenses
- View account ledger with all transactions

#### 2. Double Entry Voucher System
- **6 Voucher Types**: 
  - Payment Voucher (💸)
  - Receipt Voucher (💰)
  - Journal Voucher (📝)
  - Contra Voucher (🔄)
  - Sales Voucher (🛒)
  - Purchase Voucher (📦)
- **Rule**: Total Debit MUST equal Total Credit
- Auto-generated voucher numbers: PAY-0001, REC-0001, etc.
- Account balances auto-update after voucher

#### 3. Financial Year (वित्तीय वर्ष)
- **Format**: April-March (Indian standard)
- Current: 2025-26 (April 2025 - March 2026)
- Opening balances linked to financial year

#### 4. Trial Balance (तलपट)
- Shows all accounts with Debit and Credit totals
- Grouped by account type
- **Validation**: Total Debit = Total Credit

#### 5. Profit & Loss Statement (लाभ-हानि खाता)
- Income vs Expenses
- Direct and Indirect breakdown
- **Net Profit/Loss** calculation

#### 6. Balance Sheet (चिट्ठा)
- Two-column format
- Left: Liabilities + Capital
- Right: Assets
- **Equation**: Assets = Liabilities + Capital
- Net Profit added to Capital

### Byaj (Interest) System
- **Formula**: `(Principal × Monthly Rate % × Months) ÷ 100`
- **30-Day Month Basis**: 1 Month = 30 Days (always)
- One-click add to Cash Book + Party Ledger

### Chit Fund System
- Track chit fund memberships
- Pay Installment → Auto DEBIT to Cash Book
- Mark Won → Auto CREDIT to Cash Book

## API Endpoints

### Accounting
- `POST /api/accounts/initialize-defaults` - Create 30 default accounts
- `GET/POST /api/accounts` - Chart of Accounts CRUD
- `GET /api/accounts/{id}/ledger` - Account ledger
- `GET/POST /api/journal-entries` - Voucher entry (double entry)
- `GET /api/financial-years` - Financial year management
- `GET /api/reports/trial-balance` - Trial Balance
- `GET /api/reports/profit-loss-statement` - P&L Statement
- `GET /api/reports/balance-sheet` - Balance Sheet

## What's Been Implemented (December 2025)
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Daily Cash Book
- [x] Party Ledger
- [x] Byaj system (30-day monthly basis)
- [x] Chit Fund tracking
- [x] **Chart of Accounts (5 types, 11 sub-types)**
- [x] **Double Entry Voucher System (6 types)**
- [x] **Financial Year April-March**
- [x] **Trial Balance**
- [x] **Profit & Loss Statement**
- [x] **Balance Sheet**
- [x] Electron desktop app setup

## Testing Status
- Backend: 100% (17 accounting + previous tests)
- Frontend: 100% (All 15 pages functional)

## Navigation Tabs (15)
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
11. **Accounts** (Chart of Accounts)
12. **Voucher** (Double Entry)
13. **Trial Balance**
14. **P&L**
15. **Balance Sheet**

## Accounting Rules Implemented
| Rule | Implementation |
|------|----------------|
| Double Entry | Every voucher: Total Debit = Total Credit |
| Asset Balance | Debit increases, Credit decreases |
| Liability Balance | Credit increases, Debit decreases |
| Capital Balance | Credit increases, Debit decreases |
| Income Balance | Credit increases, Debit decreases |
| Expense Balance | Debit increases, Credit decreases |
| Trial Balance | Total Debit = Total Credit |
| Balance Sheet | Assets = Liabilities + Capital |

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation (30-day basis)
- ✅ Byaj (30-day monthly basis)
- ✅ Chit Fund with Cash Book integration
- ✅ Complete Proper Accounting System
- ✅ Double Entry Voucher System
- ✅ Trial Balance, P&L, Balance Sheet
- ✅ Electron desktop app setup

### P1 (Important)
- Export reports as PDF
- Export reports as Excel
- Receipt/Invoice printing
- GST/Tax calculation

### P2 (Nice to have)
- Multiple organizations support
- Staff photo upload
- Email reports
- Data backup to cloud

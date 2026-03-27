# Staff Manager - Complete Business Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- Daily Rate = Monthly Salary / 30
- Half Day = Daily Rate / 2
- **Byaj (Interest) calculation on 30-day MONTHLY basis** (not daily/365)
- **Chit Fund tracking** as a member with auto-link to Cash Book
- Complete Accounting System with Cash Book, Party Ledger, Expenses, Reports
- Electron Desktop App with downloadable `.exe` on GitHub push
- Top-menu colorful UI design

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React with Tailwind CSS + Shadcn UI components
- **Desktop**: Electron wrapper with auto-update support
- **CI/CD**: GitHub Actions for automated `.exe` builds

## Code Structure
```
/app/
├── backend/
│   ├── server.py           # All FastAPI endpoints
│   ├── tests/              # Pytest test files
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js          # Main router (10 tabs)
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── StaffList.jsx
│       │   ├── Attendance.jsx
│       │   ├── SalaryCalculator.jsx
│       │   ├── MonthlyReport.jsx
│       │   ├── Advance.jsx
│       │   ├── CashBook.jsx
│       │   ├── PartyLedger.jsx
│       │   ├── InterestByaj.jsx    # 30-day monthly formula
│       │   ├── Expenses.jsx
│       │   ├── AccountingReports.jsx
│       │   ├── ChitFund.jsx        # NEW
│       │   └── WhatsNew.jsx
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

### Byaj (Interest) System - UPDATED
- **Formula**: `(Principal × Monthly Rate % × Months) ÷ 100`
- **30-Day Month Basis**: 1 Month = 30 Days (always, regardless of actual month days)
- Examples:
  - 30 days = 1 month
  - 45 days = 1.5 months
  - 60 days = 2 months
- One-click add to Cash Book + Party Ledger

### Chit Fund System - NEW
- Track chit fund memberships
- Fields: Name, Total Amount, Monthly Installment, Duration, Members, Organizer
- **Pay Installment**: Auto-adds DEBIT to Cash Book
- **Mark Won**: Auto-adds CREDIT to Cash Book
- Payment history view
- Summary: Total Invested, Total Won, Remaining to Pay
- Duplicate payment/win prevention

### Accounting System
- Daily Cash Book
- Party Ledger with running balance
- Expense tracking with categories
- Profit/Loss Reports
- Payment Mode breakdown

## API Endpoints

### Staff & Attendance
- `/api/staff` - Staff CRUD
- `/api/attendance` - Attendance marking
- `/api/salary/{staff_id}/{month}` - Calculate salary
- `/api/pay-salary/{staff_id}/{month}` - Pay with auto-link

### Byaj (Interest)
- `POST /api/interest-accounts` - Create interest account
- `GET /api/interest-accounts/{id}/calculate` - Calculate with monthly formula
- `POST /api/interest-accounts/{id}/add-to-cashbook` - Add interest to cash book

### Chit Fund
- `POST /api/chit-funds` - Create chit fund
- `GET /api/chit-funds` - List all chits
- `POST /api/chit-funds/{id}/pay` - Pay installment (auto-debit to cash book)
- `POST /api/chit-funds/{id}/win` - Mark won (auto-credit to cash book)
- `GET /api/chit-funds/{id}/payments` - Payment history
- `GET /api/chit-funds/summary/all` - Summary totals

### Accounting
- `/api/parties` - Party Ledger
- `/api/transactions` - Cash Book entries
- `/api/cashbook/{date}` - Daily cash book
- `/api/expenses` - Expense tracking
- `/api/reports/profit-loss/{month}` - P&L report

## What's Been Implemented (December 2025)
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Top-Menu colorful UI design
- [x] Daily Cash Book
- [x] Party Ledger
- [x] **Byaj system updated to 30-day monthly basis**
- [x] **Chit Fund tracking with Cash Book auto-link**
- [x] Expense tracking with categories (including chit_fund)
- [x] Profit/Loss Reports
- [x] Electron desktop app setup

## Testing Status
- Backend: 100% (All tests passed)
- Frontend: 100% (All 10 pages functional)
- Test files:
  - `/app/backend/tests/test_staff_attendance_app.py`
  - `/app/backend/tests/test_accounting_system.py`
  - `/app/backend/tests/test_byaj_chitfund.py`

## Key Formulas
| Feature | Formula |
|---------|---------|
| Daily Rate | Monthly Salary ÷ 30 |
| Half Day | Daily Rate ÷ 2 |
| Byaj (Interest) | (Principal × Monthly Rate % × Months) ÷ 100 |
| Months | Days ÷ 30 (always 30-day month) |

## Navigation Tabs (10)
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

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation (30-day basis)
- ✅ Byaj (30-day monthly basis)
- ✅ Chit Fund with Cash Book integration
- ✅ Complete Accounting System
- ✅ Electron desktop app setup

### P1 (Important)
- Export reports as PDF
- Export reports as Excel
- Receipt/Invoice printing

### P2 (Nice to have)
- Multiple organizations support
- Staff photo upload
- Email reports
- Leave management
- Data backup to cloud

# Staff Manager - Complete Business Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- Daily Rate = Monthly Salary / 30
- Half Day = Daily Rate / 2
- What's New section
- Auto-update feature support
- **Electron Desktop App** with downloadable `.exe` on GitHub push
- Top-menu colorful UI design
- Advance salary tracking
- Monthly Report generation
- **Complete Accounting System** with Cash Book, Party Ledger, Byaj (Interest), Expenses, and Reports

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React with Tailwind CSS + Shadcn UI components
- **Desktop**: Electron wrapper with auto-update support
- **CI/CD**: GitHub Actions for automated `.exe` builds

## Code Structure
```
/app/
├── backend/
│   ├── server.py           # All FastAPI endpoints (Staff, Attendance, Salary, Accounting)
│   ├── tests/              # Pytest test files
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js          # Main router with all navigation
│       ├── pages/
│       │   ├── Dashboard.jsx       # Home dashboard
│       │   ├── StaffList.jsx       # Staff management
│       │   ├── Attendance.jsx      # Attendance tracking
│       │   ├── SalaryCalculator.jsx # Salary calculation
│       │   ├── MonthlyReport.jsx   # Staff monthly report
│       │   ├── Advance.jsx         # Advance salary
│       │   ├── CashBook.jsx        # Daily cash book
│       │   ├── PartyLedger.jsx     # Party/Ledger management
│       │   ├── InterestByaj.jsx    # Interest/Byaj system
│       │   ├── Expenses.jsx        # Expense tracking
│       │   ├── AccountingReports.jsx # P&L, Cash Flow reports
│       │   └── WhatsNew.jsx        # What's New modal
│       └── components/ui/  # Shadcn components
├── electron/               # Electron desktop app
└── .github/workflows/      # GitHub Actions for .exe builds
```

## Core Features Implemented

### Staff Management
- Add/Edit/Delete staff members
- Fields: name, phone, joining date, monthly salary
- Staff list with search and actions

### Attendance Tracking
- Calendar-based attendance marking
- Status: Present (P), Absent (A), Half-Day (H)
- View attendance by staff and month

### Salary Calculator
- 30-day basis calculation (strict requirement)
- Formula: Daily Rate = Monthly Salary ÷ 30
- Half Day = Daily Rate ÷ 2
- Detailed salary slip generation

### Monthly Staff Report
- All staff attendance summary
- Total Present/Absent/Half-day counts
- Total salary paid

### Advance Salary
- Track salary advances given to staff
- Add/View/Delete advances
- Total advance summary

### Accounting System (NEW!)

#### 1. Daily Cash Book (रोजाना का हिसाब)
- Add Credit (Jama) / Debit (Udhar) entries
- Opening & Closing balance calculation
- Multiple payment modes: Cash, UPI, Bank Transfer
- Date-wise view

#### 2. Party Ledger (उधारी का हिसाब)
- Create parties with opening balance
- Track Debit (Lena) / Credit (Dena) balance
- Full ledger view with all transactions
- Auto-update balance on transactions

#### 3. Byaj (Interest) System
- Create interest accounts with Principal, Rate %, Start Date
- **Formula**: (Principal × Rate × Days) ÷ (365 × 100)
- One-click: Calculate interest and add to Cash Book
- Auto-create entry in Party Ledger

#### 4. Expense Tracking
- Categories: Salary, Advance, Rent, Electricity, Supplies, Maintenance, Transport, Food, Interest Paid, Other
- **Auto-Link**: Every expense automatically adds Debit entry to Cash Book
- Category-wise summary
- Month-wise expense report

#### 5. Auto-Connect Features
- Salary Payment → Auto-add to Cash Book + Expenses
- Advance Payment → Already tracked in Cash Book
- Interest (Byaj) → Auto-add to Cash Book + Party Ledger

#### 6. Reports (Auto-Generated)
- **Profit/Loss Statement**: Total Income vs Total Expense
- **Payment Mode Summary**: Cash, UPI, Bank breakdown
- **Daily Cash Flow**: Day-wise credit/debit summary
- **Expense Breakdown**: Category-wise pie chart

### Electron Desktop App
- Standalone Windows `.exe` application
- Auto-update feature via GitHub releases
- Help menu with update checker

## API Endpoints

### Staff & Attendance
- `GET/POST /api/staff` - Staff list/create
- `GET/PUT/DELETE /api/staff/{id}` - Staff operations
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/{staff_id}/{month}` - Monthly attendance
- `GET /api/salary/{staff_id}/{month}` - Calculate salary
- `POST /api/pay-salary/{staff_id}/{month}` - Pay salary (auto-link)

### Accounting
- `GET/POST /api/parties` - Party list/create
- `GET /api/parties/{id}/ledger` - Party ledger
- `GET/POST /api/transactions` - Cash book entries
- `GET /api/cashbook/{date}` - Daily cash book
- `GET /api/cashbook/monthly/{month}` - Monthly summary
- `GET/POST /api/interest-accounts` - Byaj accounts
- `GET /api/interest-accounts/{id}/calculate` - Calculate interest
- `POST /api/interest-accounts/{id}/add-to-cashbook` - Add interest to cash book
- `GET/POST /api/expenses` - Expense tracking
- `GET /api/expenses/summary/{month}` - Category summary
- `GET /api/reports/profit-loss/{month}` - P&L report
- `GET /api/reports/payment-mode/{month}` - Payment mode breakdown

## What's Been Implemented (December 2025)
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Dashboard with live stats
- [x] What's New modal
- [x] Top-Menu colorful UI design
- [x] Monthly Report page
- [x] Advance salary tracking
- [x] Electron desktop app setup
- [x] GitHub Actions for automated `.exe` builds
- [x] Auto-update feature support
- [x] **Daily Cash Book**
- [x] **Party Ledger**
- [x] **Byaj (Interest) System with one-click add**
- [x] **Expense Tracking with auto-link**
- [x] **Profit/Loss Reports**
- [x] **Payment Mode Summary**
- [x] **Daily Cash Flow Report**

## Testing Status
- Backend: 100% (33 accounting + 26 staff tests = 59 total tests passed)
- Frontend: 100% (All pages functional)
- Test files: 
  - `/app/backend/tests/test_staff_attendance_app.py`
  - `/app/backend/tests/test_accounting_system.py`

## How to Build Desktop App

### Automatic (Recommended)
1. Push a version tag to GitHub: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions will automatically build the `.exe`
3. Download from GitHub Releases

### Manual
1. Build frontend: `cd frontend && yarn build`
2. Copy to electron: `cp -r frontend/build/* electron/build/`
3. Build exe: `cd electron && yarn build:win`

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation (30-day basis)
- ✅ Top-menu UI
- ✅ Advance tracking
- ✅ Monthly Report
- ✅ Electron setup
- ✅ Complete Accounting System
- ✅ Byaj (Interest) with one-click add

### P1 (Important)
- Export reports as PDF
- Export reports as Excel
- Multiple organizations support
- Staff photo upload
- Receipt/Invoice printing

### P2 (Nice to have)
- Email reports
- Leave management
- Employee self-service portal
- Overtime calculation
- Biometric integration
- Data backup to cloud

# Staff Manager - Complete Business & Accounting Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- **Simplified Accounting System** (User rejected complex double-entry vouchers):
  - Daily Cash Book with Opening Balance
  - Party Ledger with Opening Balance
  - Expenses tracking by category
  - Byaj (Interest) calculation on 30-day monthly basis
  - **Chit Fund with Monthly Dividend Tracking** (NEW!)
  - Auto-generated P&L Statement
  - Auto-generated Balance Sheet
  - Financial Year (April-March) filtering
- Electron Desktop App with `.exe` on GitHub push

## Chit Fund System (चिट फंड)

### How It Works
1. **Create Chit Fund** - Enter chit value, monthly EMI, total members, duration
2. **Monthly Entry** - Each month enter EMI paid + Auction amount
3. **Auto Dividend** - System calculates: `(Chit Value - Auction Amount) / Members`
4. **Lift (Uthao)** - When you win/lift the chit, record the received amount
5. **Final Profit** - System shows: Total Paid, Total Dividend, Lifted Amount, Net Profit

### Example
- Chit Value: ₹10,00,000
- Members: 20
- Monthly EMI: ₹50,000
- This month auction: ₹7,50,000
- **Your Dividend: (10,00,000 - 7,50,000) / 20 = ₹12,500**

### Net Profit Calculation
- **When Lifted:** Net Profit = Lifted Amount + Total Dividend - Total Paid
- **When Not Lifted:** Net Profit = Total Dividend (savings so far)

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Desktop**: Electron wrapper with auto-update
- **CI/CD**: GitHub Actions for `.exe` builds

## Code Structure
```
/app/
├── backend/
│   ├── server.py           # All FastAPI endpoints (~2300 lines)
│   └── tests/
│       └── test_chit_fund_dividend.py  # Chit fund tests
├── frontend/
│   └── src/
│       ├── App.js          # Main router (12 tabs)
│       ├── pages/
│       │   ├── ChitFund.jsx         # NEW! Dividend tracking
│       │   ├── CashBook.jsx         # With Opening Balance
│       │   ├── PartyLedger.jsx      # With Opening Balance Edit
│       │   ├── ProfitLossStatement.jsx  # With FY/Month filter
│       │   └── BalanceSheet.jsx
│       └── components/ui/
├── electron/
└── .github/workflows/
```

## What's Been Implemented (December 2025)

### Staff Management
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Advance tracking with deduction

### Simplified Accounting
- [x] Daily Cash Book with Opening Balance
- [x] Party Ledger with Opening Balance Edit
- [x] Expenses by category
- [x] Auto-generated P&L Statement (with FY filter)
- [x] Auto-generated Balance Sheet (with FY filter)
- [x] Financial Year (April-March) filtering
- [x] FY Selector in header

### Byaj (Interest) System
- [x] 30-day monthly basis calculation
- [x] Principal × Rate × Months / 100
- [x] One-click add to Cash Book + Party Ledger

### Chit Fund System (NEW!)
- [x] Create chit fund with chit_value, members, duration
- [x] Monthly entry with auction_amount
- [x] Auto-calculate dividend: (chit_value - auction_amount) / members
- [x] Live dividend preview in modal
- [x] Lift chit and record received amount
- [x] Full summary with net profit calculation
- [x] Cash Book integration (entry = DEBIT, lift = CREDIT)
- [x] Data migration for old chit records

### Desktop App
- [x] Electron desktop app setup
- [x] GitHub Actions for .exe build

## API Endpoints

### Chit Fund (New)
- `POST /api/chit-funds` - Create chit fund
- `GET /api/chit-funds` - List all chit funds
- `POST /api/chit-funds/{id}/monthly-entry` - Add monthly entry with dividend calculation
- `GET /api/chit-funds/{id}/monthly-entries` - List monthly entries
- `POST /api/chit-funds/{id}/lift` - Mark as lifted
- `GET /api/chit-funds/{id}/summary` - Get full summary with net profit
- `GET /api/chit-funds/summary/all` - Overall summary
- `DELETE /api/chit-monthly-entries/{id}` - Delete entry

### Financial Year
- `GET /api/financial-years/active` - Get active FY
- `PUT /api/financial-years/{id}/activate` - Set active FY

### Reports
- `GET /api/reports/simple-profit-loss?fy={id}` - P&L with FY filter
- `GET /api/reports/simple-balance-sheet?fy={id}` - Balance Sheet with FY filter

## Testing Status
- Backend: 100% (All tests passed)
- Frontend: 100% (All 12 pages functional)

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation (30-day basis)
- ✅ Advance tracking
- ✅ Cash Book with Opening Balance
- ✅ Party Ledger with Opening Balance
- ✅ Byaj (30-day monthly basis)
- ✅ Chit Fund with Dividend Tracking
- ✅ Simplified P&L & Balance Sheet
- ✅ Financial Year filtering

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

## User Language
- Primary: Hindi / Hinglish
- UI labels include Hindi translations

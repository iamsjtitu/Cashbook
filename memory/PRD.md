# Staff Manager - Complete Business & Accounting Management System

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- **Unified Accounting System** - Everything in one place:
  - **Master Cash Book** - Single page for all transactions
  - Party Ledger auto-updates from Cash Book
  - Expenses auto-track by category from Cash Book
  - Chit Fund entries visible in Cash Book
  - Byaj (Interest) linked to Cash Book
  - Auto-generated P&L and Balance Sheet
  - Financial Year (April-March) filtering
- Electron Desktop App with `.exe` on GitHub push

## Unified Cash Book Design

### How It Works
The Cash Book is now the **central command center** where all financial transactions happen:

1. **Entry Form on Left** (always visible, not modal)
   - Credit/Debit toggle (Green/Red)
   - Amount input
   - Party dropdown (with existing balance shown)
   - "+ New Party" - Create party inline
   - Category dropdown (only for Debit entries)
   - Payment Mode buttons (Cash/UPI/Bank)
   - Date picker
   - Description

2. **Transactions Table on Right**
   - Today/Week/Month filter
   - All transactions from everywhere
   - Columns: Date, Description, Party, Category, Mode, Credit, Debit, Action
   - Chit Fund entries also visible here

3. **Expense by Category Summary**
   - Appears in Debit mode
   - Shows totals by category (Rent, Salary, Chit Fund, etc.)

### Auto-Connections
- **Party Ledger**: Selecting party auto-updates their balance
- **Expenses**: Category selection auto-tracks expense
- **Chit Fund**: EMI entries appear as Debit in Cash Book
- **Byaj**: Interest entries link to Cash Book

## Chit Fund System

### Simplified Flow
1. Select Chit from dropdown (or add new)
2. Add monthly entry:
   - Select Month (dropdown shows paid months with ✓)
   - EMI Paid (₹)
   - Is Mahine Mila (₹) - Direct profit/dividend input
3. System calculates: **Effective Cost = EMI - Mila**
4. When you lift (uthao), record the amount received
5. Final Summary: Total Paid, Total Dividend, Lifted Amount, Net Profit

### Example
- EMI: ₹50,000 (pay kiya)
- Mila: ₹20,000 (profit aya)
- Effective Cost: ₹30,000

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Desktop**: Electron wrapper

## What's Been Implemented (March 2026)

### Staff Management
- [x] Staff CRUD operations
- [x] Attendance marking
- [x] Salary calculation (30-day basis)
- [x] Advance tracking

### Unified Accounting
- [x] **Unified Cash Book** - Entry form on page, all transactions visible
- [x] Party auto-create inline
- [x] Category-wise expense tracking
- [x] Party Ledger with Opening Balance
- [x] Financial Year filtering
- [x] P&L Statement (auto from Cash Book)
- [x] Balance Sheet (auto from all modules)

### Chit Fund
- [x] Simplified dividend system (EMI - Mila = Effective Cost)
- [x] Month dropdown with paid months marked
- [x] Lift tracking
- [x] Net profit calculation
- [x] Cash Book integration

### Byaj (Interest)
- [x] 30-day monthly basis
- [x] One-click add to Cash Book

## Testing Status
- Backend: 100% (All tests passed across iterations 6-10)
- Frontend: 100% (All features verified with Playwright)

## Prioritized Backlog

### P0 (Completed)
- ✅ Staff management
- ✅ Attendance & Salary (30-day basis)
- ✅ Unified Cash Book
- ✅ Party Ledger with Opening Balance
- ✅ Chit Fund with Dividend tracking
- ✅ Byaj (Interest) system
- ✅ P&L & Balance Sheet
- ✅ Financial Year filtering

### P1 (Important)
- [ ] Electron Auto-Update
- [ ] PDF Export for reports
- [ ] Excel Export for reports

### P2 (Future)
- [ ] Receipt/Invoice printing
- [ ] Multiple organization support
- [ ] Cloud data backup

## User Language
- Primary: Hindi / Hinglish
- All labels have Hindi translations

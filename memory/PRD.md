# Staff Attendance + Salary Management App

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
│       ├── App.js          # Main router with Top-Menu navigation
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── StaffList.jsx
│       │   ├── Attendance.jsx
│       │   ├── SalaryCalculator.jsx
│       │   ├── MonthlyReport.jsx
│       │   ├── Advance.jsx
│       │   └── WhatsNew.jsx
│       └── components/ui/  # Shadcn components
├── electron/
│   ├── main.js             # Electron main process
│   ├── preload.js          # Preload script
│   ├── package.json        # Electron dependencies
│   └── build/              # Icons and assets
└── .github/workflows/
    └── build-electron.yml  # GitHub Actions for .exe builds
```

## Core Features Implemented

### 1. Staff Management
- Add/Edit/Delete staff members
- Fields: name, phone, joining date, monthly salary
- Staff list with search and actions

### 2. Attendance Tracking
- Calendar-based attendance marking
- Status options: Present (P), Absent (A), Half-Day (H)
- View attendance by staff and month

### 3. Salary Calculator
- 30-day basis calculation (strict requirement)
- Formula: Daily Rate = Monthly Salary ÷ 30
- Half Day = Daily Rate ÷ 2
- Detailed salary slip generation

### 4. Monthly Report
- All staff attendance summary
- Month selection dropdown
- Total Present/Absent/Half-day counts
- Total salary paid
- Export options (Excel, PDF buttons)

### 5. Advance Salary
- Track salary advances given to staff
- Add/View/Delete advances
- Total advance summary
- Staff-wise advance records

### 6. Electron Desktop App
- Standalone Windows `.exe` application
- Auto-update feature via GitHub releases
- Help menu with update checker

## API Endpoints
- `GET/POST /api/staff` - Staff list/create
- `GET/PUT/DELETE /api/staff/{id}` - Staff operations
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/{staff_id}/{month}` - Monthly attendance
- `GET /api/attendance/date/{date}` - Daily attendance
- `GET /api/salary/{staff_id}/{month}` - Calculate salary
- `GET/POST /api/advances` - Advance management
- `GET /api/advances/{staff_id}` - Staff advances
- `DELETE /api/advances/{advance_id}` - Delete advance
- `GET/POST /api/whats-new` - Release notes
- `GET/POST /api/app-version` - For auto-update

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

## Testing Status
- Backend: 100% (26/26 tests passed)
- Frontend: 95% (All pages functional)
- Test file: `/app/backend/tests/test_staff_attendance_app.py`

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

### P1 (Important)
- Export salary slip as PDF (button exists, needs implementation)
- Export Monthly Report as Excel (button exists, needs implementation)
- Multiple organizations support
- Staff photo upload

### P2 (Nice to have)
- Email salary slips
- Leave management
- Employee self-service portal
- Overtime calculation
- Biometric integration

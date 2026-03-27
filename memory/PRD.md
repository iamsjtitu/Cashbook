# Staff Attendance + Salary Management App

## Original Problem Statement
- Staff attendance tracking with Present, Absent, Half Day options
- Salary calculation always based on 30 days (regardless of month)
- Daily Rate = Monthly Salary / 30
- Half Day = Daily Rate / 2
- What's New section
- Auto-update feature support

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React with Tailwind CSS + Shadcn UI components
- **Design**: Swiss/High-Contrast (Archetype 4) with Chivo + IBM Plex Sans fonts

## Core Features Implemented
1. **Staff Management**: Add/Edit/Delete staff with name, phone, joining date, monthly salary
2. **Attendance Tracking**: Calendar-based attendance marking (Present/Absent/Half Day)
3. **Salary Calculator**: Monthly salary slip with breakdown
4. **Dashboard**: Stats cards, recent staff, today's attendance
5. **What's New Modal**: Version updates and release notes

## User Personas
- Small business owners
- HR managers
- Shop/restaurant owners tracking staff

## What's Been Implemented (March 27, 2026)
- [x] Staff CRUD operations
- [x] Attendance marking by calendar day
- [x] Salary calculation (30-day basis)
- [x] Dashboard with live stats
- [x] What's New modal
- [x] Swiss/High-Contrast UI design
- [x] Responsive sidebar navigation

## API Endpoints
- `GET/POST /api/staff` - Staff list/create
- `PUT/DELETE /api/staff/{id}` - Staff update/delete
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/{staff_id}/{month}` - Get monthly attendance
- `GET /api/salary/{staff_id}/{month}` - Calculate salary
- `GET/POST /api/whats-new` - Release notes
- `GET /api/app-version` - For auto-update

## Prioritized Backlog
### P0 (Critical)
- ✅ Staff management
- ✅ Attendance tracking
- ✅ Salary calculation

### P1 (Important)
- Export salary slip as PDF
- Monthly attendance report export
- Multiple organizations support

### P2 (Nice to have)
- Email salary slips
- Leave management
- Employee self-service portal
- Overtime calculation

## Next Action Items
1. **Electron Desktop App**: Need to setup Electron packaging with GitHub Actions for auto .exe builds
2. PDF export for salary slips
3. Bulk attendance marking

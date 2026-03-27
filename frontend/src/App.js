import { useState, Component } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Dashboard from "@/pages/Dashboard";
import StaffList from "@/pages/StaffList";
import Attendance from "@/pages/Attendance";
import SalaryCalculator from "@/pages/SalaryCalculator";
import MonthlyReport from "@/pages/MonthlyReport";
import Advance from "@/pages/Advance";
import WhatsNew from "@/pages/WhatsNew";
// Accounting Pages
import CashBook from "@/pages/CashBook";
import PartyLedger from "@/pages/PartyLedger";
import Expenses from "@/pages/Expenses";
import InterestByaj from "@/pages/InterestByaj";
import AccountingReports from "@/pages/AccountingReports";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API = `${BACKEND_URL}/api`;

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Top Header
const TopHeader = ({ onWhatsNewClick }) => {
  return (
    <header className="top-header">
      <div className="company-info">
        <div className="company-name">STAFF MANAGER</div>
        <div className="company-location">Attendance & Salary System</div>
      </div>
      
      <div className="header-actions">
        <div className="header-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          2025-2026
        </div>
        
        <div className="header-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          admin
          <span className="admin-badge">ADMIN</span>
        </div>

        <button className="header-btn" onClick={onWhatsNewClick}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <div className="version-badge">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          v1.0.0
        </div>
        
        <button className="header-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>
    </header>
  );
};

// Main Navigation
const MainNav = () => {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
      <NavLink to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Dashboard
      </NavLink>
      
      <NavLink to="/staff" className={`nav-item ${location.pathname === '/staff' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Staff
      </NavLink>
      
      <NavLink to="/attendance" className={`nav-item ${location.pathname === '/attendance' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Attendance
      </NavLink>
      
      <NavLink to="/salary" className={`nav-item ${location.pathname === '/salary' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Salary
      </NavLink>
      
      <NavLink to="/cashbook" className={`nav-item ${location.pathname === '/cashbook' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Cash Book
      </NavLink>
      
      <NavLink to="/parties" className={`nav-item ${location.pathname === '/parties' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Party Ledger
      </NavLink>
      
      <NavLink to="/interest" className={`nav-item ${location.pathname === '/interest' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Byaj
      </NavLink>
      
      <NavLink to="/expenses" className={`nav-item ${location.pathname === '/expenses' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Expenses
      </NavLink>
      
      <NavLink to="/reports" className={`nav-item ${location.pathname === '/reports' ? 'active' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Reports
      </NavLink>
    </nav>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-title">Staff Manager - <span>Attendance & Salary System</span></div>
      <div className="footer-info">Salary = Monthly ÷ 30 days | Half Day = Daily ÷ 2</div>
      <div className="footer-credits">v1.0.0 | Built with Emergent</div>
    </footer>
  );
};

function App() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  return (
    <div className="app-container">
      <ErrorBoundary>
        <BrowserRouter>
          <TopHeader onWhatsNewClick={() => setShowWhatsNew(true)} />
          <MainNav />
          
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/staff" element={<StaffList />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/salary" element={<SalaryCalculator />} />
              <Route path="/report" element={<MonthlyReport />} />
              <Route path="/advance" element={<Advance />} />
              <Route path="/cashbook" element={<CashBook />} />
              <Route path="/parties" element={<PartyLedger />} />
              <Route path="/interest" element={<InterestByaj />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<AccountingReports />} />
            </Routes>
          </div>
          
          <Footer />
          
          {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </ErrorBoundary>
    </div>
  );
}

export default App;

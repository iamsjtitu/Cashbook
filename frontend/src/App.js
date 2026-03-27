import { useState, Component } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Dashboard from "@/pages/Dashboard";
import StaffList from "@/pages/StaffList";
import Attendance from "@/pages/Attendance";
import SalaryCalculator from "@/pages/SalaryCalculator";
import WhatsNew from "@/pages/WhatsNew";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-600">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 btn-primary"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Sidebar Navigation
const Sidebar = ({ onWhatsNewClick }) => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="text-xl font-black tracking-tighter" style={{ fontFamily: 'Chivo, sans-serif' }}>
          STAFF MANAGER
        </h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Attendance & Salary</p>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          data-testid="nav-dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink
          to="/staff"
          className={`nav-item ${location.pathname === '/staff' ? 'active' : ''}`}
          data-testid="nav-staff"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Staff</span>
        </NavLink>
        
        <NavLink
          to="/attendance"
          className={`nav-item ${location.pathname === '/attendance' ? 'active' : ''}`}
          data-testid="nav-attendance"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span>Attendance</span>
        </NavLink>
        
        <NavLink
          to="/salary"
          className={`nav-item ${location.pathname === '/salary' ? 'active' : ''}`}
          data-testid="nav-salary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
          <span>Salary</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t-2 border-black">
        <button
          onClick={onWhatsNewClick}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#002FA7] text-white hover:bg-black transition-colors"
          data-testid="whats-new-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          <span className="font-medium">What's New</span>
        </button>
      </div>
    </aside>
  );
};

// Layout wrapper
const Layout = ({ children, onWhatsNewClick }) => {
  return (
    <div className="app-container flex">
      <Sidebar onWhatsNewClick={onWhatsNewClick} />
      <main className="main-content flex-1 overflow-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
};

function App() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  return (
    <div className="App">
      <ErrorBoundary>
        <BrowserRouter>
          <Layout onWhatsNewClick={() => setShowWhatsNew(true)}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/staff" element={<StaffList />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/salary" element={<SalaryCalculator />} />
            </Routes>
          </Layout>
          
          {showWhatsNew && (
            <WhatsNew onClose={() => setShowWhatsNew(false)} />
          )}
        </BrowserRouter>
        <Toaster position="top-right" />
      </ErrorBoundary>
    </div>
  );
}

export default App;

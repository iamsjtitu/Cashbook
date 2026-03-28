import { format } from "date-fns";

const WhatsNew = ({ onClose }) => {
  const items = [
    { id: "11", version: "1.1.5", title: "Standalone Desktop App", description: "No server required! App works completely offline with embedded database.", date: "2025-03-28" },
    { id: "10", version: "1.1.5", title: "Auto Update", description: "App automatically checks for updates on startup. Manual check from Help menu.", date: "2025-03-28" },
    { id: "9", version: "1.1.0", title: "Dashboard", description: "Complete summary of Staff, Cash Book, Ledgers, Chit Fund, P&L at one place.", date: "2025-03-27" },
    { id: "8", version: "1.1.0", title: "Settings & Backup", description: "Customize header/footer. Backup data to selected folder with auto-backup option.", date: "2025-03-27" },
    { id: "7", version: "1.0.5", title: "Hierarchical Ledger System", description: "Account Heads → Parent Ledgers → Sub-Ledgers. Auto-aggregation to P&L and Balance Sheet.", date: "2025-03-26" },
    { id: "6", version: "1.0.4", title: "Chit Fund Profit Calculation", description: "Opening balance support (पहले से paid), profit calculation with expected vs actual.", date: "2025-03-25" },
    { id: "5", version: "1.0.3", title: "PDF & Excel Exports", description: "Export Staff, Attendance, Cash Book, Salary Slips, Ledger statements.", date: "2025-03-24" },
    { id: "4", version: "1.0.2", title: "Bulk Attendance", description: "Mark all staff present/absent for today. Fill unmarked days in month.", date: "2025-03-23" },
    { id: "3", version: "1.0.1", title: "Receipt Printing", description: "Print salary and advance payment receipts.", date: "2025-03-22" },
    { id: "2", version: "1.0.0", title: "Complete Accounting System", description: "Cash Book, Party Ledger, Byaj (Interest), Chit Fund, Expenses, P&L, Balance Sheet.", date: "2025-03-20" },
    { id: "1", version: "1.0.0", title: "Staff Manager Launch", description: "Staff CRUD, Attendance Calendar, 30-day Salary Calculation, Advance Management.", date: "2025-03-15" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#FF6B35', color: 'white' }}>
          <div className="modal-title flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            What's New
          </div>
          <button className="modal-close text-white" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body p-0 max-h-96 overflow-auto">
          {items.map((item, index) => (
            <div key={item.id} className={`p-4 ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">v{item.version}</span>
                    <span className="text-xs text-gray-400">{format(new Date(item.date), "dd MMM yyyy")}</span>
                  </div>
                  <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-gray-50 text-center border-t">
          <div className="text-xs text-gray-500">
            Current Version: <span className="font-semibold text-orange-500">v1.1.5</span> | 
            Designed by: <a href="https://www.9x.design" target="_blank" rel="noopener noreferrer" className="text-orange-500">9x.design</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;

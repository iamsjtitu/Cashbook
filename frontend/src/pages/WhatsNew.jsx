import { format } from "date-fns";

const WhatsNew = ({ onClose }) => {
  const items = [
    { id: "1", version: "1.0.0", title: "Staff Manager Launch", description: "Complete staff attendance and salary management system with 30-day calculation basis.", date: format(new Date(), "yyyy-MM-dd") },
    { id: "2", version: "1.0.0", title: "Attendance Calendar", description: "Mark attendance with Present, Absent, Half Day options. Visual calendar view.", date: format(new Date(), "yyyy-MM-dd") },
    { id: "3", version: "1.0.0", title: "Salary Calculator", description: "Auto calculate salary: Daily = Monthly ÷ 30, Half Day = Daily ÷ 2", date: format(new Date(), "yyyy-MM-dd") },
    { id: "4", version: "1.0.0", title: "Monthly Reports", description: "View all staff attendance and salary summary for any month.", date: format(new Date(), "yyyy-MM-dd") },
    { id: "5", version: "1.0.0", title: "Advance Management", description: "Track advance payments given to staff.", date: format(new Date(), "yyyy-MM-dd") },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
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
          <div className="text-xs text-gray-500">Current Version: <span className="font-semibold text-orange-500">v1.0.0</span> | Auto-update enabled</div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;

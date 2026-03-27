import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { X, Sparkles, Rocket } from "lucide-react";
import { format } from "date-fns";

const WhatsNew = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWhatsNew();
  }, []);

  const fetchWhatsNew = async () => {
    try {
      const response = await axios.get(`${API}/whats-new`);
      if (response.data.length === 0) {
        // Add default items if none exist
        setItems([
          {
            id: "1",
            version: "1.0.0",
            title: "Initial Release",
            description: "Staff Attendance & Salary Management App launched with core features including staff management, attendance tracking, and salary calculation.",
            date: format(new Date(), "yyyy-MM-dd"),
          },
          {
            id: "2",
            version: "1.0.0",
            title: "Salary Calculation",
            description: "All salaries are calculated on a 30-day basis regardless of actual month days. Half day = Daily Rate ÷ 2.",
            date: format(new Date(), "yyyy-MM-dd"),
          },
          {
            id: "3",
            version: "1.0.0",
            title: "Attendance Tracking",
            description: "Mark attendance as Present, Absent, or Half Day. Visual calendar view with color-coded status.",
            date: format(new Date(), "yyyy-MM-dd"),
          },
        ]);
      } else {
        setItems(response.data);
      }
    } catch (error) {
      // Default items on error
      setItems([
        {
          id: "1",
          version: "1.0.0",
          title: "Welcome to Staff Manager",
          description: "Your complete staff attendance and salary management solution.",
          date: format(new Date(), "yyyy-MM-dd"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="whats-new-modal">
      <div
        className="modal-content max-w-lg animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header bg-[#002FA7] text-white border-b-0">
          <div className="flex items-center gap-2">
            <Sparkles size={24} />
            <span>What's New</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 transition-colors rounded"
            data-testid="close-whats-new-btn"
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body p-0 max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <div>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-6 ${index !== items.length - 1 ? "border-b border-black" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center flex-shrink-0">
                      <Rocket size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-[#002FA7] text-white px-2 py-0.5">
                          v{item.version}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(item.date), "dd MMM yyyy")}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t-2 border-black">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <strong>Current Version:</strong> 1.0.0
            </div>
            <div className="text-xs text-gray-500">
              Auto-update enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;

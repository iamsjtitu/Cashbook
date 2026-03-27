import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Attendance = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    if (!selectedStaff) return;
    
    try {
      const month = format(currentMonth, "yyyy-MM");
      const response = await axios.get(`${API}/attendance/${selectedStaff.id}/${month}`);
      
      // Convert to object keyed by date
      const attendanceMap = {};
      response.data.forEach((att) => {
        attendanceMap[att.date] = att.status;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, [selectedStaff, currentMonth]);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchAttendance();
    }
  }, [selectedStaff, currentMonth, fetchAttendance]);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
      if (response.data.length > 0) {
        setSelectedStaff(response.data[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (date, status) => {
    if (!selectedStaff) return;

    try {
      await axios.post(`${API}/attendance`, {
        staff_id: selectedStaff.id,
        date: format(date, "yyyy-MM-dd"),
        status,
      });
      
      setAttendance((prev) => ({
        ...prev,
        [format(date, "yyyy-MM-dd")]: status,
      }));
      
      toast.success(`Marked ${status.replace("_", " ")} for ${format(date, "d MMM")}`);
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-black text-white";
      case "absent":
        return "bg-[#E32636] text-white";
      case "half_day":
        return "bg-[#FFD700] text-black";
      default:
        return "bg-white";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <Check size={16} />;
      case "absent":
        return <X size={16} />;
      case "half_day":
        return <Clock size={16} />;
      default:
        return null;
    }
  };

  // Get empty cells for the start of the month
  const getEmptyCells = () => {
    const firstDay = getDay(startOfMonth(currentMonth));
    return Array(firstDay).fill(null);
  };

  // Calculate summary stats
  const getSummary = () => {
    const days = getDaysInMonth();
    let present = 0, absent = 0, halfDay = 0, unmarked = 0;
    
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const status = attendance[dateStr];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "half_day") halfDay++;
      else if (day <= new Date()) unmarked++;
    });

    return { present, absent, halfDay, unmarked };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  const summary = getSummary();

  return (
    <div data-testid="attendance-page">
      <header className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Mark and track daily attendance</p>
      </header>

      {staffList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No staff members found</p>
          <a href="/staff" className="btn-primary">Add Staff First</a>
        </div>
      ) : (
        <>
          {/* Staff Selector & Month Navigation */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-secondary flex items-center gap-2" data-testid="staff-selector">
                  <span className="font-bold">{selectedStaff?.name}</span>
                  <ChevronRight size={16} className="rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-2 border-black">
                {staffList.map((staff) => (
                  <DropdownMenuItem
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                    data-testid={`select-staff-${staff.id}`}
                  >
                    {staff.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                data-testid="prev-month-btn"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-6 py-2 border-2 border-black font-bold min-w-[180px] text-center" style={{ fontFamily: 'Chivo, sans-serif' }}>
                {format(currentMonth, "MMMM yyyy")}
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                data-testid="next-month-btn"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="attendance-legend mb-4">
            <div className="legend-item">
              <div className="legend-color bg-black"></div>
              <span>Present</span>
            </div>
            <div className="legend-item">
              <div className="legend-color bg-[#E32636]"></div>
              <span>Absent</span>
            </div>
            <div className="legend-item">
              <div className="legend-color bg-[#FFD700]"></div>
              <span>Half Day</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-0 mb-6">
            <div className="stat-card">
              <div className="stat-label">Present</div>
              <div className="stat-value text-2xl">{summary.present}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Absent</div>
              <div className="stat-value text-2xl text-[#E32636]">{summary.absent}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Half Day</div>
              <div className="stat-value text-2xl text-[#B8860B]">{summary.halfDay}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unmarked</div>
              <div className="stat-value text-2xl text-gray-400">{summary.unmarked}</div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="card p-0 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-black text-white">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center text-xs font-bold uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {getEmptyCells().map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square border border-gray-100 bg-gray-50"></div>
              ))}
              
              {getDaysInMonth().map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const status = attendance[dateStr];
                const isFuture = day > new Date();

                return (
                  <DropdownMenu key={dateStr}>
                    <DropdownMenuTrigger asChild disabled={isFuture}>
                      <button
                        className={`
                          aspect-square border border-gray-100 flex flex-col items-center justify-center
                          transition-all cursor-pointer hover:border-black
                          ${getStatusColor(status)}
                          ${isToday(day) ? "ring-2 ring-[#002FA7] ring-inset" : ""}
                          ${isFuture ? "opacity-40 cursor-not-allowed" : ""}
                        `}
                        data-testid={`day-${dateStr}`}
                      >
                        <span className={`text-lg font-bold ${status ? "" : "text-gray-800"}`}>
                          {format(day, "d")}
                        </span>
                        {status && (
                          <span className="mt-1">{getStatusIcon(status)}</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    {!isFuture && (
                      <DropdownMenuContent className="bg-white border-2 border-black">
                        <DropdownMenuItem
                          onClick={() => markAttendance(day, "present")}
                          className="cursor-pointer hover:bg-black hover:text-white px-4 py-2 flex items-center gap-2"
                          data-testid={`mark-present-${dateStr}`}
                        >
                          <Check size={16} />
                          Present
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => markAttendance(day, "absent")}
                          className="cursor-pointer hover:bg-[#E32636] hover:text-white px-4 py-2 flex items-center gap-2"
                          data-testid={`mark-absent-${dateStr}`}
                        >
                          <X size={16} />
                          Absent
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => markAttendance(day, "half_day")}
                          className="cursor-pointer hover:bg-[#FFD700] hover:text-black px-4 py-2 flex items-center gap-2"
                          data-testid={`mark-halfday-${dateStr}`}
                        >
                          <Clock size={16} />
                          Half Day
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;

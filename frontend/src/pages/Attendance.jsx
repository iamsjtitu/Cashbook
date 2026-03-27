import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Attendance = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchAttendance = useCallback(async () => {
    if (!selectedStaff) return;
    try {
      const month = format(currentMonth, "yyyy-MM");
      const response = await axios.get(`${API}/attendance/${selectedStaff.id}/${month}`);
      const attendanceMap = {};
      response.data.forEach((att) => { attendanceMap[att.date] = att.status; });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, [selectedStaff, currentMonth]);

  useEffect(() => { fetchStaff(); }, []);
  useEffect(() => { if (selectedStaff) fetchAttendance(); }, [selectedStaff, currentMonth, fetchAttendance]);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
      if (response.data.length > 0) setSelectedStaff(response.data[0]);
    } catch (error) {
      toast.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (date, status) => {
    if (!selectedStaff) return;
    try {
      await axios.post(`${API}/attendance`, { staff_id: selectedStaff.id, date: format(date, "yyyy-MM-dd"), status });
      setAttendance((prev) => ({ ...prev, [format(date, "yyyy-MM-dd")]: status }));
      toast.success(`Marked ${status.replace("_", " ")} for ${format(date, "d MMM")}`);
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const saveAllAttendance = () => {
    toast.success("Attendance saved successfully!");
  };

  const getDaysInMonth = () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const getEmptyCells = () => Array(getDay(startOfMonth(currentMonth))).fill(null);
  
  const getSummary = () => {
    const days = getDaysInMonth();
    let present = 0, absent = 0, halfDay = 0, unmarked = 0;
    days.forEach(day => {
      const status = attendance[format(day, "yyyy-MM-dd")];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "half_day") halfDay++;
      else if (day <= new Date()) unmarked++;
    });
    return { present, absent, halfDay, unmarked };
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const summary = getSummary();

  return (
    <div data-testid="attendance-page" className="animate-fade-in">
      {/* Action Bar */}
      <div className="action-bar">
        <div className="date-input">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">{format(currentMonth, "MMM yyyy")}</span>
        </div>
        
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn btn-secondary px-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn btn-secondary px-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger" data-testid="staff-selector">
              <div className="staff-avatar w-6 h-6 text-xs">{selectedStaff?.name.charAt(0)}</div>
              <span className="font-medium">{selectedStaff?.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border">
            {staffList.map((staff) => (
              <DropdownMenuItem key={staff.id} onClick={() => setSelectedStaff(staff)} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                {staff.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={saveAllAttendance} className="action-btn success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Save Attendance
        </button>
        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Excel
        </button>
        <button className="action-btn outline-danger">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          PDF
        </button>
      </div>

      {/* Legend */}
      <div className="action-bar">
        <div className="legend">
          <div className="legend-item"><div className="legend-dot present">P</div> Present</div>
          <div className="legend-item"><div className="legend-dot absent">A</div> Absent</div>
          <div className="legend-item"><div className="legend-dot halfday">H</div> Half Day</div>
          <div className="legend-item"><div className="legend-dot holiday">CH</div> Holiday (Paid)</div>
        </div>
      </div>

      {staffList.length === 0 ? (
        <div className="data-card"><div className="data-card-body text-center py-8"><p className="text-gray-500">No staff members found</p><a href="/staff" className="btn btn-primary mt-3">Add Staff First</a></div></div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box"><div className="stat-box-label">Present</div><div className="stat-box-value success">{summary.present}</div></div>
            <div className="stat-box"><div className="stat-box-label">Absent</div><div className="stat-box-value danger">{summary.absent}</div></div>
            <div className="stat-box"><div className="stat-box-label">Half Day</div><div className="stat-box-value warning">{summary.halfDay}</div></div>
            <div className="stat-box"><div className="stat-box-label">Unmarked</div><div className="stat-box-value">{summary.unmarked}</div></div>
          </div>

          {/* Calendar */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="data-card-title">{format(currentMonth, "MMMM yyyy")} - {selectedStaff?.name}</div>
            </div>
            <div className="data-card-body">
              <div className="calendar-grid mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="calendar-header">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {getEmptyCells().map((_, i) => <div key={`empty-${i}`} />)}
                {getDaysInMonth().map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const status = attendance[dateStr];
                  const isFuture = day > new Date();
                  return (
                    <DropdownMenu key={dateStr}>
                      <DropdownMenuTrigger asChild disabled={isFuture}>
                        <button className={`calendar-day ${status || ''} ${isToday(day) ? 'today' : ''} ${isFuture ? 'future' : ''}`} data-testid={`day-${dateStr}`}>
                          <span>{format(day, "d")}</span>
                          {status && <span className="text-xs">{status === 'present' ? 'P' : status === 'absent' ? 'A' : 'H'}</span>}
                        </button>
                      </DropdownMenuTrigger>
                      {!isFuture && (
                        <DropdownMenuContent className="bg-white rounded-lg shadow-lg border p-1">
                          <DropdownMenuItem onClick={() => markAttendance(day, "present")} className="cursor-pointer hover:bg-green-50 px-3 py-2 rounded flex items-center gap-2">
                            <div className="legend-dot present text-xs">P</div> Present
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markAttendance(day, "absent")} className="cursor-pointer hover:bg-red-50 px-3 py-2 rounded flex items-center gap-2">
                            <div className="legend-dot absent text-xs">A</div> Absent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markAttendance(day, "half_day")} className="cursor-pointer hover:bg-yellow-50 px-3 py-2 rounded flex items-center gap-2">
                            <div className="legend-dot halfday text-xs">H</div> Half Day
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Users, Calendar, IndianRupee } from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    halfDayToday: 0,
  });
  const [recentStaff, setRecentStaff] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const [staffRes, attendanceRes] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/attendance/date/${today}`)
      ]);

      const staffList = staffRes.data;
      const todayAtt = attendanceRes.data;

      const presentCount = todayAtt.filter(a => a.status === "present").length;
      const absentCount = todayAtt.filter(a => a.status === "absent").length;
      const halfDayCount = todayAtt.filter(a => a.status === "half_day").length;

      setStats({
        totalStaff: staffList.length,
        presentToday: presentCount,
        absentToday: absentCount,
        halfDayToday: halfDayCount,
      });

      setRecentStaff(staffList.slice(0, 5));
      
      const attendanceWithNames = todayAtt.map(att => {
        const staff = staffList.find(s => s.id === att.staff_id);
        return { ...att, staffName: staff?.name || "Unknown" };
      });
      setTodayAttendance(attendanceWithNames);
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: "bg-black text-white",
      absent: "bg-[#E32636] text-white",
      half_day: "bg-[#FFD700] text-black"
    };
    const labels = {
      present: "P",
      absent: "A",
      half_day: "HD"
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-error">
        <div className="text-lg font-medium text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </header>

      <div className="stats-grid mb-8">
        <div className="stat-card" data-testid="stat-total-staff">
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-[#002FA7]" />
            <span className="stat-label">Total Staff</span>
          </div>
          <div className="stat-value">{stats.totalStaff}</div>
        </div>

        <div className="stat-card" data-testid="stat-present">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={24} className="text-black" />
            <span className="stat-label">Present Today</span>
          </div>
          <div className="stat-value">{stats.presentToday}</div>
        </div>

        <div className="stat-card" data-testid="stat-absent">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={24} className="text-[#E32636]" />
            <span className="stat-label">Absent Today</span>
          </div>
          <div className="stat-value text-[#E32636]">{stats.absentToday}</div>
        </div>

        <div className="stat-card" data-testid="stat-halfday">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={24} className="text-[#B8860B]" />
            <span className="stat-label">Half Day</span>
          </div>
          <div className="stat-value text-[#B8860B]">{stats.halfDayToday}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <span>Recent Staff</span>
            <a href="/staff" className="text-sm text-[#002FA7] hover:underline">View All</a>
          </div>
          {recentStaff.length === 0 ? (
            <p className="text-gray-500 text-sm">No staff added yet</p>
          ) : (
            <table className="w-full">
              <tbody>
                {recentStaff.map((staff) => (
                  <tr key={staff.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3">
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-gray-500">{staff.phone}</div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-sm font-bold">
                        ₹{staff.monthly_salary?.toLocaleString('en-IN') || 0}
                      </div>
                      <div className="text-xs text-gray-500">/ month</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header flex justify-between items-center">
            <span>Today's Attendance</span>
            <a href="/attendance" className="text-sm text-[#002FA7] hover:underline">Mark Attendance</a>
          </div>
          {todayAttendance.length === 0 ? (
            <p className="text-gray-500 text-sm">No attendance marked today</p>
          ) : (
            <table className="w-full">
              <tbody>
                {todayAttendance.map((att) => (
                  <tr key={att.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3">
                      <div className="font-medium">{att.staffName}</div>
                    </td>
                    <td className="py-3 text-right">
                      {getStatusBadge(att.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 card bg-[#002FA7] text-white border-[#002FA7]">
        <div className="flex items-center gap-4">
          <IndianRupee size={48} strokeWidth={1.5} />
          <div>
            <h3 className="text-xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Salary Calculation
            </h3>
            <p className="text-white/80 text-sm mt-1">
              All salaries are calculated on a 30-day basis regardless of actual month days.
              <br />Daily Rate = Monthly Salary ÷ 30 | Half Day = Daily Rate ÷ 2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

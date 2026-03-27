import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
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

      setStats({
        totalStaff: staffList.length,
        presentToday: todayAtt.filter(a => a.status === "present").length,
        absentToday: todayAtt.filter(a => a.status === "absent").length,
        halfDayToday: todayAtt.filter(a => a.status === "half_day").length,
      });

      setRecentStaff(staffList.slice(0, 5));
      const attendanceWithNames = todayAtt.map(att => {
        const staff = staffList.find(s => s.id === att.staff_id);
        return { ...att, staffName: staff?.name || "Unknown" };
      });
      setTodayAttendance(attendanceWithNames);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div data-testid="dashboard-page" className="animate-fade-in">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Staff</div>
          <div className="stat-box-value primary">{stats.totalStaff}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Present Today</div>
          <div className="stat-box-value success">{stats.presentToday}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Absent Today</div>
          <div className="stat-box-value danger">{stats.absentToday}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Half Day</div>
          <div className="stat-box-value warning">{stats.halfDayToday}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Staff */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Recent Staff</div>
            <a href="/staff" className="text-sm text-orange-500 hover:underline">View All →</a>
          </div>
          <div className="data-card-body">
            {recentStaff.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No staff added yet</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStaff.map(staff => (
                    <tr key={staff.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="staff-avatar">{staff.name.charAt(0)}</div>
                          <span className="font-medium">{staff.name}</span>
                        </div>
                      </td>
                      <td>{staff.phone}</td>
                      <td className="font-semibold">₹{staff.monthly_salary?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Today's Attendance</div>
            <a href="/attendance" className="text-sm text-orange-500 hover:underline">Mark Attendance →</a>
          </div>
          <div className="data-card-body">
            {todayAttendance.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No attendance marked today</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map(att => (
                    <tr key={att.id}>
                      <td className="font-medium">{att.staffName}</td>
                      <td>
                        <span className={`status-badge ${att.status === 'half_day' ? 'halfday' : att.status}`}>
                          {att.status === 'present' ? 'Present' : att.status === 'absent' ? 'Absent' : 'Half Day'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="data-card mt-4" style={{ background: '#FFF8F5', borderLeft: '4px solid #FF6B35' }}>
        <div className="data-card-body">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold text-gray-800">Salary Calculation Formula</div>
              <div className="text-sm text-gray-600">Daily Rate = Monthly Salary ÷ 30 | Half Day = Daily Rate ÷ 2 | Calculated on 30-day basis regardless of month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

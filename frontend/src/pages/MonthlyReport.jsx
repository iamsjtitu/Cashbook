import { useState, useEffect } from "react";

import axios from "axios";
import { api, API } from "@/App";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const MonthlyReport = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({ value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") });
    }
    return months;
  };

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffRes = await axios.get(`${API}/staff`);
      setStaffList(staffRes.data);
      
      const reports = await Promise.all(
        staffRes.data.map(async (staff) => {
          try {
            const salaryRes = await axios.get(`${API}/salary/${staff.id}/${selectedMonth}`);
            return salaryRes.data;
          } catch {
            return { staff_id: staff.id, staff_name: staff.name, total_present: 0, total_absent: 0, total_half_day: 0, total_earned: 0 };
          }
        })
      );
      setReportData(reports);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = getMonthOptions();
  const totals = reportData.reduce((acc, r) => ({
    present: acc.present + r.total_present,
    absent: acc.absent + r.total_absent,
    halfDay: acc.halfDay + r.total_half_day,
    salary: acc.salary + r.total_earned
  }), { present: 0, absent: 0, halfDay: 0, salary: 0 });

  return (
    <div className="animate-fade-in">
      <div className="action-bar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">{monthOptions.find(m => m.value === selectedMonth)?.label}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border max-h-60 overflow-auto">
            {monthOptions.map((month) => (
              <DropdownMenuItem key={month.value} onClick={() => setSelectedMonth(month.value)} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                {month.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="action-btn outline-primary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Excel</button>
        <button className="action-btn outline-danger"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> PDF</button>
      </div>

      <div className="stats-row">
        <div className="stat-box"><div className="stat-box-label">Total Present</div><div className="stat-box-value success">{totals.present}</div></div>
        <div className="stat-box"><div className="stat-box-label">Total Absent</div><div className="stat-box-value danger">{totals.absent}</div></div>
        <div className="stat-box"><div className="stat-box-label">Total Half Day</div><div className="stat-box-value warning">{totals.halfDay}</div></div>
        <div className="stat-box"><div className="stat-box-label">Total Salary</div><div className="stat-box-value primary">₹{totals.salary.toLocaleString('en-IN')}</div></div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Monthly Report - {monthOptions.find(m => m.value === selectedMonth)?.label}</div>
        </div>
        <div className="data-card-body p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Staff Name</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Half Day</th>
                  <th>Total Salary</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((report, index) => (
                  <tr key={report.staff_id}>
                    <td>{index + 1}</td>
                    <td className="font-medium">{report.staff_name}</td>
                    <td><span className="status-badge present">{report.total_present}</span></td>
                    <td><span className="status-badge absent">{report.total_absent}</span></td>
                    <td><span className="status-badge halfday">{report.total_half_day}</span></td>
                    <td className="font-bold">₹{report.total_earned.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;

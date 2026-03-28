import { useState, useEffect, useContext } from "react";
import { api, API, FYContext } from "@/App";
import axios from "axios";
import { format, subMonths } from "date-fns";
import { NavLink } from "react-router-dom";

const Dashboard = () => {
  const { activeFY } = useContext(FYContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    // Staff
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    halfDayToday: 0,
    // Cash Book
    cashBalance: 0,
    totalCredit: 0,
    totalDebit: 0,
    // Ledger
    totalLedgers: 0,
    totalDebtors: 0,
    totalCreditors: 0,
    // Chit Fund
    activeChits: 0,
    totalChitInvestment: 0,
    chitProfit: 0,
    // Expenses
    monthlyExpenses: 0,
    // Interest/Byaj
    totalInterestReceivable: 0,
    // P&L
    netProfit: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const currentMonth = format(new Date(), "yyyy-MM");
      
      const [
        staffRes, 
        attendanceRes, 
        partiesRes,
        cashbookRes,
        chitRes,
        expensesRes,
        interestRes,
        plRes
      ] = await Promise.all([
        api.getStaff(),
        axios.get(`${API}/attendance/date/${today}`),
        api.getParties(),
        axios.get(`${API}/cashbook/monthly/${currentMonth}`),
        api.getChitFunds(),
        axios.get(`${API}/expenses/summary/${currentMonth}`),
        api.getInterestAccounts(),
        axios.get(`${API}/reports/simple-profit-loss`)
      ]);

      const staffList = staffRes.data;
      const todayAtt = attendanceRes.data;
      const parties = partiesRes.data;
      const cashbook = cashbookRes.data;
      const chits = chitRes.data;
      const expenses = expensesRes.data;
      const interests = interestRes.data;
      const pl = plRes.data;

      // Calculate stats
      const debtors = parties.filter(p => (p.current_balance || 0) > 0);
      const creditors = parties.filter(p => (p.current_balance || 0) < 0);
      
      const totalChitPaid = chits.reduce((sum, c) => sum + (c.total_paid || 0) + (c.opening_amount_paid || 0), 0);
      const totalChitDividend = chits.reduce((sum, c) => sum + (c.total_dividend || 0), 0);
      
      const totalInterest = interests.reduce((sum, i) => sum + (i.total_interest || 0), 0);

      setStats({
        totalStaff: staffList.length,
        presentToday: todayAtt.filter(a => a.status === "present").length,
        absentToday: todayAtt.filter(a => a.status === "absent").length,
        halfDayToday: todayAtt.filter(a => a.status === "half_day").length,
        cashBalance: cashbook.closing_balance || 0,
        totalCredit: cashbook.total_credit || 0,
        totalDebit: cashbook.total_debit || 0,
        totalLedgers: parties.length,
        totalDebtors: debtors.reduce((sum, p) => sum + p.current_balance, 0),
        totalCreditors: Math.abs(creditors.reduce((sum, p) => sum + p.current_balance, 0)),
        activeChits: chits.filter(c => c.is_active).length,
        totalChitInvestment: totalChitPaid,
        chitProfit: totalChitDividend,
        monthlyExpenses: expenses.total_expenses || 0,
        totalInterestReceivable: totalInterest,
        netProfit: pl.net_profit || 0
      });

      // Recent transactions
      const txns = cashbook.transactions || [];
      setRecentTransactions(txns.slice(-5).reverse());

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div data-testid="dashboard-page" className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-lg p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Staff Manager</h1>
        <p className="text-white/80">
          {format(new Date(), "EEEE, dd MMMM yyyy")} | FY {activeFY?.name || "2025-26"}
        </p>
      </div>

      {/* Quick Stats Row 1 - Staff & Attendance */}
      <div className="text-xs text-gray-500 uppercase mb-2 font-semibold">Staff & Attendance</div>
      <div className="stats-row mb-6">
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

      {/* Quick Stats Row 2 - Cash Book & Ledger */}
      <div className="text-xs text-gray-500 uppercase mb-2 font-semibold">Cash Book & Ledger</div>
      <div className="stats-row mb-6">
        <div className="stat-box">
          <div className="stat-box-label">Cash Balance</div>
          <div className={`stat-box-value ${stats.cashBalance >= 0 ? 'success' : 'danger'}`}>
            ₹{stats.cashBalance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Ledgers</div>
          <div className="stat-box-value primary">{stats.totalLedgers}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Lena Hai (Debtors)</div>
          <div className="stat-box-value success">₹{stats.totalDebtors.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Dena Hai (Creditors)</div>
          <div className="stat-box-value danger">₹{stats.totalCreditors.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Quick Stats Row 3 - Chit Fund & Interest */}
      <div className="text-xs text-gray-500 uppercase mb-2 font-semibold">Chit Fund & Byaj</div>
      <div className="stats-row mb-6">
        <div className="stat-box">
          <div className="stat-box-label">Active Chit Funds</div>
          <div className="stat-box-value primary">{stats.activeChits}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Chit Investment</div>
          <div className="stat-box-value warning">₹{stats.totalChitInvestment.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Chit Dividend</div>
          <div className="stat-box-value success">₹{stats.chitProfit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Byaj Receivable</div>
          <div className="stat-box-value success">₹{stats.totalInterestReceivable.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="text-xs text-gray-500 uppercase mb-2 font-semibold">Profit & Loss</div>
      <div className="stats-row mb-6">
        <div className="stat-box">
          <div className="stat-box-label">Monthly Expenses</div>
          <div className="stat-box-value danger">₹{stats.monthlyExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">This Month Credit</div>
          <div className="stat-box-value success">₹{stats.totalCredit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">This Month Debit</div>
          <div className="stat-box-value danger">₹{stats.totalDebit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Profit/Loss</div>
          <div className={`stat-box-value ${stats.netProfit >= 0 ? 'success' : 'danger'}`}>
            {stats.netProfit >= 0 ? '+' : ''}₹{stats.netProfit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Recent Transactions</div>
            <NavLink to="/cashbook" className="text-orange-500 text-sm hover:underline">View All</NavLink>
          </div>
          <div className="data-card-body p-0">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">No transactions yet</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {recentTransactions.map((txn, idx) => (
                    <tr key={idx}>
                      <td className="text-sm">{format(new Date(txn.date), "dd MMM")}</td>
                      <td className="font-medium">{txn.description}</td>
                      <td className={`text-right font-bold ${txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.transaction_type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Quick Actions</div>
          </div>
          <div className="data-card-body">
            <div className="grid grid-cols-2 gap-3">
              <NavLink to="/attendance" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">📅</div>
                <div className="font-medium text-green-700">Mark Attendance</div>
              </NavLink>
              <NavLink to="/salary" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">💰</div>
                <div className="font-medium text-blue-700">Calculate Salary</div>
              </NavLink>
              <NavLink to="/cashbook" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">📒</div>
                <div className="font-medium text-purple-700">Cash Book Entry</div>
              </NavLink>
              <NavLink to="/party" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">👥</div>
                <div className="font-medium text-orange-700">Party Ledger</div>
              </NavLink>
              <NavLink to="/expenses" className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">📝</div>
                <div className="font-medium text-red-700">Add Expense</div>
              </NavLink>
              <NavLink to="/chitfund" className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-center transition">
                <div className="text-2xl mb-1">🏦</div>
                <div className="font-medium text-amber-700">Chit Fund</div>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AccountingReports = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [profitLoss, setProfitLoss] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);
  const [monthlyCashbook, setMonthlyCashbook] = useState(null);
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
      const [plRes, pmRes, cbRes] = await Promise.all([
        axios.get(`${API}/reports/profit-loss/${selectedMonth}`),
        axios.get(`${API}/reports/payment-mode/${selectedMonth}`),
        axios.get(`${API}/cashbook/monthly/${selectedMonth}`)
      ]);
      setProfitLoss(plRes.data);
      setPaymentMode(pmRes.data);
      setMonthlyCashbook(cbRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = getMonthOptions();
  const expenseCategories = [
    { key: "salary", label: "Salary", color: "bg-blue-500" },
    { key: "advance", label: "Advance", color: "bg-purple-500" },
    { key: "rent", label: "Rent", color: "bg-yellow-500" },
    { key: "electricity", label: "Electricity", color: "bg-orange-500" },
    { key: "supplies", label: "Supplies", color: "bg-green-500" },
    { key: "maintenance", label: "Maintenance", color: "bg-red-500" },
    { key: "transport", label: "Transport", color: "bg-indigo-500" },
    { key: "food", label: "Food", color: "bg-pink-500" },
    { key: "interest_paid", label: "Interest", color: "bg-amber-500" },
    { key: "chit_fund", label: "Chit Fund", color: "bg-violet-500" },
    { key: "other", label: "Other", color: "bg-gray-500" }
  ];

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="reports-page">
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

        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export
        </button>
      </div>

      {/* Profit/Loss Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-box">
          <div className="stat-box-label">Total Income</div>
          <div className="stat-box-value success">₹{profitLoss?.total_income?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Expense</div>
          <div className="stat-box-value danger">₹{profitLoss?.total_expense?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Profit/Loss</div>
          <div className={`stat-box-value ${(profitLoss?.net_profit || 0) >= 0 ? 'success' : 'danger'}`}>
            {(profitLoss?.net_profit || 0) >= 0 ? '+' : ''}₹{profitLoss?.net_profit?.toLocaleString('en-IN') || 0}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Cash Flow</div>
          <div className={`stat-box-value ${(monthlyCashbook?.net_balance || 0) >= 0 ? 'success' : 'danger'}`}>
            ₹{monthlyCashbook?.net_balance?.toLocaleString('en-IN') || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Expense Breakdown</div>
          </div>
          <div className="data-card-body">
            {!profitLoss?.expense_breakdown || Object.keys(profitLoss.expense_breakdown).length === 0 ? (
              <div className="text-center py-4 text-gray-500">No expenses this month</div>
            ) : (
              <div className="space-y-3">
                {expenseCategories.map(cat => {
                  const amount = profitLoss.expense_breakdown[cat.key] || 0;
                  if (amount === 0) return null;
                  const percentage = (amount / profitLoss.total_expense) * 100;
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{cat.label}</span>
                        <span>₹{amount.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full`} style={{width: `${percentage}%`}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payment Mode Breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Payment Mode Summary</div>
          </div>
          <div className="data-card-body">
            {!paymentMode?.by_payment_mode || Object.keys(paymentMode.by_payment_mode).length === 0 ? (
              <div className="text-center py-4 text-gray-500">No transactions this month</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(paymentMode.by_payment_mode).map(([mode, data]) => (
                  <div key={mode} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${mode === 'cash' ? 'bg-green-100 text-green-700' : mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {mode === 'bank_transfer' ? 'Bank Transfer' : mode.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Credit (In)</div>
                        <div className="font-bold text-green-600">₹{(data.credit || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Debit (Out)</div>
                        <div className="font-bold text-red-600">₹{(data.debit || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="data-card mt-6">
        <div className="data-card-header">
          <div className="data-card-title">Daily Cash Flow - {monthOptions.find(m => m.value === selectedMonth)?.label}</div>
        </div>
        <div className="data-card-body p-0">
          {!monthlyCashbook?.daily_summary || monthlyCashbook.daily_summary.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transactions this month</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right text-green-600">Credit (In)</th>
                  <th className="text-right text-red-600">Debit (Out)</th>
                  <th className="text-right">Balance</th>
                  <th className="text-center">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {monthlyCashbook.daily_summary.map((day) => (
                  <tr key={day.date}>
                    <td className="font-medium">{format(new Date(day.date), "dd MMM yyyy")}</td>
                    <td className="text-right text-green-600 font-medium">
                      {day.credit > 0 ? `+₹${day.credit.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="text-right text-red-600 font-medium">
                      {day.debit > 0 ? `-₹${day.debit.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className={`text-right font-bold ${day.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{day.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="text-center">
                      <span className="bg-gray-100 px-2 py-1 rounded text-sm">{day.transaction_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td>Total</td>
                  <td className="text-right text-green-600">+₹{monthlyCashbook.total_credit.toLocaleString('en-IN')}</td>
                  <td className="text-right text-red-600">-₹{monthlyCashbook.total_debit.toLocaleString('en-IN')}</td>
                  <td className={`text-right ${monthlyCashbook.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{monthlyCashbook.net_balance.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountingReports;

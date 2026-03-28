import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const EXPENSE_CATEGORIES = {
  salary: { label: "Salary", color: "bg-blue-500" },
  advance: { label: "Advance", color: "bg-purple-500" },
  rent: { label: "Rent", color: "bg-yellow-500" },
  electricity: { label: "Electricity", color: "bg-orange-500" },
  supplies: { label: "Supplies", color: "bg-green-500" },
  maintenance: { label: "Maintenance", color: "bg-red-500" },
  transport: { label: "Transport", color: "bg-indigo-500" },
  food: { label: "Food", color: "bg-pink-500" },
  interest_paid: { label: "Interest Paid", color: "bg-amber-500" },
  chit_fund: { label: "Chit Fund", color: "bg-violet-500" },
  other: { label: "Other", color: "bg-gray-500" }
};

const ProfitLossStatement = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [plData, setPlData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getMonthOptions = () => {
    const months = [{ value: "", label: "All Time (पूरा समय)" }];
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
      const url = selectedMonth 
        ? `${API}/reports/simple-profit-loss?month=${selectedMonth}`
        : `${API}/reports/simple-profit-loss`;
      const res = await axios.get(url);
      setPlData(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = getMonthOptions();
  const isProfit = (plData?.net_profit || 0) >= 0;

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="profit-loss-page">
      <div className="action-bar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">{monthOptions.find(m => m.value === selectedMonth)?.label || "All Time"}</span>
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
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Income (आमदनी)</div>
          <div className="stat-box-value success">₹{(plData?.income?.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Expenses (खर्चे)</div>
          <div className="stat-box-value danger">₹{(plData?.expenses?.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">{isProfit ? 'Net Profit (शुद्ध लाभ)' : 'Net Loss (शुद्ध हानि)'}</div>
          <div className={`stat-box-value ${isProfit ? 'success' : 'danger'}`}>
            {isProfit ? '+' : '-'}₹{Math.abs(plData?.net_profit || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Transactions</div>
          <div className="stat-box-value primary">{plData?.transaction_count || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Expenses */}
        <div className="data-card">
          <div className="data-card-header bg-red-100">
            <div className="data-card-title text-red-700">EXPENSES (खर्चे)</div>
          </div>
          <div className="data-card-body">
            {Object.keys(plData?.expenses?.by_category || {}).length === 0 ? (
              <div className="text-center py-4 text-gray-500">No expenses this period</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(plData?.expenses?.by_category || {}).map(([category, amount]) => {
                  const catInfo = EXPENSE_CATEGORIES[category] || { label: category, color: "bg-gray-500" };
                  const percentage = plData?.expenses?.total > 0 ? (amount / plData.expenses.total) * 100 : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{catInfo.label}</span>
                        <span>₹{amount.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${catInfo.color} rounded-full`} style={{width: `${percentage}%`}}></div>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Expenses</span>
                    <span className="text-red-600">₹{(plData?.expenses?.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {/* Net Profit (if profit) */}
                {isProfit && (
                  <div className="bg-green-100 p-3 rounded-lg">
                    <div className="flex justify-between font-bold text-green-700">
                      <span>Net Profit (शुद्ध लाभ)</span>
                      <span>₹{plData.net_profit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Income */}
        <div className="data-card">
          <div className="data-card-header bg-green-100">
            <div className="data-card-title text-green-700">INCOME (आमदनी)</div>
          </div>
          <div className="data-card-body">
            {Object.keys(plData?.income?.breakdown || {}).length === 0 && plData?.income?.total === 0 ? (
              <div className="text-center py-4 text-gray-500">No income this period</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(plData?.income?.breakdown || {}).map(([source, amount]) => {
                  const percentage = plData?.income?.total > 0 ? (amount / plData.income.total) * 100 : 0;
                  return (
                    <div key={source} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="font-medium capitalize">{source}</span>
                      <span className="font-bold text-green-600">₹{amount.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
                {plData?.income?.total > 0 && Object.keys(plData?.income?.breakdown || {}).length === 0 && (
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium">Cash Received</span>
                    <span className="font-bold text-green-600">₹{plData.income.total.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Income</span>
                    <span className="text-green-600">₹{(plData?.income?.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {/* Net Loss (if loss) */}
                {!isProfit && (
                  <div className="bg-red-100 p-3 rounded-lg">
                    <div className="flex justify-between font-bold text-red-700">
                      <span>Net Loss (शुद्ध हानि)</span>
                      <span>₹{Math.abs(plData.net_profit).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Result */}
      <div className={`mt-6 p-6 rounded-lg text-center ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className={`text-lg ${isProfit ? 'text-green-800' : 'text-red-800'}`}>
          {isProfit ? '🎉 Congratulations! आपका Business PROFIT में है!' : '😔 आपका Business LOSS में है'}
        </div>
        <div className={`text-4xl font-bold mt-2 ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
          {isProfit ? '+' : '-'}₹{Math.abs(plData?.net_profit || 0).toLocaleString('en-IN')}
        </div>
        <div className="text-sm mt-2 text-gray-600">
          Based on Cash Book transactions
        </div>
      </div>
    </div>
  );
};

export default ProfitLossStatement;

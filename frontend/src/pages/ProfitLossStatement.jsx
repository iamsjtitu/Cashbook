import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { format } from "date-fns";

const ProfitLossStatement = () => {
  const [plData, setPlData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/reports/profit-loss-statement`);
      setPlData(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const isProfit = (plData?.net_profit || 0) >= 0;

  return (
    <div className="animate-fade-in" data-testid="profit-loss-page">
      <div className="action-bar">
        <div className="text-sm text-gray-500">
          Financial Year: <span className="font-bold">April 2025 - March 2026</span>
        </div>
        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Income</div>
          <div className="stat-box-value success">₹{(plData?.income?.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Expenses</div>
          <div className="stat-box-value danger">₹{(plData?.expenses?.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">{isProfit ? 'Net Profit' : 'Net Loss'}</div>
          <div className={`stat-box-value ${isProfit ? 'success' : 'danger'}`}>
            {isProfit ? '+' : '-'}₹{Math.abs(plData?.net_profit || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Expenses */}
        <div className="data-card">
          <div className="data-card-header bg-red-100">
            <div className="data-card-title text-red-700">EXPENSES (खर्चे)</div>
          </div>
          <div className="data-card-body p-0">
            <table className="data-table">
              <tbody>
                {/* Direct Expenses */}
                {plData?.expenses?.direct_expense?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Direct Expenses (प्रत्यक्ष खर्चे)</td>
                    </tr>
                    {plData.expenses.direct_expense.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Indirect Expenses */}
                {plData?.expenses?.indirect_expense?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Indirect Expenses (अप्रत्यक्ष खर्चे)</td>
                    </tr>
                    {plData.expenses.indirect_expense.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="bg-red-100 font-bold">
                  <td>Total Expenses</td>
                  <td className="text-right">₹{(plData?.expenses?.total || 0).toLocaleString('en-IN')}</td>
                </tr>

                {/* Net Profit (if profit) */}
                {isProfit && (
                  <tr className="bg-green-100 font-bold text-green-700">
                    <td>Net Profit (शुद्ध लाभ)</td>
                    <td className="text-right">₹{plData.net_profit.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{((plData?.expenses?.total || 0) + (isProfit ? plData?.net_profit || 0 : 0)).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Side - Income */}
        <div className="data-card">
          <div className="data-card-header bg-green-100">
            <div className="data-card-title text-green-700">INCOME (आमदनी)</div>
          </div>
          <div className="data-card-body p-0">
            <table className="data-table">
              <tbody>
                {/* Direct Income */}
                {plData?.income?.direct_income?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Direct Income (प्रत्यक्ष आमदनी)</td>
                    </tr>
                    {plData.income.direct_income.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Indirect Income */}
                {plData?.income?.indirect_income?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Indirect Income (अप्रत्यक्ष आमदनी)</td>
                    </tr>
                    {plData.income.indirect_income.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="bg-green-100 font-bold">
                  <td>Total Income</td>
                  <td className="text-right">₹{(plData?.income?.total || 0).toLocaleString('en-IN')}</td>
                </tr>

                {/* Net Loss (if loss) */}
                {!isProfit && (
                  <tr className="bg-red-100 font-bold text-red-700">
                    <td>Net Loss (शुद्ध हानि)</td>
                    <td className="text-right">₹{Math.abs(plData.net_profit).toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{((plData?.income?.total || 0) + (!isProfit ? Math.abs(plData?.net_profit || 0) : 0)).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Final Result */}
      <div className={`mt-6 p-6 rounded-lg text-center ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className={`text-lg ${isProfit ? 'text-green-800' : 'text-red-800'}`}>
          {isProfit ? 'Congratulations! Your business is in PROFIT' : 'Your business is in LOSS'}
        </div>
        <div className={`text-4xl font-bold mt-2 ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
          {isProfit ? '+' : '-'}₹{Math.abs(plData?.net_profit || 0).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};

export default ProfitLossStatement;

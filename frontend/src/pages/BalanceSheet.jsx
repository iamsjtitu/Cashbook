import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { format } from "date-fns";

const BalanceSheet = () => {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/reports/balance-sheet`);
      setBalanceSheet(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="balance-sheet-page">
      <div className="action-bar">
        <div className="text-sm text-gray-500">
          As on: <span className="font-bold">{format(new Date(balanceSheet?.as_on_date || new Date()), "dd MMMM yyyy")}</span>
        </div>
        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export PDF
        </button>
      </div>

      {/* Balance Status */}
      <div className={`p-4 rounded-lg mb-4 ${balanceSheet?.is_balanced ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-l-4`}>
        <div className="flex items-center gap-2">
          {balanceSheet?.is_balanced ? (
            <>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-green-800 font-medium">Balance Sheet is Balanced (Assets = Liabilities + Capital)</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-red-800 font-medium">Balance Sheet is NOT Balanced!</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Liabilities & Capital */}
        <div className="data-card">
          <div className="data-card-header bg-red-100">
            <div className="data-card-title text-red-700">LIABILITIES & CAPITAL (देनदारी और पूंजी)</div>
          </div>
          <div className="data-card-body p-0">
            <table className="data-table">
              <tbody>
                {/* Capital */}
                <tr className="bg-purple-50">
                  <td colSpan="2" className="font-bold text-purple-700">Capital (पूंजी)</td>
                </tr>
                {balanceSheet?.capital?.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="pl-6">{item.account_name}</td>
                    <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {(balanceSheet?.capital?.net_profit || 0) !== 0 && (
                  <tr className={balanceSheet?.capital?.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    <td className="pl-6 font-medium">{balanceSheet?.capital?.net_profit >= 0 ? 'Add: Net Profit' : 'Less: Net Loss'}</td>
                    <td className="text-right font-medium">₹{Math.abs(balanceSheet?.capital?.net_profit || 0).toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr className="bg-purple-100 font-bold">
                  <td>Total Capital</td>
                  <td className="text-right">₹{(balanceSheet?.capital?.total || 0).toLocaleString('en-IN')}</td>
                </tr>

                {/* Liabilities */}
                <tr className="bg-red-50">
                  <td colSpan="2" className="font-bold text-red-700">Liabilities (देनदारी)</td>
                </tr>
                
                {balanceSheet?.liabilities?.long_term_liabilities?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-medium text-gray-600 pl-4">Long-term Liabilities</td>
                    </tr>
                    {balanceSheet.liabilities.long_term_liabilities.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-8">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}
                
                {balanceSheet?.liabilities?.current_liabilities?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-medium text-gray-600 pl-4">Current Liabilities</td>
                    </tr>
                    {balanceSheet.liabilities.current_liabilities.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-8">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}
                
                <tr className="bg-red-100 font-bold">
                  <td>Total Liabilities</td>
                  <td className="text-right">₹{(balanceSheet?.liabilities?.total || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{(balanceSheet?.total_liabilities_and_capital || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Side - Assets */}
        <div className="data-card">
          <div className="data-card-header bg-blue-100">
            <div className="data-card-title text-blue-700">ASSETS (संपत्ति)</div>
          </div>
          <div className="data-card-body p-0">
            <table className="data-table">
              <tbody>
                {/* Fixed Assets */}
                {balanceSheet?.assets?.fixed_assets?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Fixed Assets (स्थायी संपत्ति)</td>
                    </tr>
                    {balanceSheet.assets.fixed_assets.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Current Assets */}
                {balanceSheet?.assets?.current_assets?.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="font-bold text-gray-700">Current Assets (चालू संपत्ति)</td>
                    </tr>
                    {balanceSheet.assets.current_assets.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pl-6">{item.account_name}</td>
                        <td className="text-right font-medium">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="bg-blue-100 font-bold">
                  <td>Total Assets</td>
                  <td className="text-right">₹{(balanceSheet?.assets?.total || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{(balanceSheet?.assets?.total || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { format } from "date-fns";

const TrialBalance = () => {
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/reports/trial-balance`);
      setTrialBalance(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const groupedAccounts = {
    asset: trialBalance?.accounts?.filter(a => a.account_type === 'asset') || [],
    liability: trialBalance?.accounts?.filter(a => a.account_type === 'liability') || [],
    capital: trialBalance?.accounts?.filter(a => a.account_type === 'capital') || [],
    income: trialBalance?.accounts?.filter(a => a.account_type === 'income') || [],
    expense: trialBalance?.accounts?.filter(a => a.account_type === 'expense') || []
  };

  return (
    <div className="animate-fade-in" data-testid="trial-balance-page">
      <div className="action-bar">
        <div className="text-sm text-gray-500">
          As on: <span className="font-bold">{format(new Date(trialBalance?.as_on_date || new Date()), "dd MMMM yyyy")}</span>
        </div>
        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export PDF
        </button>
      </div>

      {/* Balance Status */}
      <div className={`p-4 rounded-lg mb-4 ${trialBalance?.is_balanced ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-l-4`}>
        <div className="flex items-center gap-2">
          {trialBalance?.is_balanced ? (
            <>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-green-800 font-medium">Trial Balance is Balanced (Debit = Credit)</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-red-800 font-medium">Trial Balance is NOT Balanced! Difference: ₹{Math.abs((trialBalance?.total_debit || 0) - (trialBalance?.total_credit || 0)).toLocaleString('en-IN')}</span>
            </>
          )}
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Trial Balance (तलपट)</div>
        </div>
        <div className="data-card-body p-0">
          <table className="data-table">
            <thead>
              <tr className="bg-gray-100">
                <th>Account Code</th>
                <th>Account Name</th>
                <th className="text-right text-red-600">Debit (Dr)</th>
                <th className="text-right text-green-600">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {/* Assets */}
              {groupedAccounts.asset.length > 0 && (
                <>
                  <tr className="bg-blue-50">
                    <td colSpan="4" className="font-bold text-blue-700">ASSETS (संपत्ति)</td>
                  </tr>
                  {groupedAccounts.asset.map(acc => (
                    <tr key={acc.account_id}>
                      <td className="text-gray-500 font-mono">{acc.account_code || "-"}</td>
                      <td className="pl-8">{acc.account_name}</td>
                      <td className="text-right font-medium text-red-600">{acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="text-right font-medium text-green-600">{acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Liabilities */}
              {groupedAccounts.liability.length > 0 && (
                <>
                  <tr className="bg-red-50">
                    <td colSpan="4" className="font-bold text-red-700">LIABILITIES (देनदारी)</td>
                  </tr>
                  {groupedAccounts.liability.map(acc => (
                    <tr key={acc.account_id}>
                      <td className="text-gray-500 font-mono">{acc.account_code || "-"}</td>
                      <td className="pl-8">{acc.account_name}</td>
                      <td className="text-right font-medium text-red-600">{acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="text-right font-medium text-green-600">{acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Capital */}
              {groupedAccounts.capital.length > 0 && (
                <>
                  <tr className="bg-purple-50">
                    <td colSpan="4" className="font-bold text-purple-700">CAPITAL (पूंजी)</td>
                  </tr>
                  {groupedAccounts.capital.map(acc => (
                    <tr key={acc.account_id}>
                      <td className="text-gray-500 font-mono">{acc.account_code || "-"}</td>
                      <td className="pl-8">{acc.account_name}</td>
                      <td className="text-right font-medium text-red-600">{acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="text-right font-medium text-green-600">{acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Income */}
              {groupedAccounts.income.length > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td colSpan="4" className="font-bold text-green-700">INCOME (आमदनी)</td>
                  </tr>
                  {groupedAccounts.income.map(acc => (
                    <tr key={acc.account_id}>
                      <td className="text-gray-500 font-mono">{acc.account_code || "-"}</td>
                      <td className="pl-8">{acc.account_name}</td>
                      <td className="text-right font-medium text-red-600">{acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="text-right font-medium text-green-600">{acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Expenses */}
              {groupedAccounts.expense.length > 0 && (
                <>
                  <tr className="bg-orange-50">
                    <td colSpan="4" className="font-bold text-orange-700">EXPENSES (खर्चे)</td>
                  </tr>
                  {groupedAccounts.expense.map(acc => (
                    <tr key={acc.account_id}>
                      <td className="text-gray-500 font-mono">{acc.account_code || "-"}</td>
                      <td className="pl-8">{acc.account_name}</td>
                      <td className="text-right font-medium text-red-600">{acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="text-right font-medium text-green-600">{acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            <tfoot className="bg-gray-100 font-bold text-lg">
              <tr>
                <td colSpan="2" className="text-right">TOTAL</td>
                <td className="text-right text-red-600">₹{(trialBalance?.total_debit || 0).toLocaleString('en-IN')}</td>
                <td className="text-right text-green-600">₹{(trialBalance?.total_credit || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;

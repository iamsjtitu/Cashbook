import { useState, useEffect } from "react";

import axios from "axios";
import { api, API } from "@/App";
import { format } from "date-fns";

const BalanceSheet = () => {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bsRes, partiesRes] = await Promise.all([
        axios.get(`${API}/reports/simple-balance-sheet`),
        axios.get(`${API}/parties`)
      ]);
      setBalanceSheet(bsRes.data);
      setParties(partiesRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group parties by account head
  const currentAssetParties = parties.filter(p => p.account_head === 'current_asset');
  const fixedAssetParties = parties.filter(p => p.account_head === 'fixed_asset');
  const currentLiabilityParties = parties.filter(p => p.account_head === 'current_liability');
  const longTermLiabilityParties = parties.filter(p => p.account_head === 'long_term_liability');
  const capitalParties = parties.filter(p => p.account_head === 'capital');

  // Calculate totals from ledgers
  const ledgerCurrentAssets = currentAssetParties.reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  const ledgerFixedAssets = fixedAssetParties.reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  const ledgerCurrentLiabilities = currentLiabilityParties.reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  const ledgerLongTermLiabilities = longTermLiabilityParties.reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);
  const ledgerCapital = capitalParties.reduce((sum, p) => sum + Math.abs(p.current_balance || 0), 0);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const systemTotalAssets = balanceSheet?.assets?.total || 0;
  const systemTotalLiabilities = balanceSheet?.liabilities?.total || 0;
  const netWorth = balanceSheet?.capital?.net_worth || 0;

  // Combined totals
  const totalAssets = systemTotalAssets + ledgerCurrentAssets + ledgerFixedAssets;
  const totalLiabilities = systemTotalLiabilities + ledgerCurrentLiabilities + ledgerLongTermLiabilities;
  const totalCapital = netWorth + ledgerCapital;

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

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Assets (संपत्ति)</div>
          <div className="stat-box-value primary">₹{totalAssets.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Liabilities (देनदारी)</div>
          <div className="stat-box-value danger">₹{totalLiabilities.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Worth (कुल मूल्य)</div>
          <div className={`stat-box-value ${totalCapital >= 0 ? 'success' : 'danger'}`}>
            ₹{totalCapital.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Balance Sheet Formula */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-blue-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Balance Sheet Formula: Assets = Liabilities + Capital (Net Worth)</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">यह report आपके Cash Book, Party Ledger (Account Head के साथ), Advances, Chit Fund और Interest accounts के data से automatically generate हो रही है।</p>
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
                {/* Current Liabilities from Ledgers */}
                <tr className="bg-red-50">
                  <td colSpan="2" className="font-bold text-red-700">Current Liabilities (चालू देनदारी)</td>
                </tr>
                
                {currentLiabilityParties.length > 0 && currentLiabilityParties.map(party => (
                  <tr key={party.id}>
                    <td className="pl-6">{party.name}</td>
                    <td className="text-right font-medium">₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}

                <tr>
                  <td className="pl-6">Creditors (देनदार)</td>
                  <td className="text-right font-medium">₹{(balanceSheet?.liabilities?.current_liabilities?.creditors?.total || 0).toLocaleString('en-IN')}</td>
                </tr>
                
                {balanceSheet?.liabilities?.current_liabilities?.creditors?.list?.map((creditor, idx) => (
                  <tr key={idx} className="text-sm text-gray-500">
                    <td className="pl-10">- {creditor.name}</td>
                    <td className="text-right">₹{creditor.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                
                {balanceSheet?.liabilities?.current_liabilities?.salaries_payable > 0 && (
                  <tr>
                    <td className="pl-6">Salaries Payable</td>
                    <td className="text-right font-medium">₹{balanceSheet.liabilities.current_liabilities.salaries_payable.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Long Term Liabilities from Ledgers */}
                {longTermLiabilityParties.length > 0 && (
                  <>
                    <tr className="bg-orange-50">
                      <td colSpan="2" className="font-bold text-orange-700">Long Term Liabilities (दीर्घकालिक देनदारी)</td>
                    </tr>
                    {longTermLiabilityParties.map(party => (
                      <tr key={party.id}>
                        <td className="pl-6">{party.name}</td>
                        <td className="text-right font-medium">₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}
                
                <tr className="bg-red-100 font-bold">
                  <td>Total Liabilities</td>
                  <td className="text-right">₹{totalLiabilities.toLocaleString('en-IN')}</td>
                </tr>

                {/* Capital */}
                <tr className="bg-purple-50">
                  <td colSpan="2" className="font-bold text-purple-700">Capital (पूंजी)</td>
                </tr>
                
                {capitalParties.length > 0 && capitalParties.map(party => (
                  <tr key={party.id}>
                    <td className="pl-6">{party.name}</td>
                    <td className="text-right font-medium">₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                
                <tr>
                  <td className="pl-6">Net Worth (Owner's Capital)</td>
                  <td className="text-right font-medium">₹{netWorth.toLocaleString('en-IN')}</td>
                </tr>
                
                {(balanceSheet?.capital?.chit_fund_won || 0) > 0 && (
                  <tr className="text-green-600">
                    <td className="pl-8 text-sm">Includes: Chit Fund Won</td>
                    <td className="text-right text-sm">₹{balanceSheet.capital.chit_fund_won.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                
                <tr className="bg-purple-100 font-bold">
                  <td>Total Capital</td>
                  <td className="text-right">₹{totalCapital.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{(totalLiabilities + totalCapital).toLocaleString('en-IN')}</td>
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
                <tr className="bg-blue-50">
                  <td colSpan="2" className="font-bold text-blue-700">Current Assets (चालू संपत्ति)</td>
                </tr>
                
                {/* Current Assets from Ledgers */}
                {currentAssetParties.length > 0 && currentAssetParties.map(party => (
                  <tr key={party.id}>
                    <td className="pl-6">{party.name}</td>
                    <td className="text-right font-medium">₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                
                <tr>
                  <td className="pl-6">Cash Balance (नकद शेष)</td>
                  <td className={`text-right font-medium ${(balanceSheet?.assets?.current_assets?.cash_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(balanceSheet?.assets?.current_assets?.cash_balance || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
                
                <tr>
                  <td className="pl-6">Debtors (लेनदार - जो हमें देंगे)</td>
                  <td className="text-right font-medium">₹{(balanceSheet?.assets?.current_assets?.debtors?.total || 0).toLocaleString('en-IN')}</td>
                </tr>
                
                {balanceSheet?.assets?.current_assets?.debtors?.list?.map((debtor, idx) => (
                  <tr key={idx} className="text-sm text-gray-500">
                    <td className="pl-10">- {debtor.name}</td>
                    <td className="text-right">₹{debtor.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                
                <tr>
                  <td className="pl-6">Advances to Staff (अग्रिम)</td>
                  <td className="text-right font-medium">₹{(balanceSheet?.assets?.current_assets?.advances_to_staff || 0).toLocaleString('en-IN')}</td>
                </tr>
                
                <tr>
                  <td className="pl-6">Chit Fund Investment (चिट फंड)</td>
                  <td className="text-right font-medium">₹{(balanceSheet?.assets?.current_assets?.chit_fund_investment || 0).toLocaleString('en-IN')}</td>
                </tr>
                
                <tr>
                  <td className="pl-6">Interest Receivable (ब्याज लेना)</td>
                  <td className="text-right font-medium">₹{(balanceSheet?.assets?.current_assets?.interest_receivable || 0).toLocaleString('en-IN')}</td>
                </tr>

                {/* Fixed Assets from Ledgers */}
                {fixedAssetParties.length > 0 && (
                  <>
                    <tr className="bg-indigo-50">
                      <td colSpan="2" className="font-bold text-indigo-700">Fixed Assets (स्थायी संपत्ति)</td>
                    </tr>
                    {fixedAssetParties.map(party => (
                      <tr key={party.id}>
                        <td className="pl-6">{party.name}</td>
                        <td className="text-right font-medium">₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </>
                )}
                
                <tr className="bg-blue-100 font-bold">
                  <td>Total Assets</td>
                  <td className="text-right">₹{totalAssets.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-200 font-bold text-lg">
                <tr>
                  <td>TOTAL</td>
                  <td className="text-right">₹{totalAssets.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className={`mt-6 p-4 rounded-lg ${Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 1 ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center justify-center gap-2">
          {Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 1 ? (
            <>
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-green-800 font-medium">Balance Sheet is BALANCED!</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-red-800 font-medium">Balance Sheet is NOT balanced!</span>
            </>
          )}
        </div>
        <div className="text-center text-sm mt-2">
          <span className="text-blue-600">Assets: ₹{totalAssets.toLocaleString('en-IN')}</span>
          <span className="mx-2">=</span>
          <span className="text-red-600">Liabilities: ₹{totalLiabilities.toLocaleString('en-IN')}</span>
          <span className="mx-2">+</span>
          <span className="text-purple-600">Capital: ₹{totalCapital.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;

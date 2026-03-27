import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset (संपत्ति)", color: "bg-blue-100 text-blue-700" },
  { value: "liability", label: "Liability (देनदारी)", color: "bg-red-100 text-red-700" },
  { value: "capital", label: "Capital (पूंजी)", color: "bg-purple-100 text-purple-700" },
  { value: "income", label: "Income (आमदनी)", color: "bg-green-100 text-green-700" },
  { value: "expense", label: "Expense (खर्चा)", color: "bg-orange-100 text-orange-700" }
];

const SUB_TYPES = {
  asset: [
    { value: "current_asset", label: "Current Asset (चालू संपत्ति)" },
    { value: "fixed_asset", label: "Fixed Asset (स्थायी संपत्ति)" }
  ],
  liability: [
    { value: "current_liability", label: "Current Liability (चालू देनदारी)" },
    { value: "long_term_liability", label: "Long-term Liability (दीर्घकालीन)" }
  ],
  capital: [
    { value: "owners_capital", label: "Owner's Capital (मालिक की पूंजी)" },
    { value: "drawings", label: "Drawings (निकासी)" },
    { value: "retained_earnings", label: "Retained Earnings (संचित लाभ)" }
  ],
  income: [
    { value: "direct_income", label: "Direct Income (प्रत्यक्ष आमदनी)" },
    { value: "indirect_income", label: "Indirect Income (अप्रत्यक्ष आमदनी)" }
  ],
  expense: [
    { value: "direct_expense", label: "Direct Expense (प्रत्यक्ष खर्चा)" },
    { value: "indirect_expense", label: "Indirect Expense (अप्रत्यक्ष खर्चा)" }
  ]
};

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState(["asset", "liability", "capital", "income", "expense"]);
  
  const [formData, setFormData] = useState({
    name: "",
    account_type: "asset",
    sub_type: "current_asset",
    code: "",
    description: "",
    opening_balance: "0",
    opening_balance_type: "debit"
  });

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${API}/accounts/grouped/all`);
      setAccounts(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      const res = await axios.post(`${API}/accounts/initialize-defaults`);
      toast.success(res.data.message);
      fetchAccounts();
    } catch (error) {
      toast.error("Failed to initialize accounts");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/accounts`, {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0
      });
      toast.success("Account created!");
      setShowModal(false);
      setFormData({ name: "", account_type: "asset", sub_type: "current_asset", code: "", description: "", opening_balance: "0", opening_balance_type: "debit" });
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create account");
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      toast.success("Account deleted!");
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const viewLedger = async (account) => {
    setSelectedAccount(account);
    try {
      const res = await axios.get(`${API}/accounts/${account.id}/ledger`);
      setLedgerData(res.data);
      setShowLedgerModal(true);
    } catch (error) {
      toast.error("Failed to fetch ledger");
    }
  };

  const toggleType = (type) => {
    setExpandedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getTypeInfo = (type) => ACCOUNT_TYPES.find(t => t.value === type);
  const getSubTypeLabel = (type, subType) => {
    const sub = SUB_TYPES[type]?.find(s => s.value === subType);
    return sub?.label || subType;
  };

  const countAccounts = (type) => {
    if (!accounts[type]) return 0;
    return Object.values(accounts[type]).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const hasAccounts = Object.values(accounts).some(type => 
    Object.values(type).some(arr => arr.length > 0)
  );

  return (
    <div className="animate-fade-in" data-testid="chart-of-accounts-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-account-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Account
        </button>
        {!hasAccounts && (
          <button onClick={initializeDefaults} className="action-btn primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Initialize Default Accounts
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-indigo-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Chart of Accounts (खाता तालिका)</span>
        </div>
        <p className="text-sm text-indigo-700 mt-1">Double Entry System: हर transaction में Debit और Credit बराबर होना चाहिए। Assets & Expenses = Debit Balance, Liabilities, Capital & Income = Credit Balance</p>
      </div>

      {/* Account Type Cards */}
      {ACCOUNT_TYPES.map(typeInfo => (
        <div key={typeInfo.value} className="data-card mb-4">
          <div 
            className={`data-card-header cursor-pointer flex justify-between items-center ${typeInfo.color}`}
            onClick={() => toggleType(typeInfo.value)}
          >
            <div className="data-card-title flex items-center gap-2">
              <svg className={`w-4 h-4 transition-transform ${expandedTypes.includes(typeInfo.value) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {typeInfo.label}
              <span className="text-xs bg-white/50 px-2 py-0.5 rounded">{countAccounts(typeInfo.value)} accounts</span>
            </div>
          </div>
          
          {expandedTypes.includes(typeInfo.value) && accounts[typeInfo.value] && (
            <div className="data-card-body p-0">
              {SUB_TYPES[typeInfo.value].map(subType => {
                const subAccounts = accounts[typeInfo.value][subType.value] || [];
                if (subAccounts.length === 0) return null;
                
                return (
                  <div key={subType.value} className="border-b last:border-b-0">
                    <div className="px-4 py-2 bg-gray-50 font-medium text-sm text-gray-600">
                      {subType.label}
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Account Name</th>
                          <th className="text-right">Balance</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subAccounts.map(acc => (
                          <tr key={acc.id}>
                            <td className="text-gray-500 font-mono">{acc.code || "-"}</td>
                            <td className="font-medium">
                              {acc.name}
                              {acc.is_system && <span className="ml-2 text-xs bg-gray-200 px-1 rounded">System</span>}
                            </td>
                            <td className="text-right font-bold">
                              ₹{Math.abs(acc.current_balance || 0).toLocaleString('en-IN')}
                              <span className="text-xs ml-1 text-gray-500">
                                {typeInfo.value === 'asset' || typeInfo.value === 'expense' ? 'Dr' : 'Cr'}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button onClick={() => viewLedger(acc)} className="text-blue-500 hover:text-blue-700" title="View Ledger">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                                {!acc.is_system && (
                                  <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {Object.values(accounts[typeInfo.value]).every(arr => arr.length === 0) && (
                <div className="text-center py-4 text-gray-500">No accounts in this category</div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Account Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Account</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Account Type *</label>
                    <select className="form-control" value={formData.account_type} onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({
                        ...formData, 
                        account_type: newType,
                        sub_type: SUB_TYPES[newType][0].value,
                        opening_balance_type: newType === 'asset' || newType === 'expense' ? 'debit' : 'credit'
                      });
                    }} required>
                      {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sub Type *</label>
                    <select className="form-control" value={formData.sub_type} onChange={(e) => setFormData({...formData, sub_type: e.target.value})} required>
                      {SUB_TYPES[formData.account_type]?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Name *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Petty Cash, SBI Bank Account" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Account Code</label>
                    <input type="text" className="form-control" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="e.g., 1001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Opening Balance</label>
                    <div className="flex gap-2">
                      <input type="number" className="form-control flex-1" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: e.target.value})} placeholder="0" />
                      <select className="form-control w-24" value={formData.opening_balance_type} onChange={(e) => setFormData({...formData, opening_balance_type: e.target.value})}>
                        <option value="debit">Dr</option>
                        <option value="credit">Cr</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-control" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Optional description" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && ledgerData && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
            <div className="modal-header">
              <div className="modal-title">Ledger - {ledgerData.account?.name}</div>
              <button className="modal-close" onClick={() => setShowLedgerModal(false)}>&times;</button>
            </div>
            <div className="modal-body p-0">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Opening Balance</div>
                  <div className="text-lg font-bold">₹{ledgerData.opening_balance?.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Current Balance</div>
                  <div className="text-lg font-bold text-blue-600">₹{Math.abs(ledgerData.current_balance || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total Entries</div>
                  <div className="text-lg font-bold">{ledgerData.entries?.length || 0}</div>
                </div>
              </div>
              {ledgerData.entries?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No transactions found</div>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <table className="data-table">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th>Date</th>
                        <th>Voucher</th>
                        <th>Narration</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Credit</th>
                        <th className="text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.entries.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.date}</td>
                          <td><span className="text-xs bg-gray-100 px-2 py-1 rounded">{entry.voucher_no}</span></td>
                          <td className="font-medium">{entry.narration}</td>
                          <td className="text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="text-right text-green-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="text-right font-bold">₹{Math.abs(entry.balance).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;

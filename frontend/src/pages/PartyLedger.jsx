import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";

const ACCOUNT_HEAD_OPTIONS = {
  balance_sheet: [
    { value: "current_asset", label: "Current Asset (चालू संपत्ति)" },
    { value: "fixed_asset", label: "Fixed Asset (स्थायी संपत्ति)" },
    { value: "current_liability", label: "Current Liability (चालू देनदारी)" },
    { value: "long_term_liability", label: "Long Term Liability (दीर्घकालिक देनदारी)" },
    { value: "capital", label: "Capital (पूंजी)" }
  ],
  profit_loss: [
    { value: "direct_income", label: "Direct Income (प्रत्यक्ष आय)" },
    { value: "indirect_income", label: "Indirect Income (अप्रत्यक्ष आय)" },
    { value: "direct_expense", label: "Direct Expense (प्रत्यक्ष खर्च)" },
    { value: "indirect_expense", label: "Indirect Expense (अप्रत्यक्ष खर्च)" }
  ]
};

const PartyLedger = () => {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showEditOB, setShowEditOB] = useState(false);
  const [editOBData, setEditOBData] = useState({ party: null, opening_balance: "0" });
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "", 
    address: "", 
    opening_balance: "0", 
    balance_type: "debit",
    account_head: "",
    parent_party_id: ""
  });
  const [filterHead, setFilterHead] = useState("all");

  useEffect(() => { fetchParties(); }, []);

  const fetchParties = async () => {
    try {
      const res = await axios.get(`${API}/parties`);
      setParties(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (partyId) => {
    try {
      const res = await axios.get(`${API}/parties/${partyId}/ledger`);
      setLedgerData(res.data);
      setShowLedger(true);
    } catch (error) {
      toast.error("Failed to fetch ledger");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/parties`, {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        account_head: formData.account_head || null,
        parent_party_id: formData.parent_party_id || null
      });
      toast.success("Ledger added!");
      setShowModal(false);
      setFormData({ name: "", phone: "", address: "", opening_balance: "0", balance_type: "debit", account_head: "", parent_party_id: "" });
      fetchParties();
    } catch (error) {
      toast.error("Failed to add ledger");
    }
  };

  const handleDelete = async (partyId) => {
    if (!window.confirm("Delete this ledger? This cannot be undone if ledger has transactions.")) return;
    try {
      await axios.delete(`${API}/parties/${partyId}`);
      toast.success("Ledger deleted!");
      fetchParties();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const handleEditOB = (party) => {
    setEditOBData({ party, opening_balance: party.opening_balance?.toString() || "0" });
    setShowEditOB(true);
  };

  const handleUpdateOB = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/parties/${editOBData.party.id}`, {
        opening_balance: parseFloat(editOBData.opening_balance) || 0
      });
      toast.success("Opening Balance updated!");
      setShowEditOB(false);
      fetchParties();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  // Get parent parties (ones with account_head set)
  const parentParties = parties.filter(p => p.account_head);
  
  // Filter parties by account head
  const filteredParties = filterHead === "all" 
    ? parties 
    : parties.filter(p => p.account_head === filterHead || p.parent_party_id && parentParties.find(pp => pp.id === p.parent_party_id && pp.account_head === filterHead));

  const totalDebit = filteredParties.reduce((sum, p) => sum + (p.current_balance > 0 ? p.current_balance : 0), 0);
  const totalCredit = filteredParties.reduce((sum, p) => sum + (p.current_balance < 0 ? Math.abs(p.current_balance) : 0), 0);

  const getAccountHeadLabel = (value) => {
    const all = [...ACCOUNT_HEAD_OPTIONS.balance_sheet, ...ACCOUNT_HEAD_OPTIONS.profit_loss];
    return all.find(h => h.value === value)?.label || value;
  };

  const getParentName = (parentId) => {
    const parent = parties.find(p => p.id === parentId);
    return parent?.name || "-";
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="party-ledger-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-party-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Ledger
        </button>
        
        {/* Filter by Account Head */}
        <select 
          className="form-control w-auto" 
          value={filterHead} 
          onChange={(e) => setFilterHead(e.target.value)}
        >
          <option value="all">All Ledgers</option>
          <optgroup label="Balance Sheet">
            {ACCOUNT_HEAD_OPTIONS.balance_sheet.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </optgroup>
          <optgroup label="P&L">
            {ACCOUNT_HEAD_OPTIONS.profit_loss.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Ledgers</div>
          <div className="stat-box-value primary">{filteredParties.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Debit Balance (Lena)</div>
          <div className="stat-box-value danger">₹{totalDebit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Credit Balance (Dena)</div>
          <div className="stat-box-value success">₹{totalCredit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Balance</div>
          <div className={`stat-box-value ${(totalDebit - totalCredit) >= 0 ? 'success' : 'danger'}`}>
            ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Party Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Ledger Master</div>
        </div>
        <div className="data-card-body p-0">
          {filteredParties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No ledgers found</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Ledger</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>ACCOUNT HEAD</th>
                  <th>PARENT</th>
                  <th>OPENING BAL</th>
                  <th>CURRENT BAL</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.map((party) => (
                  <tr key={party.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="staff-avatar">{party.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold">{party.name}</div>
                          {party.phone && <div className="text-xs text-gray-500">{party.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {party.account_head ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          party.account_head.includes('asset') ? 'bg-blue-100 text-blue-700' :
                          party.account_head.includes('liability') ? 'bg-orange-100 text-orange-700' :
                          party.account_head.includes('income') ? 'bg-green-100 text-green-700' :
                          party.account_head.includes('expense') ? 'bg-red-100 text-red-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {getAccountHeadLabel(party.account_head)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      {party.parent_party_id ? (
                        <span className="text-sm text-blue-600">{getParentName(party.parent_party_id)}</span>
                      ) : '-'}
                    </td>
                    <td className="font-medium">
                      ₹{(party.opening_balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className={`font-bold ${party.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.abs(party.current_balance || 0).toLocaleString('en-IN')}
                      <span className="text-xs ml-1">({party.current_balance >= 0 ? 'DR' : 'CR'})</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => fetchLedger(party.id)} className="btn btn-secondary text-xs py-1 px-2">
                          Ledger
                        </button>
                        <button onClick={() => handleEditOB(party)} className="btn btn-secondary text-xs py-1 px-2">
                          Edit OB
                        </button>
                        <button onClick={() => handleDelete(party.id)} className="btn btn-outline-danger text-xs py-1 px-2">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Ledger (नया खाता)</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Ledger Name *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter name" required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Account Head (Category) *</label>
                  <select 
                    className="form-control" 
                    value={formData.account_head} 
                    onChange={(e) => setFormData({...formData, account_head: e.target.value})}
                  >
                    <option value="">-- Select Category --</option>
                    <optgroup label="Balance Sheet Items">
                      {ACCOUNT_HEAD_OPTIONS.balance_sheet.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="P&L Items">
                      {ACCOUNT_HEAD_OPTIONS.profit_loss.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Ledger (Optional)</label>
                  <select 
                    className="form-control" 
                    value={formData.parent_party_id} 
                    onChange={(e) => setFormData({...formData, parent_party_id: e.target.value})}
                  >
                    <option value="">-- No Parent (Independent) --</option>
                    {parentParties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({getAccountHeadLabel(p.account_head)})</option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">Sub-ledger inherit parent's category in reports</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-control" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Enter phone" />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-control" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Enter address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Opening Balance</label>
                    <input type="number" className="form-control" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: e.target.value})} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balance Type</label>
                    <select className="form-control" value={formData.balance_type} onChange={(e) => setFormData({...formData, balance_type: e.target.value})}>
                      <option value="debit">Debit (Lena)</option>
                      <option value="credit">Credit (Dena)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Save Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedger && ledgerData && (
        <div className="modal-overlay" onClick={() => setShowLedger(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
            <div className="modal-header">
              <div className="modal-title">Ledger - {ledgerData.party?.name}</div>
              <button className="modal-close" onClick={() => setShowLedger(false)}>&times;</button>
            </div>
            <div className="modal-body p-0">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Opening Balance</div>
                  <div className="text-lg font-bold">₹{ledgerData.opening_balance?.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Current Balance</div>
                  <div className={`text-lg font-bold ${ledgerData.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.abs(ledgerData.current_balance).toLocaleString('en-IN')} {ledgerData.current_balance >= 0 ? '(DR)' : '(CR)'}
                  </div>
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
                        <th>Description</th>
                        <th>Mode</th>
                        <th className="text-right text-red-600">Debit</th>
                        <th className="text-right text-green-600">Credit</th>
                        <th className="text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.entries.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{format(new Date(entry.date), "dd-MM-yyyy")}</td>
                          <td className="font-medium">{entry.description}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${entry.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : entry.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {entry.payment_mode}
                            </span>
                          </td>
                          <td className="text-right font-bold text-red-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="text-right font-bold text-green-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}</td>
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

      {/* Edit Opening Balance Modal */}
      {showEditOB && editOBData.party && (
        <div className="modal-overlay" onClick={() => setShowEditOB(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <div className="modal-title">Edit Opening Balance - {editOBData.party.name}</div>
              <button className="modal-close" onClick={() => setShowEditOB(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateOB}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Opening Balance</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={editOBData.opening_balance} 
                    onChange={(e) => setEditOBData({...editOBData, opening_balance: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditOB(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyLedger;

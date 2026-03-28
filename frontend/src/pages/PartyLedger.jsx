import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";

const PartyLedger = () => {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showEditOB, setShowEditOB] = useState(false);
  const [editOBData, setEditOBData] = useState({ party: null, opening_balance: "0" });
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", opening_balance: "0", balance_type: "debit" });

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
        opening_balance: parseFloat(formData.opening_balance) || 0
      });
      toast.success("Party added!");
      setShowModal(false);
      setFormData({ name: "", phone: "", address: "", opening_balance: "0", balance_type: "debit" });
      fetchParties();
    } catch (error) {
      toast.error("Failed to add party");
    }
  };

  const handleDelete = async (partyId) => {
    if (!window.confirm("Delete this party? This cannot be undone if party has transactions.")) return;
    try {
      await axios.delete(`${API}/parties/${partyId}`);
      toast.success("Party deleted!");
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

  const totalDebit = parties.reduce((sum, p) => sum + (p.current_balance > 0 ? p.current_balance : 0), 0);
  const totalCredit = parties.reduce((sum, p) => sum + (p.current_balance < 0 ? Math.abs(p.current_balance) : 0), 0);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="party-ledger-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-party-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Party
        </button>
      </div>

      {/* Summary */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Parties</div>
          <div className="stat-box-value primary">{parties.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Debit (Lena)</div>
          <div className="stat-box-value success">₹{totalDebit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Credit (Dena)</div>
          <div className="stat-box-value danger">₹{totalCredit.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Balance</div>
          <div className={`stat-box-value ${totalDebit - totalCredit >= 0 ? 'success' : 'danger'}`}>
            ₹{(totalDebit - totalCredit).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Parties List */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Party List</div>
        </div>
        <div className="data-card-body p-0">
          {parties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No parties yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Party</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className="text-right">Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id}>
                    <td className="font-medium">{party.name}</td>
                    <td>{party.phone || "-"}</td>
                    <td className="text-gray-500">{party.address || "-"}</td>
                    <td className="text-right">
                      <span className={`font-bold ${party.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(party.current_balance).toLocaleString('en-IN')}
                        <span className="text-xs ml-1">({party.current_balance >= 0 ? 'DR' : 'CR'})</span>
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => fetchLedger(party.id)} className="text-blue-500 hover:text-blue-700" title="View Ledger">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleEditOB(party)} className="text-orange-500 hover:text-orange-700" title="Edit Opening Balance">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(party.id)} className="text-red-500 hover:text-red-700" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      {/* Add Party Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Party</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Party Name *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter name" required />
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
                <button type="submit" className="btn btn-success">Save Party</button>
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
                  <div className={`text-lg font-bold ${ledgerData.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Opening Balance - {editOBData.party.name}</div>
              <button className="modal-close" onClick={() => setShowEditOB(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateOB}>
              <div className="modal-body">
                <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-4">
                  <p className="text-sm text-orange-700">
                    <strong>Opening Balance</strong> woh amount hai jo Financial Year ke shuruwat me party ka balance tha. 
                    Isko change karne se current balance bhi adjust ho jayega.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Opening Balance (₹)</label>
                  <input 
                    type="number" 
                    className="form-control text-xl font-bold" 
                    value={editOBData.opening_balance} 
                    onChange={(e) => setEditOBData({...editOBData, opening_balance: e.target.value})} 
                    placeholder="0" 
                  />
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Current Balance: ₹{editOBData.party.current_balance?.toLocaleString('en-IN')}
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

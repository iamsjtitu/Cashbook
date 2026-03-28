import { useState, useEffect } from "react";

import axios from "axios";
import { api, API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const InterestByaj = () => {
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    party_id: "",
    principal_amount: "",
    interest_rate: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    note: ""
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [accRes, partiesRes] = await Promise.all([
        axios.get(`${API}/interest-accounts`),
        axios.get(`${API}/parties`)
      ]);
      setAccounts(accRes.data);
      setParties(partiesRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/interest-accounts`, {
        ...formData,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate)
      });
      toast.success("Interest account created!");
      setShowModal(false);
      setFormData({ party_id: "", principal_amount: "", interest_rate: "", start_date: format(new Date(), "yyyy-MM-dd"), note: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create");
    }
  };

  const calculateInterest = async (account) => {
    setSelectedAccount(account);
    try {
      const res = await axios.get(`${API}/interest-accounts/${account.id}/calculate?end_date=${endDate}`);
      setCalcResult(res.data);
      setShowCalcModal(true);
    } catch (error) {
      toast.error("Calculation failed");
    }
  };

  const addToCashbook = async () => {
    try {
      const res = await axios.post(`${API}/interest-accounts/${selectedAccount.id}/add-to-cashbook?end_date=${endDate}`);
      toast.success(`₹${res.data.interest_amount} interest added to cash book!`);
      setShowCalcModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this interest account?")) return;
    try {
      await axios.delete(`${API}/interest-accounts/${id}`);
      toast.success("Deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const totalPrincipal = accounts.filter(a => a.is_active).reduce((sum, a) => sum + a.principal_amount, 0);
  const totalInterestAdded = accounts.reduce((sum, a) => sum + (a.total_interest_added || 0), 0);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="interest-page">
      <div className="action-bar">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button className="dropdown-trigger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">Till: {format(new Date(endDate), "dd MMM yyyy")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="start">
            <Calendar mode="single" selected={new Date(endDate)} onSelect={(date) => { if(date) { setEndDate(format(date, "yyyy-MM-dd")); setDatePickerOpen(false); }}} initialFocus />
          </PopoverContent>
        </Popover>

        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-interest-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Byaj Account
        </button>
      </div>

      {/* Summary */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Active Accounts</div>
          <div className="stat-box-value primary">{accounts.filter(a => a.is_active).length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Principal</div>
          <div className="stat-box-value warning">₹{totalPrincipal.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Interest Added</div>
          <div className="stat-box-value success">₹{totalInterestAdded.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Interest Info Box */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-orange-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Byaj Formula: (Principal × Monthly Rate % × Months) ÷ 100</span>
        </div>
        <p className="text-sm text-orange-700 mt-1"><strong>30-Day Month Basis:</strong> 1 Month = 30 Days (हमेशा, चाहे February हो या 31 दिन का महीना). Rate monthly % में enter करें।</p>
      </div>

      {/* Accounts Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Interest (Byaj) Accounts</div>
        </div>
        <div className="data-card-body p-0">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No interest accounts yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Account</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Principal</th>
                  <th>Rate %</th>
                  <th>Start Date</th>
                  <th>Interest Added</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className={!acc.is_active ? 'opacity-50' : ''}>
                    <td className="font-medium">{parties.find(p => p.id === acc.party_id)?.name || "Unknown"}</td>
                    <td className="font-bold text-orange-600">₹{acc.principal_amount.toLocaleString('en-IN')}</td>
                    <td><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">{acc.interest_rate}%</span></td>
                    <td>{format(new Date(acc.start_date), "dd-MM-yyyy")}</td>
                    <td className="text-green-600 font-medium">₹{(acc.total_interest_added || 0).toLocaleString('en-IN')}</td>
                    <td className="text-gray-500 text-sm">{acc.note || "-"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => calculateInterest(acc)} className="action-btn success text-xs px-2 py-1">
                          Calculate
                        </button>
                        <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700" title="Delete">
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

      {/* Add Account Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Interest (Byaj) Account</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Party *</label>
                  <select className="form-control" value={formData.party_id} onChange={(e) => setFormData({...formData, party_id: e.target.value})} required>
                    <option value="">-- Select Party --</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Principal Amount (₹) *</label>
                    <input type="number" className="form-control" value={formData.principal_amount} onChange={(e) => setFormData({...formData, principal_amount: e.target.value})} placeholder="Enter amount" required min="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Rate (% per month) *</label>
                    <input type="number" step="0.01" className="form-control" value={formData.interest_rate} onChange={(e) => setFormData({...formData, interest_rate: e.target.value})} placeholder="e.g. 2" required min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-control" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input type="text" className="form-control" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="Enter note" />
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

      {/* Calculate Interest Modal */}
      {showCalcModal && calcResult && (
        <div className="modal-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
              <div className="modal-title text-white">Interest Calculation</div>
              <button className="modal-close text-white" onClick={() => setShowCalcModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="text-center py-4">
                <div className="text-gray-500 mb-2">Party: <span className="font-bold text-gray-800">{calcResult.party_name}</span></div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">Principal</div>
                    <div className="font-bold text-lg">₹{calcResult.principal.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">Rate</div>
                    <div className="font-bold text-lg">{calcResult.interest_rate}% / month</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">Duration</div>
                    <div className="font-bold text-lg">{calcResult.days} days = {calcResult.months} months</div>
                    <div className="text-xs text-gray-400">(30 days = 1 month)</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-green-600">Interest (Byaj)</div>
                    <div className="font-bold text-lg text-green-600">₹{calcResult.calculated_interest.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg">
                  <div className="text-orange-600 text-sm">Total Amount (Principal + Byaj)</div>
                  <div className="text-3xl font-bold text-orange-600">₹{calcResult.total_amount.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowCalcModal(false)} className="btn btn-secondary">Close</button>
              <button type="button" onClick={addToCashbook} className="btn btn-success">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Add ₹{calcResult.calculated_interest.toLocaleString('en-IN')} to Cash Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestByaj;

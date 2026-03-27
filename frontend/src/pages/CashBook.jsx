import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CashBook = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cashbookData, setCashbookData] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    party_id: "",
    transaction_type: "credit",
    amount: "",
    payment_mode: "cash",
    description: ""
  });

  useEffect(() => { fetchData(); }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cbRes, partiesRes] = await Promise.all([
        axios.get(`${API}/cashbook/${selectedDate}`),
        axios.get(`${API}/parties`)
      ]);
      setCashbookData(cbRes.data);
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
      await axios.post(`${API}/transactions`, {
        ...formData,
        amount: parseFloat(formData.amount),
        party_id: formData.party_id || null
      });
      toast.success("Transaction added!");
      setShowModal(false);
      setFormData({ date: selectedDate, party_id: "", transaction_type: "credit", amount: "", payment_mode: "cash", description: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add transaction");
    }
  };

  const handleDelete = async (txnId) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${API}/transactions/${txnId}`);
      toast.success("Transaction deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const paymentModeLabel = { cash: "Cash", upi: "UPI", bank_transfer: "Bank" };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="cashbook-page">
      <div className="action-bar">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button className="dropdown-trigger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">{format(new Date(selectedDate), "dd MMM yyyy")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="start">
            <Calendar mode="single" selected={new Date(selectedDate)} onSelect={(date) => { if(date) { setSelectedDate(format(date, "yyyy-MM-dd")); setDatePickerOpen(false); }}} initialFocus />
          </PopoverContent>
        </Popover>

        <button onClick={() => { setFormData({...formData, date: selectedDate}); setShowModal(true); }} className="action-btn success" data-testid="add-transaction-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Opening Balance</div>
          <div className="stat-box-value primary">₹{cashbookData?.opening_balance?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Credit (Jama)</div>
          <div className="stat-box-value success">₹{cashbookData?.total_credit?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Debit (Udhar)</div>
          <div className="stat-box-value danger">₹{cashbookData?.total_debit?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Closing Balance</div>
          <div className={`stat-box-value ${(cashbookData?.closing_balance || 0) >= 0 ? 'success' : 'danger'}`}>
            ₹{cashbookData?.closing_balance?.toLocaleString('en-IN') || 0}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Daily Cash Book - {format(new Date(selectedDate), "dd MMMM yyyy")}</div>
        </div>
        <div className="data-card-body p-0">
          {!cashbookData?.transactions?.length ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions for this day</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Entry</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Description</th>
                  <th>Party</th>
                  <th>Mode</th>
                  <th className="text-right text-green-600">Credit</th>
                  <th className="text-right text-red-600">Debit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cashbookData.transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="text-gray-500 text-sm">{txn.created_at ? format(new Date(txn.created_at), "HH:mm") : "-"}</td>
                    <td className="font-medium">{txn.description}</td>
                    <td>{parties.find(p => p.id === txn.party_id)?.name || "-"}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${txn.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : txn.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {paymentModeLabel[txn.payment_mode]}
                      </span>
                    </td>
                    <td className="text-right font-bold text-green-600">{txn.transaction_type === 'credit' ? `₹${txn.amount.toLocaleString('en-IN')}` : '-'}</td>
                    <td className="text-right font-bold text-red-600">{txn.transaction_type === 'debit' ? `₹${txn.amount.toLocaleString('en-IN')}` : '-'}</td>
                    <td>
                      <button onClick={() => handleDelete(txn.id)} className="text-red-500 hover:text-red-700" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Cash Book Entry</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFormData({...formData, transaction_type: "credit"})}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${formData.transaction_type === 'credit' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        Credit (Jama)
                      </button>
                      <button type="button" onClick={() => setFormData({...formData, transaction_type: "debit"})}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${formData.transaction_type === 'debit' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        Debit (Udhar)
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control text-xl font-bold" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount" required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Party (Optional)</label>
                  <select className="form-control" value={formData.party_id} onChange={(e) => setFormData({...formData, party_id: e.target.value})}>
                    <option value="">-- No Party --</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-control" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Enter description" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className={`btn ${formData.transaction_type === 'credit' ? 'btn-success' : 'btn-danger'}`}>
                  Add {formData.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashBook;

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ChitFund = () => {
  const [chits, setChits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedChit, setSelectedChit] = useState(null);
  const [payments, setPayments] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    total_amount: "",
    monthly_installment: "",
    total_members: "",
    duration_months: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    organizer: "",
    note: ""
  });
  
  const [payData, setPayData] = useState({
    month_number: 1,
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash",
    note: ""
  });
  
  const [winData, setWinData] = useState({
    won_month: 1,
    won_amount: "",
    payment_mode: "bank_transfer"
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [chitsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/chit-funds`),
        axios.get(`${API}/chit-funds/summary/all`)
      ]);
      setChits(chitsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds`, {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        monthly_installment: parseFloat(formData.monthly_installment),
        total_members: parseInt(formData.total_members),
        duration_months: parseInt(formData.duration_months)
      });
      toast.success("Chit Fund added!");
      setShowModal(false);
      setFormData({ name: "", total_amount: "", monthly_installment: "", total_members: "", duration_months: "", start_date: format(new Date(), "yyyy-MM-dd"), organizer: "", note: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add chit fund");
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds/${selectedChit.id}/pay`, {
        chit_id: selectedChit.id,
        ...payData,
        amount: parseFloat(payData.amount)
      });
      toast.success("Payment recorded & added to Cash Book!");
      setShowPayModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record payment");
    }
  };

  const handleWin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds/${selectedChit.id}/win?won_month=${winData.won_month}&won_amount=${winData.won_amount}&payment_mode=${winData.payment_mode}`);
      toast.success("Chit Won! Amount added to Cash Book!");
      setShowWinModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to mark as won");
    }
  };

  const fetchPayments = async (chit) => {
    setSelectedChit(chit);
    try {
      const res = await axios.get(`${API}/chit-funds/${chit.id}/payments`);
      setPayments(res.data);
      setShowPaymentsModal(true);
    } catch (error) {
      toast.error("Failed to fetch payments");
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await axios.delete(`${API}/chit-payments/${paymentId}`);
      toast.success("Payment deleted!");
      fetchPayments(selectedChit);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleDelete = async (chitId) => {
    if (!window.confirm("Delete this chit fund?")) return;
    try {
      await axios.delete(`${API}/chit-funds/${chitId}`);
      toast.success("Chit fund deleted!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const openPayModal = (chit) => {
    setSelectedChit(chit);
    setPayData({
      month_number: chit.payments_count + 1,
      amount: chit.monthly_installment.toString(),
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      note: ""
    });
    setShowPayModal(true);
  };

  const openWinModal = (chit) => {
    setSelectedChit(chit);
    setWinData({
      won_month: chit.payments_count || 1,
      won_amount: chit.total_amount.toString(),
      payment_mode: "bank_transfer"
    });
    setShowWinModal(true);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="chitfund-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-chit-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Chit Fund
        </button>
      </div>

      {/* Summary */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Active Chits</div>
          <div className="stat-box-value primary">{summary?.active_chits || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Invested</div>
          <div className="stat-box-value danger">₹{summary?.total_invested?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Won</div>
          <div className="stat-box-value success">₹{summary?.total_won?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Remaining to Pay</div>
          <div className="stat-box-value warning">₹{summary?.total_remaining?.toLocaleString('en-IN') || 0}</div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-purple-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Chit Fund Tracking</span>
        </div>
        <p className="text-sm text-purple-700 mt-1">Track your chit fund memberships. Monthly payments auto-add to Cash Book as debit. When you win, the amount adds as credit.</p>
      </div>

      {/* Chits List */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">My Chit Funds</div>
        </div>
        <div className="data-card-body p-0">
          {chits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No chit funds yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Chit</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chit Name</th>
                  <th>Total Amount</th>
                  <th>Monthly</th>
                  <th>Duration</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chits.map((chit) => (
                  <tr key={chit.id} className={!chit.is_active ? 'opacity-50' : ''}>
                    <td>
                      <div className="font-medium">{chit.name}</div>
                      {chit.organizer && <div className="text-xs text-gray-500">{chit.organizer}</div>}
                    </td>
                    <td className="font-bold text-purple-600">₹{chit.total_amount.toLocaleString('en-IN')}</td>
                    <td>₹{chit.monthly_installment.toLocaleString('en-IN')}</td>
                    <td>{chit.duration_months} months</td>
                    <td>
                      <div className="font-medium">{chit.payments_count}/{chit.duration_months}</div>
                      <div className="text-xs text-gray-500">₹{chit.total_paid?.toLocaleString('en-IN') || 0}</div>
                    </td>
                    <td>
                      {chit.is_won ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          WON (Month {chit.won_month})
                        </span>
                      ) : chit.is_active ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Active</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">Completed</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openPayModal(chit)} className="action-btn success text-xs px-2 py-1" disabled={chit.payments_count >= chit.duration_months}>
                          Pay
                        </button>
                        {!chit.is_won && (
                          <button onClick={() => openWinModal(chit)} className="action-btn primary text-xs px-2 py-1">
                            Won
                          </button>
                        )}
                        <button onClick={() => fetchPayments(chit)} className="text-blue-500 hover:text-blue-700" title="View Payments">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(chit.id)} className="text-red-500 hover:text-red-700" title="Delete">
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

      {/* Add Chit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Chit Fund</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chit Name *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Navkar Chit 5 Lakh" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Total Amount (₹) *</label>
                    <input type="number" className="form-control" value={formData.total_amount} onChange={(e) => setFormData({...formData, total_amount: e.target.value})} placeholder="500000" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Installment (₹) *</label>
                    <input type="number" className="form-control" value={formData.monthly_installment} onChange={(e) => setFormData({...formData, monthly_installment: e.target.value})} placeholder="25000" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Total Members *</label>
                    <input type="number" className="form-control" value={formData.total_members} onChange={(e) => setFormData({...formData, total_members: e.target.value})} placeholder="20" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Months) *</label>
                    <input type="number" className="form-control" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: e.target.value})} placeholder="20" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer</label>
                    <input type="text" className="form-control" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} placeholder="Company name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input type="text" className="form-control" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="Additional notes" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Add Chit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {showPayModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Pay Installment - {selectedChit.name}</div>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePay}>
              <div className="modal-body">
                <div className="bg-purple-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-purple-700">Monthly: ₹{selectedChit.monthly_installment.toLocaleString('en-IN')} | Paid: {selectedChit.payments_count}/{selectedChit.duration_months}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Month Number *</label>
                    <input type="number" className="form-control" value={payData.month_number} onChange={(e) => setPayData({...payData, month_number: parseInt(e.target.value)})} min="1" max={selectedChit.duration_months} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input type="number" className="form-control" value={payData.amount} onChange={(e) => setPayData({...payData, amount: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input type="date" className="form-control" value={payData.payment_date} onChange={(e) => setPayData({...payData, payment_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select className="form-control" value={payData.payment_mode} onChange={(e) => setPayData({...payData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  This payment will be automatically added to Cash Book as a Debit entry.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Pay ₹{payData.amount}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Won Modal */}
      {showWinModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowWinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="modal-title text-white">Chit Won! - {selectedChit.name}</div>
              <button className="modal-close text-white" onClick={() => setShowWinModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleWin}>
              <div className="modal-body">
                <div className="text-center py-4">
                  <div className="text-5xl mb-2">🎉</div>
                  <div className="text-lg font-bold text-green-600">Congratulations!</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Won in Month *</label>
                    <input type="number" className="form-control" value={winData.won_month} onChange={(e) => setWinData({...winData, won_month: parseInt(e.target.value)})} min="1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹) *</label>
                    <input type="number" className="form-control" value={winData.won_amount} onChange={(e) => setWinData({...winData, won_amount: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode *</label>
                  <select className="form-control" value={winData.payment_mode} onChange={(e) => setWinData({...winData, payment_mode: e.target.value})}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  The won amount will be automatically added to Cash Book as a Credit entry.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowWinModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Confirm Win</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Payments Modal */}
      {showPaymentsModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowPaymentsModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px'}}>
            <div className="modal-header">
              <div className="modal-title">Payment History - {selectedChit.name}</div>
              <button className="modal-close" onClick={() => setShowPaymentsModal(false)}>&times;</button>
            </div>
            <div className="modal-body p-0">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No payments yet</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">Month {p.month_number}</td>
                        <td>{format(new Date(p.payment_date), "dd-MM-yyyy")}</td>
                        <td className="font-bold text-red-600">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${p.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : p.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {p.payment_mode === 'bank_transfer' ? 'Bank' : p.payment_mode.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => handleDeletePayment(p.id)} className="text-red-500 hover:text-red-700">
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
        </div>
      )}
    </div>
  );
};

export default ChitFund;

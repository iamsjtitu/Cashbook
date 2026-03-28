import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";

const ChitFund = () => {
  const [chits, setChits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChit, setSelectedChit] = useState(null);
  const [chitDetail, setChitDetail] = useState(null);
  const [paidMonths, setPaidMonths] = useState({ paid_months: [], pending_months: [] });
  
  const [formData, setFormData] = useState({
    name: "",
    chit_value: "",
    monthly_installment: "",
    total_members: "",
    duration_months: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    organizer: "",
    note: ""
  });
  
  const [entryData, setEntryData] = useState({
    month_number: "",
    paid_amount: "",
    dividend_received: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash",
    note: ""
  });
  
  const [liftData, setLiftData] = useState({
    lifted_month: 1,
    lifted_amount: "",
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
        chit_value: parseFloat(formData.chit_value),
        monthly_installment: parseFloat(formData.monthly_installment),
        total_members: parseInt(formData.total_members),
        duration_months: parseInt(formData.duration_months)
      });
      toast.success("Chit Fund add ho gaya!");
      setShowModal(false);
      setFormData({ name: "", chit_value: "", monthly_installment: "", total_members: "", duration_months: "", start_date: format(new Date(), "yyyy-MM-dd"), organizer: "", note: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add chit fund");
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/chit-funds/${selectedChit.id}/monthly-entry`, {
        chit_id: selectedChit.id,
        month_number: parseInt(entryData.month_number),
        paid_amount: parseFloat(entryData.paid_amount),
        dividend_received: parseFloat(entryData.dividend_received),
        payment_date: entryData.payment_date,
        payment_mode: entryData.payment_mode,
        note: entryData.note
      });
      const profit = parseFloat(entryData.dividend_received);
      toast.success(`Month ${entryData.month_number} entry add ho gayi! Profit: ₹${profit.toLocaleString('en-IN')}`);
      setShowEntryModal(false);
      fetchData();
      if (showDetailModal) fetchChitDetail(selectedChit);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Entry add nahi hui");
    }
  };

  const handleLift = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds/${selectedChit.id}/lift?lifted_month=${liftData.lifted_month}&lifted_amount=${liftData.lifted_amount}&payment_mode=${liftData.payment_mode}`);
      toast.success("Chit Lifted! Amount Cash Book me add ho gaya!");
      setShowLiftModal(false);
      fetchData();
      if (showDetailModal) fetchChitDetail(selectedChit);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to lift chit");
    }
  };

  const fetchChitDetail = async (chit) => {
    setSelectedChit(chit);
    try {
      const res = await axios.get(`${API}/chit-funds/${chit.id}/summary`);
      setChitDetail(res.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error("Failed to fetch details");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/chit-monthly-entries/${entryId}`);
      toast.success("Entry deleted!");
      fetchChitDetail(selectedChit);
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

  const openEntryModal = async (chit) => {
    setSelectedChit(chit);
    // Fetch paid months for dropdown
    try {
      const res = await axios.get(`${API}/chit-funds/${chit.id}/paid-months`);
      setPaidMonths(res.data);
      // Auto-select first pending month
      const firstPending = res.data.pending_months?.[0] || 1;
      setEntryData({
        month_number: firstPending.toString(),
        paid_amount: chit.monthly_installment?.toString() || "",
        dividend_received: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_mode: "cash",
        note: ""
      });
    } catch (err) {
      console.error(err);
      setEntryData({
        month_number: "",
        paid_amount: chit.monthly_installment?.toString() || "",
        dividend_received: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_mode: "cash",
        note: ""
      });
    }
    setShowEntryModal(true);
  };

  const openLiftModal = (chit) => {
    setSelectedChit(chit);
    setLiftData({
      lifted_month: (chit.payments_count || 0) + 1,
      lifted_amount: chit.chit_value?.toString() || "",
      payment_mode: "bank_transfer"
    });
    setShowLiftModal(true);
  };

  // Calculate effective cost
  const calculateEffectiveCost = () => {
    const paid = parseFloat(entryData.paid_amount) || 0;
    const dividend = parseFloat(entryData.dividend_received) || 0;
    return paid - dividend;
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
          <div className="stat-box-label">Total Paid (भुगतान)</div>
          <div className="stat-box-value danger">₹{summary?.total_paid?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Dividend (लाभांश)</div>
          <div className="stat-box-value success">₹{summary?.total_dividend?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Net Profit (शुद्ध लाभ)</div>
          <div className={`stat-box-value ${summary?.is_profit ? 'success' : 'danger'}`}>
            {summary?.is_profit ? '+' : ''}₹{summary?.net_profit?.toLocaleString('en-IN') || 0}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-purple-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Chit Fund System - Kaise Kaam Karta Hai?</span>
        </div>
        <p className="text-sm text-purple-700 mt-1">
          <strong>Example:</strong> EMI ₹50,000 | Auction me ₹30,000 me gaya | Aapka Dividend = ₹20,000<br/>
          Har month auction amount enter karo → Dividend auto-calculate hoga. Jab uthao (lift karo), wo bhi track hoga.
        </p>
      </div>

      {/* Chits List */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">My Chit Funds (मेरे चिट फंड)</div>
        </div>
        <div className="data-card-body p-0">
          {chits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No chit funds yet. Add your first chit!</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Chit</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chit Name</th>
                  <th>Chit Value</th>
                  <th>Monthly EMI</th>
                  <th>Progress</th>
                  <th>Total Dividend</th>
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
                    <td className="font-bold text-purple-600">₹{(chit.chit_value || chit.total_amount)?.toLocaleString('en-IN')}</td>
                    <td>₹{chit.monthly_installment?.toLocaleString('en-IN')}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden" style={{minWidth: '60px'}}>
                          <div 
                            className="h-full bg-purple-500 rounded-full" 
                            style={{width: `${((chit.payments_count || 0) / chit.duration_months) * 100}%`}}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{chit.payments_count || 0}/{chit.duration_months}</span>
                      </div>
                      <div className="text-xs text-gray-500">Paid: ₹{chit.total_paid?.toLocaleString('en-IN') || 0}</div>
                    </td>
                    <td>
                      <div className="font-bold text-green-600">₹{chit.total_dividend?.toLocaleString('en-IN') || 0}</div>
                    </td>
                    <td>
                      {chit.is_lifted ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          LIFTED (Month {chit.lifted_month})
                        </span>
                      ) : chit.is_active ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Active</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">Completed</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openEntryModal(chit)} className="action-btn success text-xs px-2 py-1" title="Add Monthly Entry">
                          + Entry
                        </button>
                        {!chit.is_lifted && (
                          <button onClick={() => openLiftModal(chit)} className="action-btn warning text-xs px-2 py-1" title="Mark as Lifted">
                            Lift
                          </button>
                        )}
                        <button onClick={() => fetchChitDetail(chit)} className="text-blue-500 hover:text-blue-700" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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
              <div className="modal-title">Add Chit Fund (नया चिट फंड)</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chit Name *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Navkar Chit 10 Lakh" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Chit Value (₹) * <span className="text-gray-400 text-xs">(कुल राशि)</span></label>
                    <input type="number" className="form-control" value={formData.chit_value} onChange={(e) => setFormData({...formData, chit_value: e.target.value})} placeholder="1000000" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly EMI (₹) * <span className="text-gray-400 text-xs">(मासिक किस्त)</span></label>
                    <input type="number" className="form-control" value={formData.monthly_installment} onChange={(e) => setFormData({...formData, monthly_installment: e.target.value})} placeholder="50000" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Total Members * <span className="text-gray-400 text-xs">(कुल सदस्य)</span></label>
                    <input type="number" className="form-control" value={formData.total_members} onChange={(e) => setFormData({...formData, total_members: e.target.value})} placeholder="20" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Months) * <span className="text-gray-400 text-xs">(अवधि)</span></label>
                    <input type="number" className="form-control" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: e.target.value})} placeholder="20" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer (Company)</label>
                    <input type="text" className="form-control" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} placeholder="Chit company name" />
                  </div>
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

      {/* Add Monthly Entry Modal */}
      {showEntryModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="modal-title text-white">Monthly Entry - {selectedChit.name}</div>
              <button className="modal-close text-white" onClick={() => setShowEntryModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddEntry}>
              <div className="modal-body">
                <div className="bg-purple-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-purple-700">
                    <strong>Monthly EMI:</strong> ₹{selectedChit.monthly_installment?.toLocaleString('en-IN')} | 
                    <strong> Duration:</strong> {selectedChit.duration_months} months
                  </div>
                </div>
                
                {/* Month Dropdown */}
                <div className="form-group">
                  <label className="form-label">Month Select Karo * <span className="text-gray-400 text-xs">(महीना चुनो)</span></label>
                  <select 
                    className="form-control text-lg font-bold" 
                    value={entryData.month_number} 
                    onChange={(e) => setEntryData({...entryData, month_number: e.target.value})}
                    required
                  >
                    <option value="">-- Month Select Karo --</option>
                    {Array.from({ length: selectedChit.duration_months }, (_, i) => i + 1).map(month => {
                      const isPaid = paidMonths.paid_months?.includes(month);
                      return (
                        <option key={month} value={month} disabled={isPaid}>
                          Month {month} {isPaid ? '✓ (Paid)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">EMI Paid (₹) * <span className="text-gray-400 text-xs">(कितना दिया)</span></label>
                    <input type="number" className="form-control text-lg" value={entryData.paid_amount} onChange={(e) => setEntryData({...entryData, paid_amount: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Is Mahine Mila (₹) * <span className="text-gray-400 text-xs">(Profit/Dividend)</span></label>
                    <input 
                      type="number" 
                      className="form-control text-lg font-bold text-green-600" 
                      value={entryData.dividend_received} 
                      onChange={(e) => setEntryData({...entryData, dividend_received: e.target.value})} 
                      placeholder="e.g., 20000" 
                      required 
                    />
                  </div>
                </div>

                {/* Live Calculation */}
                {entryData.paid_amount && entryData.dividend_received && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-500">EMI Paid</div>
                        <div className="text-lg font-bold text-red-600">₹{parseFloat(entryData.paid_amount).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Mila (Profit)</div>
                        <div className="text-lg font-bold text-green-600">₹{parseFloat(entryData.dividend_received).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Effective Cost</div>
                        <div className="text-lg font-bold text-purple-600">₹{calculateEffectiveCost().toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input type="date" className="form-control" value={entryData.payment_date} onChange={(e) => setEntryData({...entryData, payment_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select className="form-control" value={entryData.payment_mode} onChange={(e) => setEntryData({...entryData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mt-4">
                  EMI automatically Cash Book me Debit hogi.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEntryModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Add Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lift Chit Modal */}
      {showLiftModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowLiftModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <div className="modal-title text-white">Chit Uthao (Lift) - {selectedChit.name}</div>
              <button className="modal-close text-white" onClick={() => setShowLiftModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleLift}>
              <div className="modal-body">
                <div className="text-center py-4">
                  <div className="text-5xl mb-2">🎯</div>
                  <div className="text-lg font-bold text-orange-600">Chit Lift Karo!</div>
                  <p className="text-sm text-gray-500">Jis month me aapne uthaya, wo amount enter karo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Lifted in Month * <span className="text-gray-400 text-xs">(कौन से महीने)</span></label>
                    <input type="number" className="form-control" value={liftData.lifted_month} onChange={(e) => setLiftData({...liftData, lifted_month: parseInt(e.target.value)})} min="1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹) * <span className="text-gray-400 text-xs">(कितना मिला)</span></label>
                    <input type="number" className="form-control" value={liftData.lifted_amount} onChange={(e) => setLiftData({...liftData, lifted_amount: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode *</label>
                  <select className="form-control" value={liftData.payment_mode} onChange={(e) => setLiftData({...liftData, payment_mode: e.target.value})}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  Ye amount Cash Book me Credit ho jayega.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowLiftModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-warning">Confirm Lift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chit Detail Modal with Full Summary */}
      {showDetailModal && chitDetail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
            <div className="modal-header">
              <div className="modal-title">{chitDetail.chit?.name} - Full Summary</div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body p-0">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500">Total Paid (भुगतान)</div>
                  <div className="text-lg font-bold text-red-600">₹{chitDetail.summary?.total_paid?.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500">Total Dividend (लाभांश)</div>
                  <div className="text-lg font-bold text-green-600">₹{chitDetail.summary?.total_dividend?.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500">Lifted Amount (उठाया)</div>
                  <div className="text-lg font-bold text-blue-600">
                    {chitDetail.summary?.is_lifted ? `₹${chitDetail.summary?.lifted_amount?.toLocaleString('en-IN')}` : 'Not Yet'}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500">Net Profit (शुद्ध लाभ)</div>
                  <div className={`text-xl font-bold ${chitDetail.summary?.is_profit ? 'text-green-600' : 'text-red-600'}`}>
                    {chitDetail.summary?.is_profit ? '+' : ''}₹{chitDetail.summary?.net_profit?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Remaining Info */}
              {chitDetail.summary?.remaining_months > 0 && (
                <div className="p-4 bg-yellow-50 border-b">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700">Remaining: {chitDetail.summary?.remaining_months} months</span>
                    <span className="font-bold text-yellow-700">₹{chitDetail.summary?.remaining_amount?.toLocaleString('en-IN')} more to pay</span>
                  </div>
                </div>
              )}

              {/* Monthly Entries Table */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-700">Monthly Entries (महीनावार विवरण)</h3>
                  <button onClick={() => openEntryModal(selectedChit)} className="action-btn success text-xs">+ Add Entry</button>
                </div>
                
                {chitDetail.entries?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No entries yet. Add your first monthly entry!</div>
                ) : (
                  <div className="overflow-auto max-h-72">
                    <table className="data-table">
                      <thead className="sticky top-0 bg-white">
                        <tr>
                          <th>Month</th>
                          <th>Date</th>
                          <th className="text-right">EMI Paid</th>
                          <th className="text-right text-green-600">Mila (Profit)</th>
                          <th className="text-right">Effective Cost</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chitDetail.entries.map((entry, idx) => {
                          const dividend = entry.dividend_received || entry.dividend || 0;
                          const netCost = entry.paid_amount - dividend;
                          return (
                            <tr key={entry.id || idx}>
                              <td className="font-bold">Month {entry.month_number}</td>
                              <td>{format(new Date(entry.payment_date), "dd-MM-yyyy")}</td>
                              <td className="text-right text-red-600 font-medium">₹{entry.paid_amount?.toLocaleString('en-IN')}</td>
                              <td className="text-right text-green-600 font-bold">₹{dividend?.toLocaleString('en-IN')}</td>
                              <td className="text-right font-medium">₹{netCost?.toLocaleString('en-IN')}</td>
                              <td>
                                <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:text-red-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan="2">Total</td>
                          <td className="text-right text-red-600">₹{chitDetail.summary?.total_paid?.toLocaleString('en-IN')}</td>
                          <td className="text-right text-green-600">₹{chitDetail.summary?.total_dividend?.toLocaleString('en-IN')}</td>
                          <td className="text-right">₹{(chitDetail.summary?.total_paid - chitDetail.summary?.total_dividend)?.toLocaleString('en-IN')}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Final Summary Box */}
              {chitDetail.summary?.is_lifted && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t">
                  <div className="text-center">
                    <div className="text-sm text-green-600 mb-1">Chit Completed - Final Calculation</div>
                    <div className="text-lg font-bold">
                      Total Received (Lift + Dividend) = ₹{(chitDetail.summary?.lifted_amount + chitDetail.summary?.total_dividend)?.toLocaleString('en-IN')}
                    </div>
                    <div className="text-lg">
                      Total Paid = ₹{chitDetail.summary?.total_paid?.toLocaleString('en-IN')}
                    </div>
                    <div className={`text-2xl font-bold mt-2 ${chitDetail.summary?.is_profit ? 'text-green-600' : 'text-red-600'}`}>
                      Net {chitDetail.summary?.is_profit ? 'Profit' : 'Loss'}: ₹{Math.abs(chitDetail.summary?.net_profit)?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitFund;

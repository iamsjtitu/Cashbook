import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ChitFund = () => {
  const [chits, setChits] = useState([]);
  const [selectedChit, setSelectedChit] = useState(null);
  const [chitSummary, setChitSummary] = useState(null);
  const [paidMonths, setPaidMonths] = useState({ paid_months: [], pending_months: [], duration_months: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddChitModal, setShowAddChitModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);
  
  const [chitFormData, setChitFormData] = useState({
    name: "",
    chit_value: "",
    monthly_installment: "",
    total_members: "",
    duration_months: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    organizer: ""
  });
  
  const [entryData, setEntryData] = useState({
    month_number: "",
    paid_amount: "",
    dividend_received: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash"
  });
  
  const [liftData, setLiftData] = useState({
    lifted_month: 1,
    lifted_amount: "",
    payment_mode: "bank_transfer"
  });

  useEffect(() => { fetchChits(); }, []);
  
  useEffect(() => { 
    if (selectedChit) {
      fetchChitData();
    }
  }, [selectedChit]);

  const fetchChits = async () => {
    try {
      const res = await axios.get(`${API}/chit-funds`);
      setChits(res.data);
      if (res.data.length > 0 && !selectedChit) {
        setSelectedChit(res.data[0]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChitData = async () => {
    if (!selectedChit) return;
    try {
      const [summaryRes, paidRes] = await Promise.all([
        axios.get(`${API}/chit-funds/${selectedChit.id}/summary`),
        axios.get(`${API}/chit-funds/${selectedChit.id}/paid-months`)
      ]);
      setChitSummary(summaryRes.data);
      setPaidMonths(paidRes.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddChit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/chit-funds`, {
        ...chitFormData,
        chit_value: parseFloat(chitFormData.chit_value),
        monthly_installment: parseFloat(chitFormData.monthly_installment),
        total_members: parseInt(chitFormData.total_members),
        duration_months: parseInt(chitFormData.duration_months)
      });
      toast.success("Chit Fund add ho gaya!");
      setShowAddChitModal(false);
      setChitFormData({ name: "", chit_value: "", monthly_installment: "", total_members: "", duration_months: "", start_date: format(new Date(), "yyyy-MM-dd"), organizer: "" });
      fetchChits();
      setSelectedChit(res.data);
    } catch (error) {
      toast.error("Failed to add chit fund");
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds/${selectedChit.id}/monthly-entry`, {
        chit_id: selectedChit.id,
        month_number: parseInt(entryData.month_number),
        paid_amount: parseFloat(entryData.paid_amount),
        dividend_received: parseFloat(entryData.dividend_received),
        payment_date: entryData.payment_date,
        payment_mode: entryData.payment_mode
      });
      toast.success(`Month ${entryData.month_number} entry add ho gayi!`);
      setShowEntryModal(false);
      fetchChitData();
      fetchChits();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Entry add nahi hui");
    }
  };

  const handleLift = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chit-funds/${selectedChit.id}/lift?lifted_month=${liftData.lifted_month}&lifted_amount=${liftData.lifted_amount}&payment_mode=${liftData.payment_mode}`);
      toast.success("Chit Lifted! Amount Cash Book me credit ho gaya!");
      setShowLiftModal(false);
      fetchChitData();
      fetchChits();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Lift nahi hua");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/chit-monthly-entries/${entryId}`);
      toast.success("Entry delete ho gayi!");
      fetchChitData();
      fetchChits();
    } catch (error) {
      toast.error("Delete nahi hua");
    }
  };

  const handleDeleteChit = async () => {
    if (!window.confirm("Delete this chit fund?")) return;
    try {
      await axios.delete(`${API}/chit-funds/${selectedChit.id}`);
      toast.success("Chit fund delete ho gaya!");
      setSelectedChit(null);
      fetchChits();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Delete nahi hua");
    }
  };

  const openEntryModal = () => {
    const firstPending = paidMonths.pending_months?.[0] || 1;
    setEntryData({
      month_number: firstPending.toString(),
      paid_amount: selectedChit?.monthly_installment?.toString() || "",
      dividend_received: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash"
    });
    setShowEntryModal(true);
  };

  const openLiftModal = () => {
    setLiftData({
      lifted_month: (chitSummary?.summary?.months_completed || 0) + 1,
      lifted_amount: selectedChit?.chit_value?.toString() || "",
      payment_mode: "bank_transfer"
    });
    setShowLiftModal(true);
  };

  const calculateEffectiveCost = () => {
    const paid = parseFloat(entryData.paid_amount) || 0;
    const dividend = parseFloat(entryData.dividend_received) || 0;
    return paid - dividend;
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="chitfund-page">
      {/* Action Bar - Like Cash Book */}
      <div className="action-bar">
        {/* Chit Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger" data-testid="chit-selector">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">{selectedChit?.name || "Select Chit"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border min-w-[250px]">
            {chits.map((chit) => (
              <DropdownMenuItem 
                key={chit.id} 
                onClick={() => setSelectedChit(chit)}
                className={`cursor-pointer hover:bg-gray-50 px-3 py-2 ${chit.id === selectedChit?.id ? 'bg-purple-50 text-purple-600' : ''}`}
              >
                <div className="flex justify-between items-center w-full">
                  <span>{chit.name}</span>
                  <span className="text-xs text-gray-500">₹{(chit.chit_value || chit.total_amount)?.toLocaleString('en-IN')}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <div className="border-t my-1"></div>
            <DropdownMenuItem 
              onClick={() => setShowAddChitModal(true)}
              className="cursor-pointer hover:bg-green-50 px-3 py-2 text-green-600 font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Chit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedChit && (
          <>
            <button onClick={openEntryModal} className="action-btn success" data-testid="add-entry-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Entry
            </button>

            {!chitSummary?.summary?.is_lifted && (
              <button onClick={openLiftModal} className="action-btn warning" data-testid="lift-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Lift Chit
              </button>
            )}

            <button onClick={handleDeleteChit} className="action-btn outline-danger" data-testid="delete-chit-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        )}
      </div>

      {!selectedChit ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg mb-4">No Chit Fund Selected</p>
          <button onClick={() => setShowAddChitModal(true)} className="btn btn-primary">Add First Chit Fund</button>
        </div>
      ) : (
        <>
          {/* Summary Cards - Like Cash Book */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-box-label">Monthly EMI</div>
              <div className="stat-box-value primary">₹{selectedChit?.monthly_installment?.toLocaleString('en-IN')}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Total Paid (भुगतान)</div>
              <div className="stat-box-value danger">₹{chitSummary?.summary?.total_paid?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Total Mila (लाभांश)</div>
              <div className="stat-box-value success">₹{chitSummary?.summary?.total_dividend?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Net Profit (शुद्ध लाभ)</div>
              <div className={`stat-box-value ${chitSummary?.summary?.is_profit ? 'success' : 'danger'}`}>
                {chitSummary?.summary?.is_profit ? '+' : ''}₹{chitSummary?.summary?.net_profit?.toLocaleString('en-IN') || 0}
              </div>
            </div>
          </div>

          {/* Chit Info Bar */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="text-sm text-purple-600">Chit Value</div>
                <div className="text-xl font-bold text-purple-700">₹{(selectedChit?.chit_value || selectedChit?.total_amount)?.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-sm text-purple-600">Members</div>
                <div className="text-xl font-bold text-purple-700">{selectedChit?.total_members}</div>
              </div>
              <div>
                <div className="text-sm text-purple-600">Progress</div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all" 
                      style={{width: `${((chitSummary?.summary?.months_completed || 0) / selectedChit?.duration_months) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-purple-700">{chitSummary?.summary?.months_completed || 0}/{selectedChit?.duration_months}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-purple-600">Status</div>
                <div className="text-xl font-bold">
                  {chitSummary?.summary?.is_lifted ? (
                    <span className="text-green-600">LIFTED (Month {chitSummary?.summary?.lifted_month})</span>
                  ) : (
                    <span className="text-blue-600">Active</span>
                  )}
                </div>
              </div>
              {chitSummary?.summary?.is_lifted && (
                <div>
                  <div className="text-sm text-green-600">Lifted Amount</div>
                  <div className="text-xl font-bold text-green-700">₹{chitSummary?.summary?.lifted_amount?.toLocaleString('en-IN')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Entries Table - Like Cash Book Transactions */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="data-card-title">Monthly Entries - {selectedChit?.name}</div>
              <div className="text-sm text-gray-500">
                Remaining: {chitSummary?.summary?.remaining_months || 0} months (₹{chitSummary?.summary?.remaining_amount?.toLocaleString('en-IN') || 0})
              </div>
            </div>
            <div className="data-card-body p-0">
              {!chitSummary?.entries?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No entries yet</p>
                  <button onClick={openEntryModal} className="btn btn-primary mt-3">Add First Entry</button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th className="text-right text-red-600">EMI Paid</th>
                      <th className="text-right text-green-600">Mila (Profit)</th>
                      <th className="text-right">Effective Cost</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chitSummary.entries.map((entry, idx) => {
                      const dividend = entry.dividend_received || entry.dividend || 0;
                      const effectiveCost = entry.paid_amount - dividend;
                      return (
                        <tr key={entry.id || idx}>
                          <td className="font-bold text-purple-600">Month {entry.month_number}</td>
                          <td className="text-gray-500">{format(new Date(entry.payment_date), "dd-MM-yyyy")}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : entry.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {entry.payment_mode === 'bank_transfer' ? 'Bank' : entry.payment_mode?.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right font-bold text-red-600">₹{entry.paid_amount?.toLocaleString('en-IN')}</td>
                          <td className="text-right font-bold text-green-600">₹{dividend?.toLocaleString('en-IN')}</td>
                          <td className="text-right font-medium">₹{effectiveCost?.toLocaleString('en-IN')}</td>
                          <td>
                            <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:text-red-700" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan="3" className="text-right">Total</td>
                      <td className="text-right text-red-600">₹{chitSummary?.summary?.total_paid?.toLocaleString('en-IN')}</td>
                      <td className="text-right text-green-600">₹{chitSummary?.summary?.total_dividend?.toLocaleString('en-IN')}</td>
                      <td className="text-right">₹{(chitSummary?.summary?.total_paid - chitSummary?.summary?.total_dividend)?.toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Final Summary if Lifted */}
          {chitSummary?.summary?.is_lifted && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mt-4">
              <div className="text-center">
                <div className="text-lg text-green-600 mb-2 font-medium">Chit Completed - Final Summary</div>
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div>
                    <div className="text-sm text-gray-500">Total Paid</div>
                    <div className="text-xl font-bold text-red-600">₹{chitSummary?.summary?.total_paid?.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Received</div>
                    <div className="text-xl font-bold text-blue-600">₹{(chitSummary?.summary?.lifted_amount + chitSummary?.summary?.total_dividend)?.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Net Profit</div>
                    <div className={`text-2xl font-bold ${chitSummary?.summary?.is_profit ? 'text-green-600' : 'text-red-600'}`}>
                      {chitSummary?.summary?.is_profit ? '+' : ''}₹{chitSummary?.summary?.net_profit?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Chit Modal */}
      {showAddChitModal && (
        <div className="modal-overlay" onClick={() => setShowAddChitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Chit Fund</div>
              <button className="modal-close" onClick={() => setShowAddChitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddChit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chit Name *</label>
                  <input type="text" className="form-control" value={chitFormData.name} onChange={(e) => setChitFormData({...chitFormData, name: e.target.value})} placeholder="e.g., Navkar Chit 10 Lakh" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Chit Value (₹) *</label>
                    <input type="number" className="form-control" value={chitFormData.chit_value} onChange={(e) => setChitFormData({...chitFormData, chit_value: e.target.value})} placeholder="1000000" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly EMI (₹) *</label>
                    <input type="number" className="form-control" value={chitFormData.monthly_installment} onChange={(e) => setChitFormData({...chitFormData, monthly_installment: e.target.value})} placeholder="50000" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Total Members *</label>
                    <input type="number" className="form-control" value={chitFormData.total_members} onChange={(e) => setChitFormData({...chitFormData, total_members: e.target.value})} placeholder="20" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Months) *</label>
                    <input type="number" className="form-control" value={chitFormData.duration_months} onChange={(e) => setChitFormData({...chitFormData, duration_months: e.target.value})} placeholder="20" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-control" value={chitFormData.start_date} onChange={(e) => setChitFormData({...chitFormData, start_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer (Company)</label>
                    <input type="text" className="form-control" value={chitFormData.organizer} onChange={(e) => setChitFormData({...chitFormData, organizer: e.target.value})} placeholder="Chit company name" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddChitModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Add Chit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showEntryModal && selectedChit && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="modal-title text-white">Add Monthly Entry</div>
              <button className="modal-close text-white" onClick={() => setShowEntryModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddEntry}>
              <div className="modal-body">
                {/* Month Dropdown */}
                <div className="form-group">
                  <label className="form-label">Month Select Karo *</label>
                  <select 
                    className="form-control text-lg font-bold" 
                    value={entryData.month_number} 
                    onChange={(e) => setEntryData({...entryData, month_number: e.target.value})}
                    required
                  >
                    <option value="">-- Select Month --</option>
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
                    <label className="form-label">EMI Paid (₹) *</label>
                    <input type="number" className="form-control text-lg" value={entryData.paid_amount} onChange={(e) => setEntryData({...entryData, paid_amount: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Is Mahine Mila (₹) *</label>
                    <input 
                      type="number" 
                      className="form-control text-lg font-bold text-green-600" 
                      value={entryData.dividend_received} 
                      onChange={(e) => setEntryData({...entryData, dividend_received: e.target.value})} 
                      placeholder="Profit/Dividend" 
                      required 
                    />
                  </div>
                </div>

                {/* Live Calculation */}
                {entryData.paid_amount && entryData.dividend_received && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
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
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-control" value={entryData.payment_date} onChange={(e) => setEntryData({...entryData, payment_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={entryData.payment_mode} onChange={(e) => setEntryData({...entryData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
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
              <div className="modal-title text-white">Chit Uthao (Lift)</div>
              <button className="modal-close text-white" onClick={() => setShowLiftModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleLift}>
              <div className="modal-body">
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎯</div>
                  <p className="text-gray-500">Jis month me aapne uthaya, wo details enter karo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Lifted in Month *</label>
                    <input type="number" className="form-control" value={liftData.lifted_month} onChange={(e) => setLiftData({...liftData, lifted_month: parseInt(e.target.value)})} min="1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹) *</label>
                    <input type="number" className="form-control" value={liftData.lifted_amount} onChange={(e) => setLiftData({...liftData, lifted_amount: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
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
    </div>
  );
};

export default ChitFund;

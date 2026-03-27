import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VOUCHER_TYPES = [
  { value: "payment", label: "Payment Voucher", icon: "💸", desc: "Cash/Bank payment to party" },
  { value: "receipt", label: "Receipt Voucher", icon: "💰", desc: "Cash/Bank receipt from party" },
  { value: "journal", label: "Journal Voucher", icon: "📝", desc: "Non-cash adjustments" },
  { value: "contra", label: "Contra Voucher", icon: "🔄", desc: "Cash to Bank or vice versa" },
  { value: "sales", label: "Sales Voucher", icon: "🛒", desc: "Sales entry" },
  { value: "purchase", label: "Purchase Voucher", icon: "📦", desc: "Purchase entry" }
];

const JournalEntry = () => {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    voucher_type: "payment",
    narration: "",
    entries: [
      { account_id: "", debit_amount: 0, credit_amount: 0 },
      { account_id: "", debit_amount: 0, credit_amount: 0 }
    ]
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [accRes, entriesRes] = await Promise.all([
        axios.get(`${API}/accounts`),
        axios.get(`${API}/journal-entries`)
      ]);
      setAccounts(accRes.data);
      setEntries(entriesRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { account_id: "", debit_amount: 0, credit_amount: 0 }]
    });
  };

  const removeLine = (index) => {
    if (formData.entries.length <= 2) return;
    setFormData({
      ...formData,
      entries: formData.entries.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index, field, value) => {
    const newEntries = [...formData.entries];
    newEntries[index][field] = field.includes('amount') ? parseFloat(value) || 0 : value;
    
    // Auto-clear opposite side when entering amount
    if (field === 'debit_amount' && value > 0) {
      newEntries[index].credit_amount = 0;
    } else if (field === 'credit_amount' && value > 0) {
      newEntries[index].debit_amount = 0;
    }
    
    setFormData({ ...formData, entries: newEntries });
  };

  const getTotals = () => {
    const totalDebit = formData.entries.reduce((sum, e) => sum + (e.debit_amount || 0), 0);
    const totalCredit = formData.entries.reduce((sum, e) => sum + (e.credit_amount || 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isBalanced, totalDebit, totalCredit } = getTotals();
    
    if (!isBalanced) {
      toast.error(`Debit (₹${totalDebit}) और Credit (₹${totalCredit}) बराबर होना चाहिए!`);
      return;
    }
    
    // Filter out empty lines
    const validEntries = formData.entries.filter(e => e.account_id && (e.debit_amount > 0 || e.credit_amount > 0));
    if (validEntries.length < 2) {
      toast.error("कम से कम 2 valid entries होनी चाहिए!");
      return;
    }
    
    try {
      await axios.post(`${API}/journal-entries`, {
        ...formData,
        entries: validEntries
      });
      toast.success("Voucher saved successfully!");
      setShowModal(false);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        voucher_type: "payment",
        narration: "",
        entries: [
          { account_id: "", debit_amount: 0, credit_amount: 0 },
          { account_id: "", debit_amount: 0, credit_amount: 0 }
        ]
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save voucher");
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Delete this voucher?")) return;
    try {
      await axios.delete(`${API}/journal-entries/${entryId}`);
      toast.success("Voucher deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || "Unknown";
  const { totalDebit, totalCredit, isBalanced } = getTotals();

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="journal-entry-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-voucher-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          New Voucher Entry
        </button>
      </div>

      {/* Voucher Type Quick Select */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {VOUCHER_TYPES.map(vt => (
          <div key={vt.value} onClick={() => { setFormData({...formData, voucher_type: vt.value}); setShowModal(true); }}
            className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition text-center">
            <div className="text-2xl">{vt.icon}</div>
            <div className="text-xs font-medium">{vt.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Vouchers */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Recent Vouchers</div>
        </div>
        <div className="data-card-body p-0">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No vouchers yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Create First Voucher</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher No</th>
                  <th>Type</th>
                  <th>Narration</th>
                  <th className="text-right">Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map((entry) => {
                  const amount = entry.entries?.reduce((sum, e) => sum + (e.debit_amount || 0), 0) || 0;
                  const voucherType = VOUCHER_TYPES.find(v => v.value === entry.voucher_type);
                  return (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td><span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{entry.voucher_no}</span></td>
                      <td>
                        <span className="flex items-center gap-1">
                          <span>{voucherType?.icon}</span>
                          <span className="text-sm">{voucherType?.label || entry.voucher_type}</span>
                        </span>
                      </td>
                      <td className="font-medium">{entry.narration}</td>
                      <td className="text-right font-bold">₹{amount.toLocaleString('en-IN')}</td>
                      <td>
                        <button onClick={() => handleDelete(entry.id)} className="text-red-500 hover:text-red-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Voucher Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px'}}>
            <div className="modal-header">
              <div className="modal-title flex items-center gap-2">
                {VOUCHER_TYPES.find(v => v.value === formData.voucher_type)?.icon}
                {VOUCHER_TYPES.find(v => v.value === formData.voucher_type)?.label || "Voucher Entry"}
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="form-control text-left">
                          {format(new Date(formData.date), "dd-MM-yyyy")}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="start">
                        <Calendar mode="single" selected={new Date(formData.date)} onSelect={(date) => { if(date) { setFormData({...formData, date: format(date, "yyyy-MM-dd")}); setDatePickerOpen(false); }}} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Voucher Type *</label>
                    <select className="form-control" value={formData.voucher_type} onChange={(e) => setFormData({...formData, voucher_type: e.target.value})}>
                      {VOUCHER_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Narration *</label>
                    <input type="text" className="form-control" value={formData.narration} onChange={(e) => setFormData({...formData, narration: e.target.value})} placeholder="Description" required />
                  </div>
                </div>

                {/* Entry Lines */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left text-sm">Account</th>
                        <th className="p-2 text-right text-sm w-32">Debit (Dr)</th>
                        <th className="p-2 text-right text-sm w-32">Credit (Cr)</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.entries.map((entry, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <select className="form-control text-sm" value={entry.account_id} onChange={(e) => updateLine(idx, 'account_id', e.target.value)}>
                              <option value="">-- Select Account --</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code ? `${acc.code} - ` : ''}{acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" className="form-control text-sm text-right" value={entry.debit_amount || ''} onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)} placeholder="0" min="0" />
                          </td>
                          <td className="p-2">
                            <input type="number" className="form-control text-sm text-right" value={entry.credit_amount || ''} onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)} placeholder="0" min="0" />
                          </td>
                          <td className="p-2">
                            {formData.entries.length > 2 && (
                              <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td className="p-2 text-right">Total</td>
                        <td className={`p-2 text-right ${!isBalanced ? 'text-red-600' : ''}`}>₹{totalDebit.toLocaleString('en-IN')}</td>
                        <td className={`p-2 text-right ${!isBalanced ? 'text-red-600' : ''}`}>₹{totalCredit.toLocaleString('en-IN')}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <button type="button" onClick={addLine} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Line
                </button>

                {!isBalanced && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <strong>Difference:</strong> ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')} - Debit और Credit बराबर होने चाहिए!
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success" disabled={!isBalanced}>Save Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntry;

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportCashBookPDF, exportCashBookExcel } from "@/utils/exportUtils";

const CashBook = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateRange, setDateRange] = useState("today"); // today, week, month, all
  const [transactions, setTransactions] = useState([]);
  const [parties, setParties] = useState([]);
  const [allParties, setAllParties] = useState([]); // For filter dropdown (includes parents)
  const [filterPartyId, setFilterPartyId] = useState(""); // Party filter
  const [summary, setSummary] = useState({ opening: 0, credit: 0, debit: 0, closing: 0 });
  const [loading, setLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showNewPartyInput, setShowNewPartyInput] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  
  // Entry Form State (always visible on page)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    transaction_type: "credit",
    amount: "",
    party_id: "",
    party_name: "", // For new party
    payment_mode: "cash",
    category: "",
    description: ""
  });

  const expenseCategories = [
    { value: "", label: "-- No Category --" },
    { value: "salary", label: "Salary (वेतन)" },
    { value: "rent", label: "Rent (किराया)" },
    { value: "electricity", label: "Electricity (बिजली)" },
    { value: "supplies", label: "Supplies (सामान)" },
    { value: "transport", label: "Transport (यातायात)" },
    { value: "food", label: "Food (खाना)" },
    { value: "maintenance", label: "Maintenance (मरम्मत)" },
    { value: "chit_fund", label: "Chit Fund (चिट फंड)" },
    { value: "interest", label: "Interest/Byaj (ब्याज)" },
    { value: "other", label: "Other (अन्य)" }
  ];

  useEffect(() => { fetchData(); }, [selectedDate, dateRange, filterPartyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch leaf parties (for entry form) and all parties (for filter)
      const [leafRes, allRes] = await Promise.all([
        axios.get(`${API}/parties/leaf`),
        axios.get(`${API}/parties`)
      ]);
      setParties(leafRes.data);
      setAllParties(allRes.data);
      
      // Fetch transactions based on date range
      let txnRes;
      if (dateRange === "today") {
        txnRes = await axios.get(`${API}/cashbook/${selectedDate}`);
        let todayTxns = txnRes.data.transactions || [];
        
        // Apply party filter if selected
        if (filterPartyId) {
          todayTxns = todayTxns.filter(t => t.party_id === filterPartyId);
        }
        
        setTransactions(todayTxns);
        
        // Recalculate summary based on filtered transactions
        const credit = todayTxns.filter(t => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
        const debit = todayTxns.filter(t => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0);
        setSummary({
          opening: txnRes.data.opening_balance || 0,
          credit,
          debit,
          closing: (txnRes.data.opening_balance || 0) + credit - debit
        });
      } else {
        // For week/month/all, fetch from monthly API or all transactions
        const month = format(new Date(selectedDate), "yyyy-MM");
        txnRes = await axios.get(`${API}/cashbook/monthly/${month}`);
        let allTxns = txnRes.data.transactions || [];
        
        // Filter based on range
        let filtered = allTxns;
        if (dateRange === "week") {
          const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
          filtered = allTxns.filter(t => t.date >= weekAgo);
        }
        
        // Apply party filter if selected
        if (filterPartyId) {
          filtered = filtered.filter(t => t.party_id === filterPartyId);
        }
        
        setTransactions(filtered);
        const credit = filtered.filter(t => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
        const debit = filtered.filter(t => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0);
        setSummary({
          opening: txnRes.data.opening_balance || 0,
          credit,
          debit,
          closing: (txnRes.data.opening_balance || 0) + credit - debit
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let partyId = formData.party_id;
      
      // If new party name entered, create party first
      if (showNewPartyInput && newPartyName.trim()) {
        const partyRes = await axios.post(`${API}/parties`, {
          name: newPartyName.trim(),
          phone: "",
          address: "",
          opening_balance: 0,
          balance_type: formData.transaction_type === "credit" ? "credit" : "debit"
        });
        partyId = partyRes.data.id;
        toast.success(`Party "${newPartyName}" create ho gayi!`);
      }
      
      // Create transaction
      await axios.post(`${API}/transactions`, {
        date: formData.date,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        party_id: partyId || null,
        payment_mode: formData.payment_mode,
        category: formData.category || null,
        description: formData.description
      });
      
      toast.success(`${formData.transaction_type === 'credit' ? 'Credit' : 'Debit'} entry add ho gayi!`);
      
      // Reset form
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        transaction_type: "credit",
        amount: "",
        party_id: "",
        party_name: "",
        payment_mode: "cash",
        category: "",
        description: ""
      });
      setShowNewPartyInput(false);
      setNewPartyName("");
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Entry add nahi hui");
    }
  };

  const handleDelete = async (txnId) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/transactions/${txnId}`);
      toast.success("Entry delete ho gayi!");
      fetchData();
    } catch (error) {
      toast.error("Delete nahi hua");
    }
  };

  const getPartyName = (partyId) => {
    if (!partyId) return "-";
    const party = parties.find(p => p.id === partyId);
    return party?.name || "-";
  };

  const paymentModeLabels = { cash: "Cash", upi: "UPI", bank_transfer: "Bank" };
  const categoryLabels = expenseCategories.reduce((acc, c) => { acc[c.value] = c.label; return acc; }, {});

  return (
    <div className="animate-fade-in" data-testid="cashbook-page">
      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Opening Balance</div>
          <div className="stat-box-value primary">₹{summary.opening?.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Credit (Jama)</div>
          <div className="stat-box-value success">₹{summary.credit?.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Total Debit (Udhar)</div>
          <div className="stat-box-value danger">₹{summary.debit?.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Closing Balance</div>
          <div className={`stat-box-value ${summary.closing >= 0 ? 'success' : 'danger'}`}>
            ₹{summary.closing?.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Main Content: Entry Form + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left: Entry Form (Always Visible) */}
        <div className="lg:col-span-1">
          <div className="data-card sticky top-4">
            <div className="data-card-header bg-gradient-to-r from-blue-500 to-purple-500">
              <div className="data-card-title text-white">New Entry (नई एंट्री)</div>
            </div>
            <div className="data-card-body">
              <form onSubmit={handleSubmit}>
                {/* Type Toggle */}
                <div className="form-group">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, transaction_type: "credit"})}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold text-lg transition ${formData.transaction_type === 'credit' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}
                    >
                      + Credit (Jama)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, transaction_type: "debit"})}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold text-lg transition ${formData.transaction_type === 'debit' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}
                    >
                      - Debit (Udhar)
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input 
                    type="number" 
                    className={`form-control text-2xl font-bold text-center ${formData.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                    placeholder="0" 
                    required 
                    min="1"
                  />
                </div>

                {/* Party Selection */}
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label mb-0">Party (पार्टी)</label>
                    <button 
                      type="button" 
                      onClick={() => setShowNewPartyInput(!showNewPartyInput)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showNewPartyInput ? "Select Existing" : "+ New Party"}
                    </button>
                  </div>
                  
                  {showNewPartyInput ? (
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newPartyName}
                      onChange={(e) => setNewPartyName(e.target.value)}
                      placeholder="Enter new party name"
                    />
                  ) : (
                    <select 
                      className="form-control" 
                      value={formData.party_id} 
                      onChange={(e) => setFormData({...formData, party_id: e.target.value})}
                    >
                      <option value="">-- No Party --</option>
                      {parties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{Math.abs(p.current_balance || 0).toLocaleString('en-IN')} {(p.current_balance || 0) >= 0 ? 'DR' : 'CR'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Category (for expenses) */}
                {formData.transaction_type === "debit" && (
                  <div className="form-group">
                    <label className="form-label">Category (श्रेणी)</label>
                    <select 
                      className="form-control" 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {expenseCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Payment Mode */}
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'upi', 'bank_transfer'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFormData({...formData, payment_mode: mode})}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition ${formData.payment_mode === mode ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {paymentModeLabels[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Enter details"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className={`w-full py-3 rounded-lg font-bold text-lg text-white transition ${formData.transaction_type === 'credit' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {formData.transaction_type === 'credit' ? '+ Add Credit Entry' : '- Add Debit Entry'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right: Transactions List */}
        <div className="lg:col-span-2">
          <div className="data-card">
            <div className="data-card-header">
              <div className="data-card-title">Transactions (लेन-देन)</div>
              <div className="flex gap-2 items-center flex-wrap">
                {/* Party Filter */}
                <select 
                  className="form-control w-auto text-sm py-1"
                  value={filterPartyId}
                  onChange={(e) => setFilterPartyId(e.target.value)}
                  data-testid="party-filter"
                >
                  <option value="">All Parties</option>
                  {allParties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Date Range Filter */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'Week' },
                    { key: 'month', label: 'Month' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setDateRange(opt.key)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition ${dateRange === opt.key ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                
                {/* Date Picker */}
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="dropdown-trigger">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">{format(new Date(selectedDate), "dd MMM")}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="end">
                    <Calendar 
                      mode="single" 
                      selected={new Date(selectedDate)} 
                      onSelect={(date) => { if(date) { setSelectedDate(format(date, "yyyy-MM-dd")); setDatePickerOpen(false); }}} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>

                {/* Export Buttons */}
                <button 
                  onClick={() => {
                    const rangeLabel = dateRange === 'today' ? format(new Date(selectedDate), 'dd-MM-yyyy') : dateRange === 'week' ? 'Last 7 Days' : format(new Date(selectedDate), 'MMMM yyyy');
                    exportCashBookExcel(transactions, rangeLabel);
                    toast.success("Excel downloaded!");
                  }}
                  className="btn btn-secondary text-sm"
                  data-testid="cashbook-excel-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Excel
                </button>
                <button 
                  onClick={() => {
                    const rangeLabel = dateRange === 'today' ? format(new Date(selectedDate), 'dd-MM-yyyy') : dateRange === 'week' ? 'Last 7 Days' : format(new Date(selectedDate), 'MMMM yyyy');
                    exportCashBookPDF(transactions, rangeLabel, { credit: summary.credit, debit: summary.debit });
                    toast.success("PDF downloaded!");
                  }}
                  className="btn btn-secondary text-sm"
                  data-testid="cashbook-pdf-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  PDF
                </button>
              </div>
            </div>
            <div className="data-card-body p-0">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No transactions for this period</p>
                  <p className="text-sm">Add your first entry from the form</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <table className="data-table">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Party</th>
                        <th>Category</th>
                        <th>Mode</th>
                        <th className="text-right text-green-600">Credit</th>
                        <th className="text-right text-red-600">Debit</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="text-gray-500 text-sm whitespace-nowrap">
                            {format(new Date(txn.date), "dd-MM")}
                            <div className="text-xs">{txn.created_at ? format(new Date(txn.created_at), "HH:mm") : ""}</div>
                          </td>
                          <td className="font-medium max-w-[200px] truncate" title={txn.description}>{txn.description}</td>
                          <td className="text-sm">{getPartyName(txn.party_id)}</td>
                          <td className="text-xs">
                            {txn.category && (
                              <span className="bg-gray-100 px-2 py-1 rounded">{categoryLabels[txn.category] || txn.category}</span>
                            )}
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${txn.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : txn.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {paymentModeLabels[txn.payment_mode] || txn.payment_mode}
                            </span>
                          </td>
                          <td className="text-right font-bold text-green-600">
                            {txn.transaction_type === 'credit' ? `₹${txn.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="text-right font-bold text-red-600">
                            {txn.transaction_type === 'debit' ? `₹${txn.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td>
                            <button 
                              onClick={() => handleDelete(txn.id)} 
                              className="text-red-500 hover:text-red-700" 
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats by Category */}
          {transactions.length > 0 && formData.transaction_type === "debit" && (
            <div className="data-card mt-4">
              <div className="data-card-header">
                <div className="data-card-title">Expense by Category (खर्चा श्रेणी अनुसार)</div>
              </div>
              <div className="data-card-body">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(
                    transactions
                      .filter(t => t.transaction_type === 'debit' && t.category)
                      .reduce((acc, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                      }, {})
                  ).map(([cat, amount]) => (
                    <div key={cat} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">{categoryLabels[cat] || cat}</div>
                      <div className="text-lg font-bold text-red-600">₹{amount.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashBook;

import { useState, useEffect } from "react";

import axios from "axios";
import { api, API } from "@/App";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Default categories (can be extended with custom ones)
const DEFAULT_CATEGORIES = [
  { value: "salary", label: "Salary", color: "bg-blue-100 text-blue-700" },
  { value: "advance", label: "Advance", color: "bg-purple-100 text-purple-700" },
  { value: "rent", label: "Rent", color: "bg-yellow-100 text-yellow-700" },
  { value: "electricity", label: "Electricity", color: "bg-orange-100 text-orange-700" },
  { value: "supplies", label: "Supplies", color: "bg-green-100 text-green-700" },
  { value: "maintenance", label: "Maintenance", color: "bg-red-100 text-red-700" },
  { value: "transport", label: "Transport", color: "bg-indigo-100 text-indigo-700" },
  { value: "food", label: "Food", color: "bg-pink-100 text-pink-700" },
  { value: "interest_paid", label: "Interest Paid", color: "bg-amber-100 text-amber-700" },
  { value: "chit_fund", label: "Chit Fund", color: "bg-violet-100 text-violet-700" },
  { value: "ghar_kharcha", label: "Ghar Kharcha", color: "bg-teal-100 text-teal-700" },
  { value: "office_expense", label: "Office Expense", color: "bg-cyan-100 text-cyan-700" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700" }
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [parties, setParties] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "other",
    amount: "",
    payment_mode: "cash",
    description: "",
    party_id: ""
  });

  // Combine default and custom categories
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({ value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") });
    }
    return months;
  };

  useEffect(() => { 
    fetchData(); 
    loadCustomCategories();
  }, [selectedMonth]);

  const loadCustomCategories = () => {
    const saved = localStorage.getItem('expense_custom_categories');
    if (saved) {
      setCustomCategories(JSON.parse(saved));
    }
  };

  const saveCustomCategory = () => {
    if (!newCategory.trim()) return;
    
    const categoryValue = newCategory.toLowerCase().replace(/\s+/g, '_');
    if (allCategories.find(c => c.value === categoryValue)) {
      toast.error("Category already exists!");
      return;
    }
    
    const newCat = {
      value: categoryValue,
      label: newCategory.trim(),
      color: "bg-slate-100 text-slate-700"
    };
    
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    localStorage.setItem('expense_custom_categories', JSON.stringify(updated));
    
    toast.success(`Category "${newCategory}" added!`);
    setNewCategory("");
    setShowCategoryModal(false);
  };

  const deleteCustomCategory = (value) => {
    const updated = customCategories.filter(c => c.value !== value);
    setCustomCategories(updated);
    localStorage.setItem('expense_custom_categories', JSON.stringify(updated));
    toast.success("Category deleted!");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, partiesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/expenses?month=${selectedMonth}`),
        axios.get(`${API}/parties`),
        axios.get(`${API}/expenses/summary/${selectedMonth}`)
      ]);
      setExpenses(expRes.data);
      setParties(partiesRes.data);
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
      await axios.post(`${API}/expenses`, {
        ...formData,
        amount: parseFloat(formData.amount),
        party_id: formData.party_id || null
      });
      toast.success("Expense added and synced to Cash Book!");
      setShowModal(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), category: "other", amount: "", payment_mode: "cash", description: "", party_id: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      toast.success("Expense deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const getCategoryInfo = (cat) => allCategories.find(c => c.value === cat) || { value: cat, label: cat, color: "bg-gray-100 text-gray-700" };
  const monthOptions = getMonthOptions();

  // Filter expense parties (those with direct_expense or indirect_expense head)
  const expenseParties = parties.filter(p => 
    p.account_head === 'direct_expense' || 
    p.account_head === 'indirect_expense' ||
    !p.account_head
  );

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="expenses-page">
      <div className="action-bar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">{monthOptions.find(m => m.value === selectedMonth)?.label}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border max-h-60 overflow-auto">
            {monthOptions.map((month) => (
              <DropdownMenuItem key={month.value} onClick={() => setSelectedMonth(month.value)} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                {month.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={() => setShowModal(true)} className="action-btn danger" data-testid="add-expense-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Expense
        </button>

        <button onClick={() => setShowCategoryModal(true)} className="action-btn outline-primary" data-testid="manage-categories-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          Manage Categories
        </button>
      </div>

      {/* Summary */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">Total Expenses</div>
          <div className="stat-box-value danger">₹{summary?.total_expenses?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Expense Count</div>
          <div className="stat-box-value primary">{summary?.expense_count || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Categories</div>
          <div className="stat-box-value">{allCategories.length}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {Object.entries(summary.by_category).map(([cat, amount]) => {
            const catInfo = getCategoryInfo(cat);
            return (
              <div key={cat} className={`p-3 rounded-lg ${catInfo.color}`}>
                <div className="text-xs font-medium">{catInfo.label}</div>
                <div className="font-bold">₹{amount.toLocaleString('en-IN')}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expenses Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Expense List - {monthOptions.find(m => m.value === selectedMonth)?.label}</div>
        </div>
        <div className="data-card-body p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses this month</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Expense</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Party</th>
                  <th>Mode</th>
                  <th className="text-right">Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const catInfo = getCategoryInfo(exp.category);
                  return (
                    <tr key={exp.id}>
                      <td>{format(new Date(exp.date), "dd-MM-yyyy")}</td>
                      <td><span className={`px-2 py-1 rounded text-xs font-medium ${catInfo.color}`}>{catInfo.label}</span></td>
                      <td className="font-medium">{exp.description}</td>
                      <td className="text-gray-500">{parties.find(p => p.id === exp.party_id)?.name || "-"}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${exp.payment_mode === 'cash' ? 'bg-green-100 text-green-700' : exp.payment_mode === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {exp.payment_mode === 'bank_transfer' ? 'Bank' : exp.payment_mode.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right font-bold text-red-600">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td>
                        <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700" title="Delete">
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

      {/* Add Expense Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-red-500 to-rose-500 text-white">
              <div className="modal-title text-white">Add Expense (खर्च जोड़ें)</div>
              <button className="modal-close text-white" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
                      {allCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" className="form-control text-xl font-bold" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount" required min="0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select className="form-control" value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Party/Ledger (Optional)</label>
                    <select className="form-control" value={formData.party_id} onChange={(e) => setFormData({...formData, party_id: e.target.value})}>
                      <option value="">-- No Party --</option>
                      {expenseParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input type="text" className="form-control" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Enter description" required />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <strong>Note:</strong> This expense will be automatically added to Cash Book as a Debit entry.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-danger">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Manage Expense Categories</div>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Add New Category */}
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  className="form-control flex-1" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name..."
                  onKeyPress={(e) => e.key === 'Enter' && saveCustomCategory()}
                />
                <button onClick={saveCustomCategory} className="btn btn-success">Add</button>
              </div>

              {/* Default Categories */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 uppercase mb-2">Default Categories</div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <span key={cat.value} className={`px-3 py-1 rounded-full text-sm ${cat.color}`}>
                      {cat.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Categories */}
              {customCategories.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">Custom Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map(cat => (
                      <span key={cat.value} className={`px-3 py-1 rounded-full text-sm ${cat.color} flex items-center gap-1`}>
                        {cat.label}
                        <button onClick={() => deleteCustomCategory(cat.value)} className="text-red-500 hover:text-red-700 ml-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

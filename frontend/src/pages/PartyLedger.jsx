import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { exportStaffListPDF, exportStaffListExcel } from "@/utils/exportUtils";
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Apply jspdf-autotable plugin to jsPDF
applyPlugin(jsPDF);
import * as XLSX from 'xlsx';

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
  const [activeTab, setActiveTab] = useState("ledger"); // "ledger" or "parent"
  const [searchQuery, setSearchQuery] = useState(""); // Name search
  const [dateFrom, setDateFrom] = useState(""); // Date filter from
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd")); // Date filter to

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

  // Get parent parties (ones with account_head set AND have sub-ledgers)
  const parentPartiesWithChildren = parties.filter(p => 
    parties.some(sub => sub.parent_party_id === p.id)
  );
  
  // Get leaf parties (no sub-ledgers under them)
  const leafParties = parties.filter(p => 
    !parties.some(sub => sub.parent_party_id === p.id)
  );
  
  // Filter based on active tab
  let displayParties = activeTab === "parent" ? parentPartiesWithChildren : leafParties;
  
  // Apply name search filter
  if (searchQuery.trim()) {
    displayParties = displayParties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Then apply account head filter
  if (filterHead !== "all") {
    displayParties = displayParties.filter(p => 
      p.account_head === filterHead || 
      (p.parent_party_id && parties.find(pp => pp.id === p.parent_party_id)?.account_head === filterHead)
    );
  }

  const totalDebit = displayParties.reduce((sum, p) => sum + (p.current_balance > 0 ? p.current_balance : 0), 0);
  const totalCredit = displayParties.reduce((sum, p) => sum + (p.current_balance < 0 ? Math.abs(p.current_balance) : 0), 0);

  const getAccountHeadLabel = (value) => {
    const all = [...ACCOUNT_HEAD_OPTIONS.balance_sheet, ...ACCOUNT_HEAD_OPTIONS.profit_loss];
    return all.find(h => h.value === value)?.label || value;
  };

  const getParentName = (parentId) => {
    const parent = parties.find(p => p.id === parentId);
    return parent?.name || "-";
  };

  // Get count of sub-ledgers for a party
  const getSubLedgerCount = (partyId) => {
    return parties.filter(p => p.parent_party_id === partyId).length;
  };

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(255, 107, 53);
    doc.text('STAFF MANAGER', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(activeTab === "parent" ? "Parent Ledger Report" : "Ledger Master Report", 105, 24, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 105, 31, { align: 'center' });
    
    const tableData = displayParties.map(p => [
      p.name,
      p.account_head ? getAccountHeadLabel(p.account_head) : '-',
      activeTab === "parent" ? `${getSubLedgerCount(p.id)} Sub-ledgers` : (p.parent_party_id ? getParentName(p.parent_party_id) : '-'),
      `Rs. ${(p.opening_balance || 0).toLocaleString('en-IN')}`,
      `Rs. ${Math.abs(p.current_balance || 0).toLocaleString('en-IN')} ${p.current_balance >= 0 ? '(DR)' : '(CR)'}`
    ]);
    
    doc.autoTable({
      startY: 38,
      head: [['Name', 'Account Head', activeTab === "parent" ? 'Sub-Ledgers' : 'Parent', 'Opening Bal', 'Current Bal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [255, 107, 53] }
    });
    
    doc.save(`${activeTab === "parent" ? "Parent_Ledger" : "Ledger_Master"}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success("PDF Downloaded!");
  };

  // Export to Excel
  const exportExcel = () => {
    const data = displayParties.map(p => ({
      'Name': p.name,
      'Account Head': p.account_head ? getAccountHeadLabel(p.account_head) : '-',
      [activeTab === "parent" ? 'Sub-Ledgers' : 'Parent']: activeTab === "parent" ? `${getSubLedgerCount(p.id)} Sub-ledgers` : (p.parent_party_id ? getParentName(p.parent_party_id) : '-'),
      'Opening Balance': p.opening_balance || 0,
      'Current Balance': p.current_balance || 0,
      'Balance Type': (p.current_balance || 0) >= 0 ? 'Debit' : 'Credit'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === "parent" ? 'Parent Ledger' : 'Ledger Master');
    XLSX.writeFile(wb, `${activeTab === "parent" ? "Parent_Ledger" : "Ledger_Master"}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Excel Downloaded!");
  };

  // Check if party is a parent (has sub-ledgers)
  const isParentLedger = (partyId) => {
    return parties.some(p => p.parent_party_id === partyId);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="party-ledger-page">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success" data-testid="add-party-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Ledger
        </button>
        
        {/* Tabs: Ledger Master / Parent Ledger */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'ledger' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
            data-testid="tab-ledger"
          >
            Ledger Master ({leafParties.length})
          </button>
          <button
            onClick={() => setActiveTab("parent")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'parent' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            data-testid="tab-parent"
          >
            Parent Ledger ({parentPartiesWithChildren.length})
          </button>
        </div>
        
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
        
        {/* Export Buttons */}
        <button onClick={exportExcel} className="action-btn outline-primary" data-testid="export-excel">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Excel
        </button>
        <button onClick={exportPDF} className="action-btn outline-danger" data-testid="export-pdf">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          PDF
        </button>
      </div>

      {/* Search and Date Filters */}
      <div className="action-bar">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            className="form-control max-w-xs"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">From:</span>
          <input
            type="date"
            className="form-control w-auto"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-sm text-gray-500">To:</span>
          <input
            type="date"
            className="form-control w-auto"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <button 
            onClick={() => { setDateFrom(""); setDateTo(format(new Date(), "yyyy-MM-dd")); }}
            className="btn btn-secondary text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-label">{activeTab === "parent" ? "Parent Ledgers" : "Total Ledgers"}</div>
          <div className="stat-box-value primary">{displayParties.length}</div>
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
          <div className="data-card-title">{activeTab === "parent" ? "Parent Ledger" : "Ledger Master"}</div>
        </div>
        <div className="data-card-body p-0">
          {displayParties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{activeTab === "parent" ? "No parent ledgers found" : "No ledgers found"}</p>
              {activeTab === "ledger" && <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Ledger</button>}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>ACCOUNT HEAD</th>
                  <th>{activeTab === "parent" ? "SUB-LEDGERS" : "PARENT"}</th>
                  <th>OPENING BAL</th>
                  <th>CURRENT BAL</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayParties.map((party) => {
                  const subCount = getSubLedgerCount(party.id);
                  const isParent = subCount > 0;
                  return (
                  <tr key={party.id} className={isParent ? 'bg-blue-50' : ''}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`staff-avatar ${isParent ? 'bg-blue-500' : ''}`}>{party.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {party.name}
                            {isParent && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                {subCount} Sub-ledgers
                              </span>
                            )}
                          </div>
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
                      {activeTab === "parent" ? (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                          {subCount} Sub-ledgers
                        </span>
                      ) : (
                        party.parent_party_id ? (
                          <span className="text-sm text-blue-600">{getParentName(party.parent_party_id)}</span>
                        ) : '-'
                      )}
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
                          {isParent ? 'View All' : 'Ledger'}
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
                  );
                })}
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
                    {parentPartiesWithChildren.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({getAccountHeadLabel(p.account_head)})</option>
                    ))}
                    {/* Also show parties with account_head that can be parents */}
                    {parties.filter(p => p.account_head && !parentPartiesWithChildren.find(pp => pp.id === p.id)).map(p => (
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
              {/* Sub-ledgers info */}
              {ledgerData.sub_ledgers && ledgerData.sub_ledgers.length > 0 && (
                <div className="bg-blue-50 p-3 border-b">
                  <div className="text-xs text-blue-600 font-medium mb-2">
                    Includes {ledgerData.sub_ledgers.length} Sub-ledgers:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ledgerData.sub_ledgers.map(sub => (
                      <span key={sub.id} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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

import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Advance = () => {
  const [staffList, setStaffList] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ staff_id: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [staffRes, advanceRes] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/advances`).catch(() => ({ data: [] }))
      ]);
      setStaffList(staffRes.data);
      setAdvances(advanceRes.data);
      if (staffRes.data.length > 0 && !formData.staff_id) {
        setFormData(prev => ({ ...prev, staff_id: staffRes.data[0].id }));
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
      await axios.post(`${API}/advances`, { ...formData, amount: parseFloat(formData.amount) });
      toast.success("Advance added successfully!");
      setShowModal(false);
      setFormData({ staff_id: staffList[0]?.id || "", amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add advance");
    }
  };

  const selectedStaff = staffList.find(s => s.id === formData.staff_id);

  const handleDelete = async (advanceId) => {
    if (!window.confirm("Are you sure you want to delete this advance?")) return;
    try {
      await axios.delete(`${API}/advances/${advanceId}`);
      toast.success("Advance deleted successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete advance");
    }
  };

  const totalAdvance = advances.reduce((sum, adv) => sum + adv.amount, 0);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="action-bar">
        <button onClick={() => setShowModal(true)} className="action-btn success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Advance
        </button>
        <div className="stat-box">
          <div className="stat-box-label">Total Advance</div>
          <div className="stat-box-value danger">₹{totalAdvance.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Advance Records</div>
        </div>
        <div className="data-card-body p-0">
          {advances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No advance records yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-3">Add First Advance</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {advances.map(adv => (
                  <tr key={adv.id}>
                    <td>{format(new Date(adv.date), "dd-MM-yyyy")}</td>
                    <td className="font-medium">{staffList.find(s => s.id === adv.staff_id)?.name || "Unknown"}</td>
                    <td className="font-bold text-red-600">₹{adv.amount.toLocaleString('en-IN')}</td>
                    <td className="text-gray-500">{adv.note || "-"}</td>
                    <td>
                      <button onClick={() => handleDelete(adv.id)} className="text-red-500 hover:text-red-700" title="Delete">
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Advance</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Staff</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="form-control text-left flex items-center justify-between">
                        <span>{selectedStaff?.name || "Select Staff"}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white rounded-lg shadow-lg border">
                      {staffList.map((staff) => (
                        <DropdownMenuItem key={staff.id} onClick={() => setFormData({...formData, staff_id: staff.id})} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                          {staff.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount" required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="form-control text-left">
                        {formData.date ? format(new Date(formData.date), "dd-MM-yyyy") : "Select date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="start">
                      <Calendar mode="single" selected={formData.date ? new Date(formData.date) : undefined} onSelect={(date) => { if(date) { setFormData({...formData, date: format(date, "yyyy-MM-dd")}); setDatePickerOpen(false); }}} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input type="text" className="form-control" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="Enter note" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advance;

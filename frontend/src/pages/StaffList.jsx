import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "", joining_date: "", monthly_salary: "" });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
    } catch (error) {
      toast.error("Failed to fetch staff list");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, monthly_salary: parseFloat(formData.monthly_salary) };
      if (editingStaff) {
        await axios.put(`${API}/staff/${editingStaff.id}`, payload);
        toast.success("Staff updated successfully!");
      } else {
        await axios.post(`${API}/staff`, payload);
        toast.success("Staff added successfully!");
      }
      setShowModal(false);
      setEditingStaff(null);
      setFormData({ name: "", phone: "", joining_date: "", monthly_salary: "" });
      fetchStaff();
    } catch (error) {
      toast.error(editingStaff ? "Failed to update staff" : "Failed to add staff");
    }
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({ name: staff.name, phone: staff.phone, joining_date: staff.joining_date, monthly_salary: staff.monthly_salary.toString() });
    setShowModal(true);
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm("Are you sure you want to delete this staff?")) return;
    try {
      await axios.delete(`${API}/staff/${staffId}`);
      toast.success("Staff deleted!");
      fetchStaff();
    } catch (error) {
      toast.error("Failed to delete staff");
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: "", phone: "", joining_date: "", monthly_salary: "" });
    setShowModal(true);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div data-testid="staff-list-page" className="animate-fade-in">
      {/* Action Bar */}
      <div className="action-bar">
        <button onClick={openAddModal} className="action-btn success" data-testid="add-staff-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Staff
        </button>
        <button className="action-btn outline-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel
        </button>
        <button className="action-btn outline-danger">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
      </div>

      {/* Staff Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">Staff Master</div>
          <span className="text-sm text-gray-500">Total: {staffList.length}</span>
        </div>
        <div className="data-card-body p-0">
          {staffList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No staff added yet</p>
              <button onClick={openAddModal} className="btn btn-primary mt-3">Add First Staff</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Joining Date</th>
                  <th>Monthly Salary</th>
                  <th>Daily Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => (
                  <tr key={staff.id} data-testid={`staff-row-${staff.id}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="staff-avatar">{staff.name.charAt(0)}</div>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                    </td>
                    <td>{staff.phone}</td>
                    <td>{staff.joining_date ? format(new Date(staff.joining_date), "dd-MM-yyyy") : "-"}</td>
                    <td className="font-semibold">₹{staff.monthly_salary.toLocaleString('en-IN')}</td>
                    <td className="text-gray-600">₹{(staff.monthly_salary / 30).toFixed(2)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(staff)} className="btn btn-secondary text-xs px-2 py-1" data-testid={`edit-staff-${staff.id}`}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(staff.id)} className="btn btn-outline-danger text-xs px-2 py-1" data-testid={`delete-staff-${staff.id}`}>
                          Delete
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingStaff ? "Edit Staff" : "Add New Staff"}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name / नाम</label>
                  <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter name" required data-testid="staff-name-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / फोन</label>
                  <input type="tel" className="form-control" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Enter phone" required data-testid="staff-phone-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Date / तारीख</label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="form-control text-left" data-testid="staff-date-input">
                        {formData.joining_date ? format(new Date(formData.joining_date), "dd-MM-yyyy") : "Select date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-lg shadow-lg" align="start">
                      <Calendar mode="single" selected={formData.joining_date ? new Date(formData.joining_date) : undefined} onSelect={(date) => { if(date) { setFormData({...formData, joining_date: format(date, "yyyy-MM-dd")}); setDatePickerOpen(false); }}} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary / मासिक वेतन (₹)</label>
                  <input type="number" className="form-control" value={formData.monthly_salary} onChange={(e) => setFormData({...formData, monthly_salary: e.target.value})} placeholder="Enter salary" required min="0" data-testid="staff-salary-input" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success" data-testid="save-staff-btn">{editingStaff ? "Update" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;

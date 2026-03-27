import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    joining_date: "",
    monthly_salary: "",
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

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
      const payload = {
        ...formData,
        monthly_salary: parseFloat(formData.monthly_salary),
      };

      if (editingStaff) {
        await axios.put(`${API}/staff/${editingStaff.id}`, payload);
        toast.success("Staff updated successfully");
      } else {
        await axios.post(`${API}/staff`, payload);
        toast.success("Staff added successfully");
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
    setFormData({
      name: staff.name,
      phone: staff.phone,
      joining_date: staff.joining_date,
      monthly_salary: staff.monthly_salary.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      await axios.delete(`${API}/staff/${staffId}`);
      toast.success("Staff deleted successfully");
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

  const handleDateSelect = (date) => {
    if (date) {
      setFormData({ ...formData, joining_date: format(date, "yyyy-MM-dd") });
      setDatePickerOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="staff-list-page">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage your staff members</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
          data-testid="add-staff-btn"
        >
          <Plus size={20} />
          Add Staff
        </button>
      </header>

      {staffList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No staff members added yet</p>
          <button onClick={openAddModal} className="btn-primary">
            Add Your First Staff
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Joining Date</th>
                <th>Monthly Salary</th>
                <th>Daily Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id} data-testid={`staff-row-${staff.id}`}>
                  <td className="font-medium">{staff.name}</td>
                  <td>{staff.phone}</td>
                  <td>{format(new Date(staff.joining_date), "dd MMM yyyy")}</td>
                  <td className="font-bold">₹{staff.monthly_salary.toLocaleString('en-IN')}</td>
                  <td className="text-gray-600">₹{(staff.monthly_salary / 30).toFixed(2)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(staff)}
                        className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                        data-testid={`edit-staff-${staff.id}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(staff.id)}
                        className="p-2 border-2 border-[#E32636] text-[#E32636] hover:bg-[#E32636] hover:text-white transition-colors"
                        data-testid={`delete-staff-${staff.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{editingStaff ? "Edit Staff" : "Add New Staff"}</span>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 transition-colors"
                data-testid="close-modal-btn"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter staff name"
                    required
                    data-testid="staff-name-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    required
                    data-testid="staff-phone-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="form-input text-left w-full"
                        data-testid="staff-date-input"
                      >
                        {formData.joining_date
                          ? format(new Date(formData.joining_date), "dd MMM yyyy")
                          : "Select date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-2 border-black" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.joining_date ? new Date(formData.joining_date) : undefined}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.monthly_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                    placeholder="Enter monthly salary"
                    required
                    min="0"
                    data-testid="staff-salary-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" data-testid="save-staff-btn">
                  {editingStaff ? "Update" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;

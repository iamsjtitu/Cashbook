import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SalaryCalculator = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [salaryData, setSalaryData] = useState(null);
  const [advanceData, setAdvanceData] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    advance_deducted: 0,
    payment_mode: "cash",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    note: ""
  });
  const [paying, setPaying] = useState(false);

  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({ value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") });
    }
    return months;
  };

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
      if (response.data.length > 0) setSelectedStaff(response.data[0]);
    } catch (error) {
      toast.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = async () => {
    if (!selectedStaff) return;
    setCalculating(true);
    try {
      const [salaryRes, advanceRes] = await Promise.all([
        axios.get(`${API}/salary/${selectedStaff.id}/${selectedMonth}`),
        axios.get(`${API}/advances/summary/${selectedMonth}`)
      ]);
      setSalaryData(salaryRes.data);
      
      // Get advance for this staff
      const staffAdvance = advanceRes.data.find(a => a.staff_id === selectedStaff.id);
      setAdvanceData({
        total: staffAdvance?.total_advance || 0,
        count: staffAdvance?.advance_count || 0
      });
    } catch (error) {
      toast.error("Failed to calculate salary");
    } finally {
      setCalculating(false);
    }
  };

  const openPayModal = () => {
    const netPayable = salaryData.total_earned - advanceData.total;
    setPaymentData({
      amount: salaryData.total_earned,
      advance_deducted: advanceData.total,
      payment_mode: "cash",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      note: ""
    });
    setShowPayModal(true);
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      await axios.post(`${API}/salary/pay`, {
        staff_id: selectedStaff.id,
        month: selectedMonth,
        amount: paymentData.amount,
        advance_deducted: paymentData.advance_deducted,
        payment_date: paymentData.payment_date,
        payment_mode: paymentData.payment_mode,
        note: paymentData.note
      });
      
      const netPaid = paymentData.amount - paymentData.advance_deducted;
      toast.success(`Salary ₹${netPaid.toLocaleString('en-IN')} paid! Cash Book me entry ho gayi.`);
      setShowPayModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const monthOptions = getMonthOptions();
  const netPayable = salaryData ? salaryData.total_earned - advanceData.total : 0;

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div data-testid="salary-page" className="animate-fade-in">
      {/* Action Bar */}
      <div className="action-bar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger" data-testid="salary-staff-selector">
              <div className="staff-avatar w-6 h-6 text-xs">{selectedStaff?.name.charAt(0)}</div>
              <span className="font-medium">{selectedStaff?.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border">
            {staffList.map((staff) => (
              <DropdownMenuItem key={staff.id} onClick={() => { setSelectedStaff(staff); setSalaryData(null); }} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                {staff.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="dropdown-trigger" data-testid="month-selector">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="font-medium">{monthOptions.find(m => m.value === selectedMonth)?.label}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white rounded-lg shadow-lg border max-h-60 overflow-auto">
            {monthOptions.map((month) => (
              <DropdownMenuItem key={month.value} onClick={() => { setSelectedMonth(month.value); setSalaryData(null); }} className="cursor-pointer hover:bg-gray-50 px-3 py-2">
                {month.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={calculateSalary} className="action-btn success" disabled={calculating} data-testid="calculate-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          {calculating ? "Calculating..." : "Calculate Salary"}
        </button>
        
        {salaryData && (
          <>
            <button onClick={openPayModal} className="action-btn warning" data-testid="pay-salary-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Pay Salary
            </button>
            <button className="action-btn outline-primary" onClick={() => window.print()}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </>
        )}
      </div>

      {staffList.length === 0 ? (
        <div className="data-card"><div className="data-card-body text-center py-8"><p className="text-gray-500">No staff members found</p><a href="/staff" className="btn btn-primary mt-3">Add Staff First</a></div></div>
      ) : salaryData ? (
        <div className="salary-slip" data-testid="salary-slip">
          <div className="salary-slip-header">
            <h2 className="text-xl font-bold">SALARY SLIP</h2>
            <p className="text-white/70 text-sm">{format(new Date(salaryData.month + "-01"), "MMMM yyyy")}</p>
          </div>
          <div className="salary-slip-body">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b-2 border-gray-200 mb-4">
              <div><div className="text-xs text-gray-500 uppercase">Employee</div><div className="text-lg font-bold">{salaryData.staff_name}</div></div>
              <div className="text-right"><div className="text-xs text-gray-500 uppercase">Monthly Salary</div><div className="text-lg font-bold">₹{salaryData.monthly_salary.toLocaleString('en-IN')}</div></div>
            </div>

            <div className="text-xs text-gray-500 uppercase mb-2">Attendance Summary</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-green-50 p-3 rounded text-center"><div className="text-xl font-bold text-green-600">{salaryData.total_present}</div><div className="text-xs text-green-600">Present</div></div>
              <div className="bg-red-50 p-3 rounded text-center"><div className="text-xl font-bold text-red-600">{salaryData.total_absent}</div><div className="text-xs text-red-600">Absent</div></div>
              <div className="bg-yellow-50 p-3 rounded text-center"><div className="text-xl font-bold text-yellow-600">{salaryData.total_half_day}</div><div className="text-xs text-yellow-600">Half Day</div></div>
              <div className="bg-gray-50 p-3 rounded text-center"><div className="text-xl font-bold text-gray-600">{salaryData.total_working_days}</div><div className="text-xs text-gray-600">Total</div></div>
            </div>

            <div className="text-xs text-gray-500 uppercase mb-2">Calculation</div>
            <div className="salary-row"><span>Daily Rate (÷30)</span><span className="font-semibold">₹{salaryData.daily_rate.toLocaleString('en-IN')}</span></div>
            <div className="salary-row"><span>Present ({salaryData.total_present} days)</span><span className="font-semibold text-green-600">+ ₹{salaryData.present_amount.toLocaleString('en-IN')}</span></div>
            <div className="salary-row"><span>Half Day ({salaryData.total_half_day} days)</span><span className="font-semibold text-green-600">+ ₹{salaryData.half_day_amount.toLocaleString('en-IN')}</span></div>
            <div className="salary-row"><span>Absent ({salaryData.total_absent} days)</span><span className="font-semibold text-red-600">- ₹{(salaryData.total_absent * salaryData.daily_rate).toLocaleString('en-IN')}</span></div>
            
            <div className="border-t-2 border-dashed border-gray-200 my-3"></div>
            
            <div className="salary-row"><span>Total Earned</span><span className="font-bold">₹{salaryData.total_earned.toLocaleString('en-IN')}</span></div>
            
            {advanceData.total > 0 && (
              <div className="salary-row"><span>Advance Deduction ({advanceData.count} times)</span><span className="font-semibold text-red-600">- ₹{advanceData.total.toLocaleString('en-IN')}</span></div>
            )}
            
            <div className="salary-row total"><span>NET PAYABLE</span><span className="text-2xl text-orange-500">₹{netPayable.toLocaleString('en-IN')}</span></div>
          </div>
          <div className="bg-gray-50 p-3 text-center text-xs text-gray-500">Generated on {format(new Date(), "dd-MM-yyyy HH:mm")} | 30-day calculation basis</div>
        </div>
      ) : (
        <div className="data-card">
          <div className="data-card-body text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Select Staff & Month</h3>
            <p className="text-gray-500 text-sm mb-4">Choose staff and month, then click "Calculate Salary"</p>
            <div className="bg-orange-50 rounded-lg p-4 max-w-sm mx-auto text-sm text-orange-800">
              <strong>Formula:</strong> Daily = Monthly ÷ 30 | Half Day = Daily ÷ 2
            </div>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showPayModal && salaryData && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="modal-title text-white">Pay Salary - {salaryData.staff_name}</div>
              <button className="modal-close text-white" onClick={() => setShowPayModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePaySalary}>
              <div className="modal-body">
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500">Total Earned</div>
                      <div className="text-lg font-bold">₹{salaryData.total_earned.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Advance Deduction</div>
                      <div className="text-lg font-bold text-red-600">- ₹{advanceData.total.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="border-t mt-3 pt-3 text-center">
                    <div className="text-xs text-gray-500">Net Payable</div>
                    <div className="text-2xl font-bold text-green-600">₹{netPayable.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-control" value={paymentData.payment_date} onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={paymentData.payment_mode} onChange={(e) => setPaymentData({...paymentData, payment_mode: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input type="text" className="form-control" value={paymentData.note} onChange={(e) => setPaymentData({...paymentData, note: e.target.value})} placeholder="Any remarks" />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  Ye amount Cash Book me automatically Debit ho jayega with category "Salary".
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={paying} className="btn btn-success">
                  {paying ? "Processing..." : `Pay ₹${netPayable.toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryCalculator;

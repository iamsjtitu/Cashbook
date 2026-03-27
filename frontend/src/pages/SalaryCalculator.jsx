import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Calculator, Printer, ChevronRight } from "lucide-react";
import { format, subMonths } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SalaryCalculator = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Generate last 12 months
  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
      if (response.data.length > 0) {
        setSelectedStaff(response.data[0]);
      }
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
      const response = await axios.get(`${API}/salary/${selectedStaff.id}/${selectedMonth}`);
      setSalaryData(response.data);
    } catch (error) {
      toast.error("Failed to calculate salary");
    } finally {
      setCalculating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthOptions = getMonthOptions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="salary-page">
      <header className="page-header">
        <h1 className="page-title">Salary Calculator</h1>
        <p className="page-subtitle">Calculate monthly salary based on attendance</p>
      </header>

      {staffList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No staff members found</p>
          <a href="/staff" className="btn-primary">Add Staff First</a>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center mb-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-secondary flex items-center gap-2 min-w-[200px] justify-between" data-testid="salary-staff-selector">
                  <span className="font-bold">{selectedStaff?.name}</span>
                  <ChevronRight size={16} className="rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-2 border-black">
                {staffList.map((staff) => (
                  <DropdownMenuItem
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setSalaryData(null);
                    }}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  >
                    {staff.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-secondary flex items-center gap-2 min-w-[200px] justify-between" data-testid="month-selector">
                  <span className="font-bold">
                    {monthOptions.find((m) => m.value === selectedMonth)?.label}
                  </span>
                  <ChevronRight size={16} className="rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-2 border-black max-h-[300px] overflow-auto">
                {monthOptions.map((month) => (
                  <DropdownMenuItem
                    key={month.value}
                    onClick={() => {
                      setSelectedMonth(month.value);
                      setSalaryData(null);
                    }}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  >
                    {month.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={calculateSalary}
              className="btn-primary flex items-center gap-2"
              disabled={calculating}
              data-testid="calculate-btn"
            >
              <Calculator size={20} />
              {calculating ? "Calculating..." : "Calculate Salary"}
            </button>
          </div>

          {/* Salary Slip */}
          {salaryData && (
            <div className="animate-fade-in" data-testid="salary-slip">
              <div className="flex justify-end mb-4 print:hidden">
                <button
                  onClick={handlePrint}
                  className="btn-secondary flex items-center gap-2"
                  data-testid="print-btn"
                >
                  <Printer size={20} />
                  Print Slip
                </button>
              </div>

              <div className="salary-slip max-w-2xl mx-auto">
                <div className="salary-slip-header">
                  <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    SALARY SLIP
                  </h2>
                  <p className="text-white/80 mt-1">
                    {format(new Date(salaryData.month + "-01"), "MMMM yyyy")}
                  </p>
                </div>

                <div className="salary-slip-body">
                  {/* Employee Info */}
                  <div className="mb-6 pb-4 border-b-2 border-black">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">Employee Name</div>
                        <div className="text-xl font-bold mt-1">{salaryData.staff_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">Monthly Salary</div>
                        <div className="text-xl font-bold mt-1">₹{salaryData.monthly_salary.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="mb-6">
                    <div className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">Attendance Summary</div>
                    <div className="grid grid-cols-4 gap-0">
                      <div className="border-2 border-black p-3 text-center -mr-[1px] -mb-[1px]">
                        <div className="text-2xl font-black">{salaryData.total_present}</div>
                        <div className="text-xs uppercase tracking-wider">Present</div>
                      </div>
                      <div className="border-2 border-black p-3 text-center -mr-[1px] -mb-[1px]">
                        <div className="text-2xl font-black text-[#E32636]">{salaryData.total_absent}</div>
                        <div className="text-xs uppercase tracking-wider">Absent</div>
                      </div>
                      <div className="border-2 border-black p-3 text-center -mr-[1px] -mb-[1px]">
                        <div className="text-2xl font-black text-[#B8860B]">{salaryData.total_half_day}</div>
                        <div className="text-xs uppercase tracking-wider">Half Day</div>
                      </div>
                      <div className="border-2 border-black p-3 text-center -mb-[1px]">
                        <div className="text-2xl font-black">{salaryData.total_working_days}</div>
                        <div className="text-xs uppercase tracking-wider">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* Calculation */}
                  <div className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">Salary Breakdown</div>
                  
                  <div className="salary-row">
                    <span>Daily Rate (Monthly ÷ 30)</span>
                    <span className="font-bold">₹{salaryData.daily_rate.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="salary-row">
                    <span>Present Days ({salaryData.total_present} × ₹{salaryData.daily_rate})</span>
                    <span className="font-bold text-green-700">+ ₹{salaryData.present_amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="salary-row">
                    <span>Half Days ({salaryData.total_half_day} × ₹{(salaryData.daily_rate / 2).toFixed(2)})</span>
                    <span className="font-bold text-green-700">+ ₹{salaryData.half_day_amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="salary-row">
                    <span>Absent Deduction ({salaryData.total_absent} × ₹{salaryData.daily_rate})</span>
                    <span className="font-bold text-[#E32636]">- ₹{(salaryData.total_absent * salaryData.daily_rate).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="salary-row total">
                    <span className="text-xl">NET PAYABLE</span>
                    <span className="text-3xl font-black" style={{ fontFamily: 'Chivo, sans-serif' }}>
                      ₹{salaryData.total_earned.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500">
                    Generated on {format(new Date(), "dd MMM yyyy, HH:mm")} | Salary calculated on 30-day basis
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          {!salaryData && (
            <div className="card max-w-2xl mx-auto text-center py-12">
              <Calculator size={64} strokeWidth={1} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Select Staff & Month
              </h3>
              <p className="text-gray-500">
                Choose a staff member and month, then click "Calculate Salary" to generate the salary slip.
              </p>
              <div className="mt-6 p-4 bg-gray-50 border-2 border-black">
                <p className="text-sm font-medium">
                  <strong>Calculation Formula:</strong><br />
                  Daily Rate = Monthly Salary ÷ 30<br />
                  Half Day = Daily Rate ÷ 2<br />
                  Net = (Present Days × Daily) + (Half Days × Daily/2)
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalaryCalculator;

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// ==================== PDF EXPORTS ====================

export const exportStaffListPDF = (staffList) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(255, 107, 53);
  doc.text('STAFF MANAGER', 105, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Staff List Report', 105, 22, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 105, 28, { align: 'center' });
  
  // Table
  const tableData = staffList.map((staff, idx) => [
    idx + 1,
    staff.name,
    staff.joining_date ? format(new Date(staff.joining_date), 'dd-MM-yyyy') : '-',
    `Rs. ${staff.monthly_salary.toLocaleString('en-IN')}`,
    `Rs. ${(staff.daily_rate || staff.monthly_salary / 30).toLocaleString('en-IN')}`
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Name', 'Joining Date', 'Monthly Salary', 'Daily Rate']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [255, 107, 53] },
    styles: { fontSize: 10 }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount} | Staff Manager`, 105, 290, { align: 'center' });
  }
  
  doc.save(`Staff_List_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportAttendancePDF = (staffName, month, attendance, summary) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(255, 107, 53);
  doc.text('STAFF MANAGER', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(50);
  doc.text(`Attendance Report - ${staffName}`, 105, 24, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Month: ${month}`, 105, 31, { align: 'center' });
  
  // Summary Box
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 38, 182, 25, 'F');
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Present: ${summary.present}`, 30, 50);
  doc.text(`Absent: ${summary.absent}`, 70, 50);
  doc.text(`Half Day: ${summary.halfDay}`, 110, 50);
  doc.text(`Unmarked: ${summary.unmarked}`, 150, 50);
  
  // Table
  const tableData = Object.entries(attendance).map(([date, status]) => [
    format(new Date(date), 'dd-MM-yyyy (EEE)'),
    status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Half Day'
  ]);
  
  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [255, 107, 53] },
    bodyStyles: { fontSize: 10 },
    didParseCell: function(data) {
      if (data.column.index === 1) {
        if (data.cell.raw === 'Present') data.cell.styles.textColor = [40, 167, 69];
        else if (data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 53, 69];
        else if (data.cell.raw === 'Half Day') data.cell.styles.textColor = [255, 193, 7];
      }
    }
  });
  
  doc.save(`Attendance_${staffName}_${month}.pdf`);
};

export const exportSalarySlipPDF = (salaryData, advanceData, staffName) => {
  const doc = new jsPDF();
  const netPayable = salaryData.total_earned - (advanceData?.total || 0);
  
  // Header
  doc.setFillColor(51, 51, 51);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('SALARY SLIP', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(format(new Date(salaryData.month + '-01'), 'MMMM yyyy'), 105, 30, { align: 'center' });
  
  // Employee Info
  doc.setTextColor(50);
  doc.setFontSize(12);
  doc.text(`Employee: ${staffName}`, 14, 55);
  doc.text(`Monthly Salary: Rs. ${salaryData.monthly_salary.toLocaleString('en-IN')}`, 14, 62);
  doc.text(`Daily Rate: Rs. ${salaryData.daily_rate.toLocaleString('en-IN')} (Monthly / 30)`, 14, 69);
  
  // Attendance Summary
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 75, 182, 20, 'F');
  doc.setFontSize(10);
  doc.text(`Present: ${salaryData.total_present}`, 30, 87);
  doc.text(`Absent: ${salaryData.total_absent}`, 70, 87);
  doc.text(`Half Day: ${salaryData.total_half_day}`, 110, 87);
  doc.text(`Total Days: ${salaryData.total_working_days}`, 150, 87);
  
  // Calculation Table
  const calcData = [
    ['Present Days Amount', `+ Rs. ${salaryData.present_amount.toLocaleString('en-IN')}`],
    ['Half Day Amount', `+ Rs. ${salaryData.half_day_amount.toLocaleString('en-IN')}`],
    ['Absent Deduction', `- Rs. ${(salaryData.total_absent * salaryData.daily_rate).toLocaleString('en-IN')}`],
    ['Total Earned', `Rs. ${salaryData.total_earned.toLocaleString('en-IN')}`]
  ];
  
  if (advanceData?.total > 0) {
    calcData.push(['Advance Deduction', `- Rs. ${advanceData.total.toLocaleString('en-IN')}`]);
  }
  calcData.push(['NET PAYABLE', `Rs. ${netPayable.toLocaleString('en-IN')}`]);
  
  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Amount']],
    body: calcData,
    theme: 'plain',
    headStyles: { fillColor: [255, 107, 53], textColor: 255 },
    styles: { fontSize: 11 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(data) {
      if (data.row.index === calcData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 14;
        if (data.column.index === 1) data.cell.styles.textColor = [255, 107, 53];
      }
    }
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated on ${format(new Date(), 'dd-MM-yyyy HH:mm')} | 30-day calculation basis | Staff Manager`, 105, 285, { align: 'center' });
  
  doc.save(`Salary_Slip_${staffName}_${salaryData.month}.pdf`);
};

export const exportCashBookPDF = (transactions, dateRange, totals) => {
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(255, 107, 53);
  doc.text('STAFF MANAGER', 148, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(50);
  doc.text('Cash Book Report', 148, 24, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${dateRange}`, 148, 31, { align: 'center' });
  
  // Summary
  doc.setFillColor(40, 167, 69);
  doc.rect(20, 38, 80, 15, 'F');
  doc.setTextColor(255);
  doc.text(`Total Credit: Rs. ${totals.credit.toLocaleString('en-IN')}`, 60, 47, { align: 'center' });
  
  doc.setFillColor(220, 53, 69);
  doc.rect(110, 38, 80, 15, 'F');
  doc.text(`Total Debit: Rs. ${totals.debit.toLocaleString('en-IN')}`, 150, 47, { align: 'center' });
  
  doc.setFillColor(255, 107, 53);
  doc.rect(200, 38, 80, 15, 'F');
  doc.text(`Balance: Rs. ${(totals.credit - totals.debit).toLocaleString('en-IN')}`, 240, 47, { align: 'center' });
  
  // Table
  const tableData = transactions.map(t => [
    format(new Date(t.date), 'dd-MM-yyyy'),
    t.description || '-',
    t.type === 'credit' ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
    t.type === 'debit' ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
    t.category || '-',
    t.payment_mode || 'cash'
  ]);
  
  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Description', 'Credit', 'Debit', 'Category', 'Mode']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [255, 107, 53] },
    styles: { fontSize: 9 },
    columnStyles: {
      2: { textColor: [40, 167, 69] },
      3: { textColor: [220, 53, 69] }
    }
  });
  
  doc.save(`CashBook_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ==================== EXCEL EXPORTS ====================

export const exportStaffListExcel = (staffList) => {
  const data = staffList.map((staff, idx) => ({
    'Sr No': idx + 1,
    'Name': staff.name,
    'Joining Date': staff.joining_date ? format(new Date(staff.joining_date), 'dd-MM-yyyy') : '-',
    'Monthly Salary': staff.monthly_salary,
    'Daily Rate': staff.daily_rate || Math.round(staff.monthly_salary / 30)
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staff List');
  
  // Auto-width columns
  const colWidths = [8, 25, 15, 15, 12];
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  
  XLSX.writeFile(wb, `Staff_List_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportAttendanceExcel = (staffName, month, attendance) => {
  const data = Object.entries(attendance).map(([date, status]) => ({
    'Date': format(new Date(date), 'dd-MM-yyyy'),
    'Day': format(new Date(date), 'EEEE'),
    'Status': status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Half Day'
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  
  XLSX.writeFile(wb, `Attendance_${staffName}_${month}.xlsx`);
};

export const exportCashBookExcel = (transactions, dateRange) => {
  const data = transactions.map(t => ({
    'Date': format(new Date(t.date), 'dd-MM-yyyy'),
    'Description': t.description || '-',
    'Type': t.type,
    'Amount': t.amount,
    'Category': t.category || '-',
    'Payment Mode': t.payment_mode || 'cash',
    'Party': t.party_name || '-'
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cash Book');
  
  // Auto-width
  ws['!cols'] = [12, 30, 10, 12, 15, 12, 20].map(w => ({ wch: w }));
  
  XLSX.writeFile(wb, `CashBook_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// ==================== RECEIPT PRINTING ====================

export const printReceipt = (receiptData) => {
  const { type, staffName, amount, date, month, paymentMode, note, advanceDeducted, netPaid } = receiptData;
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${type}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
        .receipt { border: 2px dashed #333; padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
        .header h2 { color: #FF6B35; margin: 0 0 5px 0; }
        .header p { margin: 0; color: #666; font-size: 12px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
        .row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: bold; }
        .total { background: #f5f5f5; padding: 12px; margin-top: 15px; text-align: center; }
        .total .amount { font-size: 24px; color: #FF6B35; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
        .signature { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig-box { text-align: center; }
        .sig-line { border-top: 1px solid #333; width: 100px; margin-top: 30px; }
        @media print { body { margin: 0; padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h2>STAFF MANAGER</h2>
          <p>${type === 'salary' ? 'SALARY PAYMENT RECEIPT' : 'ADVANCE PAYMENT RECEIPT'}</p>
          <p>Receipt No: ${Date.now().toString().slice(-8)}</p>
        </div>
        
        <div class="row"><span class="label">Employee:</span><span class="value">${staffName}</span></div>
        <div class="row"><span class="label">Date:</span><span class="value">${format(new Date(date), 'dd-MM-yyyy')}</span></div>
        ${month ? `<div class="row"><span class="label">For Month:</span><span class="value">${month}</span></div>` : ''}
        <div class="row"><span class="label">Payment Mode:</span><span class="value">${paymentMode.toUpperCase()}</span></div>
        ${type === 'salary' ? `
          <div class="row"><span class="label">Total Salary:</span><span class="value">Rs. ${amount.toLocaleString('en-IN')}</span></div>
          ${advanceDeducted > 0 ? `<div class="row"><span class="label">Advance Deducted:</span><span class="value" style="color:red">- Rs. ${advanceDeducted.toLocaleString('en-IN')}</span></div>` : ''}
        ` : ''}
        ${note ? `<div class="row"><span class="label">Note:</span><span class="value">${note}</span></div>` : ''}
        
        <div class="total">
          <div style="font-size:12px;color:#666;margin-bottom:5px;">${type === 'salary' ? 'NET PAID' : 'ADVANCE AMOUNT'}</div>
          <div class="amount">Rs. ${(netPaid || amount).toLocaleString('en-IN')}</div>
        </div>
        
        <div class="signature">
          <div class="sig-box"><div class="sig-line"></div><div>Receiver</div></div>
          <div class="sig-box"><div class="sig-line"></div><div>Authorized</div></div>
        </div>
        
        <div class="footer">
          Generated on ${format(new Date(), 'dd-MM-yyyy HH:mm')} | Staff Manager
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
};

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateSalarySlipPDF = async (salarySlip, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 30,
        bufferPages: true 
      });
      
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // ==================== HEADER SECTION ====================
      // Company Header with Blue Background
      doc.rect(0, 0, doc.page.width, 100)
         .fill('#1e3a8a');
      
      // Company Logo
      const logoPath = path.join(__dirname, '../assets/logoo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 40, 25, { width: 50, height: 50 });
        } catch (err) {
          // Fallback to text logo
          doc.fillColor('#ffffff')
             .fontSize(24)
             .font('Helvetica-Bold')
             .text('F', 45, 30);
        }
      } else {
        doc.fillColor('#ffffff')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('F', 45, 30);
      }

      // Company Name and Details
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Fintradify', 100, 30);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh, 201301', 100, 55);
      
      doc.text('Phone: +91 78360 09907 | Email: hr@fintradify.com', 100, 68);
      
      // Salary Slip Title
      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('SALARY SLIP', 0, 25, { align: 'center' });
      
      doc.fillColor('#93c5fd')
         .fontSize(12)
         .text(`For the Month of ${salarySlip.month || 'Not Specified'}`, 0, 55, { align: 'center' });
      
      // Salary Slip Number and Date
      doc.fillColor('#ffffff')
         .fontSize(9)
         .text(`Slip No: ${salarySlip.id || 'SLIP-' + Date.now()}`, 450, 30);
      
      doc.text(`Generated On: ${salarySlip.date ? new Date(salarySlip.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 450, 45);

      // ==================== EMPLOYEE DETAILS SECTION ====================
      let yPos = 110;
      
      // Employee Details Card
      doc.rect(30, yPos, doc.page.width - 60, 80)
         .fill('#f8fafc')
         .stroke('#e2e8f0');
      
      doc.fillColor('#1e293b')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Employee Information', 40, yPos + 15);
      
      // Employee Details Grid
      const employeeDetails = [
        { label: 'Employee ID', value: employee.employeeId || 'N/A', x: 40 },
        { label: 'Employee Name', value: employee.name || 'N/A', x: 240 },
        { label: 'Designation', value: employee.position || 'N/A', x: 440 },
        { label: 'Department', value: employee.department || 'N/A', x: 40 },
        { label: 'Joining Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A', x: 240 },
        { label: 'Bank Account', value: salarySlip.bankAccount || 'Not Provided', x: 440 }
      ];
      
      doc.fontSize(10)
         .font('Helvetica');
      
      employeeDetails.forEach((detail, index) => {
        const rowY = yPos + 40 + (Math.floor(index / 3) * 20);
        
        doc.fillColor('#64748b')
           .text(`${detail.label}:`, detail.x, rowY);
        
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text(detail.value, detail.x + 80, rowY);
      });

      // ==================== SALARY BREAKDOWN SECTION ====================
      yPos += 110;
      
      // Section Title
      doc.fillColor('#1e293b')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Salary Breakdown', 30, yPos);
      
      yPos += 30;
      
      // Earnings Table
      const basicSalary = salarySlip.amount || 0;
      
      // Table Header
      doc.rect(30, yPos, doc.page.width - 60, 25)
         .fill('#1e3a8a')
         .stroke('#1e3a8a');
      
      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('EARNINGS', 40, yPos + 8);
      
      doc.text('AMOUNT (₹)', doc.page.width - 140, yPos + 8);
      
      yPos += 25;
      
      // Earnings Rows (Only Basic Salary)
      const earnings = [
        { description: 'Basic Salary', amount: basicSalary }
      ];
      
      earnings.forEach((earning, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        doc.rect(30, yPos, doc.page.width - 60, 25)
           .fill(rowColor)
           .stroke('#e2e8f0');
        
        doc.fillColor('#1e293b')
           .fontSize(10)
           .font('Helvetica')
           .text(earning.description, 40, yPos + 8);
        
        doc.font('Helvetica-Bold')
           .text(`₹ ${earning.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 140, yPos + 8);
        
        yPos += 25;
      });
      
      // Total Earnings Row
      doc.rect(30, yPos, doc.page.width - 60, 30)
         .fill('#dbeafe')
         .stroke('#93c5fd');
      
      doc.fillColor('#1e3a8a')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL EARNINGS', 40, yPos + 10);
      
      doc.text(`₹ ${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 140, yPos + 10);
      
      yPos += 40;
      
      // Deductions Table
      doc.fillColor('#1e293b')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DEDUCTIONS', 40, yPos);
      
      yPos += 10;
      
      // Deductions Header
      doc.rect(30, yPos, doc.page.width - 60, 25)
         .fill('#dc2626')
         .stroke('#dc2626');
      
      doc.fillColor('#ffffff')
         .text('DEDUCTIONS', 40, yPos + 8);
      
      doc.text('AMOUNT (₹)', doc.page.width - 140, yPos + 8);
      
      yPos += 25;
      
      // No Deductions (as per requirement)
      const deductions = [
        { description: 'No Deductions Applied', amount: 0 }
      ];
      
      deductions.forEach((deduction, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        doc.rect(30, yPos, doc.page.width - 60, 25)
           .fill(rowColor)
           .stroke('#e2e8f0');
        
        doc.fillColor('#64748b')
           .fontSize(10)
           .font('Helvetica')
           .text(deduction.description, 40, yPos + 8);
        
        doc.font('Helvetica-Bold')
           .fillColor('#dc2626')
           .text(`₹ ${deduction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 140, yPos + 8);
        
        yPos += 25;
      });
      
      // Total Deductions Row
      doc.rect(30, yPos, doc.page.width - 60, 30)
         .fill('#fee2e2')
         .stroke('#fca5a5');
      
      doc.fillColor('#dc2626')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL DEDUCTIONS', 40, yPos + 10);
      
      doc.text(`₹ ${0.00.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 140, yPos + 10);
      
      // ==================== NET SALARY SECTION ====================
      yPos += 50;
      
      // Net Salary Card
      doc.rect(30, yPos, doc.page.width - 60, 60)
         .fill('#10b981')
         .stroke('#10b981')
         .roundedCorners(8);
      
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('NET SALARY PAYABLE', 40, yPos + 10);
      
      doc.fontSize(24)
         .text(`₹ ${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 180, yPos + 8);
      
      // Amount in Words
      doc.fillColor('#ffffff')
         .fontSize(10)
         .font('Helvetica')
         .text(`In Words: ${numberToWords(basicSalary)} Rupees Only`, 40, yPos + 40);
      
      // ==================== PAYMENT DETAILS SECTION ====================
      yPos += 80;
      
      doc.fillColor('#1e293b')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Payment Details', 30, yPos);
      
      yPos += 25;
      
      const paymentDetails = [
        { label: 'Payment Mode', value: salarySlip.paymentMode || 'Bank Transfer' },
        { label: 'Payment Date', value: salarySlip.paymentDate || 'Last working day of month' },
        { label: 'Financial Year', value: salarySlip.financialYear || getFinancialYear() }
      ];
      
      paymentDetails.forEach((detail, index) => {
        doc.fillColor('#475569')
           .fontSize(10)
           .font('Helvetica')
           .text(`${detail.label}:`, 40 + (index * 200), yPos);
        
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text(detail.value, 40 + (index * 200) + 80, yPos);
      });
      
      // ==================== FOOTER SECTION ====================
      yPos += 40;
      
      // Disclaimer Box
      doc.rect(30, yPos, doc.page.width - 60, 40)
         .fill('#fef3c7')
         .stroke('#fbbf24');
      
      doc.fillColor('#92400e')
         .fontSize(8)
         .font('Helvetica')
         .text('Disclaimer:', 40, yPos + 10);
      
      doc.text('1. This is a computer-generated document and does not require a physical signature.', 40, yPos + 20);
      doc.text('2. Please verify all details and report discrepancies within 7 days of receipt.', 40, yPos + 30);
      
      // Final Signatures Area
      yPos += 60;
      
      // HR Signature
      doc.rect(100, yPos, 150, 40)
         .stroke('#cbd5e1');
      
      doc.fillColor('#64748b')
         .fontSize(9)
         .text('Authorized Signatory', 120, yPos + 15, { align: 'center', width: 110 });
      
      doc.text('HR Department', 120, yPos + 30, { align: 'center', width: 110 });
      
      // Employee Acknowledgment
      doc.rect(350, yPos, 150, 40)
         .stroke('#cbd5e1');
      
      doc.text('Employee Acknowledgment', 360, yPos + 15, { align: 'center', width: 130 });
      doc.text('(If required)', 360, yPos + 30, { align: 'center', width: 130 });
      
      // Page Footer
      doc.fillColor('#64748b')
         .fontSize(8)
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, doc.page.height - 30, { align: 'center' });
      
      doc.text(`Document Generated on: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 0, doc.page.height - 20, { align: 'center' });
      
      // Page Number (Only one page)
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8')
           .fontSize(8)
           .text(`Page ${i + 1} of ${pages.count}`, doc.page.width - 60, doc.page.height - 20);
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to convert number to words (Indian Number System)
function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertHundreds(n) {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }
  
  let result = '';
  let number = Math.floor(num);
  
  // Handle paise if any
  const paise = Math.round((num - number) * 100);
  
  // Crore
  if (number >= 10000000) {
    const crore = Math.floor(number / 10000000);
    result += convertHundreds(crore) + ' Crore ';
    number %= 10000000;
  }
  
  // Lakh
  if (number >= 100000) {
    const lakh = Math.floor(number / 100000);
    result += convertHundreds(lakh) + ' Lakh ';
    number %= 100000;
  }
  
  // Thousand
  if (number >= 1000) {
    const thousand = Math.floor(number / 1000);
    result += convertHundreds(thousand) + ' Thousand ';
    number %= 1000;
  }
  
  // Remainder
  if (number > 0) {
    result += convertHundreds(number);
  }
  
  result = result.trim() || 'Zero';
  
  // Add paise if any
  if (paise > 0) {
    result += ` and ${convertHundreds(paise)} Paise`;
  }
  
  return result;
}

// Helper function to get current financial year
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

module.exports = { generateSalarySlipPDF };
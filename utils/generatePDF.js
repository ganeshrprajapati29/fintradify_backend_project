const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateSalarySlipPDF = async (salarySlip, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
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
      doc.rect(0, 0, doc.page.width, 120)
         .fill('#1e3a8a');

      // Company Logo - Simplified to text only
      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('F', 55, 40);

      // Company Name and Details
      doc.fillColor('#ffffff')
         .fontSize(26)
         .font('Helvetica-Bold')
         .text('Fintradify', 120, 35);

      doc.fontSize(11)
         .font('Helvetica')
         .text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh, 201301', 120, 60);

      doc.text('Phone: +91 78360 09907 | Email: hr@fintradify.com', 120, 75);

      // Salary Slip Title
      doc.fillColor('#ffffff')
         .fontSize(32)
         .font('Helvetica-Bold')
         .text('SALARY SLIP', 0, 35, { align: 'center' });

      doc.fillColor('#93c5fd')
         .fontSize(14)
         .text(`For the Month of ${salarySlip.month || 'Not Specified'}`, 0, 65, { align: 'center' });

      // Salary Slip Number and Date
      doc.fillColor('#ffffff')
         .fontSize(10)
         .text(`Slip No: ${salarySlip._id || 'SLIP-' + Date.now()}`, 450, 35);

      doc.text(`Generated On: ${salarySlip.date ? new Date(salarySlip.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 450, 50);

      // ==================== EMPLOYEE DETAILS SECTION ====================
      let yPos = 140;

      // Employee Details Card
      doc.rect(50, yPos, doc.page.width - 100, 100)
         .fill('#f8fafc')
         .stroke('#e2e8f0');

      doc.fillColor('#1e293b')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Employee Information', 60, yPos + 20);

      // Employee Details in two columns
      doc.fontSize(11)
         .font('Helvetica');

      const leftColumn = [
        { label: 'Employee ID', value: employee.employeeId || 'N/A' },
        { label: 'Employee Name', value: employee.name || 'N/A' },
        { label: 'Department', value: employee.department || 'N/A' }
      ];

      const rightColumn = [
        { label: 'Designation', value: employee.position || 'N/A' },
        { label: 'Joining Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A' },
        { label: 'Bank Account', value: salarySlip.bankAccount || 'Not Provided' }
      ];

      leftColumn.forEach((detail, index) => {
        const rowY = yPos + 45 + (index * 18);
        doc.fillColor('#64748b')
           .text(`${detail.label}:`, 70, rowY);
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text(detail.value, 150, rowY);
      });

      rightColumn.forEach((detail, index) => {
        const rowY = yPos + 45 + (index * 18);
        doc.fillColor('#64748b')
           .text(`${detail.label}:`, 350, rowY);
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text(detail.value, 430, rowY);
      });

      // ==================== SALARY BREAKDOWN SECTION ====================
      yPos += 130;

      // Section Title
      doc.fillColor('#1e293b')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('Salary Breakdown', 50, yPos);

      yPos += 40;

      // Earnings Table
      const basicSalary = parseFloat(salarySlip.amount) || 0;

      // Table Header
      doc.rect(50, yPos, doc.page.width - 100, 30)
         .fill('#1e3a8a')
         .stroke('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('EARNINGS', 60, yPos + 10);

      doc.text('AMOUNT (₹)', doc.page.width - 150, yPos + 10);

      yPos += 30;

      // Earnings Rows
      const earnings = [
        { description: 'Basic Salary', amount: basicSalary }
      ];

      earnings.forEach((earning, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

        doc.rect(50, yPos, doc.page.width - 100, 30)
           .fill(rowColor)
           .stroke('#e2e8f0');

        doc.fillColor('#1e293b')
           .fontSize(11)
           .font('Helvetica')
           .text(earning.description, 60, yPos + 10);

        doc.font('Helvetica-Bold')
           .text(`₹ ${earning.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 150, yPos + 10);

        yPos += 30;
      });

      // Total Earnings Row
      doc.rect(50, yPos, doc.page.width - 100, 35)
         .fill('#dbeafe')
         .stroke('#93c5fd');

      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL EARNINGS', 60, yPos + 12);

      doc.text(`₹ ${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 150, yPos + 12);

      yPos += 50;

      // Deductions Table
      doc.fillColor('#1e293b')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('DEDUCTIONS', 60, yPos);

      yPos += 15;

      // Deductions Header
      doc.rect(50, yPos, doc.page.width - 100, 30)
         .fill('#dc2626')
         .stroke('#dc2626');

      doc.fillColor('#ffffff')
         .text('DEDUCTIONS', 60, yPos + 10);

      doc.text('AMOUNT (₹)', doc.page.width - 150, yPos + 10);

      yPos += 30;

      // No Deductions
      const deductions = [
        { description: 'No Deductions Applied', amount: 0 }
      ];

      deductions.forEach((deduction, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

        doc.rect(50, yPos, doc.page.width - 100, 30)
           .fill(rowColor)
           .stroke('#e2e8f0');

        doc.fillColor('#64748b')
           .fontSize(11)
           .font('Helvetica')
           .text(deduction.description, 60, yPos + 10);

        doc.font('Helvetica-Bold')
           .fillColor('#dc2626')
           .text(`₹ ${deduction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 150, yPos + 10);

        yPos += 30;
      });

      // Total Deductions Row
      doc.rect(50, yPos, doc.page.width - 100, 35)
         .fill('#fee2e2')
         .stroke('#fca5a5');

      doc.fillColor('#dc2626')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL DEDUCTIONS', 60, yPos + 12);

      doc.text(`₹ ${0.00.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 150, yPos + 12);

      // ==================== NET SALARY SECTION ====================
      yPos += 60;

      // Net Salary Card
      doc.rect(50, yPos, doc.page.width - 100, 70)
         .fill('#10b981')
         .stroke('#10b981')
         .roundedCorners(8);

      doc.fillColor('#ffffff')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('NET SALARY PAYABLE', 60, yPos + 15);

      doc.fontSize(26)
         .text(`₹ ${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, doc.page.width - 200, yPos + 12);

      // Amount in Words
      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica')
         .text(`In Words: ${numberToWords(basicSalary)} Rupees Only`, 60, yPos + 45);

      // ==================== PAYMENT DETAILS SECTION ====================
      yPos += 90;

      doc.fillColor('#1e293b')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Payment Details', 50, yPos);

      yPos += 30;

      const paymentDetails = [
        { label: 'Payment Mode', value: salarySlip.paymentMode || 'Bank Transfer' },
        { label: 'Payment Date', value: salarySlip.paymentDate || 'Last working day of month' },
        { label: 'Financial Year', value: salarySlip.financialYear || getFinancialYear() }
      ];

      paymentDetails.forEach((detail, index) => {
        doc.fillColor('#475569')
           .fontSize(11)
           .font('Helvetica')
           .text(`${detail.label}:`, 60 + (index * 180), yPos);

        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text(detail.value, 60 + (index * 180) + 90, yPos);
      });

      // ==================== FOOTER SECTION ====================
      yPos += 50;

      // Disclaimer Box
      doc.rect(50, yPos, doc.page.width - 100, 50)
         .fill('#fef3c7')
         .stroke('#fbbf24');

      doc.fillColor('#92400e')
         .fontSize(9)
         .font('Helvetica')
         .text('Disclaimer:', 60, yPos + 12);

      doc.text('1. This is a computer-generated document and does not require a physical signature.', 60, yPos + 25);
      doc.text('2. Please verify all details and report discrepancies within 7 days of receipt.', 60, yPos + 38);

      // Final Signatures Area
      yPos += 70;

      // HR Signature
      doc.rect(120, yPos, 150, 50)
         .stroke('#cbd5e1');

      doc.fillColor('#64748b')
         .fontSize(10)
         .text('Authorized Signatory', 140, yPos + 18, { align: 'center', width: 110 });

      doc.text('HR Department', 140, yPos + 35, { align: 'center', width: 110 });

      // Employee Acknowledgment
      doc.rect(350, yPos, 150, 50)
         .stroke('#cbd5e1');

      doc.text('Employee Acknowledgment', 370, yPos + 18, { align: 'center', width: 130 });
      doc.text('(If required)', 370, yPos + 35, { align: 'center', width: 130 });

      // Page Footer
      doc.fillColor('#64748b')
         .fontSize(9)
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, doc.page.height - 40, { align: 'center' });

      doc.text(`Document Generated on: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 0, doc.page.height - 25, { align: 'center' });

      // Page Number (assuming single page)
      doc.fillColor('#94a3b8')
         .fontSize(9)
         .text(`Page 1 of 1`, doc.page.width - 70, doc.page.height - 25);

      doc.end();

    } catch (error) {
      console.error('PDF Generation Error:', error);
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
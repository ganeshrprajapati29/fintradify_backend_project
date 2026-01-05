const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateSalarySlipPDF = async (salarySlip, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 20,
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
      doc.rect(0, 0, doc.page.width, 100)
         .fill('#1e3a8a');

      // Company Logo
      const logoPath = path.join(__dirname, '../assets/logoo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 20, 15, { width: 50, height: 50 });
      } else {
        doc.fillColor('#ffffff')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('F', 40, 30);
      }

      // Company Info
      doc.fillColor('#ffffff')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('FINTRADIFY', 80, 18);

      doc.fontSize(9)
         .font('Helvetica')
         .text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301', 80, 40);

      doc.text('Phone: +91 78360 09907 | Email: hr@fintradify.com', 80, 50);

      // Salary Slip Title
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('SALARY SLIP', 300, 30, { align: 'right', width: 250 });

      doc.fontSize(10)
         .text(`Month: ${salarySlip.month || 'N/A'}`, 300, 52, { align: 'right', width: 250 });

      doc.fontSize(9)
         .text(`Slip ID: ${salarySlip._id || 'SLIP-' + Date.now()}`, 300, 65, { align: 'right', width: 250 });

      doc.text(`Date: ${salarySlip.date ? new Date(salarySlip.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 300, 77, { align: 'right', width: 250 });

      // ==================== EMPLOYEE DETAILS SECTION ====================
      let yPos = 115;

      doc.rect(20, yPos, doc.page.width - 40, 60)
         .fill('#f0f4f8')
         .stroke('#cbd5e1');

      doc.fillColor('#1e293b')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Employee Details', 30, yPos + 8);

      // Employee Info in grid
      const empDetailsLeft = [
        { label: 'Emp ID:', value: employee.employeeId || 'N/A' },
        { label: 'Name:', value: employee.name || 'N/A' }
      ];

      const empDetailsMiddle = [
        { label: 'Department:', value: employee.department || 'N/A' },
        { label: 'Position:', value: employee.position || 'N/A' }
      ];

      const empDetailsRight = [
        { label: 'Joining Date:', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A' },
        { label: 'Bank Name:', value: salarySlip.bankName || 'N/A' },
        { label: 'Bank A/C:', value: salarySlip.bankAccount ? salarySlip.bankAccount.slice(-4).padStart(salarySlip.bankAccount.length, '*') : 'N/A' }
      ];

      empDetailsLeft.forEach((detail, index) => {
        const rowY = yPos + 28 + (index * 14);
        doc.fillColor('#64748b')
           .fontSize(9)
           .font('Helvetica')
           .text(detail.label, 30, rowY);
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(detail.value, 80, rowY);
      });

      empDetailsMiddle.forEach((detail, index) => {
        const rowY = yPos + 28 + (index * 14);
        doc.fillColor('#64748b')
           .fontSize(9)
           .font('Helvetica')
           .text(detail.label, 240, rowY);
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(detail.value, 310, rowY);
      });

      empDetailsRight.forEach((detail, index) => {
        const rowY = yPos + 28 + (index * 14);
        doc.fillColor('#64748b')
           .fontSize(9)
           .font('Helvetica')
           .text(detail.label, 430, rowY);
        doc.fillColor('#1e293b')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(detail.value, 500, rowY);
      });

      // ==================== SALARY BREAKDOWN ====================
      yPos += 80;

      // Earnings Header
      doc.rect(20, yPos, (doc.page.width - 40) / 2 - 5, 22)
         .fill('#1e3a8a')
         .stroke('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('EARNINGS', 28, yPos + 6);

      doc.text('Amount', (doc.page.width / 2) - 50, yPos + 6, { align: 'right' });

      // Deductions Header
      doc.rect((doc.page.width / 2) + 5, yPos, (doc.page.width - 40) / 2 - 5, 22)
         .fill('#dc2626')
         .stroke('#dc2626');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DEDUCTIONS', (doc.page.width / 2) + 13, yPos + 6);

      doc.text('Amount', doc.page.width - 30, yPos + 6, { align: 'right' });

      yPos += 22;

      // Earnings Data
      const earnings = [
        { description: 'Basic Pay', amount: salarySlip.basicPay || 0 }
      ];

      const deductions = [
        { description: 'Provident Fund', amount: salarySlip.pf || 0 },
        { description: 'Professional Tax', amount: salarySlip.professionalTax || 0 },
        { description: 'Gratuity', amount: salarySlip.gratuity || 0 },
        { description: 'Other Deductions', amount: salarySlip.otherDeductions || 0 }
      ];

      const maxRows = Math.max(earnings.length, deductions.length);

      for (let i = 0; i < maxRows; i++) {
        const rowHeight = 18;
        const rowColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Earnings Row
        doc.rect(20, yPos, (doc.page.width - 40) / 2 - 5, rowHeight)
           .fill(rowColor)
           .stroke('#e2e8f0');

        if (earnings[i]) {
          doc.fillColor('#1e293b')
             .fontSize(9)
             .font('Helvetica')
             .text(earnings[i].description, 28, yPos + 4);

          doc.font('Helvetica-Bold')
             .fillColor('#1e3a8a')
             .fontSize(9)
             .text(`INR ${earnings[i].amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, yPos + 4, { align: 'right', width: (doc.page.width / 2) - 50 });
        }

        // Deductions Row
        doc.rect((doc.page.width / 2) + 5, yPos, (doc.page.width - 40) / 2 - 5, rowHeight)
           .fill(rowColor)
           .stroke('#e2e8f0');

        if (deductions[i]) {
          doc.fillColor('#1e293b')
             .fontSize(9)
             .font('Helvetica')
             .text(deductions[i].description, (doc.page.width / 2) + 13, yPos + 4);

          doc.font('Helvetica-Bold')
             .fillColor('#dc2626')
             .fontSize(9)
             .text(`INR ${deductions[i].amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, (doc.page.width / 2) + 5, yPos + 4, { align: 'right', width: (doc.page.width / 2) - 50 });
        }

        yPos += rowHeight;
      }

      // Total Earnings
      doc.rect(20, yPos, (doc.page.width - 40) / 2 - 5, 20)
         .fill('#dbeafe')
         .stroke('#93c5fd');

      doc.fillColor('#1e3a8a')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('TOTAL EARNINGS', 28, yPos + 4);

      doc.text(`INR ${(salarySlip.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, yPos + 4, { align: 'right', width: (doc.page.width / 2) - 50 });

      // Total Deductions
      doc.rect((doc.page.width / 2) + 5, yPos, (doc.page.width - 40) / 2 - 5, 20)
         .fill('#fee2e2')
         .stroke('#fca5a5');

      doc.fillColor('#dc2626')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('TOTAL DEDUCTIONS', (doc.page.width / 2) + 13, yPos + 4);

      doc.text(`INR ${(salarySlip.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, (doc.page.width / 2) + 5, yPos + 4, { align: 'right', width: (doc.page.width / 2) - 50 });

      yPos += 30;

      // ==================== NET SALARY ====================
      doc.roundedRect(20, yPos, doc.page.width - 40, 50, 5)
         .fill('#10b981')
         .stroke('#10b981');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica')
         .text('NET SALARY PAYABLE', 28, yPos + 8);

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text(`INR ${(salarySlip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 28, yPos + 22);

      doc.fontSize(9)
         .font('Helvetica')
         .text(`In Words: ${numberToWords(salarySlip.netSalary || 0)} INR Only`, 28, yPos + 38);

      yPos += 65;

      // ==================== PAYMENT DETAILS ====================
      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Payment Details', 20, yPos);

      yPos += 15;

      const payDetails = [
        `Mode: ${salarySlip.paymentMode || 'Bank Transfer'}`,
        `Date: ${salarySlip.paymentDate || 'Last working day of month'}`,
        `FY: ${salarySlip.financialYear || getFinancialYear()}`
      ];

      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica');

      payDetails.forEach((detail, index) => {
        doc.text(detail, 20 + (index * 180), yPos);
      });

      // ==================== FOOTER ====================
      yPos += 20;

      doc.rect(20, yPos, doc.page.width - 40, 35)
         .fill('#fef3c7')
         .stroke('#fbbf24');

      doc.fillColor('#92400e')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Disclaimer:', 28, yPos + 6);

      doc.fontSize(8)
         .font('Helvetica')
         .text('1. Computer generated document, no signature required. 2. Report discrepancies within 7 days.', 28, yPos + 18, { width: doc.page.width - 56 });

      yPos += 50;

      // Signature Area
      doc.rect(20, yPos, (doc.page.width - 50) / 2, 35)
         .stroke('#cbd5e1');

      // Manager Signature Image
      const signaturePath = path.join(__dirname, '../assets/manager.jpeg');
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, 30, yPos + 5, { width: 50, height: 25 });
      }

      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Manager Signature', 30, yPos + 15, { align: 'center', width: (doc.page.width - 70) / 2 });

      doc.rect((doc.page.width - 50) / 2 + 30, yPos, (doc.page.width - 50) / 2, 35)
         .stroke('#cbd5e1');

      // Co-Founder Signature Image
      const coFounderSignaturePath = path.join(__dirname, '../assets/co-founder.jpeg');
      if (fs.existsSync(coFounderSignaturePath)) {
        doc.image(coFounderSignaturePath, (doc.page.width - 50) / 2 + 40, yPos + 5, { width: 50, height: 25 });
      }

      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Co-Founder Signature', (doc.page.width - 50) / 2 + 40, yPos + 15, { align: 'center', width: (doc.page.width - 70) / 2 });

      // Bottom Footer
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, doc.page.height - 18, { align: 'center' });

      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Page 1`, 0, doc.page.height - 10, { align: 'center' });

      doc.end();

    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};

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
  const paise = Math.round((num - number) * 100);
  
  if (number >= 10000000) {
    const crore = Math.floor(number / 10000000);
    result += convertHundreds(crore) + ' Crore ';
    number %= 10000000;
  }
  
  if (number >= 100000) {
    const lakh = Math.floor(number / 100000);
    result += convertHundreds(lakh) + ' Lakh ';
    number %= 100000;
  }
  
  if (number >= 1000) {
    const thousand = Math.floor(number / 1000);
    result += convertHundreds(thousand) + ' Thousand ';
    number %= 1000;
  }
  
  if (number > 0) {
    result += convertHundreds(number);
  }
  
  result = result.trim() || 'Zero';
  
  if (paise > 0) {
    result += ` and ${convertHundreds(paise)} Paise`;
  }
  
  return result;
}

function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

module.exports = { generateSalarySlipPDF };
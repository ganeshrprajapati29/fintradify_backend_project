const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateSalarySlipPDF = async (salarySlip, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 20,
        bufferPages: true,
        info: {
          Title: `Salary Slip - ${employee.name || 'Employee'}`,
          Author: 'Fintradify HR System',
          Subject: 'Salary Slip',
          Keywords: 'salary, payslip, payroll',
          CreationDate: new Date()
        }
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
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('FINTRADIFY', 80, 20);

      doc.fontSize(8)
         .font('Helvetica')
         .text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301', 80, 38);

      doc.text('Phone: +91 78360 09907 | Email: hr@fintradify.com', 80, 50);

      // Salary Slip Title
      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('SALARY SLIP', doc.page.width - 220, 20, { align: 'right', width: 200 });

      doc.fontSize(9)
         .text(`Month: ${salarySlip.month || 'N/A'}`, doc.page.width - 220, 40, { align: 'right', width: 200 });

      doc.text(`Slip ID: ${salarySlip._id || 'SLIP-' + Date.now().toString().slice(-8)}`, doc.page.width - 220, 52, { align: 'right', width: 200 });

      const slipDate = salarySlip.date ? new Date(salarySlip.date) : new Date();
      doc.text(`Date: ${slipDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, doc.page.width - 220, 64, { align: 'right', width: 200 });

      // ==================== EMPLOYEE DETAILS SECTION ====================
      let yPos = 115;

      doc.rect(20, yPos, doc.page.width - 40, 70) // Increased height for bank details
         .fill('#f0f4f8')
         .stroke('#cbd5e1');

      doc.fillColor('#1e293b')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Employee Details', 30, yPos + 8);

      // Employee Info in grid layout - 3 columns with proper spacing
      const leftColumnX = 30;
      const middleColumnX = 240;
      const rightColumnX = 430;
      const labelWidth = 80; // Increased for better alignment
      const valueWidth = 130; // Width for value fields
      
      // Left Column - Employee ID & Name
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Emp ID:', leftColumnX, yPos + 28);
      
      const empId = employee.employeeId || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(truncateText(doc, empId, valueWidth, 9), leftColumnX + labelWidth, yPos + 28);
      
      doc.fillColor('#64748b')
         .font('Helvetica')
         .text('Name:', leftColumnX, yPos + 42);
      
      const employeeName = employee.name || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(truncateText(doc, employeeName, valueWidth, 9), leftColumnX + labelWidth, yPos + 42);

      // Middle Column - Department & Position
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Department:', middleColumnX, yPos + 28);
      
      const department = employee.department || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(truncateText(doc, department, valueWidth, 9), middleColumnX + labelWidth, yPos + 28);
      
      doc.fillColor('#64748b')
         .font('Helvetica')
         .text('Position:', middleColumnX, yPos + 42);
      
      const position = employee.position || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(truncateText(doc, position, valueWidth, 9), middleColumnX + labelWidth, yPos + 42);

      // Right Column - Joining Date & Bank Details
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Joining Date:', rightColumnX, yPos + 28);
      
      const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(joiningDate, rightColumnX + labelWidth, yPos + 28);
      
      // Bank Name - Row 2
      doc.fillColor('#64748b')
         .font('Helvetica')
         .text('Bank Name:', rightColumnX, yPos + 42);
      
      const bankName = employee.bankName || employee.bank_name || 'N/A';
      const truncatedBankName = truncateText(doc, bankName, valueWidth - 10, 9);
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(truncatedBankName, rightColumnX + labelWidth, yPos + 42);

      // Bank Account - Row 3
      doc.fillColor('#64748b')
         .font('Helvetica')
         .text('Bank A/C:', rightColumnX, yPos + 56);
      
      const bankAccount = salarySlip.bankAccount || employee.bankAccount || '';
      const maskedAccount = bankAccount ? '••••' + bankAccount.slice(-4) : 'N/A';
      
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(maskedAccount, rightColumnX + labelWidth, yPos + 56);

      // ==================== SALARY BREAKDOWN ====================
      yPos += 85;

      // Calculate column widths
      const columnWidth = (doc.page.width - 40) / 2;
      const leftBoxX = 20;
      const rightBoxX = leftBoxX + columnWidth + 5;

      // Earnings Header
      doc.rect(leftBoxX, yPos, columnWidth - 5, 22)
         .fill('#1e3a8a')
         .stroke('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('EARNINGS', leftBoxX + 8, yPos + 6);

      // Deductions Header
      doc.rect(rightBoxX, yPos, columnWidth - 5, 22)
         .fill('#dc2626')
         .stroke('#dc2626');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DEDUCTIONS', rightBoxX + 8, yPos + 6);

      yPos += 22;

      // Prepare earnings and deductions data
      const earnings = [];
      const deductions = [];
      
      // Add Basic Pay to earnings
      if (salarySlip.basicPay || salarySlip.basicPay === 0) {
        earnings.push({ description: 'Basic Pay', amount: salarySlip.basicPay });
      }
      
      // Add other earnings components (always show all, even if zero)
      const earningComponents = [
        { key: 'hra', label: 'House Rent Allowance' },
        { key: 'specialAllowance', label: 'Special Allowance' },
        { key: 'conveyance', label: 'Conveyance Allowance' },
        { key: 'medicalAllowance', label: 'Medical Allowance' },
        { key: 'bonus', label: 'Bonus' },
        { key: 'overtime', label: 'Overtime' },
        { key: 'otherAllowances', label: 'Other Allowances' }
      ];

      earningComponents.forEach(item => {
        const amount = salarySlip[item.key] || 0;
        earnings.push({ description: item.label, amount: amount });
      });

      // Add standard deductions (always show all, even if zero)
      const deductionComponents = [
        { key: 'pf', label: 'Provident Fund (PF)' },
        { key: 'professionalTax', label: 'Professional Tax' },
        { key: 'tds', label: 'Income Tax (TDS)' },
        { key: 'gratuity', label: 'Gratuity' },
        { key: 'esi', label: 'Employee State Insurance (ESI)' },
        { key: 'loan', label: 'Loan Recovery' },
        { key: 'otherDeductions', label: 'Other Deductions' }
      ];

      deductionComponents.forEach(item => {
        const amount = salarySlip[item.key] || 0;
        deductions.push({ description: item.label, amount: amount });
      });

      const maxRows = Math.max(earnings.length, deductions.length);

      for (let i = 0; i < maxRows; i++) {
        const rowHeight = 18;
        const rowColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Earnings Row
        doc.rect(leftBoxX, yPos, columnWidth - 5, rowHeight)
           .fill(rowColor)
           .stroke('#e2e8f0');

        if (earnings[i]) {
          // Truncate description to fit column
          const description = truncateText(doc, earnings[i].description, columnWidth - 100, 9);
          
          doc.fillColor('#1e293b')
             .fontSize(9)
             .font('Helvetica')
             .text(description, leftBoxX + 8, yPos + 4);

          const amountText = `INR ${formatNumber(earnings[i].amount)}`;
          doc.font('Helvetica-Bold')
             .fillColor('#1e3a8a')
             .fontSize(9)
             .text(amountText, leftBoxX, yPos + 4, { 
               align: 'right', 
               width: columnWidth - 13 
             });
        }

        // Deductions Row
        doc.rect(rightBoxX, yPos, columnWidth - 5, rowHeight)
           .fill(rowColor)
           .stroke('#e2e8f0');

        if (deductions[i]) {
          // Truncate description to fit column
          const description = truncateText(doc, deductions[i].description, columnWidth - 100, 9);
          
          doc.fillColor('#1e293b')
             .fontSize(9)
             .font('Helvetica')
             .text(description, rightBoxX + 8, yPos + 4);

          const amountText = `INR ${formatNumber(deductions[i].amount)}`;
          doc.font('Helvetica-Bold')
             .fillColor('#dc2626')
             .fontSize(9)
             .text(amountText, rightBoxX, yPos + 4, { 
               align: 'right', 
               width: columnWidth - 13 
             });
        }

        yPos += rowHeight;
      }

      // Total Earnings
      doc.rect(leftBoxX, yPos, columnWidth - 5, 20)
         .fill('#dbeafe')
         .stroke('#93c5fd');

      doc.fillColor('#1e3a8a')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('TOTAL EARNINGS', leftBoxX + 8, yPos + 4);

      const totalEarnings = salarySlip.totalEarnings || 
                          earnings.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      doc.text(`INR ${formatNumber(totalEarnings)}`, leftBoxX, yPos + 4, { 
        align: 'right', 
        width: columnWidth - 13 
      });

      // Total Deductions
      doc.rect(rightBoxX, yPos, columnWidth - 5, 20)
         .fill('#fee2e2')
         .stroke('#fca5a5');

      doc.fillColor('#dc2626')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('TOTAL DEDUCTIONS', rightBoxX + 8, yPos + 4);

      const totalDeductions = salarySlip.totalDeductions || 
                             deductions.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      doc.text(`INR ${formatNumber(totalDeductions)}`, rightBoxX, yPos + 4, { 
        align: 'right', 
        width: columnWidth - 13 
      });

      yPos += 30;

      // ==================== NET SALARY ====================
      const netSalary = salarySlip.netSalary || totalEarnings - totalDeductions;
      
      doc.roundedRect(20, yPos, doc.page.width - 40, 50, 5)
         .fill('#10b981')
         .stroke('#10b981');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('NET SALARY PAYABLE', 28, yPos + 8);

      doc.fontSize(16)
         .text(`INR ${formatNumber(netSalary, true)}`, 28, yPos + 22);

      // Convert amount to words
      const amountInWords = numberToWords(netSalary);
      const wordsText = `In Words: ${amountInWords} INR Only`;
      
      // Check if text fits in one line
      const wordsWidth = doc.widthOfString(wordsText, { fontSize: 9 });
      if (wordsWidth > (doc.page.width - 80)) {
        doc.fontSize(8)
           .font('Helvetica')
           .text(wordsText, 28, yPos + 38, { width: doc.page.width - 56 });
      } else {
        doc.fontSize(9)
           .font('Helvetica')
         .text(wordsText, 28, yPos + 38);
      }

      yPos += 65;

      // ==================== PAYMENT DETAILS ====================
      doc.fillColor('#1e293b') 
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Payment Details', 20, yPos);

      yPos += 15;

      const payDetails = [
        `Payroll Number: ${salarySlip.payrollNumber || 'N/A'}`,
        `Pay Type: ${salarySlip.payType || 'Monthly'}`,
        `Period: ${salarySlip.period || getCurrentMonthYear()}`,
        `Pay Date: ${salarySlip.payDate ? new Date(salarySlip.payDate).toLocaleDateString('en-IN') : slipDate.toLocaleDateString('en-IN')}`,
        `Mode: ${salarySlip.paymentMode || 'Bank Transfer'}`,
        `FY: ${salarySlip.financialYear || getFinancialYear()}`
      ];

      // Arrange payment details in two rows
      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica');

      // First row (first 3 items)
      payDetails.slice(0, 3).forEach((detail, index) => {
        doc.text(detail, 20 + (index * 180), yPos);
      });

      // Second row (next 3 items)
      yPos += 14;
      payDetails.slice(3, 6).forEach((detail, index) => {
        doc.text(detail, 20 + (index * 180), yPos);
      });

      // ==================== FOOTER ====================
      yPos += 24;

      // Disclaimer box
      const disclaimerHeight = 35;
      doc.rect(20, yPos, doc.page.width - 40, disclaimerHeight)
         .fill('#fef3c7')
         .stroke('#fbbf24');

      doc.fillColor('#92400e')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Disclaimer:', 28, yPos + 8);

      doc.fontSize(8)
         .font('Helvetica')
         .text('1. This is a computer generated document and does not require a signature.', 28, yPos + 18, { width: doc.page.width - 56 });

      doc.text('2. Please report any discrepancies within 7 days of receiving this slip.', 28, yPos + 26, { width: doc.page.width - 56 });

      yPos += disclaimerHeight + 15;

      // ==================== SIGNATURE SECTION ====================
      const signatureBoxWidth = (doc.page.width - 60) / 2;
      const signatureBoxHeight = 55; // Increased height
      const signatureBoxY = yPos;
      
      // Manager Signature Box (Left)
      doc.rect(30, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .fill('#f8fafc')
         .stroke('#1e3a8a')
         .lineWidth(1);
      
      // Manager Signature Image
      const managerSignaturePath = path.join(__dirname, '../assets/manager.jpeg');
      const managerSignatureX = 30 + (signatureBoxWidth / 2) - 25;
      
      if (fs.existsSync(managerSignaturePath)) {
        try {
          doc.image(managerSignaturePath, managerSignatureX, signatureBoxY + 10, { 
            width: 50, 
            height: 25,
            fit: [50, 25] // Ensure proper fit
          });
        } catch (err) {
          console.warn('Could not load manager signature:', err.message);
          // Draw placeholder
          doc.fillColor('#cbd5e1')
             .fontSize(24)
             .text('✍️', managerSignatureX + 10, signatureBoxY + 10);
        }
      } else {
        // Draw placeholder
        doc.fillColor('#cbd5e1')
           .fontSize(24)
           .text('✍️', managerSignatureX + 10, signatureBoxY + 10);
      }
      
      // Manager Signature Line
      doc.moveTo(30 + 15, signatureBoxY + 38)
         .lineTo(30 + signatureBoxWidth - 15, signatureBoxY + 38)
         .stroke('#1e3a8a')
         .lineWidth(0.5);
      
      // Manager Text
      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('MANAGER', 30, signatureBoxY + 42, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('Authorized Signatory', 30, signatureBoxY + 48, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // Co-Founder Signature Box (Right)
      const coFounderX = 30 + signatureBoxWidth + 10;
      doc.rect(coFounderX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .fill('#f8fafc')
         .stroke('#1e3a8a')
         .lineWidth(1);
      
      // Co-Founder Signature Image
      const coFounderSignaturePath = path.join(__dirname, '../assets/co-founder.jpeg');
      const coFounderSignatureX = coFounderX + (signatureBoxWidth / 2) - 25;
      
      if (fs.existsSync(coFounderSignaturePath)) {
        try {
          doc.image(coFounderSignaturePath, coFounderSignatureX, signatureBoxY + 10, { 
            width: 50, 
            height: 25,
            fit: [50, 25]
          });
        } catch (err) {
          console.warn('Could not load co-founder signature:', err.message);
          // Draw placeholder
          doc.fillColor('#cbd5e1')
             .fontSize(24)
             .text('✍️', coFounderSignatureX + 10, signatureBoxY + 10);
        }
      } else {
        // Draw placeholder
        doc.fillColor('#cbd5e1')
           .fontSize(24)
           .text('✍️', coFounderSignatureX + 10, signatureBoxY + 10);
      }
      
      // Co-Founder Signature Line
      doc.moveTo(coFounderX + 15, signatureBoxY + 38)
         .lineTo(coFounderX + signatureBoxWidth - 15, signatureBoxY + 38)
         .stroke('#1e3a8a')
         .lineWidth(0.5);
      
      // Co-Founder Text
      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('CO-FOUNDER', coFounderX, signatureBoxY + 42, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('Authorized Signatory', coFounderX, signatureBoxY + 48, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // ==================== BOTTOM FOOTER ====================
      const footerY = doc.page.height - 25;
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, footerY, { align: 'center' });

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Page 1`, 0, footerY + 10, { align: 'center' });

      doc.end();

    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};

// Helper function to truncate text if too long
function truncateText(doc, text, maxWidth, fontSize) {
  if (!text) return 'N/A';
  
  const ellipsis = '...';
  let truncated = text;
  
  // Check if text fits in the given width
  while (doc.widthOfString(truncated, { fontSize: fontSize }) > maxWidth && truncated.length > 3) {
    truncated = truncated.substring(0, truncated.length - 1);
  }
  
  // Add ellipsis if text was truncated
  if (truncated.length < text.length) {
    truncated = truncated.substring(0, truncated.length - 3) + ellipsis;
  }
  
  return truncated;
}

// Helper function to format numbers with Indian numbering system
function formatNumber(amount, large = false) {
  if (amount === undefined || amount === null) amount = 0;
  return parseFloat(amount).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Helper function to get current month and year
function getCurrentMonthYear() {
  const now = new Date();
  return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Helper function to get financial year
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(-2)}`;
}

// Number to words conversion
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
  
  // Handle Crores
  if (number >= 10000000) {
    const crore = Math.floor(number / 10000000);
    result += convertHundreds(crore) + ' Crore ';
    number %= 10000000;
  }
  
  // Handle Lakhs
  if (number >= 100000) {
    const lakh = Math.floor(number / 100000);
    result += convertHundreds(lakh) + ' Lakh ';
    number %= 100000;
  }
  
  // Handle Thousands
  if (number >= 1000) {
    const thousand = Math.floor(number / 1000);
    result += convertHundreds(thousand) + ' Thousand ';
    number %= 1000;
  }
  
  // Handle Hundreds
  if (number > 0) {
    result += convertHundreds(number);
  }
  
  result = result.trim() || 'Zero';
  
  // Handle Paise
  if (paise > 0) {
    result += ` and ${convertHundreds(paise)} Paise`;
  }
  
  return result;
}

module.exports = { generateSalarySlipPDF };
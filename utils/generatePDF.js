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

      // Employee details box height based on content
      const employeeDetailsHeight = 70;
      doc.rect(20, yPos, doc.page.width - 40, employeeDetailsHeight)
         .fill('#f0f4f8')
         .stroke('#cbd5e1');

      doc.fillColor('#1e293b')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Employee Details', 30, yPos + 8);

      // Define column positions
      const col1X = 30; // Left column
      const col2X = 220; // Middle column
      const col3X = 410; // Right column
      const labelWidth = 75;
      const valueWidth = 120;

      // Row 1
      const row1Y = yPos + 28;
      
      // Column 1: Emp ID
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Emp ID:', col1X, row1Y);
      
      const empId = employee.employeeId || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(empId, col1X + labelWidth, row1Y);

      // Column 2: Department
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Department:', col2X, row1Y);
      
      const department = employee.department || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(department, col2X + labelWidth, row1Y);

      // Column 3: Joining Date
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Joining Date:', col3X, row1Y);
      
      const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(joiningDate, col3X + labelWidth, row1Y);

      // Row 2
      const row2Y = row1Y + 14;
      
      // Column 1: Name
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Name:', col1X, row2Y);
      
      const employeeName = employee.name || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(employeeName, col1X + labelWidth, row2Y, { width: valueWidth });

      // Column 2: Position
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Position:', col2X, row2Y);
      
      const position = employee.position || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(position, col2X + labelWidth, row2Y, { width: valueWidth });

      // Column 3: Bank Name (FIXED: Now on separate row)
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Bank Name:', col3X, row2Y);
      
      const bankName = employee.bankName || employee.bank_name || 'N/A';
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(bankName, col3X + labelWidth, row2Y, { width: valueWidth });

      // Row 3 - Only for Bank Account
      const row3Y = row2Y + 14;
      
      // Column 3: Bank Account (New row, only in right column)
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text('Bank A/C:', col3X, row3Y);
      
      const bankAccount = salarySlip.bankAccount || employee.bankAccount || '';
      const maskedAccount = bankAccount ? '••••' + bankAccount.slice(-4) : 'N/A';
      
      doc.fillColor('#1e293b')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(maskedAccount, col3X + labelWidth, row3Y);

      // ==================== SALARY BREAKDOWN ====================
      yPos += employeeDetailsHeight + 10;

      // Calculate column widths for earnings and deductions
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

      doc.text('Amount', leftBoxX + columnWidth - 15, yPos + 6, { align: 'right' });

      // Deductions Header
      doc.rect(rightBoxX, yPos, columnWidth - 5, 22)
         .fill('#dc2626')
         .stroke('#dc2626');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DEDUCTIONS', rightBoxX + 8, yPos + 6);

      doc.text('Amount', rightBoxX + columnWidth - 15, yPos + 6, { align: 'right' });

      yPos += 22;

      // Prepare earnings and deductions data with limited items to fit on one page
      const earnings = [];
      const deductions = [];
      
      // Add Basic Pay to earnings (always show)
      earnings.push({ description: 'Basic Pay', amount: salarySlip.basicPay || 0 });
      
      // Add limited earnings components to fit on one page
      const earningComponents = [
        { key: 'hra', label: 'House Rent Allowance' },
        { key: 'specialAllowance', label: 'Special Allowance' },
        { key: 'conveyance', label: 'Conveyance Allowance' },
        { key: 'medicalAllowance', label: 'Medical Allowance' }
      ];

      earningComponents.forEach(item => {
        const amount = salarySlip[item.key] || 0;
        if (amount > 0 || earnings.length < 6) { // Limit to 6 items max
          earnings.push({ description: item.label, amount: amount });
        }
      });

      // Add bonus and overtime only if they have value
      if (salarySlip.bonus && salarySlip.bonus > 0 && earnings.length < 6) {
        earnings.push({ description: 'Bonus', amount: salarySlip.bonus });
      }
      if (salarySlip.overtime && salarySlip.overtime > 0 && earnings.length < 6) {
        earnings.push({ description: 'Overtime', amount: salarySlip.overtime });
      }

      // Add standard deductions (limited to fit on one page)
      const deductionComponents = [
        { key: 'pf', label: 'Provident Fund' },
        { key: 'professionalTax', label: 'Professional Tax' },
        { key: 'tds', label: 'Income Tax' },
        { key: 'gratuity', label: 'Gratuity' },
        { key: 'esi', label: 'ESI' }
      ];

      deductionComponents.forEach(item => {
        const amount = salarySlip[item.key] || 0;
        if (amount > 0 || deductions.length < 6) { // Limit to 6 items max
          deductions.push({ description: item.label, amount: amount });
        }
      });

      // Add other deductions only if they have value
      if (salarySlip.otherDeductions && salarySlip.otherDeductions > 0 && deductions.length < 6) {
        deductions.push({ description: 'Other Deductions', amount: salarySlip.otherDeductions });
      }

      // Ensure we have at least one item in each section
      if (earnings.length === 0) {
        earnings.push({ description: 'Basic Pay', amount: 0 });
      }
      if (deductions.length === 0) {
        deductions.push({ description: 'No Deductions', amount: 0 });
      }

      // Limit to maximum 7 rows to fit on one page
      const maxRows = Math.min(Math.max(earnings.length, deductions.length), 7);

      for (let i = 0; i < maxRows; i++) {
        const rowHeight = 18;
        const rowColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Check if we have space on the page
        if (yPos + rowHeight > doc.page.height - 150) {
          break; // Stop adding rows if we're running out of space
        }

        // Earnings Row
        doc.rect(leftBoxX, yPos, columnWidth - 5, rowHeight)
           .fill(rowColor)
           .stroke('#e2e8f0');

        if (earnings[i]) {
          // Truncate description to fit column
          let description = earnings[i].description;
          if (description.length > 25) {
            description = description.substring(0, 22) + '...';
          }
          
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
          let description = deductions[i].description;
          if (description.length > 25) {
            description = description.substring(0, 22) + '...';
          }
          
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

      // Check if we have space for totals
      if (yPos + 20 > doc.page.height - 200) {
        // If not enough space, move to next column logic
        yPos = doc.page.height - 200;
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
      // Check if we have space for net salary section
      if (yPos + 50 > doc.page.height - 150) {
        yPos = doc.page.height - 200;
      }

      const netSalary = salarySlip.netSalary || totalEarnings - totalDeductions;
      
      doc.roundedRect(20, yPos, doc.page.width - 40, 45, 5)
         .fill('#10b981')
         .stroke('#10b981');

      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('NET SALARY PAYABLE', 28, yPos + 8);

      doc.fontSize(16)
         .text(`INR ${formatNumber(netSalary)}`, 28, yPos + 22);

      // Convert amount to words (shortened if too long)
      const amountInWords = numberToWords(netSalary);
      const wordsText = `In Words: ${amountInWords} INR Only`;
      
      // Check if text fits in one line
      const wordsWidth = doc.widthOfString(wordsText, { fontSize: 9 });
      if (wordsWidth > (doc.page.width - 80)) {
        // Shorten the words text
        const shortWords = `In Words: ${amountInWords.substring(0, 60)}... INR Only`;
        doc.fontSize(8)
           .font('Helvetica')
           .text(shortWords, 28, yPos + 38, { width: doc.page.width - 56 });
      } else {
        doc.fontSize(9)
           .font('Helvetica')
           .text(wordsText, 28, yPos + 38);
      }

      yPos += 55;

      // ==================== PAYMENT DETAILS ====================
      // Check if we have space for payment details
      if (yPos + 30 > doc.page.height - 150) {
        yPos = doc.page.height - 180;
      }

      doc.fillColor('#1e293b') 
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Payment Details', 20, yPos);

      yPos += 15;

      const payDetails = [
        `Payroll No: ${salarySlip.payrollNumber || 'N/A'}`,
        `Pay Type: ${salarySlip.payType || 'Monthly'}`,
        `Period: ${salarySlip.period || getCurrentMonthYear()}`,
        `Pay Date: ${salarySlip.payDate ? new Date(salarySlip.payDate).toLocaleDateString('en-IN') : slipDate.toLocaleDateString('en-IN')}`,
        `Mode: ${salarySlip.paymentMode || 'Bank Transfer'}`,
        `FY: ${salarySlip.financialYear || getFinancialYear()}`
      ];

      // Arrange payment details in two compact rows
      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica');

      // First row (first 3 items)
      payDetails.slice(0, 3).forEach((detail, index) => {
        doc.text(detail, 20 + (index * 180), yPos);
      });

      // Second row (next 3 items)
      yPos += 12;
      payDetails.slice(3, 6).forEach((detail, index) => {
        doc.text(detail, 20 + (index * 180), yPos);
      });

      // ==================== FOOTER ====================
      yPos += 20;

      // Check if we have space for disclaimer
      if (yPos + 35 > doc.page.height - 100) {
        yPos = doc.page.height - 135;
      }

      // Disclaimer box
      const disclaimerHeight = 30;
      doc.rect(20, yPos, doc.page.width - 40, disclaimerHeight)
         .fill('#fef3c7')
         .stroke('#fbbf24');

      doc.fillColor('#92400e')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Disclaimer:', 28, yPos + 8);

      doc.fontSize(8)
         .font('Helvetica')
         .text('1. Computer generated document, no signature required.', 28, yPos + 18, { width: doc.page.width - 56 });

      yPos += disclaimerHeight + 15;

      // ==================== SIGNATURE SECTION ====================
      // Check if we have space for signatures
      if (yPos + 55 > doc.page.height - 30) {
        yPos = doc.page.height - 85;
      }

      const signatureBoxWidth = (doc.page.width - 60) / 2;
      const signatureBoxHeight = 45;
      const signatureBoxY = yPos;
      
      // Manager Signature Box (Left)
      doc.rect(30, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .stroke('#cbd5e1');
      
      // Manager Signature Image
      const managerSignaturePath = path.join(__dirname, '../assets/manager.jpeg');
      if (fs.existsSync(managerSignaturePath)) {
        try {
          doc.image(managerSignaturePath, 30 + (signatureBoxWidth/2) - 20, signatureBoxY + 5, { 
            width: 40, 
            height: 20 
          });
        } catch (err) {
          // Draw placeholder if image fails
          doc.fillColor('#cbd5e1')
             .fontSize(16)
             .text('✍️', 30 + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
        }
      } else {
        doc.fillColor('#cbd5e1')
           .fontSize(16)
           .text('✍️', 30 + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
      }
      
      // Manager Text
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Manager', 30, signatureBoxY + 28, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('Authorized Signatory', 30, signatureBoxY + 36, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // Co-Founder Signature Box (Right)
      const coFounderX = 30 + signatureBoxWidth + 10;
      doc.rect(coFounderX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .stroke('#cbd5e1');
      
      // Co-Founder Signature Image
      const coFounderSignaturePath = path.join(__dirname, '../assets/co-founder.jpeg');
      if (fs.existsSync(coFounderSignaturePath)) {
        try {
          doc.image(coFounderSignaturePath, coFounderX + (signatureBoxWidth/2) - 20, signatureBoxY + 5, { 
            width: 40, 
            height: 20 
          });
        } catch (err) {
          // Draw placeholder if image fails
          doc.fillColor('#cbd5e1')
             .fontSize(16)
             .text('✍️', coFounderX + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
        }
      } else {
        doc.fillColor('#cbd5e1')
           .fontSize(16)
           .text('✍️', coFounderX + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
      }
      
      // Co-Founder Text
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Co-Founder', coFounderX, signatureBoxY + 28, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('Authorized Signatory', coFounderX, signatureBoxY + 36, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // ==================== BOTTOM FOOTER ====================
      const footerY = doc.page.height - 20;
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, footerY - 10, { align: 'center' });

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} | Page 1 of 1`, 0, footerY, { align: 'center' });

      // Ensure we only have one page
      doc.flushPages();
      
      doc.end();

    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};

// Helper function to format numbers
function formatNumber(amount) {
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

// Number to words conversion (simplified for space)
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
  
  return result.trim() || 'Zero';
}

const generateRelievingLetterPDF = async (employee, relievingLetter) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Relieving Letter - ${employee.name || 'Employee'}`,
          Author: 'Fintradify HR System',
          Subject: 'Relieving Letter',
          Keywords: 'relieving, letter, termination',
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

      // Letter Title
      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('RELIEVING LETTER', doc.page.width - 220, 20, { align: 'right', width: 200 });

      doc.fontSize(9)
         .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, doc.page.width - 220, 40, { align: 'right', width: 200 });

      // ==================== LETTER CONTENT ====================
      let yPos = 120;

      // To Whom It May Concern
      doc.fillColor('#1e293b')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('To Whom It May Concern,', 50, yPos);

      yPos += 30;

      // Letter Body - Professional Content
      doc.fontSize(11)
         .font('Helvetica')
         .text('This is to certify that', 50, yPos);

      yPos += 20;

      doc.font('Helvetica-Bold')
         .text(`${employee.name || 'N/A'}`, 70, yPos);

      yPos += 20;

      const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
      const relievingDate = relievingLetter.relievingDate ? new Date(relievingLetter.relievingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

      doc.font('Helvetica')
         .text(`has been employed with Fintradify Private Limited from ${joiningDate} to ${relievingDate} in the capacity of ${employee.position || 'N/A'} in the ${employee.department || 'N/A'} Department.`, 50, yPos, { width: doc.page.width - 100 });

      yPos += 30;

      doc.text(`During the tenure of employment, ${employee.name ? (employee.name.split(' ')[0] === 'Mr' || employee.name.split(' ')[0] === 'Mrs' || employee.name.split(' ')[0] === 'Ms' ? employee.name.split(' ')[0] === 'Mr' ? 'his' : 'her' : 'his/her') : 'his/her'} conduct and performance were found to be satisfactory.`, 50, yPos, { width: doc.page.width - 100 });

      yPos += 20;

      doc.text(`The reason for relieving is: ${relievingLetter.reason || 'Resignation'}.`, 50, yPos, { width: doc.page.width - 100 });

      yPos += 30;

      doc.text('This certificate is issued upon request and does not constitute any liability on the part of the company.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 20;

      doc.text('We wish him/her every success in future endeavors.', 50, yPos);

      yPos += 40;

      // Closing
      doc.font('Helvetica-Bold')
         .text('Sincerely,', 50, yPos);

      yPos += 20;

      doc.text('Fintradify HR Team', 50, yPos);

      // ==================== SIGNATURE SECTION ====================
      yPos += 40;

      const signatureBoxWidth = (doc.page.width - 100) / 2;
      const signatureBoxHeight = 45;
      const signatureBoxY = yPos;
      
      // Manager Signature Box (Left)
      doc.rect(50, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .stroke('#cbd5e1');
      
      // Manager Signature Image
      const managerSignaturePath = path.join(__dirname, '../assets/manager.jpeg');
      if (fs.existsSync(managerSignaturePath)) {
        try {
          doc.image(managerSignaturePath, 50 + (signatureBoxWidth/2) - 20, signatureBoxY + 5, { 
            width: 40, 
            height: 20 
          });
        } catch (err) {
          doc.fillColor('#cbd5e1')
             .fontSize(16)
             .text('✍️', 50 + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
        }
      } else {
        doc.fillColor('#cbd5e1')
           .fontSize(16)
           .text('✍️', 50 + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
      }
      
      // Manager Text
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Manager', 50, signatureBoxY + 28, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('Authorized Signatory', 50, signatureBoxY + 36, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // Co-Founder Signature Box (Right)
      const coFounderX = 50 + signatureBoxWidth + 10;
      doc.rect(coFounderX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
         .stroke('#cbd5e1');
      
      // Co-Founder Signature Image
      const coFounderSignaturePath = path.join(__dirname, '../assets/co-founder.jpeg');
      if (fs.existsSync(coFounderSignaturePath)) {
        try {
          doc.image(coFounderSignaturePath, coFounderX + (signatureBoxWidth/2) - 20, signatureBoxY + 5, { 
            width: 40, 
            height: 20 
          });
        } catch (err) {
          doc.fillColor('#cbd5e1')
             .fontSize(16)
             .text('✍️', coFounderX + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
        }
      } else {
        doc.fillColor('#cbd5e1')
           .fontSize(16)
           .text('✍️', coFounderX + (signatureBoxWidth/2) - 8, signatureBoxY + 8);
      }
      
      // Co-Founder Text
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Co-Founder', coFounderX, signatureBoxY + 28, { 
           align: 'center', 
           width: signatureBoxWidth 
         });
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('Authorized Signatory', coFounderX, signatureBoxY + 36, { 
           align: 'center', 
           width: signatureBoxWidth 
         });

      // ==================== BOTTOM FOOTER ====================
      const footerY = doc.page.height - 20;
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('© 2024 Fintradify HR Management System. All rights reserved.', 0, footerY - 10, { align: 'center' });

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} | Page 1 of 1`, 0, footerY, { align: 'center' });

      doc.end();

    } catch (error) {
      console.error('Relieving Letter PDF Generation Error:', error);
      reject(error);
    }
  });
};

const generateOfferLetterPDF = async (employee, offerLetter) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Offer Letter - ${employee.name || 'Employee'}`,
          Author: 'Fintradify HR System',
          Subject: 'Offer Letter',
          Keywords: 'offer, letter, employment, job',
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

      // ==================== PAGE 1: HEADER & INTRODUCTION ====================
      // Header
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
         .text('FINTRADIFY PRIVATE LIMITED', 80, 20);

      doc.fontSize(8)
         .font('Helvetica')
         .text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301', 80, 38);

      doc.text('Phone: +91 78360 09907 | Email: hr@fintradify.com | Website: www.fintradify.com', 80, 50);

      // Offer Letter Title
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('EMPLOYMENT OFFER LETTER', doc.page.width - 250, 20, { align: 'right', width: 230 });

      doc.fontSize(10)
         .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, doc.page.width - 250, 45, { align: 'right', width: 230 });

      doc.text(`Reference: OFFER/${employee.employeeId || 'EMP'}/${new Date().getFullYear()}`, doc.page.width - 250, 60, { align: 'right', width: 230 });

      // ==================== EMPLOYEE DETAILS ====================
      let yPos = 120;

      doc.fillColor('#1e293b')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TO:', 50, yPos);

      yPos += 25;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(employee.name || 'N/A', 50, yPos);

      yPos += 20;

      doc.fontSize(11)
         .font('Helvetica')
         .text(employee.email || 'N/A', 50, yPos);

      yPos += 15;

      doc.text(employee.phone || 'N/A', 50, yPos);

      yPos += 15;

      doc.text(employee.address || 'N/A', 50, yPos, { width: doc.page.width - 100 });

      yPos += 40;

      // ==================== OFFER INTRODUCTION ====================
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Dear ' + (employee.name ? employee.name.split(' ')[0] : 'Candidate') + ',', 50, yPos);

      yPos += 30;

      doc.fontSize(11)
         .font('Helvetica')
         .text('We are pleased to offer you the position of', 50, yPos);

      yPos += 20;

      doc.font('Helvetica-Bold')
         .text(offerLetter.position || 'N/A', 70, yPos);

      yPos += 20;

      doc.font('Helvetica')
         .text('in the ' + (offerLetter.department || 'N/A') + ' Department at Fintradify Private Limited.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 30;

      doc.text('This offer is contingent upon your successful completion of background verification, reference checks, and submission of required documents.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 30;

      // ==================== COMPENSATION DETAILS ====================
      doc.font('Helvetica-Bold')
         .text('COMPENSATION & BENEFITS:', 50, yPos);

      yPos += 20;

      const salary = offerLetter.salary || 0;
      doc.font('Helvetica')
         .text(`• Monthly Salary: INR ${salary.toLocaleString('en-IN')}`, 70, yPos);

      yPos += 15;

      doc.text('• Conveyance Allowance: As per company policy', 70, yPos);

      yPos += 15;

      doc.text('• Medical Insurance: Company provided', 70, yPos);

      yPos += 15;

      doc.text('• Paid Leave: 12 days per annum', 70, yPos);

      yPos += 15;

      doc.text('• Work Timings: Monday to Friday, 9:00 AM to 6:00 PM', 70, yPos);

      yPos += 30;

      // ==================== PROBATION PERIOD ====================
      doc.font('Helvetica-Bold')
         .text('PROBATION PERIOD:', 50, yPos);

      yPos += 20;

      doc.font('Helvetica')
         .text(`You will serve a probation period of ${offerLetter.probationPeriod || 6} months from your date of joining. During this period, your performance will be evaluated regularly.`, 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      // ==================== JOINING DETAILS ====================
      doc.font('Helvetica-Bold')
         .text('JOINING DETAILS:', 50, yPos);

      yPos += 20;

      const joiningDate = offerLetter.joiningDate ? new Date(offerLetter.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
      doc.font('Helvetica')
         .text(`• Expected Joining Date: ${joiningDate}`, 70, yPos);

      yPos += 15;

      doc.text(`• Work Location: ${offerLetter.workLocation || 'Noida, Uttar Pradesh'}`, 70, yPos);

      yPos += 15;

      doc.text(`• Reporting Manager: ${offerLetter.reportingManager || 'N/A'}`, 70, yPos);

      yPos += 40;

      // ==================== ACCEPTANCE ====================
      doc.font('Helvetica-Bold')
         .text('ACCEPTANCE:', 50, yPos);

      yPos += 20;

      doc.font('Helvetica')
         .text('To accept this offer, please sign and return this letter by [Acceptance Date] or email your acceptance to hr@fintradify.com.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      doc.text('We look forward to welcoming you to the Fintradify team!', 50, yPos);

      yPos += 40;

      doc.font('Helvetica-Bold')
         .text('Sincerely,', 50, yPos);

      yPos += 30;

      doc.text('Fintradify HR Team', 50, yPos);

      // ==================== PAGE 2: TERMS & CONDITIONS ====================
      doc.addPage();

      yPos = 50;

      // Header for Page 2
      doc.rect(0, 0, doc.page.width, 80)
         .fill('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('TERMS & CONDITIONS', doc.page.width / 2 - 80, 30);

      yPos = 100;

      doc.fillColor('#1e293b')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('1. EMPLOYMENT TERMS', 50, yPos);

      yPos += 25;

      doc.fontSize(11)
         .font('Helvetica')
         .text('• This is a full-time employment offer subject to the terms and conditions outlined in this letter.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Your employment will be governed by the company\'s policies, rules, and regulations as amended from time to time.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Any changes to your compensation, benefits, or terms of employment must be approved in writing by the management.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      doc.font('Helvetica-Bold')
         .text('2. CONFIDENTIALITY & NON-DISCLOSURE', 50, yPos);

      yPos += 25;

      doc.font('Helvetica')
         .text('• You agree to maintain strict confidentiality of all company information, client data, and proprietary information.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• This obligation continues even after termination of employment.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      doc.font('Helvetica-Bold')
         .text('3. INTELLECTUAL PROPERTY', 50, yPos);

      yPos += 25;

      doc.font('Helvetica')
         .text('• All work-related intellectual property, inventions, and creations developed during employment belong to the company.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      doc.font('Helvetica-Bold')
         .text('4. CODE OF CONDUCT', 50, yPos);

      yPos += 25;

      doc.font('Helvetica')
         .text('• You are expected to maintain professional conduct and adhere to the company\'s code of conduct and ethics policy.', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Any violation may result in disciplinary action, including termination.', 70, yPos, { width: doc.page.width - 120 });

      // ==================== PAGE 3: LEAVE POLICY & BENEFITS ====================
      doc.addPage();

      yPos = 50;

      // Header for Page 3
      doc.rect(0, 0, doc.page.width, 80)
         .fill('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('LEAVE POLICY & BENEFITS', doc.page.width / 2 - 90, 30);

      yPos = 100;

      doc.fillColor('#1e293b')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('LEAVE ENTITLEMENT', 50, yPos);

      yPos += 25;

      doc.fontSize(11)
         .font('Helvetica')
         .text('• Annual Leave: 12 days per year (accrued monthly)', 70, yPos);

      yPos += 15;

      doc.text('• Sick Leave: 6 days per year', 70, yPos);

      yPos += 15;

      doc.text('• Maternity Leave: As per government regulations', 70, yPos);

      yPos += 15;

      doc.text('• Paternity Leave: As per government regulations', 70, yPos);

      yPos += 30;

      doc.font('Helvetica-Bold')
         .text('BENEFITS & PERKS', 50, yPos);

      yPos += 25;

      doc.font('Helvetica')
         .text('• Health Insurance: Comprehensive medical coverage for you and your family', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Professional Development: Training and certification opportunities', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Flexible Work Arrangements: Subject to business requirements', 70, yPos, { width: doc.page.width - 120 });

      yPos += 20;

      doc.text('• Performance Incentives: Based on individual and company performance', 70, yPos, { width: doc.page.width - 120 });

      yPos += 30;

      doc.font('Helvetica-Bold')
         .text('PROBATION PERIOD DETAILS', 50, yPos);

      yPos += 25;

      doc.font('Helvetica')
         .text(`During the ${offerLetter.probationPeriod || 6}-month probation period:`, 70, yPos);

      yPos += 20;

      doc.text('• Your performance will be reviewed monthly', 90, yPos);

      yPos += 15;

      doc.text('• Feedback will be provided to help you succeed', 90, yPos);

      yPos += 15;

      doc.text('• Successful completion leads to confirmation of employment', 90, yPos);

      yPos += 15;

      doc.text('• Either party may terminate employment with 15 days notice', 90, yPos);

      // ==================== PAGE 4: SIGNATURES & ACCEPTANCE ====================
      doc.addPage();

      yPos = 50;

      // Header for Page 4
      doc.rect(0, 0, doc.page.width, 80)
         .fill('#1e3a8a');

      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('ACCEPTANCE & SIGNATURES', doc.page.width / 2 - 100, 30);

      yPos = 100;

      doc.fillColor('#1e293b')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('EMPLOYEE ACCEPTANCE', 50, yPos);

      yPos += 30;

      doc.fontSize(11)
         .font('Helvetica')
         .text('I, ' + (employee.name || '____________________') + ', hereby accept the offer of employment with Fintradify Private Limited under the terms and conditions outlined in this offer letter.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 30;

      doc.text('I understand and agree to abide by all company policies, rules, and regulations.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 40;

      // Signature lines
      doc.text('Employee Signature: ___________________________', 50, yPos);

      yPos += 20;

      doc.text('Date: ___________________________', 50, yPos);

      yPos += 40;

      doc.text('Employee Name (Print): ___________________________', 50, yPos);

      yPos += 60;

      // Company signatures
      doc.font('Helvetica-Bold')
         .text('COMPANY APPROVAL', 50, yPos);

      yPos += 30;

      // Manager Signature
      doc.font('Helvetica')
         .text('Approved by (Manager): ___________________________', 50, yPos);

      yPos += 20;

      doc.text('Date: ___________________________', 50, yPos);

      yPos += 40;

      // CEO Signature
      doc.text('Approved by (CEO): ___________________________', 50, yPos);

      yPos += 20;

      doc.text('Date: ___________________________', 50, yPos);

      yPos += 60;

      // Footer
      doc.fontSize(9)
         .font('Helvetica')
         .text('This offer letter is electronically generated and is valid without physical signatures. A signed copy should be maintained for records.', 50, yPos, { width: doc.page.width - 100, align: 'center' });

      yPos += 20;

      doc.text('For any queries, please contact: hr@fintradify.com | +91 78360 09907', 50, yPos, { width: doc.page.width - 100, align: 'center' });

      doc.end();

    } catch (error) {
      console.error('Offer Letter PDF Generation Error:', error);
      reject(error);
    }
  });
};

module.exports = { generateSalarySlipPDF, generateRelievingLetterPDF, generateOfferLetterPDF };

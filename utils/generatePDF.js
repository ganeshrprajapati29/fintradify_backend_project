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

      // Company Header with Logo (with fallback)
      const logoPath = path.join(__dirname, '../assets/logoo.png');
      let logoY = 45;
      
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, logoY, { width: 60 });
        } catch (err) {
          console.log('Logo loading error, using text fallback');
          doc.fontSize(14).font('Helvetica-Bold').text('Fintradify', 50, logoY + 15);
        }
      } else {
        doc.fontSize(14).font('Helvetica-Bold').text('Fintradify', 50, logoY + 15);
      }

      // Company Details (centered)
      const companyDetailsX = 140;
      doc.fontSize(18).font('Helvetica-Bold').text('Fintradify', companyDetailsX, 50, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh, 201301, India', companyDetailsX, 70, { align: 'center' });
      doc.fontSize(10).text('Phone: +91 78360 09907 | Email: hr@fintradify.com', companyDetailsX, 82, { align: 'center' });

      // Salary Slip Title
      doc.fontSize(16).font('Helvetica-Bold').text('SALARY SLIP', 0, 110, { align: 'center' });
      doc.fontSize(10).text(`For the Month of ${salarySlip.month || 'Not Specified'}`, 0, 130, { align: 'center' });

      // Employee Information
      doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', 50, 150);
      
      // Draw a box around employee details
      doc.rect(50, 160, 500, 50).stroke();
      
      let employeeY = 170;
      doc.fontSize(10).font('Helvetica');
      
      // Left Column
      doc.text(`Employee ID: ${employee.employeeId || 'N/A'}`, 60, employeeY);
      doc.text(`Name: ${employee.name || 'N/A'}`, 60, employeeY + 15);
      doc.text(`Department: ${employee.department || 'N/A'}`, 60, employeeY + 30);
      
      // Right Column
      doc.text(`Position: ${employee.position || 'N/A'}`, 300, employeeY);
      doc.text(`Joining Date: ${employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A'}`, 300, employeeY + 15);
      doc.text(`Generated On: ${salarySlip.date ? new Date(salarySlip.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 300, employeeY + 30);

      // Starting Y position for salary breakdown
      let yPos = 220;

      // Salary Breakdown Header
      doc.fontSize(12).font('Helvetica-Bold').text('Earnings', 50, yPos);
      yPos += 10;

      // Table Header for Earnings
      doc.rect(50, yPos, 250, 20).fillAndStroke('#f0f0f0', '#000');
      doc.rect(300, yPos, 150, 20).fillAndStroke('#f0f0f0', '#000');
      doc.rect(450, yPos, 100, 20).fillAndStroke('#f0f0f0', '#000');
      
      doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 60, yPos + 7);
      doc.text('Amount (₹)', 360, yPos + 7);
      
      yPos += 20;

      // Basic Salary (Only from admin-set amount)
      const basicSalary = salarySlip.amount || 0;
      
      // Earnings - Only Basic Salary (as per requirement)
      const earnings = [
        { desc: 'Basic Salary', amount: basicSalary }
      ];
      
      // Note: No HRA, Conveyance, Medical Allowance - only admin-set basic salary
      earnings.forEach((item, index) => {
        // Alternate row colors for better readability
        const fillColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        
        doc.rect(50, yPos, 250, 20).fillAndStroke(fillColor, '#000');
        doc.rect(300, yPos, 150, 20).fillAndStroke(fillColor, '#000');
        doc.rect(450, yPos, 100, 20).fillAndStroke(fillColor, '#000');
        
        doc.fillColor('#000').fontSize(9).font('Helvetica');
        doc.text(item.desc, 60, yPos + 7);
        doc.text(`₹ ${item.amount.toLocaleString('en-IN')}`, 360, yPos + 7);
        
        yPos += 20;
      });

      // Total Earnings
      const totalEarnings = basicSalary; // Only basic salary
      
      doc.rect(50, yPos, 250, 20).fillAndStroke('#e8f4f8', '#000');
      doc.rect(300, yPos, 150, 20).fillAndStroke('#e8f4f8', '#000');
      doc.rect(450, yPos, 100, 20).fillAndStroke('#e8f4f8', '#000');
      
      doc.font('Helvetica-Bold').text('Total Earnings', 60, yPos + 7);
      doc.text(`₹ ${totalEarnings.toLocaleString('en-IN')}`, 360, yPos + 7);
      
      yPos += 30;

      // Deductions Section - No deductions as per requirement
      doc.fontSize(12).font('Helvetica-Bold').text('Deductions', 50, yPos);
      yPos += 10;

      // Table Header for Deductions
      doc.rect(50, yPos, 250, 20).fillAndStroke('#f0f0f0', '#000');
      doc.rect(300, yPos, 150, 20).fillAndStroke('#f0f0f0', '#000');
      doc.rect(450, yPos, 100, 20).fillAndStroke('#f0f0f0', '#000');
      
      doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 60, yPos + 7);
      doc.text('Amount (₹)', 360, yPos + 7);
      
      yPos += 20;

      // No deductions - Only showing zero values or "None"
      const deductions = [
        { desc: 'No Deductions', amount: 0 }
      ];
      
      deductions.forEach((item, index) => {
        const fillColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        
        doc.rect(50, yPos, 250, 20).fillAndStroke(fillColor, '#000');
        doc.rect(300, yPos, 150, 20).fillAndStroke(fillColor, '#000');
        doc.rect(450, yPos, 100, 20).fillAndStroke(fillColor, '#000');
        
        doc.fillColor('#000').fontSize(9).font('Helvetica');
        doc.text(item.desc, 60, yPos + 7);
        doc.text(`₹ ${item.amount.toLocaleString('en-IN')}`, 360, yPos + 7);
        
        yPos += 20;
      });

      // Total Deductions
      const totalDeductions = 0; // No deductions
      
      doc.rect(50, yPos, 250, 20).fillAndStroke('#ffe8e8', '#000');
      doc.rect(300, yPos, 150, 20).fillAndStroke('#ffe8e8', '#000');
      doc.rect(450, yPos, 100, 20).fillAndStroke('#ffe8e8', '#000');
      
      doc.font('Helvetica-Bold').text('Total Deductions', 60, yPos + 7);
      doc.text(`₹ ${totalDeductions.toLocaleString('en-IN')}`, 360, yPos + 7);
      
      yPos += 30;

      // Net Salary (Same as basic since no allowances/deductions)
      const netSalary = totalEarnings - totalDeductions;
      
      // Net Salary in a highlighted box
      doc.rect(50, yPos, 500, 25).fillAndStroke('#d4edda', '#000');
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#155724');
      doc.text('Net Salary Payable:', 60, yPos + 9);
      doc.text(`₹ ${netSalary.toLocaleString('en-IN')}`, 360, yPos + 9);
      
      yPos += 35;

      // Amount in Words
      doc.fillColor('#000').fontSize(9).font('Helvetica');
      doc.text(`Amount in Words: ${numberToWords(netSalary)} Rupees Only`, 50, yPos);
      
      yPos += 15;
      
      // Payment Mode (if any)
      if (salarySlip.paymentMode) {
        doc.text(`Payment Mode: ${salarySlip.paymentMode}`, 50, yPos);
        yPos += 10;
      }
      
      // Bank Details (if any)
      if (salarySlip.bankAccount) {
        doc.text(`Bank Account: ${salarySlip.bankAccount}`, 50, yPos);
        yPos += 10;
      }

      // Important Notes
      yPos = doc.page.height - 100;
      doc.fontSize(8).font('Helvetica-Oblique').text('Important Notes:', 50, yPos);
      doc.fontSize(7).font('Helvetica');
      doc.text('1. This is a computer-generated salary slip and does not require a signature.', 50, yPos + 12);
      doc.text('2. Please report any discrepancies to the HR department within 7 days.', 50, yPos + 24);
      doc.text('3. This slip is confidential and should not be shared with unauthorized persons.', 50, yPos + 36);

      // Footer
      doc.fontSize(8).text('For Fintradify', 0, doc.page.height - 40, { align: 'center' });
      doc.text('Generated by HR Management System', 0, doc.page.height - 30, { align: 'center' });
      
      // Page number if multiple pages (though single page expected)
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 20,
          { align: 'center' }
        );
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
  
  return result.trim() || 'Zero';
}

module.exports = { generateSalarySlipPDF };
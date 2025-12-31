const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateSalarySlipPDF = async (salarySlip, employee) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    // Company Header with Logo
    const logoPath = path.join(__dirname, '../assets/logoo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 80 });
    }

    // Company Details
    doc.fontSize(20).font('Helvetica-Bold').text('Fintradify Technologies Pvt. Ltd.', 150, 50, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('123 Business Park, Tech City, India - 400001', 150, 75, { align: 'center' });
    doc.fontSize(12).text('Phone: +91-9876543210 | Email: hr@fintradify.com', 150, 90, { align: 'center' });

    // Salary Slip Title
    doc.moveDown(1);
    doc.fontSize(18).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center', underline: true });
    doc.fontSize(12).text(`For the Month of ${salarySlip.month}`, { align: 'center' });
    doc.moveDown(1);

    // Employee Information Box
    doc.rect(50, 140, 500, 80).stroke();
    doc.fontSize(14).font('Helvetica-Bold').text('Employee Details', 60, 150);
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Employee ID: ${employee.employeeId}`, 60, 170);
    doc.text(`Name: ${employee.name}`, 300, 170);
    doc.text(`Position: ${employee.position}`, 60, 185);
    doc.text(`Joining Date: ${new Date(employee.joiningDate).toLocaleDateString('en-IN')}`, 300, 185);
    doc.text(`Department: Technology`, 60, 200); // Assuming department, can be added to model later
    doc.text(`Generated On: ${new Date(salarySlip.date).toLocaleDateString('en-IN')}`, 300, 200);

    // Salary Breakdown Table
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('Salary Breakdown', 50, 240);

    // Table Header
    doc.rect(50, 255, 500, 20).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').fontSize(11).font('Helvetica-Bold');
    doc.text('Description', 60, 262);
    doc.text('Amount (₹)', 450, 262);

    // Earnings
    let yPos = 275;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.font('Helvetica').text('Basic Salary', 60, yPos + 7);
    doc.text(employee.salary.toLocaleString('en-IN'), 450, yPos + 7);

    yPos += 20;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.text('HRA (House Rent Allowance)', 60, yPos + 7);
    const hra = Math.round(employee.salary * 0.4); // 40% of basic
    doc.text(hra.toLocaleString('en-IN'), 450, yPos + 7);

    yPos += 20;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.text('Conveyance Allowance', 60, yPos + 7);
    const conveyance = 19200; // Standard conveyance allowance
    doc.text(conveyance.toLocaleString('en-IN'), 450, yPos + 7);

    yPos += 20;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.text('Medical Allowance', 60, yPos + 7);
    const medical = 5000;
    doc.text(medical.toLocaleString('en-IN'), 450, yPos + 7);

    // Total Earnings
    const totalEarnings = employee.salary + hra + conveyance + medical;
    yPos += 20;
    doc.rect(50, yPos, 500, 20).fillAndStroke('#e8f4f8', '#000');
    doc.font('Helvetica-Bold').text('Total Earnings', 60, yPos + 7);
    doc.text(totalEarnings.toLocaleString('en-IN'), 450, yPos + 7);

    // Deductions
    yPos += 30;
    doc.fontSize(14).font('Helvetica-Bold').text('Deductions', 50, yPos);

    yPos += 15;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.font('Helvetica').text('Provident Fund (PF)', 60, yPos + 7);
    const pf = Math.round(employee.salary * 0.12); // 12% PF
    doc.text(pf.toLocaleString('en-IN'), 450, yPos + 7);

    yPos += 20;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.text('Professional Tax', 60, yPos + 7);
    const profTax = employee.salary > 21000 ? 235 : 0; // Maharashtra PT slabs
    doc.text(profTax.toLocaleString('en-IN'), 450, yPos + 7);

    yPos += 20;
    doc.rect(50, yPos, 500, 20).stroke();
    doc.text('Income Tax (TDS)', 60, yPos + 7);
    const tds = Math.round(totalEarnings * 0.1); // Assuming 10% TDS
    doc.text(tds.toLocaleString('en-IN'), 450, yPos + 7);

    // Total Deductions
    const totalDeductions = pf + profTax + tds;
    yPos += 20;
    doc.rect(50, yPos, 500, 20).fillAndStroke('#ffe8e8', '#000');
    doc.font('Helvetica-Bold').text('Total Deductions', 60, yPos + 7);
    doc.text(totalDeductions.toLocaleString('en-IN'), 450, yPos + 7);

    // Net Salary
    const netSalary = totalEarnings - totalDeductions;
    yPos += 30;
    doc.rect(50, yPos, 500, 25).fillAndStroke('#d4edda', '#000');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#155724');
    doc.text('Net Salary Payable', 60, yPos + 8);
    doc.text(netSalary.toLocaleString('en-IN'), 450, yPos + 8);

    // Amount in Words
    yPos += 35;
    doc.fillColor('#000').fontSize(11).font('Helvetica');
    doc.text(`Amount in Words: ${numberToWords(netSalary)} Rupees Only`, 50, yPos);

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('This is a computer-generated salary slip and does not require signature.', 50, doc.page.height - 80, { align: 'center' });
    doc.text('For Fintradify ', 50, doc.page.height - 60, { align: 'center' });
    doc.text('Generated by HR Management System', 50, doc.page.height - 45, { align: 'center' });

    doc.end();
  });
};

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanOneThousand(n) {
    if (n === 0) return '';
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

  if (num === 0) return 'Zero';

  let result = '';
  let crore = Math.floor(num / 10000000);
  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore ';
    num %= 10000000;
  }

  let lakh = Math.floor(num / 100000);
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh ';
    num %= 100000;
  }

  let thousand = Math.floor(num / 1000);
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand ';
    num %= 1000;
  }

  result += convertLessThanOneThousand(num);
  return result.trim();
}

module.exports = { generateSalarySlipPDF };

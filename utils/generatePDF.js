const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { quickSort } = require('./dsa_algorithms'); // Import DSA algorithm for sorting components

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
      doc.image(logoPath, 50, 45, { width: 60 });
    }

    // Company Details
    doc.fontSize(18).font('Helvetica-Bold').text('Fintradify', 140, 50, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Office No. 105, C6, Noida Sector 7, Uttar Pradesh, 201301, India', 140, 70, { align: 'center' });
    doc.fontSize(10).text('Phone: +91 78360 09907 | Email: hr@fintradify.com', 140, 82, { align: 'center' });

    // Salary Slip Title
    doc.fontSize(16).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
    doc.fontSize(10).text(`For the Month of ${salarySlip.month}`, { align: 'center' });
    doc.moveDown(0.5);

    // Employee Information
    doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', 50, 110);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Employee ID: ${employee.employeeId}`, 50, 125);
    doc.text(`Name: ${employee.name}`, 250, 125);
    doc.text(`Position: ${employee.position}`, 50, 135);
    doc.text(`Joining Date: ${new Date(employee.joiningDate).toLocaleDateString('en-IN')}`, 250, 135);
    doc.text(`Department: Technology`, 50, 145);
    doc.text(`Generated On: ${new Date(salarySlip.date).toLocaleDateString('en-IN')}`, 250, 145);

    // Salary Breakdown
    doc.fontSize(12).font('Helvetica-Bold').text('Salary Breakdown', 50, 165);

    // Table Header
    doc.rect(50, 175, 500, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
    doc.text('Description', 60, 180);
    doc.text('Amount (₹)', 430, 180);

    // Basic Salary from admin-set amount
    const basicSalary = salarySlip.amount;

    // Earnings (sorted using DSA quickSort for efficiency)
    const earnings = [
      { desc: 'Basic Salary', amount: basicSalary },
      { desc: 'HRA (House Rent Allowance)', amount: Math.round(basicSalary * 0.4) }, // 40% of basic
      { desc: 'Conveyance Allowance', amount: 19200 }, // Standard
      { desc: 'Medical Allowance', amount: 5000 },
    ];

    // Sort earnings by amount descending using quickSort
    quickSort(earnings, (a, b) => b.amount - a.amount);

    let yPos = 190;
    earnings.forEach(item => {
      doc.rect(50, yPos, 500, 15).stroke();
      doc.font('Helvetica').text(item.desc, 60, yPos + 5);
      doc.text(`₹ ${item.amount.toLocaleString('en-IN')}`, 430, yPos + 5);
      yPos += 15;
    });

    // Total Earnings
    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
    doc.rect(50, yPos, 500, 15).fillAndStroke('#e8f4f8', '#000');
    doc.font('Helvetica-Bold').text('Total Earnings', 60, yPos + 5);
    doc.text(`₹ ${totalEarnings.toLocaleString('en-IN')}`, 430, yPos + 5);
    yPos += 20;

    // Deductions (sorted using quickSort)
    doc.fontSize(12).font('Helvetica-Bold').text('Deductions', 50, yPos);
    yPos += 15;

    const deductions = [
      { desc: 'Provident Fund (PF)', amount: Math.round(basicSalary * 0.12) }, // 12% PF
      { desc: 'Professional Tax', amount: basicSalary > 21000 ? 235 : 0 }, // Maharashtra PT
      { desc: 'Income Tax (TDS)', amount: Math.round(totalEarnings * 0.1) }, // 10% TDS
    ];

    // Sort deductions by amount descending
    quickSort(deductions, (a, b) => b.amount - a.amount);

    deductions.forEach(item => {
      doc.rect(50, yPos, 500, 15).stroke();
      doc.font('Helvetica').text(item.desc, 60, yPos + 5);
      doc.text(`₹ ${item.amount.toLocaleString('en-IN')}`, 430, yPos + 5);
      yPos += 15;
    });

    // Total Deductions
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
    doc.rect(50, yPos, 500, 15).fillAndStroke('#ffe8e8', '#000');
    doc.font('Helvetica-Bold').text('Total Deductions', 60, yPos + 5);
    doc.text(`₹ ${totalDeductions.toLocaleString('en-IN')}`, 430, yPos + 5);
    yPos += 20;

    // Net Salary
    const netSalary = totalEarnings - totalDeductions;
    doc.rect(50, yPos, 500, 20).fillAndStroke('#d4edda', '#000');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#155724');
    doc.text('Net Salary Payable', 60, yPos + 7);
    doc.text(`₹ ${netSalary.toLocaleString('en-IN')}`, 430, yPos + 7);
    yPos += 25;

    // Amount in Words (optimized with DSA-like structure)
    doc.fillColor('#000').fontSize(9).font('Helvetica');
    doc.text(`Amount in Words: ${numberToWords(netSalary)} Rupees Only`, 50, yPos);

    // Footer
    doc.fontSize(8).text('This is a computer-generated salary slip and does not require signature.', 50, doc.page.height - 70, { align: 'center' });
    doc.text('For Fintradify', 50, doc.page.height - 55, { align: 'center' });
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

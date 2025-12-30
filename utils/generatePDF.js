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

    // Company Logo
    const logoPath = path.join(__dirname, '../assets/logoo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Fintradify', 200, 50, { align: 'center' });
    doc.fontSize(18).text('Salary Slip', 200, 80, { align: 'center' });
    doc.moveDown(2);

    // Employee Details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Employee ID: ${employee.employeeId}`, 50, 150);
    doc.text(`Name: ${employee.name}`, 300, 150);
    doc.text(`Position: ${employee.position}`, 50, 170);
    doc.text(`Joining Date: ${new Date(employee.joiningDate).toLocaleDateString('en-IN')}`, 300, 170);
    doc.text(`Month: ${salarySlip.month}`, 50, 190);

    // Salary Details
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('Salary Details', { underline: true });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');
    doc.text(`Fixed Monthly Salary: ₹${employee.salary.toLocaleString('en-IN')}`);
    doc.text(`Amount Paid: ₹${salarySlip.amount.toLocaleString('en-IN')}`);
    doc.text(`Generated On: ${new Date(salarySlip.date).toLocaleDateString('en-IN')}`);

    // Footer
    doc.moveDown(3);
    doc.fontSize(10).text('This is a computer-generated salary slip. No signature required.', 50, doc.page.height - 100, { align: 'center' });
    doc.text('Fintradify HR Team', 50, doc.page.height - 80, { align: 'center' });

    doc.end();
  });
};

module.exports = { generateSalarySlipPDF };

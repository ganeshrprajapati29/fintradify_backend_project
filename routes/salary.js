const express = require('express');
const router = express.Router();
const SalarySlip = require('../models/SalarySlip');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/sendEmail');
const { generateSalarySlipPDF } = require('../utils/generatePDF');


/**
 * @route POST /salary
 * @desc Create salary slip with fixed amount + send email
 */
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { employeeId, month, fixedAmount } = req.body;
  try {
    if (!fixedAmount || fixedAmount <= 0) return res.status(400).json({ message: 'Valid amount is required' });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });



    const salarySlip = new SalarySlip({
      employee: employeeId,
      month,
      netSalary: parseFloat(fixedAmount),
      bankAccount: employee.bankAccount || '',
      bankName: employee.bankName || '',
      department: employee.department || '',
      generatedBy: req.user.id,
    });
    await salarySlip.save();

    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    try {
      await sendEmail(
        employee.email,
        `Salary Slip for ${month}`,
        `Dear ${employee.name},\n\nPlease find your salary slip for ${month} attached.\n\nRegards,\nFintradify HR Team`,
        [{ filename: `salary-slip-${month}.pdf`, content: pdfBuffer }]
      );

      // Update status to 'sent' after successful email
      salarySlip.status = 'sent';
      await salarySlip.save();

      res.json(salarySlip);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      // Salary slip is saved but email failed, status remains 'generated'
      res.status(207).json({ message: 'Salary slip generated but email sending failed', salarySlip });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /salaryslips/download/:id
 * @desc Download salary slip as PDF
 */
router.get('/download/:id', auth, async (req, res) => {
  try {
    console.log('Download request for ID:', req.params.id);
    const salarySlip = await SalarySlip.findById(req.params.id).populate('employee');
    console.log('Salary slip found:', !!salarySlip);
    if (!salarySlip) return res.status(404).json({ message: 'Salary slip not found' });
    if (!salarySlip.employee) return res.status(404).json({ message: 'Employee data not found' });
    console.log('Employee data:', salarySlip.employee.name, salarySlip.employee.employeeId);
    // if (req.user.role !== 'admin' && req.user.id !== salarySlip.employee._id.toString())
    //   return res.status(403).json({ message: 'You do not have permission' });

    console.log('Generating PDF for salary slip:', salarySlip._id, 'amount:', salarySlip.amount);
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, salarySlip.employee);
    console.log('PDF generated successfully, buffer size:', pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-slip-${salarySlip.month}.pdf`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Download error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

/**
 * @route GET /salaryslips/my-slips
 * @desc Get logged-in user's slips
 */
router.get('/my-slips', auth, async (req, res) => {
  try {
    const slips = await SalarySlip.find({ employee: req.user.id }).populate('employee');
    res.json(slips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /generate-monthly
 * @desc Generate salary slips for all employees based on attendance and send emails
 */
router.post('/generate-monthly', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { month, year } = req.body;
  try {
    await generateMonthlySalarySlips(month, year);
    res.json({ message: 'Salary slips generated and emails sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /salaryslips
 * @desc Get all slips (admin only)
 */
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const slips = await SalarySlip.find().populate('employee');
    res.json(slips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get current financial year
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

module.exports = router;

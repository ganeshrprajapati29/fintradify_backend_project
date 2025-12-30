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


/**
 * @route POST /salary
 * @desc Create salary slip with fixed amount + send email
 */
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { employeeId, month, amount } = req.body;
  try {
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Check if slip already exists for this month
    const existingSlip = await SalarySlip.findOne({ employee: employeeId, month });
    if (existingSlip) return res.status(400).json({ message: 'Salary slip already exists for this month' });

    const salarySlip = new SalarySlip({
      employee: employeeId,
      month,
      amount: parseFloat(amount).toFixed(2),
    });
    await salarySlip.save();

    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    await sendEmail(
      employee.email,
      `Salary Slip for ${month}`,
      `Dear ${employee.name},\n\nPlease find your salary slip for ${month} attached.\n\nRegards,\nFintradify HR Team`,
      [{ filename: `salary-slip-${month}.pdf`, content: pdfBuffer }]
    );

    res.json(salarySlip);
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
    const salarySlip = await SalarySlip.findById(req.params.id).populate('employee');
    if (!salarySlip) return res.status(404).json({ message: 'Salary slip not found' });
    if (req.user.role !== 'admin' && req.user.id !== salarySlip.employee._id.toString())
      return res.status(403).json({ message: 'You do not have permission' });

    const pdfBuffer = await generateSalarySlipPDF(salarySlip, salarySlip.employee);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-slip-${salarySlip.month}.pdf`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
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

module.exports = router;

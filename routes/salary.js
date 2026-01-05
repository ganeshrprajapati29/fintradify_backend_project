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
 * @desc Create salary slip with fixed amount + send professional email
 */
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Unauthorized' });

  const { employeeId, month, fixedAmount, bankName } = req.body;

  try {
    if (!fixedAmount || fixedAmount <= 0)
      return res.status(400).json({ message: 'Valid amount is required' });

    const employee = await Employee.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: 'Employee not found' });

    const year = parseInt(month.split('-')[0]);

    const salarySlip = new SalarySlip({
      employee: employeeId,
      month,
      year,
      amount: parseFloat(fixedAmount),
      basicPay: parseFloat(fixedAmount),
      totalEarnings: parseFloat(fixedAmount),
      totalDeductions: 0,
      netSalary: parseFloat(fixedAmount),
      bankAccount: employee.bankAccount || '',
      bankName: bankName || employee.bankName || employee.bank_name || '',
      department: employee.department || '',
      payrollNumber: `PAY-${Date.now()}`,
      payType: 'Monthly',
      period: month,
      payDate: new Date(),
      generatedBy: req.user.id,
      status: 'generated'
    });

    await salarySlip.save();

    // Generate PDF
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    /* =================================================
       🔥 PREMIUM CORPORATE HR EMAIL (HTML + TEXT)
       ================================================= */

    const subject = `Salary Slip for ${month}`;

    const textMessage = `
Dear ${employee.name},

Greetings from the HR Department.

Please find attached your salary slip for the month of ${month}.
The document contains a detailed breakdown of earnings, deductions, and net salary credited.

If you have any questions or observe any discrepancy, kindly contact the HR department within 3 working days.

This is a system-generated email. Please do not reply to this message.

Warm regards,
Fintradify HR Team
`;

    const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;color:#ffffff;padding:20px 30px;">
              <h2 style="margin:0;font-weight:500;">Salary Slip Notification</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#333333;font-size:15px;line-height:1.7;">
              <p>Dear <strong>${employee.name}</strong>,</p>

              <p>
                Greetings from the HR Department.
              </p>

              <p>
                Please find attached your <strong>salary slip for the month of ${month}</strong>.
                This document provides a detailed summary of your earnings, deductions,
                and the net salary credited for the specified period.
              </p>

              <p>
                If you have any questions or notice any discrepancy in the salary details,
                kindly reach out to the HR department within
                <strong>3 working days</strong>.
              </p>

              <p style="margin-top:30px;">
                Warm regards,<br/>
                <strong>Fintradify HR Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:15px 30px;text-align:center;font-size:12px;color:#64748b;">
              This is a system-generated email. Please do not reply to this message.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    try {
      await sendEmail(
        employee.email,
        subject,
        textMessage,
        [
          {
            filename: `salary-slip-${month}.pdf`,
            content: pdfBuffer
          }
        ],
        htmlMessage
      );

      // Update status after successful email
      salarySlip.status = 'sent';
      await salarySlip.save();

      res.json(salarySlip);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      res.status(207).json({
        message: 'Salary slip generated but email sending failed',
        salarySlip
      });
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
    const salarySlip = await SalarySlip
      .findById(req.params.id)
      .populate('employee');

    if (!salarySlip)
      return res.status(404).json({ message: 'Salary slip not found' });

    if (!salarySlip.employee)
      return res.status(404).json({ message: 'Employee data not found' });

    const pdfBuffer = await generateSalarySlipPDF(
      salarySlip,
      salarySlip.employee
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=salary-slip-${salarySlip.month}.pdf`
    );
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /salaryslips/my-slips
 * @desc Get logged-in user's salary slips
 */
router.get('/my-slips', auth, async (req, res) => {
  try {
    const slips = await SalarySlip
      .find({ employee: req.user.id })
      .populate('employee');

    res.json(slips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /salaryslips
 * @desc Get all salary slips (admin only)
 */
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Unauthorized' });

  try {
    const slips = await SalarySlip.find().populate('employee');
    res.json(slips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

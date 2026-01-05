const express = require('express');
const router = express.Router();
const SalarySlip = require('../models/SalarySlip');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');
const { generateSalarySlipPDF } = require('../utils/generatePDF');

/**
 * @route POST /salary
 * @desc Create salary slip + send professional styled email
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
      amount: fixedAmount,
      basicPay: fixedAmount,
      totalEarnings: fixedAmount,
      totalDeductions: 0,
      netSalary: fixedAmount,
      bankAccount: employee.bankAccount || '',
      bankName: bankName || employee.bankName || '',
      department: employee.department || '',
      payrollNumber: `PAY-${Date.now()}`,
      payType: 'Monthly',
      period: month,
      payDate: new Date(),
      generatedBy: req.user.id,
      status: 'generated'
    });

    await salarySlip.save();

    // Generate Salary Slip PDF
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    /* ===============================
       🔥 PREMIUM PROFESSIONAL EMAIL
    ================================ */

    const subject = `Salary Slip | ${month}`;

    const textMessage = `
Dear ${employee.name},

We hope you are doing well.

Please find attached your salary slip for the month of ${month}. 
This document contains a detailed breakdown of your earnings and deductions.

If you have any questions or require clarification, kindly contact the HR department within 3 working days.

Please note: This is a system-generated email. Replies to this email are not monitored.

Warm regards,
Fintradify HR Team
`;

    const htmlMessage = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:30px;">
  <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;">

    <div style="background:#0f172a;color:#ffffff;padding:20px;">
      <h2 style="margin:0;font-weight:500;">Salary Slip Notification</h2>
    </div>

    <div style="padding:30px;color:#333333;font-size:15px;line-height:1.6;">
      <p>Dear <strong>${employee.name}</strong>,</p>

      <p>
        We hope this message finds you well.
      </p>

      <p>
        Please find attached your <strong>salary slip for the month of ${month}</strong>.
        The attached document provides a detailed summary of your earnings, deductions,
        and net payable salary for the specified period.
      </p>

      <p>
        In case of any discrepancy or if you require clarification regarding the salary details,
        kindly reach out to the HR department within <strong>3 working days</strong>.
      </p>

      <div style="margin-top:30px;">
        <p style="margin-bottom:5px;">Warm regards,</p>
        <p style="margin:0;"><strong>Fintradify HR Team</strong></p>
      </div>
    </div>

    <div style="background:#f1f5f9;padding:15px;text-align:center;font-size:12px;color:#64748b;">
      This is a system-generated email. Please do not reply to this message.
    </div>

  </div>
</div>
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

      salarySlip.status = 'sent';
      await salarySlip.save();

      res.json(salarySlip);
    } catch (emailErr) {
      console.error('Email failed:', emailErr);
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
 * @desc Download salary slip PDF
 */
router.get('/download/:id', auth, async (req, res) => {
  try {
    const salarySlip = await SalarySlip
      .findById(req.params.id)
      .populate('employee');

    if (!salarySlip)
      return res.status(404).json({ message: 'Salary slip not found' });

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

module.exports = router;

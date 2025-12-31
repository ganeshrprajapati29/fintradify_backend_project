const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const SalarySlip = require('../models/SalarySlip');
const { sendEmail } = require('../utils/sendEmail');
const { generateSalarySlipPDF } = require('../utils/generatePDF');

async function generateMonthlySalarySlips(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const employees = await Employee.find();

  for (const employee of employees) {
    // Count attendance days
    const attendanceCount = await Attendance.countDocuments({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
      punchIn: { $exists: true },
      punchOut: { $exists: true }
    });

    // Calculate salary based on days present
    const totalDays = 30;
    const dailySalary = employee.salary / totalDays;
    const amount = attendanceCount * dailySalary;

    // Create salary slip
    const salarySlip = new SalarySlip({
      employee: employee._id,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      amount: Math.round(amount),
      date: new Date(),
      generatedBy: null, // System generated
    });

    await salarySlip.save();

    // Generate PDF with employee data
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    // Send email
    try {
      await sendEmail(
        employee.email,
        'Monthly Salary Slip',
        'Please find your salary slip attached.',
        [{ filename: `salary-slip-${salarySlip.month}.pdf`, content: pdfBuffer }]
      );

      // Update status to 'sent' after successful email
      salarySlip.status = 'sent';
      await salarySlip.save();
    } catch (emailErr) {
      console.error('Email sending failed for employee:', employee.email, emailErr);
      // Salary slip is saved but email failed, status remains 'generated'
    }
  }
}

module.exports = { generateMonthlySalarySlips };

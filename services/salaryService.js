const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const SalarySlip = require('../models/SalarySlip');
const { sendEmail } = require('../utils/sendEmail');
const { generateSalarySlipPDF } = require('../utils/generatePDF');

function calculateHours(att) {
  if (!att.punchIn) return 0;
  const end = att.punchOut || new Date();
  const totalTime = end - att.punchIn;
  return (totalTime - att.totalPausedDuration) / (1000 * 60 * 60);
}

async function generateMonthlySalarySlips(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const employees = await Employee.find();

  for (const employee of employees) {
    // Calculate total hours worked
    const attendances = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
      punchIn: { $exists: true },
      punchOut: { $exists: true }
    });
    const totalHours = attendances.reduce((sum, att) => sum + calculateHours(att), 0);
    const attendanceCount = attendances.length; // present days

    // Salary calculation
    const totalDays = 30;
    const standardHoursPerDay = 8;
    const monthlySalary = employee.salary;
    const hourlySalary = monthlySalary / (totalDays * standardHoursPerDay);
    const proratedSalary = totalHours * hourlySalary;

    // Earnings
    const basicPay = Math.round(proratedSalary * 0.35);
    const hra = Math.round(basicPay * 0.4);
    const conveyanceAllowance = Math.min(19200, Math.round(proratedSalary * 0.1));
    const medicalAllowance = Math.round(proratedSalary * 0.05);
    const lta = Math.round(proratedSalary * 0.1);
    const otherAllowances =
      proratedSalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

    // Deductions
    const pf = Math.round(basicPay * 0.12);
    const professionalTax = 235;
    const gratuity = Math.round((basicPay * 15 * attendanceCount) / (totalDays * 26));
    const otherDeductions = 0;

    // Totals
    const totalEarnings =
      basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
    const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
    const netSalary = totalEarnings - totalDeductions;

    const financialYear = getFinancialYear();

    // Save salary slip
    const salarySlip = new SalarySlip({
      employee: employee._id,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      year,
      amount: monthlySalary,
      basicPay,
      hra,
      conveyanceAllowance,
      medicalAllowance,
      lta,
      otherAllowances,
      pf,
      professionalTax,
      gratuity,
      otherDeductions,
      totalEarnings,
      totalDeductions,
      netSalary,
      workingDays: totalDays,
      presentDays: attendanceCount,
      paymentMode: 'Bank Transfer',
      bankAccount: employee.employeeId,
      financialYear,
      date: new Date(),
      generatedBy: null
    });

    await salarySlip.save();

    // Generate PDF
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    // 📧 PROFESSIONAL EMAIL CONTENT
    const subject = `Salary Slip for ${salarySlip.month}`;
    
    const textMessage = `
Dear ${employee.name},

We hope this message finds you well.

Please find attached your salary slip for the month of ${salarySlip.month}.
The details include earnings, deductions, and net payable salary.

If you have any questions or notice any discrepancies, please contact the HR department within 3 working days.

This is a system-generated email. Kindly do not reply.

Best regards,
HR Department
`;

    const htmlMessage = `
<p>Dear <strong>${employee.name}</strong>,</p>

<p>We hope this email finds you well.</p>

<p>Please find attached your <strong>salary slip for the month of ${salarySlip.month}</strong>.
The document contains a detailed breakdown of your earnings, deductions, and net payable salary.</p>

<p>If you have any questions or notice any discrepancies, kindly reach out to the HR department within <strong>3 working days</strong>.</p>

<p style="color:#555;font-size:13px;">
This is a system-generated email. Please do not reply to this message.
</p>

<p>Warm regards,<br/>
<strong>HR Department</strong></p>
`;

    // Send email with attachment
    await sendEmail(
      employee.email,
      subject,
      textMessage,
      pdfBuffer,
      htmlMessage
    );
  }
}

// Financial year helper
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

module.exports = { generateMonthlySalarySlips };

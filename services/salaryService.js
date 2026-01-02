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

    // Calculate salary components based on attendance
    const totalDays = 30;
    const monthlySalary = employee.salary;
    const dailySalary = monthlySalary / totalDays;
    const proratedSalary = attendanceCount * dailySalary;

    // Calculate salary components (standard Indian salary structure)
    const basicPay = Math.round(proratedSalary * 0.35); // 35% of total salary
    const hra = Math.round(basicPay * 0.4); // 40% of basic pay
    const conveyanceAllowance = Math.min(19200, Math.round(proratedSalary * 0.1)); // Conveyance allowance (max 19200/year)
    const medicalAllowance = Math.round(proratedSalary * 0.05); // 5% medical allowance
    const lta = Math.round(proratedSalary * 0.1); // 10% LTA
    const otherAllowances = proratedSalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

    // Calculate deductions
    const pf = Math.round(basicPay * 0.12); // 12% PF
    const professionalTax = 235; // Fixed professional tax for UP (can be adjusted based on state)
    const gratuity = Math.round((basicPay * 15 * attendanceCount) / (totalDays * 26)); // Gratuity calculation
    const otherDeductions = 0;

    // Calculate totals
    const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
    const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
    const netSalary = totalEarnings - totalDeductions;

    // Get financial year
    const financialYear = getFinancialYear();

    // Create salary slip with detailed components
    const salarySlip = new SalarySlip({
      employee: employee._id,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      year: year,
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
      bankAccount: employee.employeeId, // Using employee ID as placeholder
      financialYear,
      date: new Date(),
      generatedBy: null, // System generated
    });

    await salarySlip.save();

    // Generate PDF with employee data
    const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

    // Send email
    await sendEmail(employee.email, 'Monthly Salary Slip', 'Please find your salary slip attached.', pdfBuffer);
  }
}

// Helper function to get current financial year
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

module.exports = { generateMonthlySalarySlips };

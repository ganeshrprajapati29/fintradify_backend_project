const Employee = require('../models/Employee');
const SalarySlip = require('../models/SalarySlip');
const { sendEmail } = require('../utils/sendEmail');

const blockEmployee = async (employeeId, adminId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  if (employee.status !== 'active') {
    throw new Error('Employee is already blocked or terminated');
  }

  employee.status = 'blocked';
  await employee.save();

  console.log(`Employee ${employee.employeeId} (${employee.name}) has been blocked by admin ${adminId}`);

  // Send email notification
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #dc3545; text-align: center;">🚫 Account Blocked</h2>
      <p>Dear <strong>${employee.name}</strong>,</p>
      <p>Your employee account has been blocked by the administrator.</p>
      <p>If you believe this is an error, please contact your administrator immediately.</p>
      <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
        This is a system-generated notification. Do not reply to this email.
      </p>
    </div>
  `;

  try {
    await sendEmail(employee.email, '🚫 Fintradify Account Blocked', htmlContent);
  } catch (emailErr) {
    console.error('Error sending block email:', emailErr);
  }

  // Fetch latest salary
  let salary = 'N/A';
  try {
    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });
    salary = latestSalary ? latestSalary.netSalary : 'N/A';
  } catch (salaryErr) {
    console.error('Error fetching salary:', salaryErr);
  }

  return { ...employee._doc, salary };
};

const unblockEmployee = async (employeeId, adminId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  if (employee.status !== 'blocked') {
    throw new Error('Employee is not blocked');
  }

  employee.status = 'active';
  await employee.save();

  console.log(`Employee ${employee.employeeId} (${employee.name}) has been unblocked by admin ${adminId}`);

  // Send email notification
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #28a745; text-align: center;">✅ Account Unblocked</h2>
      <p>Dear <strong>${employee.name}</strong>,</p>
      <p>Your employee account has been unblocked by the administrator.</p>
      <p>You can now log in to the Fintradify Employee Portal.</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="https://crm.fintradify.com/" style="background-color:#28a745; color:#fff; padding: 10px 20px; border-radius: 5px; text-decoration:none; font-weight:bold;">
          🔗 Go to Employee Portal
        </a>
      </p>
      <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
        This is a system-generated notification. Do not reply to this email.
      </p>
    </div>
  `;

  try {
    await sendEmail(employee.email, '✅ Fintradify Account Unblocked', htmlContent);
  } catch (emailErr) {
    console.error('Error sending unblock email:', emailErr);
  }

  // Fetch latest salary
  let salary = 'N/A';
  try {
    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });
    salary = latestSalary ? latestSalary.netSalary : 'N/A';
  } catch (salaryErr) {
    console.error('Error fetching salary:', salaryErr);
  }

  return { ...employee._doc, salary };
};

module.exports = {
  blockEmployee,
  unblockEmployee,
};

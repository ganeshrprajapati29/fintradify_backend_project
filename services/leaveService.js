const Employee = require('../models/Employee');
const Leave = require('../models/Leave');

async function calculateLeaveBalances(employeeId) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  const now = new Date();
  const joinDate = new Date(employee.joiningDate);
  const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());

  if (monthsWorked >= 6) {
    // Accrue 1 full day and 1 half day per month if not taken
    // For simplicity, assume monthly accrual
    // In real scenario, this should be called monthly
    employee.paidLeaveBalance += 1;
    employee.halfDayLeaveBalance += 1;
    await employee.save();
  }

  return {
    paidLeaveBalance: employee.paidLeaveBalance,
    halfDayLeaveBalance: employee.halfDayLeaveBalance,
  };
}

async function applyLeave(employeeId, startDate, endDate) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // inclusive

  let deduction = 0;
  let status = 'approved';

  if (days <= employee.paidLeaveBalance) {
    employee.paidLeaveBalance -= days;
  } else if (days <= employee.paidLeaveBalance + employee.halfDayLeaveBalance * 0.5) {
    const fullDays = Math.floor(employee.paidLeaveBalance);
    const halfDaysNeeded = (days - fullDays) * 2;
    employee.paidLeaveBalance -= fullDays;
    employee.halfDayLeaveBalance -= halfDaysNeeded;
  } else {
    // Not enough leave, deduct salary
    const remainingDays = days - (employee.paidLeaveBalance + employee.halfDayLeaveBalance * 0.5);
    employee.paidLeaveBalance = 0;
    employee.halfDayLeaveBalance = 0;
    deduction = remainingDays; // days to deduct salary
    status = 'approved with deduction';
  }

  await employee.save();

  return { status, deduction };
}

async function getAllEmployeesLeaveData() {
  const employees = await Employee.find().select('employeeId name joiningDate paidLeaveBalance');
  return employees.map(emp => {
    const now = new Date();
    const joinDate = new Date(emp.joiningDate);
    const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    const isEligible = monthsWorked >= 6;
    const eligibilityDate = new Date(joinDate);
    eligibilityDate.setMonth(eligibilityDate.getMonth() + 6);
    return {
      employeeId: emp.employeeId,
      name: emp.name,
      isEligible,
      remainingLeaves: emp.paidLeaveBalance,
      joiningDate: emp.joiningDate,
      eligibilityDate: eligibilityDate.toISOString().split('T')[0],
    };
  });
}

async function getEmployeeLeaveData(employeeId) {
  const emp = await Employee.findById(employeeId).select('employeeId name joiningDate paidLeaveBalance');
  if (!emp) throw new Error('Employee not found');
  const now = new Date();
  const joinDate = new Date(emp.joiningDate);
  const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const isEligible = monthsWorked >= 6;
  const eligibilityDate = new Date(joinDate);
  eligibilityDate.setMonth(eligibilityDate.getMonth() + 6);
  return {
    employeeId: emp.employeeId,
    name: emp.name,
    isEligible,
    remainingLeaves: emp.paidLeaveBalance,
    joiningDate: emp.joiningDate,
    eligibilityDate: eligibilityDate.toISOString().split('T')[0],
  };
}

module.exports = { calculateLeaveBalances, applyLeave, getAllEmployeesLeaveData, getEmployeeLeaveData };

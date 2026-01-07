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
  let status = 'pending'; // Leave requests are pending until approved

  // Check if employee has enough balance for the requested leave
  if (employee.status === 'active') {
    if (days <= employee.paidLeaveBalance) {
      status = 'approved'; // Auto-approve if enough balance
      // Balance will be deducted when approved in the PUT route
    } else if (days <= employee.paidLeaveBalance + employee.halfDayLeaveBalance * 0.5) {
      status = 'approved'; // Auto-approve if enough balance including half days
      // Balance will be deducted when approved in the PUT route
    } else {
      // Not enough leave, will require approval or salary deduction
      status = 'pending';
    }
  } else {
    status = 'rejected'; // Non-active employees cannot request leave
  }

  return { status, deduction };
}

async function getAllEmployeesLeaveData() {
  const employees = await Employee.find().select('employeeId name joiningDate paidLeaveBalance usedPaidLeaves status lastLeaveAccrual');

  // Accrue leaves for all eligible employees first
  await Promise.all(employees.map(emp => accrueMonthlyLeaves(emp._id)));

  // Fetch updated data
  const updatedEmployees = await Employee.find().select('employeeId name joiningDate paidLeaveBalance usedPaidLeaves status lastLeaveAccrual');

  return updatedEmployees.map(emp => {
    const now = new Date();
    const joinDate = new Date(emp.joiningDate);
    let monthsWorked = 0;
    let isEligible = false;
    let eligibilityDateStr = '';
    let remainingLeaves = emp.paidLeaveBalance - (emp.usedPaidLeaves || 0);

    if (!isNaN(joinDate.getTime())) {
      monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
      isEligible = monthsWorked >= 6;
      const eligibilityDate = new Date(joinDate);
      eligibilityDate.setMonth(eligibilityDate.getMonth() + 6);
      eligibilityDateStr = eligibilityDate.toISOString().split('T')[0];
    }

    // For blocked/terminated employees, show 0 remaining leaves
    if (emp.status === 'blocked' || emp.status === 'terminated') {
      remainingLeaves = 0;
    }

    return {
      employeeId: emp.employeeId,
      name: emp.name,
      isEligible,
      remainingLeaves,
      usedPaidLeaves: emp.usedPaidLeaves || 0,
      joiningDate: emp.joiningDate,
      eligibilityDate: eligibilityDateStr,
      status: emp.status,
    };
  });
}

async function getEmployeeLeaveData(employeeId) {
  // Accrue leaves first
  await accrueMonthlyLeaves(employeeId);

  // Fetch updated employee data
  const emp = await Employee.findById(employeeId).select('employeeId name joiningDate paidLeaveBalance usedPaidLeaves status');
  if (!emp) throw new Error('Employee not found');

  const now = new Date();
  const joinDate = new Date(emp.joiningDate);
  let monthsWorked = 0;
  let isEligible = false;
  let eligibilityDateStr = '';
  let remainingLeaves = emp.paidLeaveBalance - (emp.usedPaidLeaves || 0);

  if (!isNaN(joinDate.getTime())) {
    monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    isEligible = monthsWorked >= 6;
    const eligibilityDate = new Date(joinDate);
    eligibilityDate.setMonth(eligibilityDate.getMonth() + 6);
    eligibilityDateStr = eligibilityDate.toISOString().split('T')[0];
  }

  // For blocked/terminated employees, show 0 remaining leaves
  if (emp.status === 'blocked' || emp.status === 'terminated') {
    remainingLeaves = 0;
  }

  return {
    employeeId: emp.employeeId,
    name: emp.name,
    isEligible,
    remainingLeaves,
    usedPaidLeaves: emp.usedPaidLeaves || 0,
    joiningDate: emp.joiningDate,
    eligibilityDate: eligibilityDateStr,
    status: emp.status,
  };
}

// Accrue monthly leaves for eligible employees
async function accrueMonthlyLeaves(employeeId) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.status !== 'active') return;

    const now = new Date();
    const joinDate = new Date(employee.joiningDate);
    const accrualStartDate = new Date('2025-11-01');

    // No accrual before November 2025
    if (now < accrualStartDate) return;

    // Check if employee is eligible (6 months or more)
    const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    if (monthsWorked < 6) return;

    // Calculate eligibility date
    const eligibilityDate = new Date(joinDate);
    eligibilityDate.setMonth(eligibilityDate.getMonth() + 6);

    // Effective accrual start is the maximum of eligibility date and November 2025
    const effectiveStart = eligibilityDate > accrualStartDate ? eligibilityDate : accrualStartDate;

    // Set lastLeaveAccrual if not set
    if (!employee.lastLeaveAccrual) {
      employee.lastLeaveAccrual = effectiveStart;
    }

    // Check if we need to accrue leaves for this month
    const lastAccrual = new Date(employee.lastLeaveAccrual);
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const lastAccrualMonth = lastAccrual.getFullYear() * 12 + lastAccrual.getMonth();

    // Accrue 1.5 days per month (1 full + 0.5 half day)
    const monthsToAccrue = currentMonth - lastAccrualMonth;
    if (monthsToAccrue > 0) {
      employee.paidLeaveBalance += monthsToAccrue * 1.5;
      employee.lastLeaveAccrual = now;
      await employee.save();
    }
  } catch (error) {
    console.error('Error accruing monthly leaves:', error);
  }
}

module.exports = { calculateLeaveBalances, applyLeave, getAllEmployeesLeaveData, getEmployeeLeaveData, accrueMonthlyLeaves };

const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { applyLeave, calculateLeaveBalances, getEmployeeLeaveData, getAllEmployeesLeaveData } = require('../services/leaveService');

router.post('/', auth, async (req, res) => {
  const { startDate, endDate, reason, type } = req.body;
  try {
    const result = await applyLeave(req.user.id, startDate, endDate);
    const leave = new Leave({
      employee: req.user.id,
      startDate,
      endDate,
      reason,
      type: type || 'paid',
      status: result.status,
    });
    await leave.save();

    // Create notification for admin
    const notification = new Notification({
      type: 'leave_request',
      message: `New leave request from employee`,
      recipient: 'admin',
      relatedId: leave._id,
    });
    await notification.save();

    res.json({ leave, deduction: result.deduction });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const leaves = await Leave.find().populate('employee', 'employeeId name');
  res.json(leaves);
});

router.get('/my-leaves', auth, async (req, res) => {
  const leaves = await Leave.find({ employee: req.user.id }).populate('employee', 'employeeId name');
  res.json(leaves);
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { status } = req.body;
  try {
    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Calculate days if approving
    if (status === 'approved' && leave.status !== 'approved') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      if (leave.type === 'paid') {
        // Increment used paid leaves and decrement balance
        await Employee.findByIdAndUpdate(leave.employee._id, { $inc: { usedPaidLeaves: days, paidLeaveBalance: -days } });
      }
    }

    leave.status = status;
    await leave.save();

    // Create notification for employee about leave status update
    const notification = new Notification({
      type: 'leave_status',
      message: `Your leave request has been ${status}`,
      recipient: leave.employee._id.toString(),
      relatedId: leave._id,
    });
    await notification.save();

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /balances
 * @desc Get leave balances for all employees (admin only)
 */
router.get('/balances', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const employees = await Employee.find().select('employeeId name paidLeaveBalance halfDayLeaveBalance');
    const balances = await Promise.all(employees.map(async (emp) => {
      const balance = await calculateLeaveBalances(emp._id);
      return {
        employeeId: emp.employeeId,
        name: emp.name,
        paidLeaveBalance: balance.paidLeaveBalance,
        halfDayLeaveBalance: balance.halfDayLeaveBalance,
      };
    }));
    res.json(balances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /history
 * @desc Get leave history for all employees (admin only)
 */
router.get('/history', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const leaves = await Leave.find({ status: 'approved' })
      .populate('employee', 'employeeId name')
      .sort({ startDate: -1 });
    const history = leaves.map(leave => ({
      employeeId: leave.employee?.employeeId,
      name: leave.employee?.name,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1,
      month: new Date(leave.startDate).toLocaleString('default', { month: 'long', year: 'numeric' }),
    }));
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /employee-data
 * @desc Get leave data for all employees (admin only)
 */
router.get('/employee-data', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const data = await getAllEmployeesLeaveData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /my-employee-data
 * @desc Get leave data for current employee
 */
router.get('/my-employee-data', auth, async (req, res) => {
  try {
    const data = await getEmployeeLeaveData(req.user.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /my-balances
 * @desc Get leave balances for current employee
 */
router.get('/my-balances', auth, async (req, res) => {
  try {
    // Accrue leaves first
    await require('../services/leaveService').accrueMonthlyLeaves(req.user.id);

    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // For blocked/terminated employees, show 0 balance
    if (employee.status === 'blocked' || employee.status === 'terminated') {
      return res.json({
        paidLeaveBalance: 0,
        unpaidLeaveBalance: employee.unpaidLeaveBalance,
        halfDayLeaveBalance: employee.halfDayLeaveBalance,
      });
    }

    // Return the remaining balance (accrued - used)
    const remaining = employee.paidLeaveBalance - (employee.usedPaidLeaves || 0);
    res.json({
      paidLeaveBalance: remaining,
      unpaidLeaveBalance: employee.unpaidLeaveBalance,
      halfDayLeaveBalance: employee.halfDayLeaveBalance,
    });
  } catch (err) {
    console.error('Fetch leave balances error:', err);
    res.status(500).json({ message: 'Server error while fetching leave balances' });
  }
});

module.exports = router;

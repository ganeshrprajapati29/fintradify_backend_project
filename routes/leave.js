const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
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
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('employee', 'employeeId name');
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
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
    const Employee = require('../models/Employee');
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

module.exports = router;

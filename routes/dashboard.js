const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const SalarySlip = require('../models/SalarySlip');
const auth = require('../middleware/auth');

// Get dashboard metrics
router.get('/metrics', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    // Get total employees
    const totalEmployees = await Employee.countDocuments();

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysAttendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });

    const presentToday = todaysAttendanceRecords.length;
    const todaysAttendance = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // Get pending leaves
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    // Get leaves needing approval (same as pending)
    const leavesNeedingApproval = pendingLeaves;

    // Get monthly salary total
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlySalaryRecords = await SalarySlip.find({ month: currentMonth });
    const monthlySalary = monthlySalaryRecords.reduce((sum, slip) => sum + slip.amount, 0);

    // Get leave statistics
    const approvedLeaves = await Leave.countDocuments({ status: 'approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'rejected' });

    // Calculate growth metrics (simplified - comparing to last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    const lastMonthEmployees = await Employee.countDocuments({ createdAt: { $lt: lastMonth } });
    const employeeGrowth = lastMonthEmployees > 0 ? Math.round(((totalEmployees - lastMonthEmployees) / lastMonthEmployees) * 100) : 0;

    const lastMonthSalaryRecords = await SalarySlip.find({ month: lastMonthStr });
    const lastMonthSalary = lastMonthSalaryRecords.reduce((sum, slip) => sum + slip.amount, 0);
    const salaryGrowth = lastMonthSalary > 0 ? Math.round(((monthlySalary - lastMonthSalary) / lastMonthSalary) * 100) : 0;

    const metrics = {
      totalEmployees,
      employeeGrowth,
      todaysAttendance,
      presentToday,
      pendingLeaves,
      leavesNeedingApproval,
      monthlySalary,
      salaryGrowth,
      approvedLeaves,
      rejectedLeaves
    };

    res.json(metrics);
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    res.status(500).json({ message: 'Server error while fetching dashboard metrics' });
  }
});

module.exports = router;

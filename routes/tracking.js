const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

function calculateHours(att) {
  if (!att.punchIn) return 0;
  const end = att.punchOut || new Date();
  const totalTime = end - att.punchIn;
  return (totalTime - att.totalPausedDuration) / (1000 * 60 * 60);
}

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get all employees
    const employees = await Employee.find({ status: 'active' });

    // Get today's attendance
    const todaysAttendance = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      punchIn: { $ne: null }
    }).populate('employee', 'name employeeId team department');

    // Get today's tasks
    const todaysTasks = await Task.find({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    }).populate('employee', 'name');

    // Create a map of employee IDs to their attendance data
    const attendanceMap = {};
    todaysAttendance.forEach(att => {
      const hoursWorked = calculateHours(att).toFixed(2);
      attendanceMap[att.employee._id.toString()] = {
        isActive: att.timerStatus === 'active',
        hoursWorked: parseFloat(hoursWorked),
        punchIn: att.punchIn,
        punchOut: att.punchOut,
        status: att.status
      };
    });

    // Create a map of employee IDs to their tasks
    const taskMap = {};
    todaysTasks.forEach(task => {
      if (task.employee) {
        const empId = task.employee._id.toString();
        if (!taskMap[empId]) taskMap[empId] = [];
        taskMap[empId].push({
          title: task.title,
          status: task.status,
          priority: task.priority
        });
      }
    });

    // Build employee tracking data
    const trackingData = employees.map(emp => {
      const empAttendance = attendanceMap[emp._id.toString()] || { isActive: false, hoursWorked: 0, punchIn: null, punchOut: null, status: null };
      const empTasks = taskMap[emp._id.toString()] || [];
      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        team: emp.team,
        profilePhoto: emp.profilePhoto,
        location: emp.location,
        isActive: empAttendance.isActive,
        hoursWorked: empAttendance.hoursWorked,
        punchIn: empAttendance.punchIn,
        punchOut: empAttendance.punchOut,
        attendanceStatus: empAttendance.status,
        todaysTasks: empTasks,
        lastActivity: empAttendance.punchIn || emp.updatedAt
      };
    });

    res.json({ success: true, data: trackingData });
  } catch (err) {
    console.error('Fetch tracking error:', err);
    res.status(500).json({ message: 'Server error while fetching tracking data' });
  }
});

module.exports = router;

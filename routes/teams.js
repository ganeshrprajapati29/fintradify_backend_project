const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  // Allow both admin and employee roles
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
      const hoursWorked = att.punchOut && att.punchIn
        ? ((new Date(att.punchOut) - new Date(att.punchIn)) / 1000 / 60 / 60).toFixed(2)
        : 0;
      attendanceMap[att.employee._id.toString()] = {
        isActive: true,
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

    // Group employees by team (use department if team is empty)
    const teams = {};

    employees.forEach(emp => {
      const teamName = emp.team || emp.department || 'No Team';
      if (!teams[teamName]) {
        teams[teamName] = [];
      }
      const empAttendance = attendanceMap[emp._id.toString()] || { isActive: false, hoursWorked: 0, punchIn: null, punchOut: null, status: null };
      const empTasks = taskMap[emp._id.toString()] || [];
      teams[teamName].push({
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        team: emp.team,
        profilePhoto: emp.profilePhoto,
        isActive: empAttendance.isActive,
        hoursWorked: empAttendance.hoursWorked,
        punchIn: empAttendance.punchIn,
        punchOut: empAttendance.punchOut,
        attendanceStatus: empAttendance.status,
        todaysTasks: empTasks
      });
    });

    // Convert to array format
    const teamsArray = Object.keys(teams).map(teamName => ({
      teamName,
      employees: teams[teamName]
    }));

    res.json({ success: true, data: teamsArray });
  } catch (err) {
    console.error('Fetch teams error:', err);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
});

module.exports = router;

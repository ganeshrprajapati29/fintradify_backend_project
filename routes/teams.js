const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Get all employees
    const employees = await Employee.find({ status: 'active' });

    // Get today's attendance
    const todaysAttendance = await Attendance.find({
      date: today,
      punchIn: { $ne: null }
    }).populate('employee', 'name employeeId team department');

    // Create a map of employee IDs to their attendance data
    const attendanceMap = {};
    todaysAttendance.forEach(att => {
      attendanceMap[att.employee._id.toString()] = {
        isActive: true,
        hoursWorked: att.hoursWorked || 0
      };
    });

    // Group employees by team (use department if team is empty)
    const teams = {};

    employees.forEach(emp => {
      const teamName = emp.team || emp.department || 'No Team';
      if (!teams[teamName]) {
        teams[teamName] = [];
      }
      const empAttendance = attendanceMap[emp._id.toString()] || { isActive: false, hoursWorked: 0 };
      teams[teamName].push({
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        team: emp.team,
        profilePhoto: emp.profilePhoto,
        isActive: empAttendance.isActive,
        hoursWorked: empAttendance.hoursWorked
      });
    });

    // Convert to array format
    const teamsArray = Object.keys(teams).map(teamName => ({
      teamName,
      employees: teams[teamName]
    }));

    res.json(teamsArray);
  } catch (err) {
    console.error('Fetch teams error:', err);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
});

module.exports = router;

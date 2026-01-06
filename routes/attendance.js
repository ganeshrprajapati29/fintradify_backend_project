const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const SalarySlip = require('../models/SalarySlip');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');

const moment = require('moment-timezone');

function calculateHours(att) {
  if (!att.punchIn) return 0;
  const end = att.punchOut || new Date();
  const totalTime = end - att.punchIn;
  return (totalTime - att.totalPausedDuration) / (1000 * 60 * 60);
}

/**
 * Punch In / Out
 */
router.post('/punch', auth, async (req, res) => {
  const { type } = req.body;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      employee: req.user.id,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (type === 'in') {
      if (existingAttendance && existingAttendance.punchIn) {
        return res.status(400).json({ message: 'Already punched in today' });
      }
      const attendance = new Attendance({
        employee: req.user.id,
        date: new Date(),
        punchIn: new Date(),
        timerStatus: 'active',
      });
      await attendance.save();
      return res.json({ message: 'Punch-in recorded', attendance });
    }

    if (type === 'out') {
      if (!existingAttendance) {
        return res.status(400).json({ message: 'No punch-in record found for today' });
      }
      if (existingAttendance.punchOut) {
        return res.status(400).json({ message: 'Already punched out today' });
      }
      existingAttendance.punchOut = new Date();
      existingAttendance.status = 'pending'; // Set status to pending for admin approval
      await existingAttendance.save();

      // Create notification for admin
      const adminNotification = new Notification({
        type: 'attendance_pending',
        message: `An employee has punched out. Please review and approve/reject.`,
        recipient: 'admin',
        relatedId: existingAttendance._id,
      });
      await adminNotification.save();

      return res.json({ message: 'Punch-out recorded and sent for approval', attendance: existingAttendance });
    }

    return res.status(400).json({ message: 'Invalid punch type' });
  } catch (err) {
    console.error('Punch error:', err);
    res.status(500).json({ message: 'Server error while recording punch' });
  }
});

/**
 * Admin: Get All Attendance
 */
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { startDate, endDate } = req.query;
  const query = startDate && endDate
    ? { date: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : {};
  try {
    const attendances = await Attendance.find(query).populate('employee', 'employeeId name');
    res.json(attendances);
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
});

/**
 * Admin: Get Pending Attendance
 */
router.get('/pending', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const pendingAttendances = await Attendance.find({ status: 'pending' })
      .populate('employee', 'employeeId name')
      .sort({ date: -1 });
    res.json(pendingAttendances);
  } catch (err) {
    console.error('Fetch pending attendance error:', err);
    res.status(500).json({ message: 'Server error while fetching pending attendance' });
  }
});

/**
 * Employee: My Attendance
 */
router.get('/my-attendance', auth, async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = {
    employee: req.user.id,
    ...(startDate && endDate && {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }),
  };
  try {
    const attendances = await Attendance.find(query).populate('employee', 'employeeId name');
    res.json(attendances);
  } catch (err) {
    console.error('Fetch my-attendance error:', err);
    res.status(500).json({ message: 'Server error while fetching your attendance' });
  }
});

/**
 * Admin: Attendance Overview
 */
router.get('/overview', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const attendances = await Attendance.find()
      .populate('employee', 'employeeId name')
      .sort({ date: -1 });

    if (!attendances.length) {
      return res.json({ message: 'No attendance records found' });
    }

    const overview = attendances.reduce((acc, att) => {
      const date = new Date(att.date).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];

      const hoursWorked = calculateHours(att).toFixed(2);

      acc[date].push({
        employeeId: att.employee?.employeeId || 'N/A',
        name: att.employee?.name || 'N/A',
        punchIn: att.punchIn
          ? new Date(att.punchIn).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : '-',
        punchOut: att.punchOut
          ? new Date(att.punchOut).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : '-',
        hoursWorked,
      });

      return acc;
    }, {});

    res.json(overview);
  } catch (err) {
    console.error('Fetch overview error:', err);
    res.status(500).json({ message: 'Server error while fetching attendance overview' });
  }
});

/**
 * Admin: Download Attendance CSV - CORRECTED VERSION
 */
router.get('/download', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const attendances = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate('employee', 'employeeId name');

    const validAttendances = attendances.filter(att => att.employee);

    if (!validAttendances.length) {
      return res.status(404).json({ message: 'No attendance records found for the selected date range' });
    }

    // Get all unique employee IDs from valid attendances
    const employeeIds = [...new Set(validAttendances.map(att => att.employee._id.toString()))];

    // Fetch salary slips for all employees in the date range
    const salarySlips = await SalarySlip.find({
      employee: { $in: employeeIds },
      month: { $gte: startDate.slice(0, 7), $lte: endDate.slice(0, 7) },
    }).lean();

    const records = validAttendances.map(att => {
      const hoursWorked = calculateHours(att).toFixed(2);
      const dateMonth = new Date(att.date).toISOString().slice(0, 7);

      // Find salary slip for this employee and month
      const salarySlip = salarySlips.find(slip =>
        slip.employee && slip.employee.toString() === att.employee._id.toString() &&
        slip.month === dateMonth
      );

      // Use salary slip data if available, otherwise use default
      let hourlyRate = '100.00';
      if (salarySlip && salarySlip.hoursWorked > 0) {
        hourlyRate = (salarySlip.amount / salarySlip.hoursWorked).toFixed(2);
      }

      const totalSalary = (parseFloat(hoursWorked) * parseFloat(hourlyRate)).toFixed(2);

      return {
        employeeId: att.employee?.employeeId || 'N/A',
        name: att.employee?.name || 'N/A',
        date: new Date(att.date).toLocaleDateString('en-IN'),
        punchIn: att.punchIn
          ? new Date(att.punchIn).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : '-',
        punchOut: att.punchOut
          ? new Date(att.punchOut).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : '-',
        hoursWorked,
        hourlyRate,
        totalSalary,
      };
    });

    const header = 'Employee ID,Name,Date,Punch In,Punch Out,Hours Worked,Hourly Rate (₹),Total Salary (₹)\n';
    const rows = records.map(r => `${r.employeeId},${r.name},${r.date},${r.punchIn},${r.punchOut},${r.hoursWorked},${r.hourlyRate},${r.totalSalary}`).join('\n');
    const csvContent = header + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${startDate}-${endDate}.csv`);
    res.send('\ufeff' + csvContent);
  } catch (err) {
    console.error('Download CSV error:', err);
    res.status(500).json({ message: 'Server error while downloading CSV' });
  }
});

/**
 * Employee: Download My Attendance CSV
 */
router.get('/download/my-attendance', auth, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const attendances = await Attendance.find({
      employee: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate('employee', 'employeeId name');

    if (!attendances.length) {
      return res.status(404).json({ message: 'No attendance records found for the selected date range' });
    }

    const salarySlips = await SalarySlip.find({
      employee: req.user.id,
      month: { $gte: startDate.slice(0, 7), $lte: endDate.slice(0, 7) },
    }).lean();

    const records = attendances.map(att => {
      const hoursWorked = calculateHours(att).toFixed(2);
      const dateMonth = new Date(att.date).toISOString().slice(0, 7);

      const salarySlip = salarySlips.find(slip => slip.month === dateMonth);

      let hourlyRate = '100.00';
      if (salarySlip && salarySlip.hoursWorked > 0) {
        hourlyRate = (salarySlip.amount / salarySlip.hoursWorked).toFixed(2);
      }

      const totalSalary = (parseFloat(hoursWorked) * parseFloat(hourlyRate)).toFixed(2);

      return {
        employeeId: att.employee?.employeeId || 'N/A',
        name: att.employee?.name || 'N/A',
        date: new Date(att.date).toLocaleDateString('en-IN'),
        punchIn: att.punchIn
          ? new Date(att.punchIn).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : '-',
        punchOut: att.punchOut
          ? new Date(att.punchOut).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : '-',
        hoursWorked,
        hourlyRate,
        totalSalary,
      };
    });

    const header = 'Employee ID,Name,Date,Punch In,Punch Out,Hours Worked,Hourly Rate (₹),Total Salary (₹)\n';
    const rows = records.map(r => `${r.employeeId},${r.name},${r.date},${r.punchIn},${r.punchOut},${r.hoursWorked},${r.hourlyRate},${r.totalSalary}`).join('\n');
    const csvContent = header + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=my-attendance-${startDate}-${endDate}.csv`);
    res.send('\ufeff' + csvContent);
  } catch (err) {
    console.error('Download my-attendance CSV error:', err);
    res.status(500).json({ message: 'Server error while downloading your attendance CSV' });
  }
});

/**
 * Get Attendance by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate('employee', 'employeeId name');
    if (!attendance) {
      // Return a default object instead of 404 to prevent frontend errors
      return res.status(200).json({
        message: 'Attendance record not found',
        employee: { name: 'Unknown Employee', employeeId: 'N/A' },
        date: new Date(),
        punchIn: null,
        punchOut: null,
        status: 'unknown'
      });
    }
    res.json(attendance);
  } catch (err) {
    console.error('Fetch attendance by ID error:', err);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
});

/**
 * Admin: Manual Punch In/Out
 */
router.post('/admin/punch', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { employeeId, date, punchIn, punchOut } = req.body;
  try {
    // Parse punchIn and punchOut as IST and convert to UTC for storage
    const punchInUTC = punchIn ? moment.tz(punchIn, 'Asia/Kolkata').utc().toDate() : undefined;
    const punchOutUTC = punchOut ? moment.tz(punchOut, 'Asia/Kolkata').utc().toDate() : undefined;

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: new Date(date) },
      { punchIn: punchInUTC, punchOut: punchOutUTC },
      { new: true, upsert: true }
    );
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Admin: Mark Holiday or Half Day
 */
router.post('/admin/mark', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { employeeId, date, type } = req.body; // type: 'holiday' or 'halfDay'
  try {
    const update = type === 'holiday' ? { holiday: true } : { halfDay: true };
    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: new Date(date) },
      update,
      { new: true, upsert: true }
    );
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Admin: Edit Attendance by ID
 */
router.put('/admin/edit/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { punchIn, punchOut, holiday, halfDay } = req.body;
  try {
    const update = {};
    if (punchIn !== undefined) update.punchIn = punchIn ? moment.tz(punchIn, 'Asia/Kolkata').utc().toDate() : null;
    if (punchOut !== undefined) update.punchOut = punchOut ? moment.tz(punchOut, 'Asia/Kolkata').utc().toDate() : null;
    if (holiday !== undefined) update.holiday = holiday;
    if (halfDay !== undefined) update.halfDay = halfDay;

    const attendance = await Attendance.findByIdAndUpdate(req.params.id, update, { new: true }).populate('employee', 'employeeId name');
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
    res.json(attendance);
  } catch (err) {
    console.error('Edit attendance error:', err);
    res.status(500).json({ message: 'Server error while editing attendance' });
  }
});

/**
 * Admin: Delete Attendance by ID
 */
router.delete('/admin/delete/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ message: 'Server error while deleting attendance' });
  }
});

/**
 * Admin: Approve Attendance Punch
 */
router.put('/admin/approve/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const attendance = await Attendance.findById(req.params.id).populate('employee', 'employeeId name');
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    // Update status to approved
    attendance.status = 'approved';
    await attendance.save();

    // Create notification for the employee
    const notification = new Notification({
      type: 'attendance_approved',
      message: `Your attendance for ${new Date(attendance.date).toLocaleDateString('en-IN')} has been approved`,
      recipient: attendance.employee._id.toString(),
      relatedId: attendance._id,
    });
    await notification.save();

    res.json({ message: 'Attendance approved', attendance });
  } catch (err) {
    console.error('Approve attendance error:', err);
    res.status(500).json({ message: 'Server error while approving attendance' });
  }
});

/**
 * Admin: Reject Attendance Punch
 */
router.put('/admin/reject/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { reason } = req.body;
  try {
    const attendance = await Attendance.findById(req.params.id).populate('employee', 'employeeId name');
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    // Update attendance status to rejected
    attendance.status = 'rejected';
    await attendance.save();

    // Create notification for employee about rejection
    const notification = new Notification({
      type: 'attendance_rejected',
      message: `Your attendance for ${new Date(attendance.date).toLocaleDateString('en-IN')} has been rejected${reason ? `: ${reason}` : ''}`,
      recipient: attendance.employee._id.toString(),
      relatedId: attendance._id,
    });
    await notification.save();

    res.json({ message: 'Attendance rejected', attendance });
  } catch (err) {
    console.error('Reject attendance error:', err);
    res.status(500).json({ message: 'Server error while rejecting attendance' });
  }
});

/**
 * Admin: Get Approved Attendances with Pagination
 */
router.get('/approved', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { page = 1, limit = 10, startDate, endDate } = req.query;
  const query = { status: 'approved' };
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  try {
    const attendances = await Attendance.find(query)
      .populate('employee', 'employeeId name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Attendance.countDocuments(query);
    res.json({
      attendances,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Fetch approved attendance error:', err);
    res.status(500).json({ message: 'Server error while fetching approved attendance' });
  }
});

/**
 * Admin: Get Rejected Attendances with Pagination
 */
router.get('/rejected', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { page = 1, limit = 10, startDate, endDate } = req.query;
  const query = { status: 'rejected' };
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  try {
    const attendances = await Attendance.find(query)
      .populate('employee', 'employeeId name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Attendance.countDocuments(query);
    res.json({
      attendances,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Fetch rejected attendance error:', err);
    res.status(500).json({ message: 'Server error while fetching rejected attendance' });
  }
});

/**
 * Admin: Pause Timer for Attendance
 */
router.put('/admin/pause/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
    if (attendance.timerStatus !== 'active') return res.status(400).json({ message: 'Timer is not active' });

    attendance.timerStatus = 'paused';
    attendance.pausedAt = new Date();
    await attendance.save();
    res.json({ message: 'Timer paused', attendance });
  } catch (err) {
    console.error('Pause timer error:', err);
    res.status(500).json({ message: 'Server error while pausing timer' });
  }
});

/**
 * Admin: Resume Timer for Attendance
 */
router.put('/admin/resume/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
    if (attendance.timerStatus !== 'paused') return res.status(400).json({ message: 'Timer is not paused' });

    const now = new Date();
    const pausedDuration = now - attendance.pausedAt;
    attendance.totalPausedDuration += pausedDuration;
    attendance.timerStatus = 'active';
    attendance.pausedAt = null;
    await attendance.save();
    res.json({ message: 'Timer resumed', attendance });
  } catch (err) {
    console.error('Resume timer error:', err);
    res.status(500).json({ message: 'Server error while resuming timer' });
  }
});

/**
 * Admin: Get Active Attendances (punched in, not punched out)
 */
router.get('/active', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const activeAttendances = await Attendance.find({
      punchIn: { $ne: null },
      punchOut: null
    }).populate('employee', 'employeeId name').sort({ punchIn: -1 });
    res.json(activeAttendances);
  } catch (err) {
    console.error('Fetch active attendances error:', err);
    res.status(500).json({ message: 'Server error while fetching active attendances' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Location = require('../models/Location');
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

    // Get latest locations for all employees
    const latestLocations = await Location.find({ isActive: true })
      .populate('employee', 'employeeId name');

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

    // Create a map of employee IDs to their latest location
    const locationMap = {};
    latestLocations.forEach(loc => {
      locationMap[loc.employee._id.toString()] = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        address: loc.address,
        timestamp: loc.timestamp,
        batteryLevel: loc.batteryLevel,
        source: loc.source
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
      const empLocation = locationMap[emp._id.toString()] || null;

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        team: emp.team,
        profilePhoto: emp.profilePhoto,
        location: emp.location, // Static location from employee record
        currentLocation: empLocation, // Real-time GPS location
        isActive: empAttendance.isActive,
        hoursWorked: empAttendance.hoursWorked,
        punchIn: empAttendance.punchIn,
        punchOut: empAttendance.punchOut,
        attendanceStatus: empAttendance.status,
        todaysTasks: empTasks,
        lastActivity: empAttendance.punchIn || emp.updatedAt,
        lastLocationUpdate: empLocation?.timestamp || null
      };
    });

    res.json({ success: true, data: trackingData });
  } catch (err) {
    console.error('Fetch tracking error:', err);
    res.status(500).json({ message: 'Server error while fetching tracking data' });
  }
});

// POST /tracking/update-location - Employee updates their location
router.post('/update-location', auth, async (req, res) => {
  const {
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    altitude,
    address,
    batteryLevel,
    deviceInfo,
    source = 'gps'
  } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  try {
    // Deactivate previous active locations for this employee
    await Location.updateMany(
      { employee: req.user.id, isActive: true },
      { isActive: false }
    );

    // Create new location entry
    const location = new Location({
      employee: req.user.id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      altitude,
      address,
      batteryLevel,
      deviceInfo,
      source,
      timestamp: new Date(),
      isActive: true
    });

    await location.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        timestamp: location.timestamp
      }
    });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ message: 'Server error while updating location' });
  }
});

// GET /tracking/live-locations - Admin gets live locations of all employees
router.get('/live-locations', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    // Get latest active locations for all employees
    const locations = await Location.find({ isActive: true })
      .populate('employee', 'employeeId name position department team profilePhoto')
      .sort({ timestamp: -1 });

    // Group by employee and get the most recent location
    const employeeLocations = {};
    locations.forEach(loc => {
      const empId = loc.employee._id.toString();
      if (!employeeLocations[empId] || loc.timestamp > employeeLocations[empId].timestamp) {
        employeeLocations[empId] = {
          employee: loc.employee,
          location: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            speed: loc.speed,
            heading: loc.heading,
            altitude: loc.altitude,
            address: loc.address,
            timestamp: loc.timestamp,
            batteryLevel: loc.batteryLevel,
            source: loc.source
          }
        };
      }
    });

    res.json({
      success: true,
      data: Object.values(employeeLocations),
      count: Object.keys(employeeLocations).length
    });
  } catch (err) {
    console.error('Fetch live locations error:', err);
    res.status(500).json({ message: 'Server error while fetching live locations' });
  }
});

// GET /tracking/location-history/:employeeId - Admin gets location history for specific employee
router.get('/location-history/:employeeId', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { startDate, endDate, limit = 100 } = req.query;

  try {
    const query = { employee: req.params.employeeId };
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('employee', 'employeeId name');

    res.json({
      success: true,
      data: locations,
      count: locations.length
    });
  } catch (err) {
    console.error('Fetch location history error:', err);
    res.status(500).json({ message: 'Server error while fetching location history' });
  }
});

// GET /tracking/my-location - Employee gets their own current location
router.get('/my-location', auth, async (req, res) => {
  try {
    const location = await Location.findOne({
      employee: req.user.id,
      isActive: true
    }).sort({ timestamp: -1 });

    if (!location) {
      return res.json({
        success: true,
        message: 'No active location found',
        location: null
      });
    }

    res.json({
      success: true,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        altitude: location.altitude,
        address: location.address,
        timestamp: location.timestamp,
        batteryLevel: location.batteryLevel,
        source: location.source
      }
    });
  } catch (err) {
    console.error('Fetch my location error:', err);
    res.status(500).json({ message: 'Server error while fetching location' });
  }
});

// GET /tracking/route/:employeeId - Admin gets route/path for employee
router.get('/route/:employeeId', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Get date range for the target date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const locations = await Location.find({
      employee: req.params.employeeId,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    })
    .sort({ timestamp: 1 }) // Sort by time ascending for route
    .populate('employee', 'employeeId name');

    // Calculate distance and time between points
    const route = locations.map((loc, index) => {
      let distance = 0;
      let timeDiff = 0;

      if (index > 0) {
        const prevLoc = locations[index - 1];
        distance = calculateDistance(
          prevLoc.latitude, prevLoc.longitude,
          loc.latitude, loc.longitude
        );
        timeDiff = (loc.timestamp - prevLoc.timestamp) / 1000; // seconds
      }

      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: loc.timestamp,
        address: loc.address,
        speed: loc.speed,
        distance: distance,
        timeDiff: timeDiff,
        sequence: index + 1
      };
    });

    res.json({
      success: true,
      employee: locations[0]?.employee,
      date: targetDate.toISOString().split('T')[0],
      route: route,
      totalPoints: route.length,
      totalDistance: route.reduce((sum, point) => sum + point.distance, 0)
    });
  } catch (err) {
    console.error('Fetch route error:', err);
    res.status(500).json({ message: 'Server error while fetching route' });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

module.exports = router;

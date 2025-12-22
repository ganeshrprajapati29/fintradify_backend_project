const express = require('express');
const router = express.Router();

// Sample features data - in a real app, this could come from a database
const features = [
  {
    title: 'Enhanced Attendance Tracking',
    description: 'Improved attendance system with real-time updates and better reporting.',
    date: '2024-01-15'
  },
  {
    title: 'Leave Management System',
    description: 'Streamlined leave requests and approvals with automated notifications.',
    date: '2024-02-01'
  },
  {
    title: 'Salary Slip Generation',
    description: 'Automatic PDF generation for salary slips with detailed breakdowns.',
    date: '2024-02-15'
  },
  {
    title: 'Task Assignment Module',
    description: 'New task management system for better project tracking and collaboration.',
    date: '2024-03-01'
  }
];

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: features
    });
  } catch (err) {
    console.error('Fetch features error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching features'
    });
  }
});

module.exports = router;

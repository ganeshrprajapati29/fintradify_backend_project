const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get marquee alerts
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    // Static alerts for now - can be made dynamic later
    const alerts = [
      {
        message: "Welcome to Fintradify Admin Dashboard! 🚀",
        icon: "🚀"
      },
      {
        message: "New features available in the employee portal 📱",
        icon: "📱"
      },
      {
        message: "Monthly payroll processing completed successfully 💰",
        icon: "💰"
      },
      {
        message: "System maintenance scheduled for tonight 🔧",
        icon: "🔧"
      }
    ];

    res.json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ message: 'Server error while fetching alerts' });
  }
});

module.exports = router;

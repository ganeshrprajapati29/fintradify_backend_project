const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

/**
 * Get Notifications for User
 */
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    // Allow admin to see all notifications or users to see their own
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const notifications = await Notification.find({
      recipient: req.user.role === 'admin' ? 'admin' : userId
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

/**
 * Mark Notification as Read
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    // Check if user is authorized to mark this notification
    if (req.user.role !== 'admin' && notification.recipient !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(notification);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
});

/**
 * Get Unread Notification Count
 */
router.get('/count/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const count = await Notification.countDocuments({
      recipient: req.user.role === 'admin' ? 'admin' : userId,
      status: 'unread'
    });

    res.json({ count });
  } catch (err) {
    console.error('Fetch notification count error:', err);
    res.status(500).json({ message: 'Server error while fetching notification count' });
  }
});

/**
 * Admin: Get All Notifications
 */
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('Fetch all notifications error:', err);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

module.exports = router;

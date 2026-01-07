const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Get Settings
 */
router.get('/', auth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings();
      await settings.save();
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching settings' });
  }
});

/**
 * Update Settings (Admin only)
 */
router.put('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    let settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Server error while updating settings' });
  }
});

/**
 * Get Public Settings (no auth required for basic info)
 */
router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.findOne().select('companyName companyLogo theme language dateFormat timeFormat currency');
    if (!settings) {
      return res.json({
        companyName: 'FinTradify',
        theme: 'light',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        currency: 'INR'
      });
    }
    res.json(settings);
  } catch (err) {
    console.error('Fetch public settings error:', err);
    res.status(500).json({ message: 'Server error while fetching public settings' });
  }
});

/**
 * Reset to Default Settings (Admin only)
 */
router.post('/reset', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const defaultSettings = new Settings();
    await Settings.findOneAndUpdate({}, defaultSettings.toObject(), { upsert: true });
    res.json({ message: 'Settings reset to default successfully' });
  } catch (err) {
    console.error('Reset settings error:', err);
    res.status(500).json({ message: 'Server error while resetting settings' });
  }
});

/**
 * Get Employee-Specific Settings
 */
router.get('/employee', auth, async (req, res) => {
  try {
    const settings = await Settings.findOne().select('employeeSettings timezone workStartTime workEndTime workingDays currency dateFormat timeFormat language theme');
    if (!settings) {
      return res.json({ success: true, data: {
        employeeSettings: {
          canRequestLeave: true,
          canViewSalary: true,
          canEditProfile: true,
          requireManagerApproval: true,
        },
        timezone: 'Asia/Kolkata',
        workStartTime: '09:00',
        workEndTime: '18:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        language: 'en',
        theme: 'light'
      }});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Fetch employee settings error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching employee settings' });
  }
});

/**
 * Get Admin-Specific Settings
 */
router.get('/admin', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const settings = await Settings.findOne().select('adminSettings');
    if (!settings) {
      return res.json({
        adminSettings: {
          autoApproveLeaves: false,
          requireReasonForRejection: true,
          allowBulkActions: true,
        }
      });
    }
    res.json(settings);
  } catch (err) {
    console.error('Fetch admin settings error:', err);
    res.status(500).json({ message: 'Server error while fetching admin settings' });
  }
});

/**
 * Update Attendance Settings (Admin only)
 */
router.put('/attendance', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const attendanceFields = [
      'workStartTime', 'workEndTime', 'breakStartTime', 'breakEndTime',
      'workingDays', 'allowLateCheckIn', 'lateCheckInGracePeriod',
      'allowEarlyCheckOut', 'earlyCheckOutGracePeriod'
    ];

    const updateData = {};
    attendanceFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    updateData.updatedAt = new Date();

    const settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    console.error('Update attendance settings error:', err);
    res.status(500).json({ message: 'Server error while updating attendance settings' });
  }
});

/**
 * Update Leave Settings (Admin only)
 */
router.put('/leave', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const leaveFields = [
      'annualLeaveDays', 'sickLeaveDays', 'casualLeaveDays',
      'maternityLeaveDays', 'paternityLeaveDays', 'allowLeaveCarryForward',
      'maxCarryForwardDays'
    ];

    const updateData = {};
    leaveFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    updateData.updatedAt = new Date();

    const settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    console.error('Update leave settings error:', err);
    res.status(500).json({ message: 'Server error while updating leave settings' });
  }
});

/**
 * Update Notification Settings (Admin only)
 */
router.put('/notifications', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const notificationFields = [
      'emailNotifications', 'pushNotifications', 'notifyOnLeaveRequest',
      'notifyOnAttendance', 'notifyOnSalarySlip'
    ];

    const updateData = {};
    notificationFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    updateData.updatedAt = new Date();

    const settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    console.error('Update notification settings error:', err);
    res.status(500).json({ message: 'Server error while updating notification settings' });
  }
});

/**
 * Upload Company Logo (Admin only)
 */
router.post('/logo', auth, upload.single('logo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fintradify/company-logos',
          public_id: `logo_${Date.now()}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Update settings with new logo URL
    const settings = await Settings.findOneAndUpdate(
      {},
      { companyLogo: result.secure_url },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Company logo updated successfully',
      logoUrl: result.secure_url
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ message: 'Error uploading logo' });
  }
});

module.exports = router;

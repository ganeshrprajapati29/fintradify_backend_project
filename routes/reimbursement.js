const express = require('express');
const router = express.Router();
const Reimbursement = require('../models/Reimbursement');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all reimbursements (Admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const reimbursements = await Reimbursement.find()
      .populate('employee', 'name email employeeId')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reimbursements });
  } catch (err) {
    console.error('Fetch reimbursements error:', err);
    res.status(500).json({ message: 'Server error while fetching reimbursements' });
  }
});

// Get employee's own reimbursements
router.get('/my', auth, async (req, res) => {
  try {
    const reimbursements = await Reimbursement.find({ employee: req.user.id })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reimbursements });
  } catch (err) {
    console.error('Fetch my reimbursements error:', err);
    res.status(500).json({ message: 'Server error while fetching reimbursements' });
  }
});

// Create new reimbursement request
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { amount, description, category, date } = req.body;

    // Validate required fields
    if (!amount || !description || !category) {
      return res.status(400).json({ message: 'Amount, description, and category are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Handle file uploads
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'fintradify-reimbursements',
                public_id: `reimbursement-${req.user.id}-${Date.now()}-${file.originalname}`,
                resource_type: 'auto'
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            stream.end(file.buffer);
          });

          attachments.push({
            filename: file.originalname,
            url: result.secure_url
          });
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr);
          // Continue without this attachment
        }
      }
    }

    const reimbursement = new Reimbursement({
      employee: req.user.id,
      amount: parseFloat(amount),
      description,
      category,
      date: date ? new Date(date) : new Date(),
      attachments
    });

    await reimbursement.save();

    const populatedReimbursement = await Reimbursement.findById(reimbursement._id)
      .populate('employee', 'name email employeeId');

    res.status(201).json({
      success: true,
      data: populatedReimbursement
    });
  } catch (err) {
    console.error('Create reimbursement error:', err);
    res.status(500).json({ message: 'Server error while creating reimbursement' });
  }
});

// Update reimbursement status (Admin only)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected' });
    }

    const reimbursement = await Reimbursement.findById(req.params.id);
    if (!reimbursement) {
      return res.status(404).json({ message: 'Reimbursement not found' });
    }

    reimbursement.status = status;
    reimbursement.approvedBy = req.user.id;
    reimbursement.approvedAt = new Date();

    if (status === 'Rejected' && rejectionReason) {
      reimbursement.rejectionReason = rejectionReason;
    }

    await reimbursement.save();

    const updatedReimbursement = await Reimbursement.findById(reimbursement._id)
      .populate('employee', 'name email employeeId')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      data: updatedReimbursement
    });
  } catch (err) {
    console.error('Update reimbursement status error:', err);
    res.status(500).json({ message: 'Server error while updating reimbursement status' });
  }
});

// Delete reimbursement (Admin only or own pending request)
router.delete('/:id', auth, async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findById(req.params.id);
    if (!reimbursement) {
      return res.status(404).json({ message: 'Reimbursement not found' });
    }

    // Allow admin to delete any reimbursement, or employee to delete their own pending ones
    if (req.user.role !== 'admin' && reimbursement.employee.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== 'admin' && reimbursement.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot delete processed reimbursement requests' });
    }

    // Delete attachments from Cloudinary
    if (reimbursement.attachments && reimbursement.attachments.length > 0) {
      for (const attachment of reimbursement.attachments) {
        try {
          // Extract public_id from URL
          const publicId = attachment.url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`fintradify-reimbursements/${publicId}`);
        } catch (deleteErr) {
          console.error('Error deleting attachment:', deleteErr);
        }
      }
    }

    await reimbursement.remove();
    res.json({ success: true, message: 'Reimbursement deleted successfully' });
  } catch (err) {
    console.error('Delete reimbursement error:', err);
    res.status(500).json({ message: 'Server error while deleting reimbursement' });
  }
});

// Get reimbursement statistics (Admin only)
router.get('/stats', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const stats = await Reimbursement.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyStats = await Reimbursement.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats,
        monthly: monthlyStats
      }
    });
  } catch (err) {
    console.error('Get reimbursement stats error:', err);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const RelievingLetter = require('../models/RelievingLetter');
const Employee = require('../models/Employee');
const { generateRelievingLetterPDF } = require('../utils/generatePDF');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');

// POST /relieving/generate
router.post('/generate', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { employeeId, relievingDate, reason } = req.body;

  if (!employeeId || !relievingDate) {
    return res.status(400).json({ message: 'Employee ID and relieving date are required' });
  }

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if relieving letter already exists
    const existingLetter = await RelievingLetter.findOne({ employee: employeeId });
    if (existingLetter) {
      return res.status(400).json({ message: 'Relieving letter already generated for this employee' });
    }

    // Generate PDF
    const relievingLetterData = {
      relievingDate: new Date(relievingDate),
      reason: reason || 'Resignation'
    };

    const pdfBuffer = await generateRelievingLetterPDF(employee, relievingLetterData);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'relieving-letters',
          public_id: `relieving-letter-${employee.employeeId}-${Date.now()}`,
          resource_type: 'raw'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(pdfBuffer);
    });

    // Save to database
    const relievingLetter = new RelievingLetter({
      employee: employeeId,
      relievingDate: new Date(relievingDate),
      joiningDate: employee.joiningDate,
      position: employee.position,
      department: employee.department,
      reason: reason || 'Resignation',
      letterUrl: uploadResult.secure_url
    });

    await relievingLetter.save();

    // Send email to employee
    const subject = 'Your Relieving Letter from Fintradify';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">Relieving Letter Generated</h2>
        <p>Dear ${employee.name},</p>
        <p>Your relieving letter has been generated successfully.</p>
        <p>You can download your relieving letter using the link below:</p>
        <p><a href="${uploadResult.secure_url}" style="background-color: #1e3a8a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Relieving Letter</a></p>
        <p>If you have any questions, please contact HR at hr@fintradify.com</p>
        <p>Best regards,<br>Fintradify HR Team</p>
      </div>
    `;

    await sendEmail(employee.email, subject, html);

    res.json({
      message: 'Relieving letter generated and emailed successfully',
      letterUrl: uploadResult.secure_url,
      relievingLetter
    });

  } catch (error) {
    console.error('Generate relieving letter error:', error);
    res.status(500).json({ message: 'Server error while generating relieving letter' });
  }
});

// GET /relieving - Get all relieving letters
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const letters = await RelievingLetter.find().populate('employee', 'employeeId name email');
    res.json(letters);
  } catch (error) {
    console.error('Fetch relieving letters error:', error);
    res.status(500).json({ message: 'Server error while fetching relieving letters' });
  }
});

module.exports = router;

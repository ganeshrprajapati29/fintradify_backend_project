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

    // Save to database - update if exists, create if not
    const relievingLetterDataToSave = {
      employee: employeeId,
      relievingDate: new Date(relievingDate),
      joiningDate: employee.joiningDate,
      position: employee.position,
      department: employee.department,
      reason: reason || 'Resignation',
      letterUrl: uploadResult.secure_url
    };

    const relievingLetter = await RelievingLetter.findOneAndUpdate(
      { employee: employeeId },
      relievingLetterDataToSave,
      { new: true, upsert: true }
    );

    // Send email to employee
    const subject = 'Relieving Letter - Fintradify';
    const html = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/logoo.png" alt="Fintradify Logo" style="max-width: 150px; height: auto;">
          <h2 style="color: #1e3a8a; margin: 10px 0; font-size: 24px;">FINTRADIFY</h2>
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301</p>
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Phone: +91 78360 09907 | Email: hr@fintradify.com</p>
        </div>

        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #1e3a8a; text-align: center; margin-bottom: 20px; font-size: 20px;">Relieving Letter Notification</h3>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${employee.name},</p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">We are pleased to inform you that your relieving letter has been successfully generated and is now available for download.</p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">This document serves as an official record of your employment tenure with Fintradify and can be used for future employment opportunities or official purposes.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${uploadResult.secure_url}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">Download Your Relieving Letter</a>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;"><strong>Important Information:</strong></p>
          <ul style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
            <li>Please save this document securely for your records</li>
            <li>This letter confirms your employment period and position held</li>
            <li>For any clarifications, contact our HR department</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">We wish you all the very best in your future endeavors and continued success in your career.</p>

          <div style="border-top: 2px solid #1e3a8a; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;"><strong>Best Regards,</strong></p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Fintradify HR Team</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 5px;">HR Department</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 0;">Email: hr@fintradify.com | Phone: +91 78360 09907</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} Fintradify. All rights reserved.</p>
        </div>
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

// DELETE /relieving/:id - Delete a relieving letter
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const letter = await RelievingLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Relieving letter not found' });
    }

    // Delete from Cloudinary if exists
    if (letter.letterUrl) {
      try {
        const publicId = letter.letterUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`relieving-letters/${publicId}`);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await RelievingLetter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Relieving letter deleted successfully' });
  } catch (error) {
    console.error('Delete relieving letter error:', error);
    res.status(500).json({ message: 'Server error while deleting relieving letter' });
  }
});

module.exports = router;

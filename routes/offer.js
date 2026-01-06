const express = require('express');
const router = express.Router();
const OfferLetter = require('../models/OfferLetter');
const Employee = require('../models/Employee');
const { generateOfferLetterPDF } = require('../utils/generatePDF');
const { sendEmail } = require('../utils/sendEmail');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');

// POST /offer/generate
router.post('/generate', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { employeeId, position, department, joiningDate, salary, reportingManager, workLocation } = req.body;

  if (!employeeId || !position || !department || !joiningDate || !salary) {
    return res.status(400).json({ message: 'Employee ID, position, department, joining date, and salary are required' });
  }

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if offer letter already exists
    const existingLetter = await OfferLetter.findOne({ employee: employeeId });
    if (existingLetter) {
      return res.status(400).json({ message: 'Offer letter already generated for this employee' });
    }

    // Generate PDF
    const offerLetterData = {
      position,
      department,
      joiningDate: new Date(joiningDate),
      salary: parseFloat(salary),
      reportingManager: reportingManager || 'HR Manager',
      workLocation: workLocation || 'Noida, Uttar Pradesh',
      probationPeriod: 6
    };

    const pdfBuffer = await generateOfferLetterPDF(employee, offerLetterData);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'offer-letters',
          public_id: `offer-letter-${employee.employeeId}-${Date.now()}`,
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
    const offerLetter = new OfferLetter({
      employee: employeeId,
      position,
      department,
      joiningDate: new Date(joiningDate),
      salary: parseFloat(salary),
      reportingManager: reportingManager || 'HR Manager',
      workLocation: workLocation || 'Noida, Uttar Pradesh',
      offerLetterUrl: uploadResult.secure_url,
      status: 'sent',
      sentAt: new Date()
    });

    await offerLetter.save();

    // Send email to employee
    const subject = 'Employment Offer Letter - Fintradify';
    const html = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/logoo.png" alt="Fintradify Logo" style="max-width: 150px; height: auto;">
          <h2 style="color: #1e3a8a; margin: 10px 0; font-size: 24px;">FINTRADIFY</h2>
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301</p>
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Phone: +91 78360 09907 | Email: hr@fintradify.com</p>
        </div>

        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #1e3a8a; text-align: center; margin-bottom: 20px; font-size: 20px;">Employment Offer Letter</h3>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${employee.name},</p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Congratulations! We are pleased to extend a formal offer of employment for the position of <strong>${position}</strong> in our ${department} Department.</p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your detailed offer letter is attached below. Please review all terms and conditions carefully.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${uploadResult.secure_url}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">Download Your Offer Letter</a>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;"><strong>Next Steps:</strong></p>
          <ul style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
            <li>Review the offer letter carefully</li>
            <li>Sign and return the acceptance copy by [Acceptance Date]</li>
            <li>Submit required documents for background verification</li>
            <li>Join on ${new Date(joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">We are excited about the possibility of you joining our team and contributing to our continued success.</p>

          <div style="border-top: 2px solid #1e3a8a; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;"><strong>Best Regards,</strong></p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Fintradify HR Team</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Human Resources Department</p>
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
      message: 'Offer letter generated and emailed successfully',
      letterUrl: uploadResult.secure_url,
      offerLetter
    });

  } catch (error) {
    console.error('Generate offer letter error:', error);
    res.status(500).json({ message: 'Server error while generating offer letter' });
  }
});

// GET /offer - Get all offer letters
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const letters = await OfferLetter.find().populate('employee', 'employeeId name email');
    res.json(letters);
  } catch (error) {
    console.error('Fetch offer letters error:', error);
    res.status(500).json({ message: 'Server error while fetching offer letters' });
  }
});

// DELETE /offer/:id - Delete an offer letter
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    // Delete from Cloudinary if exists
    if (letter.offerLetterUrl) {
      try {
        const publicId = letter.offerLetterUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`offer-letters/${publicId}`);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await OfferLetter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer letter deleted successfully' });
  } catch (error) {
    console.error('Delete offer letter error:', error);
    res.status(500).json({ message: 'Server error while deleting offer letter' });
  }
});

// PUT /offer/:id/status - Update offer letter status
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { status, rejectionReason } = req.body;

  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    letter.status = status;
    if (status === 'accepted') {
      letter.acceptedAt = new Date();
    } else if (status === 'rejected') {
      letter.rejectedAt = new Date();
      letter.rejectionReason = rejectionReason;
    }

    await letter.save();
    res.json({ message: 'Offer letter status updated successfully', letter });
  } catch (error) {
    console.error('Update offer letter status error:', error);
    res.status(500).json({ message: 'Server error while updating offer letter status' });
  }
});

module.exports = router;


const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const salaryRoutes = require('./routes/salary');
const taskRoutes = require('./routes/task');
const featuresRoutes = require('./routes/features');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notification');
const dashboardRoutes = require('./routes/dashboard');
const alertsRoutes = require('./routes/alerts');
const reimbursementRoutes = require('./routes/reimbursement');
const teamsRoutes = require('./routes/teams');
const trackingRoutes = require('./routes/tracking');
const relievingRoutes = require('./routes/relieving');
const offerRoutes = require('./routes/offer');
const demoRoutes = require('./routes/demo');
const saldemoRoutes = require('./routes/saldemo');
const cors = require('cors');
const { sendEmail } = require('./utils/sendEmail');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
require('dotenv').config();

// Configure Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Fix Mongoose strictQuery deprecation warning
mongoose.set('strictQuery', false);

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/saldemo', saldemoRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/relieving', relievingRoutes);
app.use('/api/offer', offerRoutes);
// ===== Root Route =====
app.get('/', (req, res) => {
  res.send('🚀 HR Fintradify Backend LIVE');
});

// ===== API Root Route (FIX FOR Cannot GET /api) =====
app.get('/api', (req, res) => {
  res.send('✅ API Working Successfully');
});

// ===== LATE PUNCH-IN NOTIFICATION FUNCTION =====
const sendLatePunchInNotifications = async () => {
  try {
    // Skip Sundays
    const today = new Date();
    if (today.getDay() === 0) { // 0 = Sunday
      console.log('⏰ Skipping late punch-in notifications on Sunday.');
      return;
    }

    console.log('🔍 Checking for late punch-ins after 10:15 AM...');

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Late punch-in threshold: 10:15 AM
    const lateThreshold = new Date();
    lateThreshold.setHours(10, 15, 0, 0);

    // Find employees who punched in after 10:15 AM today
    const latePunchIns = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      punchIn: { $gte: lateThreshold },
      timerStatus: { $in: ['active', 'paused'] }
    }).populate('employee', 'name email employeeId');

    if (latePunchIns.length === 0) {
      console.log('✅ No late punch-ins found after 10:15 AM.');
      return;
    }

    console.log(`📧 Sending late punch-in notifications to ${latePunchIns.length} employees...`);

    for (const attendance of latePunchIns) {
      const emp = attendance.employee;
      if (!emp || !emp.email) continue;

      const punchInTime = new Date(attendance.punchIn).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Mark attendance as late
      attendance.isLate = true;
      await attendance.save();

      const subject = 'Late Punch-In Notification - Fintradify HR';

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#dc2626;color:#ffffff;padding:20px 30px;">
              <h2 style="margin:0;font-weight:500;">Late Punch-In Notification / देरी से पंच-इन अधिसूचना</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#333333;font-size:15px;line-height:1.7;">
              <p>Dear <strong>${emp.name}</strong>,</p>
              <p>प्रिय <strong>${emp.name}</strong>,</p>

              <p>
                <strong>English:</strong> This is to inform you that your punch-in time today was recorded as <strong>${punchInTime}</strong>,
                which is after the standard office hours start time of 10:15 AM. Your attendance has been marked as late.
              </p>

              <p>
                <strong>हिंदी:</strong> यह आपको सूचित करने के लिए है कि आज आपका पंच-इन समय <strong>${punchInTime}</strong> दर्ज किया गया है,
                जो कार्यालय के मानक प्रारंभ समय 10:15 AM के बाद है। आपकी उपस्थिति को देरी के रूप में चिह्नित किया गया है।
              </p>

              <p>
                <strong>English:</strong> Please ensure timely attendance in the future. Remember to punch out by 6:15 PM to avoid late punch-out notifications.
              </p>

              <p>
                <strong>हिंदी:</strong> कृपया भविष्य में समय पर उपस्थिति सुनिश्चित करें। देरी से पंच-आउट अधिसूचनाओं से बचने के लिए 6:15 PM तक पंच आउट करना याद रखें।
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://crm.fintradify.com/'}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">Go to Dashboard / डैशबोर्ड पर जाएं</a>
              </div>

              <div style="border-top: 2px solid #dc2626; margin-top: 30px; padding-top: 20px;">
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;"><strong>Best Regards / शुभकामनाओं सहित,</strong></p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Fintradify HR Team</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">HR Department</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 0;">Email: hr@fintradify.com | Phone: +91 78360 09907</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:15px 30px;text-align:center;font-size:12px;color:#64748b;">
              This is an automated notification. Please do not reply to this message. / यह एक स्वचालित अधिसूचना है। कृपया इस संदेश का उत्तर न दें।
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      const textMessage = `
Dear ${emp.name},

English:
This is to inform you that your punch-in time today was recorded as ${punchInTime},
which is after the standard office hours start time of 10:15 AM. Your attendance has been marked as late.

Please ensure timely attendance in the future. Remember to punch out by 6:15 PM to avoid late punch-out notifications.

हिंदी:
यह आपको सूचित करने के लिए है कि आज आपका पंच-इन समय ${punchInTime} दर्ज किया गया है,
जो कार्यालय के मानक प्रारंभ समय 10:15 AM के बाद है। आपकी उपस्थिति को देरी के रूप में चिह्नित किया गया है।

कृपया भविष्य में समय पर उपस्थिति सुनिश्चित करें। देरी से पंच-आउट अधिसूचनाओं से बचने के लिए 6:15 PM तक पंच आउट करना याद रखें।

Best Regards,
Fintradify HR Team
HR Department
Email: hr@fintradify.com | Phone: +91 78360 09907

This is an automated notification. Please do not reply to this message.
`;

      // Send bilingual email (English and Hindi)
      await sendEmail(emp.email, subject, textMessage, [], htmlMessage);

      console.log(`✅ Late punch-in notification sent to ${emp.name} (${emp.email})`);
    }

    console.log('✅ All late punch-in notifications sent successfully.');

  } catch (error) {
    console.error('❌ Error sending late punch-in notifications:', error);
  }
};

// ===== PUNCH OUT REMINDER FUNCTION =====
const sendPunchOutReminders = async () => {
  try {
    // Skip Sundays
    const today = new Date();
    if (today.getDay() === 0) { // 0 = Sunday
      console.log('⏰ Skipping punch out reminders on Sunday.');
      return;
    }

    console.log('🔍 Checking for employees who forgot to punch out...');

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find employees who punched in today but haven't punched out
    const unpunchoutEmployees = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      punchIn: { $ne: null },
      punchOut: null,
      timerStatus: 'active'
    }).populate('employee', 'name email employeeId');

    if (unpunchoutEmployees.length === 0) {
      console.log('✅ No employees found who forgot to punch out.');
      return;
    }

    console.log(`📧 Sending punch out reminders to ${unpunchoutEmployees.length} employees...`);

    for (const attendance of unpunchoutEmployees) {
      const emp = attendance.employee;
      if (!emp || !emp.email) continue;

      const punchInTime = new Date(attendance.punchIn).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const subject = 'Reminder: Please Punch Out - Fintradify HR';

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;color:#ffffff;padding:20px 30px;">
              <h2 style="margin:0;font-weight:500;">Attendance Reminder / उपस्थिति अनुस्मारक</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#333333;font-size:15px;line-height:1.7;">
              <p>Dear <strong>${emp.name}</strong>,</p>
              <p>प्रिय <strong>${emp.name}</strong>,</p>

              <p>
                <strong>English:</strong> This is a friendly reminder that you have not punched out yet today.
                Your attendance shows you punched in at <strong>${punchInTime}</strong> but have not recorded your punch out time.
              </p>

              <p>
                <strong>हिंदी:</strong> यह एक मैत्रीपूर्ण अनुस्मारक है कि आपने आज अभी तक पंच आउट नहीं किया है।
                आपकी उपस्थिति दिखाती है कि आपने <strong>${punchInTime}</strong> पर पंच इन किया था लेकिन पंच आउट समय दर्ज नहीं किया है।
              </p>

              <p>
                <strong>English:</strong> Please ensure you punch out before leaving for the day to accurately record your working hours.
              </p>

              <p>
                <strong>हिंदी:</strong> कृपया दिन के अंत में जाने से पहले पंच आउट सुनिश्चित करें ताकि आपका कार्य समय सही ढंग से दर्ज हो।
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://crm.fintradify.com/'}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">Go to Dashboard / डैशबोर्ड पर जाएं</a>
              </div>

              <p style="margin-top:30px;">
                <strong>English:</strong> If you have already punched out, please ignore this reminder.
              </p>

              <p>
                <strong>हिंदी:</strong> यदि आप पहले ही पंच आउट कर चुके हैं, तो कृपया इस अनुस्मारक को अनदेखा करें।
              </p>

              <div style="border-top: 2px solid #1e3a8a; margin-top: 30px; padding-top: 20px;">
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;"><strong>Best Regards / शुभकामनाओं सहित,</strong></p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Fintradify HR Team</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">HR Department</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 0;">Email: hr@fintradify.com | Phone: +91 78360 09907</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:15px 30px;text-align:center;font-size:12px;color:#64748b;">
              This is an automated reminder. Please do not reply to this message. / यह एक स्वचालित अनुस्मारक है। कृपया इस संदेश का उत्तर न दें।
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      const textMessage = `
Dear ${emp.name},

English:
This is a friendly reminder that you have not punched out yet today.
Your attendance shows you punched in at ${punchInTime} but have not recorded your punch out time.

Please ensure you punch out before leaving for the day to accurately record your working hours.

If you have already punched out, please ignore this reminder.

हिंदी:
यह एक मैत्रीपूर्ण अनुस्मारक है कि आपने आज अभी तक पंच आउट नहीं किया है।
आपकी उपस्थिति दिखाती है कि आपने ${punchInTime} पर पंच इन किया था लेकिन पंच आउट समय दर्ज नहीं किया है।

कृपया दिन के अंत में जाने से पहले पंच आउट सुनिश्चित करें ताकि आपका कार्य समय सही ढंग से दर्ज हो।

यदि आप पहले ही पंच आउट कर चुके हैं, तो कृपया इस अनुस्मारक को अनदेखा करें।

Best Regards,
Fintradify HR Team
HR Department
Email: hr@fintradify.com | Phone: +91 78360 09907

This is an automated reminder. Please do not reply to this message.
`;

      // Send bilingual email (English and Hindi)
      await sendEmail(emp.email, subject, textMessage, [], htmlMessage);

      console.log(`✅ Punch out reminder sent to ${emp.name} (${emp.email})`);
    }

    console.log('✅ All punch out reminders sent successfully.');

  } catch (error) {
    console.error('❌ Error sending punch out reminders:', error);
  }
};

// ===== LATE PUNCH-OUT NOTIFICATION FUNCTION =====
const sendLatePunchOutNotifications = async () => {
  try {
    // Skip Sundays
    const today = new Date();
    if (today.getDay() === 0) { // 0 = Sunday
      console.log('⏰ Skipping late punch-out notifications on Sunday.');
      return;
    }

    console.log('🔍 Checking for late punch-outs after 6:15 PM...');

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Late punch-out threshold: 6:15 PM
    const lateThreshold = new Date();
    lateThreshold.setHours(18, 15, 0, 0);

    // Find employees who punched out after 6:15 PM today
    const latePunchOuts = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      punchOut: { $gte: lateThreshold },
      status: { $in: ['pending', 'approved'] } // Only for punched out attendances
    }).populate('employee', 'name email employeeId');

    if (latePunchOuts.length === 0) {
      console.log('✅ No late punch-outs found after 6:15 PM.');
      return;
    }

    console.log(`📧 Sending late punch-out notifications to ${latePunchOuts.length} employees...`);

    for (const attendance of latePunchOuts) {
      const emp = attendance.employee;
      if (!emp || !emp.email) continue;

      const punchOutTime = new Date(attendance.punchOut).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Mark attendance as late punch-out
      attendance.isLatePunchOut = true;
      await attendance.save();

      const subject = 'Late Punch-Out Notification - Fintradify HR';

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#dc2626;color:#ffffff;padding:20px 30px;">
              <h2 style="margin:0;font-weight:500;">Late Punch-Out Notification / देरी से पंच-आउट अधिसूचना</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#333333;font-size:15px;line-height:1.7;">
              <p>Dear <strong>${emp.name}</strong>,</p>
              <p>प्रिय <strong>${emp.name}</strong>,</p>

              <p>
                <strong>English:</strong> This is to inform you that your punch-out time today was recorded as <strong>${punchOutTime}</strong>,
                which is after the standard office hours end time of 6:15 PM. Your attendance has been marked as late punch-out.
              </p>

              <p>
                <strong>हिंदी:</strong> यह आपको सूचित करने के लिए है कि आज आपका पंच-आउट समय <strong>${punchOutTime}</strong> दर्ज किया गया है,
                जो कार्यालय के मानक समाप्ति समय 6:15 PM के बाद है। आपकी उपस्थिति को देरी से पंच-आउट के रूप में चिह्नित किया गया है।
              </p>

              <p>
                <strong>English:</strong> Please ensure timely punch-out in the future to maintain accurate working hours.
              </p>

              <p>
                <strong>हिंदी:</strong> कृपया भविष्य में समय पर पंच-आउट सुनिश्चित करें ताकि सही कार्य समय दर्ज हो।
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://crm.fintradify.com/'}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">Go to Dashboard / डैशबोर्ड पर जाएं</a>
              </div>

              <div style="border-top: 2px solid #dc2626; margin-top: 30px; padding-top: 20px;">
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;"><strong>Best Regards / शुभकामनाओं सहित,</strong></p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Fintradify HR Team</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">HR Department</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 0;">Email: hr@fintradify.com | Phone: +91 78360 09907</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:15px 30px;text-align:center;font-size:12px;color:#64748b;">
              This is an automated notification. Please do not reply to this message. / यह एक स्वचालित अधिसूचना है। कृपया इस संदेश का उत्तर न दें।
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      const textMessage = `
Dear ${emp.name},

English:
This is to inform you that your punch-out time today was recorded as ${punchOutTime},
which is after the standard office hours end time of 6:15 PM. Your attendance has been marked as late punch-out.

Please ensure timely punch-out in the future to maintain accurate working hours.

हिंदी:
यह आपको सूचित करने के लिए है कि आज आपका पंच-आउट समय ${punchOutTime} दर्ज किया गया है,
जो कार्यालय के मानक समाप्ति समय 6:15 PM के बाद है। आपकी उपस्थिति को देरी से पंच-आउट के रूप में चिह्नित किया गया है।

कृपया भविष्य में समय पर पंच-आउट सुनिश्चित करें ताकि सही कार्य समय दर्ज हो।

Best Regards,
Fintradify HR Team
HR Department
Email: hr@fintradify.com | Phone: +91 78360 09907

This is an automated notification. Please do not reply to this message.
`;

      // Send bilingual email (English and Hindi)
      await sendEmail(emp.email, subject, textMessage, [], htmlMessage);

      console.log(`✅ Late punch-out notification sent to ${emp.name} (${emp.email})`);
    }

    console.log('✅ All late punch-out notifications sent successfully.');

  } catch (error) {
    console.error('❌ Error sending late punch-out notifications:', error);
  }
};

// ===== SCHEDULE DAILY LATE PUNCH-IN NOTIFICATION AT 10:15 AM =====
cron.schedule('15 10 * * 1-6', () => {
  console.log('⏰ Running scheduled late punch-in notification check...');
  sendLatePunchInNotifications();
}, {
  timezone: 'Asia/Kolkata'
});

// ===== SCHEDULE DAILY PUNCH OUT REMINDER AT 6:15 PM =====
cron.schedule('15 18 * * 1-6', () => {
  console.log('⏰ Running scheduled punch out reminder check...');
  sendPunchOutReminders();
}, {
  timezone: 'Asia/Kolkata'
});

// ===== SCHEDULE DAILY LATE PUNCH-OUT NOTIFICATION AT 6:30 PM =====
cron.schedule('30 18 * * 1-6', () => {
  console.log('⏰ Running scheduled late punch-out notification check...');
  sendLatePunchOutNotifications();
}, {
  timezone: 'Asia/Kolkata'
});

// ===== SERVER START =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('⏰ Late punch-in notifications scheduled for 10:15 AM IST (Mon-Sat)');
  console.log('⏰ Punch out reminders scheduled for 6:15 PM IST (Mon-Sat)');
  console.log('⏰ Late punch-out notifications scheduled for 6:30 PM IST (Mon-Sat)');
});

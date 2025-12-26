const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'leave_request', 'leave_status', 'attendance_pending', 'attendance_approved', etc.
  message: { type: String, required: true },
  recipient: { type: String, required: true }, // 'admin' or employee ID
  status: { type: String, enum: ['unread', 'read'], default: 'unread' },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of related record (leave, attendance, etc.)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);

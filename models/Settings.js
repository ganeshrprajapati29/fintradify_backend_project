const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Company Information
  companyName: { type: String, default: 'FinTradify' },
  companyLogo: { type: String, default: '' },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, default: 'en' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
  currency: { type: String, default: 'INR' },

  // Employee Settings
  employeeSettings: {
    canRequestLeave: { type: Boolean, default: true },
    canViewSalary: { type: Boolean, default: true },
    canEditProfile: { type: Boolean, default: true },
    requireManagerApproval: { type: Boolean, default: true },
  },

  // Timezone and Working Hours
  timezone: { type: String, default: 'Asia/Kolkata' },
  workStartTime: { type: String, default: '09:00' },
  workEndTime: { type: String, default: '18:00' },
  workingDays: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },

  // Admin Settings
  adminSettings: {
    autoApproveLeaves: { type: Boolean, default: false },
    requireReasonForRejection: { type: Boolean, default: true },
    allowBulkActions: { type: Boolean, default: true },
  },

  // Attendance Settings
  breakStartTime: { type: String, default: '13:00' },
  breakEndTime: { type: String, default: '14:00' },
  allowLateCheckIn: { type: Boolean, default: true },
  lateCheckInGracePeriod: { type: Number, default: 15 }, // minutes
  allowEarlyCheckOut: { type: Boolean, default: true },
  earlyCheckOutGracePeriod: { type: Number, default: 15 }, // minutes

  // Leave Settings
  annualLeaveDays: { type: Number, default: 12 },
  sickLeaveDays: { type: Number, default: 6 },
  casualLeaveDays: { type: Number, default: 6 },
  maternityLeaveDays: { type: Number, default: 84 }, // 12 weeks
  paternityLeaveDays: { type: Number, default: 5 },
  allowLeaveCarryForward: { type: Boolean, default: true },
  maxCarryForwardDays: { type: Number, default: 5 },

  // Notification Settings
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  notifyOnLeaveRequest: { type: Boolean, default: true },
  notifyOnAttendance: { type: Boolean, default: false },
  notifyOnSalarySlip: { type: Boolean, default: true },

  // Metadata
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Settings', settingsSchema);

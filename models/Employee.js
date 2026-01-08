const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  position: { type: String, required: true },
  department: { type: String, default: '' },
  team: { type: String, default: '' },
  bankAccount: { type: String, default: '' },
  bankName: { type: String, default: '' },
  salary: { type: Number, required: true, default: 0 },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  status: { type: String, enum: ['active', 'terminated', 'blocked'], default: 'active' },
  joiningDate: { type: Date, required: true },
  profilePhoto: { type: String, default: '' },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    lastUpdated: { type: Date, default: null }
  },
  paidLeaveBalance: { type: Number, default: 0 },
  unpaidLeaveBalance: { type: Number, default: 6 },
  halfDayLeaveBalance: { type: Number, default: 0 },
  usedPaidLeaves: { type: Number, default: 0 },
  lastLeaveAccrual: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Employee', employeeSchema);
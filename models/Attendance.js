const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  punchIn: { type: Date },
  punchOut: { type: Date },
  holiday: { type: Boolean, default: false },
  halfDay: { type: Boolean, default: false },
});

module.exports = mongoose.model('Attendance', attendanceSchema);
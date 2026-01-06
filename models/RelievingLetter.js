const mongoose = require('mongoose');

const relievingLetterSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  relievingDate: { type: Date, required: true },
  joiningDate: { type: Date, required: true },
  position: { type: String, required: true },
  department: { type: String, default: '' },
  reason: { type: String, default: 'Resignation' },
  letterUrl: { type: String, required: true }, // Cloudinary URL
  generatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RelievingLetter', relievingLetterSchema);

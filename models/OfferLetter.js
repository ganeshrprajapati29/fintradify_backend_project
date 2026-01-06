const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  position: { type: String, required: true },
  department: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  salary: { type: Number, required: true },
  probationPeriod: { type: Number, default: 6 }, // in months
  workLocation: { type: String, default: 'Noida, Uttar Pradesh' },
  reportingManager: { type: String, required: true },
  offerLetterUrl: { type: String },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
  sentAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('OfferLetter', offerLetterSchema);

const mongoose = require('mongoose');

const reimbursementSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['Travel', 'Medical', 'Food', 'Office Supplies', 'Training', 'Other'] },
  date: { type: Date, default: Date.now },
  attachments: [{
    filename: { type: String },
    url: { type: String }
  }],
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reimbursement', reimbursementSchema);

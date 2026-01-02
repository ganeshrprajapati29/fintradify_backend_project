const mongoose = require('mongoose');

const salarySlipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  amount: { type: Number, default: 0 }, // Monthly salary amount
  // Salary Components
  basicPay: { type: Number, required: true },
  hra: { type: Number, default: 0 },
  conveyanceAllowance: { type: Number, default: 0 },
  medicalAllowance: { type: Number, default: 0 },
  lta: { type: Number, default: 0 },
  otherAllowances: { type: Number, default: 0 },
  // Deductions
  pf: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 0 },
  gratuity: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  // Totals
  totalEarnings: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  // Additional Info
  workingDays: { type: Number, default: 30 },
  presentDays: { type: Number, default: 0 },
  hoursWorked: { type: Number, default: 160 },
  paymentMode: { type: String, default: 'Bank Transfer' },
  bankAccount: { type: String, default: '' },
  bankName: { type: String, default: '' },
  department: { type: String, default: '' },
  financialYear: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['generated', 'sent'], default: 'generated' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
});

module.exports = mongoose.model('SalarySlip', salarySlipSchema);

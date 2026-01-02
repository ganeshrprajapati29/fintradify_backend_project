const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const SalarySlip = require('./models/SalarySlip');

// Connect to database
mongoose.connect('mongodb://localhost:27017/fintradify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Test creating a SalarySlip
const testSalarySlip = async () => {
  try {
    const salarySlip = new SalarySlip({
      employee: '507f1f77bcf86cd799439011', // dummy ObjectId
      month: '2024-01',
      year: 2024,
      amount: 21000,
      basicPay: 7350,
      hra: 2940,
      conveyanceAllowance: 2100,
      medicalAllowance: 1050,
      lta: 2100,
      otherAllowances: 6460,
      pf: 882,
      professionalTax: 235,
      gratuity: 397,
      otherDeductions: 0,
      totalEarnings: 21000,
      totalDeductions: 1514,
      netSalary: 19486,
      workingDays: 30,
      presentDays: 30,
      paymentMode: 'Bank Transfer',
      bankAccount: 'TRD1234',
      financialYear: '2024-25',
      date: new Date(),
      generatedBy: null,
    });

    await salarySlip.validate();
    console.log('SalarySlip validation passed');
  } catch (err) {
    console.error('SalarySlip validation error:', err.message);
    console.error('Error details:', err);
  } finally {
    mongoose.disconnect();
  }
};

testSalarySlip();

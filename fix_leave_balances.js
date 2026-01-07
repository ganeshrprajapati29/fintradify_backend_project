require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./vps_server_crm/models/Employee');

async function fixLeaveBalances() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Update all employees: paidLeaveBalance = paidLeaveBalance - usedPaidLeaves
    const result = await Employee.updateMany(
      {},
      [
        {
          $set: {
            paidLeaveBalance: {
              $subtract: ['$paidLeaveBalance', '$usedPaidLeaves']
            }
          }
        }
      ]
    );

    console.log(`Updated ${result.modifiedCount} employees`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error fixing leave balances:', error);
  }
}

fixLeaveBalances();

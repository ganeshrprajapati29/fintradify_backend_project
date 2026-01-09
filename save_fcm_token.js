const mongoose = require('mongoose');
const Employee = require('./vps_server_crm/models/Employee');

// Replace with your MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/fintradify'; // Update if different

const fcmToken = 'efP_u5PDTamz9FdFugUxa5:APA91bEV6hZA56NrGtwodyt2RnSvhaVIzHzG5vkMaR4qBPXqxY-8BaLWppnct6dzHtXQS8b60-l2EyI43wRyfnqr6kr-n7JBmY6jK4AsPyO-vUQO-6Q2MSk';

async function saveFcmToken() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin employee to save the token (you can change this to specific employee)
    const employee = await Employee.findOne({ role: 'admin' });
    if (!employee) {
      console.log('No admin employee found');
      return;
    }

    employee.fcmToken = fcmToken;
    await employee.save();

    console.log(`FCM token saved for employee: ${employee.name} (${employee.employeeId})`);
    console.log('FCM Token:', fcmToken);

  } catch (error) {
    console.error('Error saving FCM token:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

saveFcmToken();

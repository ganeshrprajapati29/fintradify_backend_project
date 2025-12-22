
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const salaryRoutes = require('./routes/salary');
const taskRoutes = require('./routes/task');
const featuresRoutes = require('./routes/features');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Fix Mongoose strictQuery deprecation warning
mongoose.set('strictQuery', false);

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/salary', salaryRoutes);
app.use('/tasks', taskRoutes);
app.use('/features', featuresRoutes);
// Root route
app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

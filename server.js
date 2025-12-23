
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

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/features', featuresRoutes);
// ===== Root Route =====
app.get('/', (req, res) => {
  res.send('🚀 HR Fintradify Backend LIVE');
});

// ===== API Root Route (FIX FOR Cannot GET /api) =====
app.get('/api', (req, res) => {
  res.send('✅ API Working Successfully');
});

// ===== SERVER START =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
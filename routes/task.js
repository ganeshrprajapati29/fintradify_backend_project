const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');

router.get('/my-tasks', auth, async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.user.id);
    const tasks = await Task.find({ employee: req.user.id })
      .populate('employee', 'employeeId name email')
      .sort({ createdAt: -1 });
    console.log('Tasks fetched:', tasks);
    res.json({ success: true, data: tasks || [] });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching tasks' });
  }
});

router.post('/', auth, async (req, res) => {
  const { title, description, employeeId } = req.body;
  try {
    let employee;
    if (req.user.role === 'admin') {
      if (!employeeId) {
        return res.status(400).json({ message: 'Employee ID is required for admin' });
      }
      employee = await Employee.findById(employeeId);
    } else {
      employee = await Employee.findById(req.user.id);
    }
    if (!employee) {
      console.error('Employee not found');
      return res.status(404).json({ message: 'Employee not found' });
    }

    const task = new Task({
      title,
      description,
      employee: employee._id,
    });
    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate('employee', 'employeeId name email');
    if (req.user.role === 'admin') {
      await sendEmail(employee.email, 'New Task Assigned', `Task: ${title}\nDescription: ${description}`);
    }
    console.log('Task created:', populatedTask);
    res.json({ success: true, data: populatedTask });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, message: 'Server error while creating task' });
  }
});

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
  try {
    const tasks = await Task.find()
      .populate('employee', 'employeeId name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tasks || [] });
  } catch (err) {
    console.error('Fetch all tasks error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching all tasks' });
  }
});

router.get('/all-tasks', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
  try {
    const tasks = await Task.find()
      .populate('employee', 'employeeId name email')
      .sort({ createdAt: -1 });
    const tasksByDate = {};
    tasks.forEach(task => {
      const date = new Date(task.createdAt).toISOString().split('T')[0];
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });
    res.json({ success: true, data: tasksByDate });
  } catch (err) {
    console.error('Fetch all tasks grouped error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching all tasks' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      console.error('Task not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (req.user.role !== 'admin' && task.employee.toString() !== req.user.id) {
      console.error('Unauthorized task update by user:', req.user.id);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    task.status = status || task.status;
    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate('employee', 'employeeId name email');
    console.log('Task updated:', populatedTask);
    res.json({ success: true, data: populatedTask });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, message: 'Server error while updating task' });
  }
});

module.exports = router;

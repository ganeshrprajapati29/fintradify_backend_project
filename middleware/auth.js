const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findById(decoded.id);
    if (!employee) return res.status(401).json({ message: 'Employee not found' });

    // Allow profile updates even for blocked/terminated employees
    if (req.route.path !== '/profile') {
      if (employee.status === 'blocked') {
        return res.status(403).json({ message: 'Account is blocked. Please contact your administrator.' });
      }
      if (employee.status === 'terminated') {
        return res.status(403).json({ message: 'Account has been terminated. Please contact your administrator.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;

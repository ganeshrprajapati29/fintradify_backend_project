
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const SalarySlip = require('../models/SalarySlip');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/sendEmail');
const { blockEmployee, unblockEmployee } = require('../services/employeeService');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const generateEmployeeId = async () => {
  let employeeId;
  let isUnique = false;
  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    employeeId = `TRD${randomNum}`;
    const existing = await Employee.findOne({ employeeId });
    if (!existing) isUnique = true;
  }
  return employeeId;
};

// Helper function to get current financial year
const getFinancialYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
};

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const employees = await Employee.find();
    const employeesWithSalary = await Promise.all(
      employees.map(async (emp) => {
        const latestSalary = await SalarySlip.findOne({ employee: emp._id })
          .sort({ month: -1 });

        // Calculate paid leave balance based on joining date with carry over
        const now = new Date();
        const joining = new Date(emp.joiningDate);
        const monthsDiff = Math.floor((now - joining) / (1000 * 60 * 60 * 24 * 30)); // More accurate month calculation
        const accruedPaidLeave = monthsDiff >= 6 ? Math.floor(monthsDiff * 1.5) : 0; // Eligible after 6 months, 1.5 days per month
        const calculatedPaidLeave = Math.max(0, accruedPaidLeave - (emp.usedPaidLeaves || 0)); // Carry over unused leaves

        let salary = 'N/A';
        if (latestSalary && latestSalary.netSalary && !isNaN(latestSalary.netSalary)) {
          salary = latestSalary.netSalary;
        } else if (emp.salary && !isNaN(emp.salary)) {
          salary = emp.salary;
        }

        return {
          ...emp._doc,
          salary,
          paidLeaveBalance: calculatedPaidLeave,
          unpaidLeaveBalance: emp.unpaidLeaveBalance,
          isActive: emp.status === 'active'
        };
      })
    );
    res.json(employeesWithSalary);
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
});

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { name, email, phone, address, position, department, bankAccount, bankName, salary, joiningDate } = req.body;
  try {
    let employee = await Employee.findOne({ email });
    if (employee) return res.status(400).json({ message: 'Employee already exists' });

    const employeeId = await generateEmployeeId();
    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    employee = new Employee({
      employeeId,
      name,
      email,
      phone,
      address,
      position,
      department,
      bankAccount,
      bankName,
      salary: salary || 0,
      joiningDate: joiningDate || new Date(),
      password: hashedPassword,
      role: 'employee',
    });

    await employee.save();

    // Create salary slip if salary is provided
    if (salary && !isNaN(salary) && salary > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const currentYear = new Date().getFullYear();
      const monthlySalary = parseFloat(salary);
      const basicPay = Math.round(monthlySalary * 0.35); // 35% of total salary
      const hra = Math.round(basicPay * 0.4); // 40% of basic pay
      const conveyanceAllowance = Math.min(19200, Math.round(monthlySalary * 0.1)); // Conveyance allowance (max 19200/year)
      const medicalAllowance = Math.round(monthlySalary * 0.05); // 5% medical allowance
      const lta = Math.round(monthlySalary * 0.1); // 10% LTA
      const otherAllowances = monthlySalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

        // Calculate deductions
        const pf = 0; // No PF deduction
        const professionalTax = 0; // No professional tax
        const gratuity = 0; // No gratuity deduction
        const otherDeductions = 0;

      // Calculate totals
      const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
      const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
      const netSalary = totalEarnings - totalDeductions;

      const salarySlip = new SalarySlip({
        employee: employee._id,
        month: currentMonth,
        year: currentYear,
        amount: monthlySalary,
        basicPay,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        lta,
        otherAllowances,
        pf,
        professionalTax,
        gratuity,
        otherDeductions,
        totalEarnings,
        totalDeductions,
        netSalary,
        workingDays: 30,
        presentDays: 30,
        paymentMode: 'Bank Transfer',
        bankAccount: employee.employeeId,
        financialYear: getFinancialYear(),
        date: new Date(),
        generatedBy: null,
      });
      await salarySlip.save();
    }

    // ✅ Professional Email Template with Portal Link
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #007bff; text-align: center;">🎉 Welcome to Fintradify</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your employee account has been successfully created.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Password</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${password}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Please use these credentials to log in to the <strong>Fintradify Employee Portal</strong>.</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="https://crm.fintradify.com/" style="background-color:#007bff; color:#fff; padding: 10px 20px; border-radius: 5px; text-decoration:none; font-weight:bold;">
            🔗 Go to Employee Portal
          </a>
        </p>
        <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
          🔒 This is a system-generated email. Do not share your credentials with anyone.
        </p>
      </div>
    `;

    await sendEmail(email, '🎉 Fintradify Account Created', htmlContent);

    res.json({ ...employee._doc, salary: salary || 'N/A' });
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ message: 'Server error while adding employee' });
  }
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { name, email, phone, address, position, department, bankAccount, bankName, password, salary, joiningDate, profilePhoto } = req.body;
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    employee.name = name || employee.name;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.address = address !== undefined ? address : employee.address;
    employee.position = position || employee.position;
    employee.department = department !== undefined ? department : employee.department;
    employee.bankAccount = bankAccount !== undefined ? bankAccount : employee.bankAccount;
    employee.bankName = bankName !== undefined ? bankName : employee.bankName;
    employee.profilePhoto = profilePhoto !== undefined ? profilePhoto : employee.profilePhoto;
    employee.joiningDate = joiningDate ? new Date(joiningDate) : (employee.joiningDate || new Date());
    if (password) employee.password = await bcrypt.hash(password, 10);
    if (salary !== undefined) employee.salary = parseFloat(salary) || 0;

    await employee.save();

    if (salary !== undefined && !isNaN(salary) && salary >= 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentYear = new Date().getFullYear();
      let salarySlip = await SalarySlip.findOne({
        employee: employee._id,
        month: currentMonth,
      });

      if (salarySlip) {
        // Update existing salary slip with new amount and recalculate components
        const monthlySalary = parseFloat(salary);
        const basicPay = Math.round(monthlySalary * 0.35); // 35% of total salary
        const hra = Math.round(basicPay * 0.4); // 40% of basic pay
        const conveyanceAllowance = Math.min(19200, Math.round(monthlySalary * 0.1)); // Conveyance allowance (max 19200/year)
        const medicalAllowance = Math.round(monthlySalary * 0.05); // 5% medical allowance
        const lta = Math.round(monthlySalary * 0.1); // 10% LTA
        const otherAllowances = monthlySalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

        // Calculate deductions
        const pf = 0; // No PF deduction
        const professionalTax = 0; // No professional tax
        const gratuity = 0; // No gratuity deduction
        const otherDeductions = 0;

        // Calculate totals
        const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
        const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
        const netSalary = totalEarnings - totalDeductions;

        salarySlip.amount = monthlySalary;
        salarySlip.basicPay = basicPay;
        salarySlip.hra = hra;
        salarySlip.conveyanceAllowance = conveyanceAllowance;
        salarySlip.medicalAllowance = medicalAllowance;
        salarySlip.lta = lta;
        salarySlip.otherAllowances = otherAllowances;
        salarySlip.pf = pf;
        salarySlip.professionalTax = professionalTax;
        salarySlip.gratuity = gratuity;
        salarySlip.otherDeductions = otherDeductions;
        salarySlip.totalEarnings = totalEarnings;
        salarySlip.totalDeductions = totalDeductions;
        salarySlip.netSalary = netSalary;
        salarySlip.hoursWorked = 160;
        salarySlip.workingDays = 30;
        salarySlip.presentDays = 30;
        salarySlip.year = currentYear;
        salarySlip.financialYear = getFinancialYear();
        await salarySlip.save();
      } else if (salary > 0) {
        // Create new salary slip with all required fields
        const monthlySalary = parseFloat(salary);
        const basicPay = Math.round(monthlySalary * 0.35); // 35% of total salary
        const hra = Math.round(basicPay * 0.4); // 40% of basic pay
        const conveyanceAllowance = Math.min(19200, Math.round(monthlySalary * 0.1)); // Conveyance allowance (max 19200/year)
        const medicalAllowance = Math.round(monthlySalary * 0.05); // 5% medical allowance
        const lta = Math.round(monthlySalary * 0.1); // 10% LTA
        const otherAllowances = monthlySalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

        // Calculate deductions
        const pf = 0; // No PF deduction
        const professionalTax = 0; // No professional tax
        const gratuity = 0; // No gratuity deduction
        const otherDeductions = 0;

        // Calculate totals
        const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
        const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
        const netSalary = totalEarnings - totalDeductions;

        salarySlip = new SalarySlip({
          employee: employee._id,
          month: currentMonth,
          year: currentYear,
          amount: monthlySalary,
          basicPay,
          hra,
          conveyanceAllowance,
          medicalAllowance,
          lta,
          otherAllowances,
          pf,
          professionalTax,
          gratuity,
          otherDeductions,
          totalEarnings,
          totalDeductions,
          netSalary,
          workingDays: 30,
          presentDays: 30,
          paymentMode: 'Bank Transfer',
          bankAccount: employee.employeeId,
          financialYear: getFinancialYear(),
          date: new Date(),
          generatedBy: null,
        });
        await salarySlip.save();
      }
    }

    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });
    res.json({ ...employee._doc, salary: latestSalary ? latestSalary.netSalary : 'N/A' });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ message: 'Server error while updating employee' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await employee.remove();
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ message: 'Server error while deleting employee' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });

    if (latestSalary) employee.salary = latestSalary.amount;

    // Calculate paid leave balance with carry over
    const now = new Date();
    const joining = new Date(employee.joiningDate);
    const monthsDiff = Math.floor((now - joining) / (1000 * 60 * 60 * 24 * 30)); // More accurate month calculation
    const isEligible = monthsDiff >= 6;
    const accruedPaidLeave = isEligible ? Math.floor(monthsDiff * 1.5) : 0;
    const calculatedPaidLeave = Math.max(0, accruedPaidLeave - (employee.usedPaidLeaves || 0));

    res.json({
      success: true,
      data: {
        ...employee._doc,
        salary: latestSalary ? latestSalary.amount : 'N/A',
        employeeId: employee.employeeId, // Ensure employeeId is included
        paidLeaveBalance: calculatedPaidLeave,
        unpaidLeaveBalance: employee.unpaidLeaveBalance,
        halfDayLeaveBalance: employee.halfDayLeaveBalance,
        isEligibleForPaidLeaves: isEligible,
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

router.put('/:id/terminate', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (!employee.joiningDate) employee.joiningDate = new Date();
    employee.status = 'terminated';
    await employee.save();

    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });
    res.json({ ...employee._doc, salary: latestSalary ? latestSalary.amount : 'N/A' });
  } catch (err) {
    console.error('Terminate employee error:', err);
    res.status(500).json({ message: 'Server error while terminating employee' });
  }
});

router.put('/:id/enable', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (!employee.joiningDate) employee.joiningDate = new Date();
    employee.status = 'active';
    await employee.save();

    let salary = 'N/A';
    try {
      const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });
      salary = latestSalary ? latestSalary.netSalary : 'N/A';
    } catch (salaryErr) {
      console.error('Error fetching salary:', salaryErr);
    }
    res.json({ ...employee._doc, salary });
  } catch (err) {
    console.error('Enable employee error:', err);
    res.status(500).json({ message: 'Server error while enabling employee' });
  }
});

router.put('/:id/block', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const result = await blockEmployee(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Block employee error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/unblock', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const result = await unblockEmployee(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Unblock employee error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Upload photo for self (employee)
router.post('/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fintradify-profiles',
          public_id: `employee-${req.user.id}-${Date.now()}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Update employee profile photo
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    employee.profilePhoto = result.secure_url;
    await employee.save();

    res.json({ photoUrl: result.secure_url, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ message: 'Server error while uploading photo' });
  }
});

// Upload photo for employee by admin
router.post('/:id/upload-photo', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fintradify-profiles',
          public_id: `employee-${req.params.id}-${Date.now()}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Update employee profile photo
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    employee.profilePhoto = result.secure_url;
    await employee.save();

    res.json({ photoUrl: result.secure_url, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ message: 'Server error while uploading photo' });
  }
});

router.put('/profile', auth, async (req, res) => {
  // Now proceed with profile update
  const { name, email, phone, address, position, salary, profilePhoto } = req.body;
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      // Check if email is already taken by another employee
      const existingEmployee = await Employee.findOne({ email, _id: { $ne: req.user.id } });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Email already in use by another employee' });
      }
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (address) employee.address = address;
    if (position) employee.position = position;
    if (profilePhoto !== undefined) employee.profilePhoto = profilePhoto;

    await employee.save();

    // Update salary if provided
    if (salary !== undefined && !isNaN(salary) && salary >= 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentYear = new Date().getFullYear();
      let salarySlip = await SalarySlip.findOne({
        employee: employee._id,
        month: currentMonth,
      });

      // Ensure salary is a valid number
      const monthlySalary = parseFloat(salary);
      if (isNaN(monthlySalary) || monthlySalary < 0) {
        return res.status(400).json({ message: 'Invalid salary amount' });
      }

      if (salarySlip) {
        // Update existing salary slip with new amount and recalculate components
        const basicPay = Math.round(monthlySalary * 0.35); // 35% of total salary
        const hra = Math.round(basicPay * 0.4); // 40% of basic pay
        const conveyanceAllowance = Math.min(19200, Math.round(monthlySalary * 0.1)); // Conveyance allowance (max 19200/year)
        const medicalAllowance = Math.round(monthlySalary * 0.05); // 5% medical allowance
        const lta = Math.round(monthlySalary * 0.1); // 10% LTA
        const otherAllowances = monthlySalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

        // Calculate deductions
        const pf = 0; // No PF deduction
        const professionalTax = 0; // No professional tax
        const gratuity = 0; // No gratuity deduction
        const otherDeductions = 0;

        // Calculate totals
        const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
        const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
        const netSalary = totalEarnings - totalDeductions;

        salarySlip.amount = monthlySalary;
        salarySlip.basicPay = basicPay;
        salarySlip.hra = hra;
        salarySlip.conveyanceAllowance = conveyanceAllowance;
        salarySlip.medicalAllowance = medicalAllowance;
        salarySlip.lta = lta;
        salarySlip.otherAllowances = otherAllowances;
        salarySlip.pf = pf;
        salarySlip.professionalTax = professionalTax;
        salarySlip.gratuity = gratuity;
        salarySlip.otherDeductions = otherDeductions;
        salarySlip.totalEarnings = totalEarnings;
        salarySlip.totalDeductions = totalDeductions;
        salarySlip.netSalary = netSalary;
        salarySlip.hoursWorked = 160;
        salarySlip.workingDays = 30;
        salarySlip.presentDays = 30;
        salarySlip.year = currentYear;
        salarySlip.financialYear = getFinancialYear();
        await salarySlip.save();
      } else if (salary > 0) {
        // Create new salary slip with all required fields
        const basicPay = Math.round(monthlySalary * 0.35); // 35% of total salary
        const hra = Math.round(basicPay * 0.4); // 40% of basic pay
        const conveyanceAllowance = Math.min(19200, Math.round(monthlySalary * 0.1)); // Conveyance allowance (max 19200/year)
        const medicalAllowance = Math.round(monthlySalary * 0.05); // 5% medical allowance
        const lta = Math.round(monthlySalary * 0.1); // 10% LTA
        const otherAllowances = monthlySalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

        // Calculate deductions
        const pf = 0; // No PF deduction
        const professionalTax = 0; // No professional tax
        const gratuity = 0; // No gratuity deduction
        const otherDeductions = 0;

        // Calculate totals
        const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
        const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
        const netSalary = totalEarnings - totalDeductions;

        salarySlip = new SalarySlip({
          employee: employee._id,
          month: currentMonth,
          year: currentYear,
          amount: monthlySalary,
          basicPay,
          hra,
          conveyanceAllowance,
          medicalAllowance,
          lta,
          otherAllowances,
          pf,
          professionalTax,
          gratuity,
          otherDeductions,
          totalEarnings,
          totalDeductions,
          netSalary,
          workingDays: 30,
          presentDays: 30,
          paymentMode: 'Bank Transfer',
          bankAccount: employee.employeeId,
          financialYear: getFinancialYear(),
          date: new Date(),
          generatedBy: null,
        });
        await salarySlip.save();
      }
    }

    const latestSalary = await SalarySlip.findOne({ employee: employee._id }).sort({ month: -1 });

    // Calculate paid leave balance with carry over
    const now = new Date();
    const joining = new Date(employee.joiningDate);
    const monthsDiff = Math.floor((now - joining) / (1000 * 60 * 60 * 24 * 30));
    const isEligible = monthsDiff >= 6;
    const accruedPaidLeave = isEligible ? Math.floor(monthsDiff * 1.5) : 0;
    const calculatedPaidLeave = Math.max(0, accruedPaidLeave - (employee.usedPaidLeaves || 0));

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...employee._doc,
        salary: latestSalary ? latestSalary.amount : 'N/A',
        employeeId: employee.employeeId,
        paidLeaveBalance: calculatedPaidLeave,
        unpaidLeaveBalance: employee.unpaidLeaveBalance,
        halfDayLeaveBalance: employee.halfDayLeaveBalance,
        isEligibleForPaidLeaves: isEligible,
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router;

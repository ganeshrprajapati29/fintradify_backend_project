const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const SalarySlip = require('../models/SalarySlip');
const { sendEmail } = require('../utils/sendEmail');
const { generateSalarySlipPDF } = require('../utils/generatePDF');

async function generateMonthlySalarySlips(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const employees = await Employee.find();

  for (const employee of employees) {
    try {
      // Count attendance days
      const attendanceCount = await Attendance.countDocuments({
        employee: employee._id,
        date: { $gte: startDate, $lte: endDate },
        punchIn: { $exists: true },
        punchOut: { $exists: true }
      });

      // Calculate salary components based on attendance
      const totalDays = 30;
      const monthlySalary = employee.salary;
      const dailySalary = monthlySalary / totalDays;
      const proratedSalary = attendanceCount * dailySalary;

      // Calculate salary components (standard Indian salary structure)
      const basicPay = Math.round(proratedSalary * 0.35); // 35% of total salary
      const hra = Math.round(basicPay * 0.4); // 40% of basic pay
      const conveyanceAllowance = Math.min(19200, Math.round(proratedSalary * 0.1)); // Conveyance allowance (max 19200/year)
      const medicalAllowance = Math.round(proratedSalary * 0.05); // 5% medical allowance
      const lta = Math.round(proratedSalary * 0.1); // 10% LTA
      const otherAllowances = proratedSalary - (basicPay + hra + conveyanceAllowance + medicalAllowance + lta);

      // Calculate deductions
      const pf = Math.round(basicPay * 0.12); // 12% PF
      const professionalTax = 235; // Fixed professional tax for UP (can be adjusted based on state)
      const gratuity = Math.round((basicPay * 15 * attendanceCount) / (totalDays * 26)); // Gratuity calculation
      const otherDeductions = 0;

      // Calculate totals
      const totalEarnings = basicPay + hra + conveyanceAllowance + medicalAllowance + lta + otherAllowances;
      const totalDeductions = pf + professionalTax + gratuity + otherDeductions;
      const netSalary = totalEarnings - totalDeductions;

      // Get financial year
      const financialYear = getFinancialYear();
      
      // Generate payroll number
      const payrollNumber = `FINT-PAY-${year}${month.toString().padStart(2, '0')}-${employee.employeeId}`;

      // Create salary slip with detailed components
      const salarySlip = new SalarySlip({
        employee: employee._id,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        year: year,
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
        workingDays: totalDays,
        presentDays: attendanceCount,
        paymentMode: 'Bank Transfer',
        bankAccount: employee.bankAccount || employee.employeeId,
        financialYear,
        payrollNumber,
        date: new Date(),
        generatedBy: null, // System generated
      });

      await salarySlip.save();

      // Generate PDF with employee data
      const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee);

      // Get month name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[month - 1];

      // Professional email subject and body
      const emailSubject = `Fintradify - Salary Slip for ${monthName} ${year}`;
      
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salary Slip - Fintradify</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        .company-name {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .company-tagline {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .greeting {
            font-size: 20px;
            color: #1e3a8a;
            margin-bottom: 25px;
            font-weight: 600;
        }
        .message {
            font-size: 15px;
            margin-bottom: 30px;
            color: #4b5563;
        }
        .highlight-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background: #f8fafc;
            border-radius: 8px;
            overflow: hidden;
        }
        .details-table th {
            background: #e2e8f0;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            font-size: 14px;
        }
        .details-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }
        .details-table tr:last-child td {
            border-bottom: none;
        }
        .attachment-note {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            padding: 15px;
            border-radius: 8px;
            margin: 25px 0;
            font-size: 14px;
            color: #92400e;
        }
        .cta-button {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            margin: 20px 0;
            transition: background 0.3s;
        }
        .cta-button:hover {
            background: #059669;
        }
        .footer {
            background: #f1f5f9;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
        }
        .footer-links {
            margin: 15px 0;
        }
        .footer-links a {
            color: #3b82f6;
            text-decoration: none;
            margin: 0 10px;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        .disclaimer {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 15px;
            line-height: 1.5;
        }
        .signature {
            margin: 30px 0;
            padding: 20px;
            border-top: 2px solid #e2e8f0;
        }
        .signature p {
            margin: 5px 0;
        }
        .highlight {
            color: #1e3a8a;
            font-weight: 600;
        }
        .salary-amount {
            font-size: 24px;
            color: #059669;
            font-weight: 700;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">FINT</div>
            <div class="company-name">FINTRADIFY</div>
            <div class="company-tagline">Simplifying Financial Operations</div>
        </div>
        
        <div class="content">
            <div class="greeting">Dear ${employee.name},</div>
            
            <div class="message">
                We are pleased to inform you that your salary for <span class="highlight">${monthName} ${year}</span> has been processed and credited to your account.
            </div>
            
            <div class="highlight-box">
                <strong>Net Salary Credited:</strong>
                <div class="salary-amount">₹ ${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p>Amount in Words: ${numberToWordsInEmail(netSalary)} Only</p>
            </div>
            
            <table class="details-table">
                <tr>
                    <th>Payroll Details</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Employee ID</td>
                    <td>${employee.employeeId}</td>
                </tr>
                <tr>
                    <td>Payroll Number</td>
                    <td>${payrollNumber}</td>
                </tr>
                <tr>
                    <td>Payment Date</td>
                    <td>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
                <tr>
                    <td>Payment Mode</td>
                    <td>Bank Transfer</td>
                </tr>
                <tr>
                    <td>Bank Account</td>
                    <td>${employee.bankAccount ? '••••' + employee.bankAccount.slice(-4) : 'Not Provided'}</td>
                </tr>
                <tr>
                    <td>Working Days / Present Days</td>
                    <td>${totalDays} / ${attendanceCount}</td>
                </tr>
                <tr>
                    <td>Financial Year</td>
                    <td>${financialYear}</td>
                </tr>
            </table>
            
            <div class="attachment-note">
                <strong>📎 Attachment:</strong> Your detailed salary slip for ${monthName} ${year} is attached to this email. Please find the PDF document for complete breakdown of earnings and deductions.
            </div>
            
            <div class="message">
                <strong>Important Notes:</strong>
                <ul>
                    <li>This is a computer generated salary slip and does not require physical signature</li>
                    <li>Please verify all details and report any discrepancies within 7 days</li>
                    <li>Keep this document safely for your records and tax filing purposes</li>
                    <li>For any queries, contact HR Department at hr@fintradify.com</li>
                </ul>
            </div>
            
            <div class="signature">
                <p>Best Regards,</p>
                <p><strong>HR Department</strong></p>
                <p>Fintradify Private Limited</p>
                <p>Phone: +91 78360 09907 | Email: hr@fintradify.com</p>
                <p>Office: Office No. 105, C6, Noida Sector 7, Uttar Pradesh - 201301</p>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="https://fintradify.com">Website</a> | 
                <a href="mailto:hr@fintradify.com">Contact HR</a> | 
                <a href="https://fintradify.com/privacy">Privacy Policy</a>
            </div>
            <div class="disclaimer">
                <strong>Confidentiality Notice:</strong> This email and any attachments are confidential and intended solely for the use of the individual to whom they are addressed. 
                If you have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, disclosure, or copying is strictly prohibited.
            </div>
            <p>© ${new Date().getFullYear()} Fintradify HR Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `;

      // Send professional email with PDF attachment
      await sendEmail(
        employee.email,
        emailSubject,
        emailBody, // HTML body
        pdfBuffer,
        `Salary_Slip_${monthName}_${year}_${employee.employeeId}.pdf`
      );

      console.log(`✅ Salary slip generated and sent to ${employee.name} (${employee.email})`);

    } catch (error) {
      console.error(`❌ Error generating salary slip for ${employee.name}:`, error);
      // Continue with other employees even if one fails
    }
  }

  console.log(`✅ Completed salary slip generation for ${month}/${year}`);
  console.log(`📊 Total employees processed: ${employees.length}`);
}

// Helper function to get current financial year
function getFinancialYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(2)}`;
}

// Helper function for email amount in words
function numberToWordsInEmail(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertHundreds(n) {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }
  
  let result = '';
  let number = Math.floor(num);
  
  // Handle Crores
  if (number >= 10000000) {
    const crore = Math.floor(number / 10000000);
    result += convertHundreds(crore) + ' Crore ';
    number %= 10000000;
  }
  
  // Handle Lakhs
  if (number >= 100000) {
    const lakh = Math.floor(number / 100000);
    result += convertHundreds(lakh) + ' Lakh ';
    number %= 100000;
  }
  
  // Handle Thousands
  if (number >= 1000) {
    const thousand = Math.floor(number / 1000);
    result += convertHundreds(thousand) + ' Thousand ';
    number %= 1000;
  }
  
  // Handle Hundreds
  if (number > 0) {
    result += convertHundreds(number);
  }
  
  result = result.trim() || 'Zero';
  
  // Handle paise
  const paise = Math.round((num - Math.floor(num)) * 100);
  if (paise > 0) {
    result += ` and ${convertHundreds(paise)} Paise`;
  }
  
  return result;
}

module.exports = { generateMonthlySalarySlips };
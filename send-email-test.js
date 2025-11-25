const nodemailer = require('nodemailer');

// Configuration from .env.production
const smtpConfig = {
  host: 'mail.genai.hr',
  port: 465,
  secure: true,
  auth: {
    user: 'chat@genai.hr',
    pass: 'Ovsenica07'
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

const verificationUrl = 'https://chat.genai.hr/auth/verify-email?token=test-token-12345';

const mailOptions = {
  from: 'chat@genai.hr',
  to: 'mislav@metrica.hr',
  subject: 'Verify your email address - Meta Chat Platform',
  html: '<h1>Test Email</h1><p>If you received this, email is working!</p>'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } else {
    console.log('Success! Email sent to mislav@metrica.hr');
    process.exit(0);
  }
});

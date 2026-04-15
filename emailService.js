const nodemailer = require('nodemailer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');

// Load and compile template
function compileTemplate(templateName, data) {
  const filePath = path.join(__dirname, 'views', 'emails', templateName);
  const source = fs.readFileSync(filePath, 'utf8');
  const template = hbs.compile(source);
  return template(data);
}

// Nodemailer transporter (configure as per your SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send a transactional email using Nodemailer and Handlebars
 * @param {Object} opts
 * @param {string} opts.to - Recipient email
 * @param {string} opts.subject - Email subject
 * @param {string} opts.template - Template filename (e.g. 'order-received.hbs')
 * @param {Object} opts.context - Data for template
 * @returns {Promise}
 */
async function sendEmail({ to, subject, template, context }) {
  const html = compileTemplate(template, context);
  const mailOptions = {
    from: process.env.SENDER_EMAIL || 'support@eshopperr.me',
    to,
    subject,
    html
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };

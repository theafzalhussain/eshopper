// src/utils/emailHelper.js
// Brevo (Sendinblue) transactional email utility for ESHOPPER
// Uses Railway env variables: BREVO_API_KEY, SENDER_EMAIL


const { BrevoClient } = require('@getbrevo/brevo');

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.SENDER_EMAIL;

if (!apiKey || !senderEmail) {
  throw new Error('Missing BREVO_API_KEY or SENDER_EMAIL in environment variables.');
}

const brevo = new BrevoClient({ apiKey });

/**
 * Send a transactional email using Brevo
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML content of the email
 * @param {string} [options.textContent] - Plain text content (optional)
 * @returns {Promise<Object>} Brevo API response
 */

async function sendEmail({ to, subject, htmlContent, textContent }) {
  if (!to || !subject || !htmlContent) {
    throw new Error('Missing required email parameters.');
  }
  const emailData = {
    sender: { email: senderEmail, name: 'ESHOPPER' },
    to: [{ email: to }],
    subject,
    htmlContent,
    ...(textContent ? { textContent } : {})
  };
  return brevo.transactionalEmails.sendTransacEmail(emailData);
}

module.exports = { sendEmail };
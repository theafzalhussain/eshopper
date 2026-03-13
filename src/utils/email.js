const axios = require('axios');

/**
 * Sends a transactional email using Brevo/Sendinblue API
 * @param {Object} opts
 * @param {string} opts.toEmail - Recipient email
 * @param {string} opts.toName - Recipient name
 * @param {string} opts.subject - Email subject
 * @param {string} opts.htmlContent - HTML content
 * @param {Array} [opts.attachments] - Attachments (optional)
 * @returns {Promise<{provider: string, result: any}>}
 */
async function sendTransactionalEmail({ toEmail, toName, subject, htmlContent, attachments }) {
    console.log('[EMAIL] sendTransactionalEmail called:', { toEmail, toName, subject });
    if (!toEmail || !subject || !htmlContent) throw new Error('Missing required email parameters');
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (!apiKey) throw new Error('Brevo/Sendinblue API key missing in environment');
    const senderEmail = process.env.SENDER_EMAIL || 'support@eshopperr.me';
    const senderName = process.env.SENDER_NAME || 'Eshopper Boutique';
    const payload = {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
    };
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        payload.attachment = attachments.map(att => ({
            content: att.content,
            name: att.filename || att.name,
            type: att.contentType || 'application/octet-stream'
        }));
    }
    try {
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            payload,
            {
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                timeout: 20000
            }
        );
        console.log('[EMAIL] Sent via Brevo:', toEmail, subject);
        return { provider: 'Brevo', result: response.data };
    } catch (err) {
        console.error('❌ Brevo email send failed:', err.response?.data || err.message);
        throw new Error('Brevo email send failed: ' + (err.response?.data?.message || err.message));
    }
}

module.exports = { sendTransactionalEmail };

import nodemailer from 'nodemailer';

/**
 * Sends an email using MailerSend SMTP via Nodemailer.
 * 
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - Email body in HTML format
 * @returns {Promise<{data: any, error: Error|null}>}
 */
export async function sendEmail({ to, subject, html }) {
  // 1. Missing env variables validation
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  const missing = [];
  if (!host) missing.push('SMTP_HOST');
  if (!port) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('SMTP_FROM');

  if (missing.length > 0) {
    const errMsg = `SMTP Configuration Error: Missing environment variables: ${missing.join(', ')}`;
    console.error(`[Mailer] ${errMsg}`);
    return { data: null, error: new Error(errMsg) };
  }

  // 2. Validate recipient
  if (!to || (Array.isArray(to) && to.length === 0)) {
    const errMsg = 'SMTP Send Error: Recipient email is missing or empty.';
    console.error(`[Mailer] ${errMsg}`);
    return { data: null, error: new Error(errMsg) };
  }

  try {
    // 3. Create Nodemailer SMTP transporter (use built-in service shortcut if using Gmail)
    const isGmail = host.includes('gmail') || host.includes('googlemail');
    const transportConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user,
            pass,
          },
        }
      : {
          host,
          port: parseInt(port, 10),
          secure: parseInt(port, 10) === 465, // true for port 465, false for port 587
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false
          }
        };

    const transporter = nodemailer.createTransport(transportConfig);

    const toFormatted = Array.isArray(to) ? to.join(', ') : to;

    const mailOptions = {
      from,
      to: toFormatted,
      subject,
      html,
    };

    console.log(`[Mailer] Sending SMTP mail from <${from}> to <${toFormatted}> with subject: "${subject}"`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Email sent successfully. Message ID: ${info.messageId}`);
    return { data: info, error: null };
  } catch (error) {
    console.error('[Mailer] SMTP Send Failure:', error);
    
    // Add specific checks for common SMTP issues
    if (error.code === 'EAUTH' || error.message.includes('authentication') || error.responseCode === 535) {
      console.error('[Mailer] SMTP Authentication Failure. Please verify SMTP_USER and SMTP_PASS credentials.');
    }
    
    return { data: null, error };
  }
}

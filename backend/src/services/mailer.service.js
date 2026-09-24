import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

const enabled = () =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

function getTransporter() {
  if (!enabled()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Email is best-effort: when SMTP is not configured we log instead so the
 * alert still exists in the database and in server logs.
 */
export async function sendMail({ to, subject, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.log(`[mail:skipped] to=${to} subject="${subject}"`);
    return { sent: false, reason: 'smtp-not-configured' };
  }
  try {
    await tx.sendMail({ from: env.smtp.from, to, subject, text });
    return { sent: true };
  } catch (err) {
    console.error('[mail:error]', err.message);
    return { sent: false, reason: err.message };
  }
}

export default { sendMail };

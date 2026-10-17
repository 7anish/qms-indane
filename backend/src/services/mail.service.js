const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { mail } = require('../config/env');
const ApiError = require('../utils/ApiError');

/*
 * MAIL_MODE=smtp: delivered through the SMTP_* settings (one pooled, authenticated connection).
 * MAIL_MODE=mock: nothing is delivered. The complete email (headers, body and attachments)
 *   is written as a .eml file to backend/outbox/ so it can be opened in any mail client to check it.
 */

const OUTBOX_DIR = path.resolve(__dirname, '../../outbox');
const MOCK_FROM = 'QMS <no-reply@qms.local>';

let smtpTransport;
let mockTransport;

const isMock = () => mail.mode !== 'smtp';

// Mock mode is always "configured"; SMTP mode needs a host, login and sender
const isMailConfigured = () => isMock() || Boolean(mail.host && mail.user && mail.pass && mail.from);

const getSmtpTransport = () => {
  if (!isMailConfigured()) {
    throw new ApiError(
      503,
      'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in backend/.env and restart the server.'
    );
  }
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user: mail.user, pass: mail.pass },
      // Reuse one connection for the separate per-recipient emails of a quotation
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      // Fail fast instead of leaving the request hanging if the mail server is unreachable
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    });
  }
  return smtpTransport;
};

// Turn low-level SMTP errors into messages an admin can act on
const describeSmtpError = (err) => {
  if (err.code === 'EAUTH' || err.responseCode === 535) {
    return 'the mail server rejected the login. Check SMTP_USER and SMTP_PASS in backend/.env';
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(err.code)) {
    return `could not connect to ${mail.host}:${mail.port}. Check SMTP_HOST/SMTP_PORT/SMTP_SECURE and the internet connection`;
  }
  if (err.code === 'EENVELOPE' || (err.responseCode >= 550 && err.responseCode < 560)) {
    return `the mail server refused a recipient address (${err.response || err.message})`;
  }
  if (err.responseCode === 552 || /size/i.test(err.message)) {
    return 'the email is too large for the mail server';
  }
  return err.message;
};

const sendMock = async (message) => {
  if (!mockTransport) mockTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  const info = await mockTransport.sendMail({ from: mail.from || MOCK_FROM, ...message });

  await fs.promises.mkdir(OUTBOX_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${stamp}-${crypto.randomBytes(3).toString('hex')}.eml`;
  await fs.promises.writeFile(path.join(OUTBOX_DIR, fileName), info.message);

  console.log(`[mail:mock] "${message.subject}" -> ${[].concat(message.to).join(', ')} (saved outbox/${fileName})`);
  return {
    messageId: info.messageId,
    accepted: [].concat(message.to, message.cc || [], message.bcc || []),
    rejected: [],
    mode: 'mock',
    outboxFile: fileName,
  };
};

/**
 * @param {{ to: string|string[], cc?: string[], bcc?: string[], subject: string, text: string, html: string, attachments?: object[] }} message
 */
const sendMail = async (message) => {
  if (isMock()) return sendMock(message);
  try {
    const info = await getSmtpTransport().sendMail({ from: mail.from, ...message });
    console.log(`[mail:smtp] "${message.subject}" -> ${[].concat(message.to).join(', ')} (${info.messageId})`);
    return { messageId: info.messageId, accepted: info.accepted || [], rejected: info.rejected || [], mode: 'smtp' };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[mail:smtp] send failed:', err.code || '', err.message);
    throw new ApiError(502, `Email could not be sent: ${describeSmtpError(err)}`);
  }
};

// Called on startup: logs whether the SMTP login works (never throws, never sends anything)
const verifyMailConfig = async () => {
  if (isMock()) {
    console.log('[mail] MAIL_MODE=mock - emails are saved to backend/outbox, not delivered');
    return;
  }
  if (!isMailConfigured()) {
    console.warn('[mail] MAIL_MODE=smtp but SMTP settings are incomplete - sending will fail');
    return;
  }
  try {
    await getSmtpTransport().verify();
    console.log(`[mail] SMTP ready: ${mail.user} via ${mail.host}:${mail.port}`);
  } catch (err) {
    console.warn(`[mail] SMTP check failed: ${describeSmtpError(err)}`);
  }
};

module.exports = { sendMail, isMailConfigured, isMock, verifyMailConfig };

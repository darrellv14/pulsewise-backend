const { MailtrapClient } = require('mailtrap');
const env = require('../config/env');

function getClient() {
  if (!env.mailtrap.token) {
    return null;
  }

  return new MailtrapClient({
    token: env.mailtrap.token,
  });
}

async function sendOtpEmail({ toEmail, otpCode, expiresInMinutes }) {
  const client = getClient();
  if (!client) {
    const error = new Error('Mailtrap belum dikonfigurasi');
    error.statusCode = 501;
    throw error;
  }

  const sender = {
    email: env.mailtrap.senderEmail,
    name: env.mailtrap.senderName,
  };

  await client.send({
    from: sender,
    to: [{ email: toEmail }],
    subject: 'PulseWise - Kode Verifikasi OTP',
    text: `Kode OTP Anda adalah ${otpCode}. Berlaku selama ${expiresInMinutes} menit.`,
    category: 'OTP Verification',
  });
}

module.exports = {
  sendOtpEmail,
};

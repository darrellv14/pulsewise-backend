const { MailtrapClient } = require('mailtrap');
const env = require('../config/env');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOtpEmailHtml({ otpCode, expiresInMinutes }) {
  const safeOtpCode = escapeHtml(otpCode);
  const safeExpiry = escapeHtml(expiresInMinutes);
  const brandName = escapeHtml(env.mailtrap.senderName || 'Pulse Wise');
  const currentYear = new Date().getFullYear();

  const logoUrl =
    'https://res.cloudinary.com/drvu0dpry/image/upload/v1776686768/Group_9_1_vduwxy.png';

  return `
  <!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
      <title>${brandName} - Verifikasi OTP</title>
      <style>
        :root {
          color-scheme: light only;
        }
        @media (prefers-color-scheme: dark) {
          body, .body-table, .content-table, .main-cell {
            background-color: #FDF7F8 !important;
            color: #3B4A54 !important;
          }
          .content-table, .inner-cell {
            background-color: #FFFFFF !important;
          }
          .header-cell {
            background-color: #F99B9F !important;
          }
          h2 { color: #1A202C !important; }
          p { color: #4A5568 !important; }
          .otp-container {
            background-color: #FFF0F2 !important;
            border-color: #F99B9F !important;
          }
          .otp-label, .otp-value {
            color: #E13D5A !important;
          }
          .info-box {
            background-color: #F8FAFC !important;
          }
          .info-text {
            color: #64748B !important;
          }
          .footer-cell {
            background-color: #FFFFFF !important;
            border-top-color: #F1F5F9 !important;
          }
          .footer-text {
            color: #94A3B8 !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FDF7F8; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #3B4A54;">
      <table class="body-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FDF7F8; padding: 40px 16px;">
        <tr>
          <td align="center" class="main-cell">
            <table class="content-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(225, 61, 90, 0.08);">
              
              <tr>
                <td class="header-cell" style="background-color: #F99B9F; padding: 32px 32px; text-align: center;">
                  <img src="${logoUrl}" alt="${brandName} Logo" width="200" style="display: inline-block; border: 0; max-width: 100%; height: auto; -ms-interpolation-mode: bicubic;">
                </td>
              </tr>

              <tr>
                <td class="inner-cell" style="padding: 40px 32px 32px 32px; background-color: #FFFFFF;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1A202C;">
                    Verifikasi Akun Anda
                  </h2>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                    Halo,<br><br>
                    Terima kasih telah menggunakan <strong>${brandName}</strong>. Untuk melanjutkan proses masuk, silakan gunakan kode verifikasi di bawah ini.
                  </p>

                  <div class="otp-container" style="background-color: #FFF0F2; border: 1px dashed #F99B9F; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
                    <div class="otp-label" style="font-size: 12px; font-weight: 600; color: #E13D5A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      KODE OTP
                    </div>
                    <div class="otp-value" style="font-size: 40px; font-weight: 700; color: #E13D5A; letter-spacing: 8px;">
                      ${safeOtpCode}
                    </div>
                  </div>

                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A5568;">
                    Kode ini hanya berlaku selama <strong>${safeExpiry} menit</strong>. Jangan bagikan kode ini kepada siapapun, termasuk pihak yang mengaku dari ${brandName}.
                  </p>

                  <div class="info-box" style="background-color: #F8FAFC; border-radius: 12px; padding: 16px;">
                    <p class="info-text" style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                      Jika Anda tidak sedang mencoba masuk ke aplikasi ${brandName}, abaikan email ini dengan aman.
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td class="footer-cell" style="padding: 24px 32px; background-color: #FFFFFF; border-top: 1px solid #F1F5F9; text-align: center;">
                  <p class="footer-text" style="margin: 0; font-size: 12px; color: #94A3B8;">
                    &copy; ${currentYear} ${brandName}. Email ini dikirim secara otomatis.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

function buildForgotPasswordEmailHtml({ otpCode, expiresInMinutes }) {
  const safeOtpCode = escapeHtml(otpCode);
  const safeExpiry = escapeHtml(expiresInMinutes);
  const brandName = escapeHtml(env.mailtrap.senderName || 'Pulse Wise');
  const currentYear = new Date().getFullYear();

  const logoUrl =
    'https://res.cloudinary.com/drvu0dpry/image/upload/v1776686768/Group_9_1_vduwxy.png';

  return `
  <!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
      <title>${brandName} - Reset Password</title>
      <style>
        :root {
          color-scheme: light only;
        }
        @media (prefers-color-scheme: dark) {
          body, .body-table, .content-table, .main-cell {
            background-color: #FDF7F8 !important;
            color: #3B4A54 !important;
          }
          .content-table, .inner-cell {
            background-color: #FFFFFF !important;
          }
          .header-cell {
            background-color: #F99B9F !important;
          }
          h2 { color: #1A202C !important; }
          p { color: #4A5568 !important; }
          .otp-container {
            background-color: #FFF0F2 !important;
            border-color: #F99B9F !important;
          }
          .otp-label, .otp-value {
            color: #E13D5A !important;
          }
          .info-box {
            background-color: #F8FAFC !important;
          }
          .info-text {
            color: #64748B !important;
          }
          .footer-cell {
            background-color: #FFFFFF !important;
            border-top-color: #F1F5F9 !important;
          }
          .footer-text {
            color: #94A3B8 !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FDF7F8; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #3B4A54;">
      <table class="body-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FDF7F8; padding: 40px 16px;">
        <tr>
          <td align="center" class="main-cell">
            <table class="content-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(225, 61, 90, 0.08);">

              <tr>
                <td class="header-cell" style="background-color: #F99B9F; padding: 32px 32px; text-align: center;">
                  <img src="${logoUrl}" alt="${brandName} Logo" width="200" style="display: inline-block; border: 0; max-width: 100%; height: auto; -ms-interpolation-mode: bicubic;">
                </td>
              </tr>

              <tr>
                <td class="inner-cell" style="padding: 40px 32px 32px 32px; background-color: #FFFFFF;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1A202C;">
                    Reset Password Anda
                  </h2>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                    Halo,<br><br>
                    Kami menerima permintaan untuk mereset password akun <strong>${brandName}</strong> Anda. Gunakan kode OTP di bawah ini untuk melanjutkan proses reset password.
                  </p>

                  <div class="otp-container" style="background-color: #FFF0F2; border: 1px dashed #F99B9F; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
                    <div class="otp-label" style="font-size: 12px; font-weight: 600; color: #E13D5A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      KODE OTP RESET PASSWORD
                    </div>
                    <div class="otp-value" style="font-size: 40px; font-weight: 700; color: #E13D5A; letter-spacing: 8px;">
                      ${safeOtpCode}
                    </div>
                  </div>

                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A5568;">
                    Kode ini hanya berlaku selama <strong>${safeExpiry} menit</strong>. Jangan bagikan kode ini kepada siapapun, termasuk pihak yang mengaku dari ${brandName}.
                  </p>

                  <div class="info-box" style="background-color: #F8FAFC; border-radius: 12px; padding: 16px;">
                    <p class="info-text" style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                      Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td class="footer-cell" style="padding: 24px 32px; background-color: #FFFFFF; border-top: 1px solid #F1F5F9; text-align: center;">
                  <p class="footer-text" style="margin: 0; font-size: 12px; color: #94A3B8;">
                    &copy; ${currentYear} ${brandName}. Email ini dikirim secara otomatis.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

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
    subject: 'Pulse Wise - Kode Verifikasi OTP',
    text: `Kode OTP Anda adalah ${otpCode}. Berlaku selama ${expiresInMinutes} menit.`,
    html: buildOtpEmailHtml({
      otpCode,
      expiresInMinutes,
    }),
    category: 'OTP Verification',
  });
}

async function sendForgotPasswordOtpEmail({ toEmail, otpCode, expiresInMinutes }) {
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
    subject: 'Pulse Wise - Kode OTP Reset Password',
    text: `Kode OTP reset password Anda adalah ${otpCode}. Berlaku selama ${expiresInMinutes} menit.`,
    html: buildForgotPasswordEmailHtml({
      otpCode,
      expiresInMinutes,
    }),
    category: 'Forgot Password OTP',
  });
}

module.exports = {
  sendOtpEmail,
  sendForgotPasswordOtpEmail,
};

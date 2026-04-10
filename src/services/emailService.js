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
  const brandName = escapeHtml(env.mailtrap.senderName || 'PulseWise');

  return `
  <!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${brandName} - Verifikasi OTP</title>
    </head>
    <body style="margin:0;padding:0;background:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#16302b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#e7f7ef 0%,#eef6f2 100%);padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #d9ece3;box-shadow:0 18px 50px rgba(7,94,70,.12);">
              <tr>
                <td style="padding:0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#00aa13 0%,#0f766e 100%);">
                    <tr>
                      <td style="padding:28px 28px 20px 28px;">
                        <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.16);font-size:11px;line-height:1;color:#ecfdf5;font-weight:700;letter-spacing:.9px;">
                          KEAMANAN AKUN
                        </div>
                        <div style="margin-top:18px;font-size:30px;line-height:1.2;color:#ffffff;font-weight:800;">
                          Verifikasi email Anda
                        </div>
                        <div style="margin-top:10px;max-width:420px;font-size:14px;line-height:1.7;color:#dcfce7;">
                          Satu langkah lagi untuk mengaktifkan akun ${brandName}. Masukkan kode OTP di bawah ini untuk melanjutkan dengan aman.
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 28px 28px 28px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);border-radius:20px;">
                          <tr>
                            <td style="padding:16px 18px;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td style="font-size:13px;line-height:1.6;color:#ecfdf5;">
                                    Kode ini bersifat rahasia dan hanya berlaku sebentar.
                                  </td>
                                  <td align="right" style="font-size:12px;line-height:1.6;color:#bbf7d0;font-weight:700;">
                                    Berlaku ${safeExpiry} menit
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 28px 12px 28px;">
                  <p style="margin:0 0 12px 0;font-size:15px;line-height:1.8;color:#36504a;">Halo,</p>
                  <p style="margin:0 0 22px 0;font-size:15px;line-height:1.8;color:#36504a;">
                    Gunakan kode OTP berikut untuk menyelesaikan verifikasi. Kami sengaja menampilkannya besar dan jelas agar mudah dibaca di desktop maupun mobile.
                  </p>
                  <div style="margin:0 0 18px 0;padding:22px 18px;border-radius:24px;background:linear-gradient(180deg,#f2fbf6 0%,#ecfdf5 100%);border:1px solid #b7e7cc;text-align:center;">
                    <div style="font-size:12px;color:#15803d;font-weight:800;letter-spacing:1.1px;">KODE OTP</div>
                    <div style="margin-top:12px;font-size:42px;line-height:1.1;color:#065f46;font-weight:800;font-family:Consolas,'Courier New',monospace;">
                      ${safeOtpCode}
                    </div>
                    <div style="margin-top:12px;font-size:13px;line-height:1.7;color:#3f635b;">
                      Jika tombol salin di aplikasi email Anda bermasalah, ketik manual persis seperti angka di atas.
                    </div>
                  </div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                    <tr>
                      <td style="padding:0 0 10px 0;">
                        <div style="padding:14px 16px;border-radius:18px;background:#f8faf9;border:1px solid #e2ece8;">
                          <div style="font-size:13px;line-height:1.7;color:#24413a;font-weight:700;">Yang perlu Anda tahu</div>
                          <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#4a635d;">
                            Kode hanya berlaku selama <strong>${safeExpiry} menit</strong> dan akan otomatis kedaluwarsa setelah itu.
                          </div>
                          <div style="margin-top:4px;font-size:13px;line-height:1.8;color:#4a635d;">
                            Demi keamanan, jangan bagikan OTP ini kepada siapa pun, termasuk pihak yang mengaku dari tim ${brandName}.
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
                    <tr>
                      <td style="padding:0 6px 8px 0;">
                        <div style="padding:12px 14px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;line-height:1.7;color:#9a3412;">
                          Buka aplikasi dan masukkan kode sebelum masa berlaku habis.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px 28px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:20px;background:#103c35;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <div style="font-size:12px;line-height:1.8;color:#a7f3d0;font-weight:700;letter-spacing:.8px;">TIDAK MERASA MEMINTA KODE INI?</div>
                        <div style="margin-top:6px;font-size:13px;line-height:1.8;color:#e6fffa;">
                          Anda bisa abaikan email ini. Akun Anda tidak akan berubah tanpa OTP tersebut.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;background:#f8fbfa;border-top:1px solid #e2ece8;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                    Email ini dikirim otomatis oleh ${brandName}. Mohon tidak membalas langsung ke email ini.
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
    subject: 'PulseWise - Kode Verifikasi OTP',
    text: `Kode OTP Anda adalah ${otpCode}. Berlaku selama ${expiresInMinutes} menit.`,
    html: buildOtpEmailHtml({
      otpCode,
      expiresInMinutes,
    }),
    category: 'OTP Verification',
  });
}

module.exports = {
  sendOtpEmail,
};

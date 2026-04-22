const nodemailer = require('nodemailer');

let transporter;

function isMailConfigured() {
  return !!(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim() &&
    process.env.MAIL_FROM?.trim()
  );
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
  });
  return transporter;
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} opts
 * @returns {Promise<{ sent: boolean; skipped?: boolean; error?: string }>}
 */
async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    return { sent: false, skipped: true };
  }
  const t = getTransporter();
  if (!t) {
    return { sent: false, skipped: true };
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM.trim(),
      to,
      subject,
      text,
      html: html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] send failed:', err?.message || err);
    return { sent: false, error: err?.message || String(err) };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Thông báo kết quả đơn xin quyền giảng viên (không throw — lỗi chỉ log).
 */
async function sendTeacherApplicationDecisionEmail({ to, displayName, action, reviewNote }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  const name = displayName?.trim() || 'Bạn';

  if (action === 'approve') {
    const studioUrl = clientUrl ? `${clientUrl}/studio` : '/studio';
    const subject = '[Cosmo Learn] Đơn xin quyền giảng viên đã được duyệt';
    const text = `Xin chào ${name},

Đơn xin quyền giảng viên của bạn đã được phê duyệt. Bạn có thể vào Studio để tạo và quản lý nội dung:
${studioUrl}

Nếu trang vẫn hiển thị vai trò cũ, hãy tải lại trang hoặc chuyển tab — phiên đăng nhập sẽ được cập nhật.

Trân trọng,
Cosmo Learn`;
    return sendMail({ to, subject, text });
  }

  const subject = '[Cosmo Learn] Đơn xin quyền giảng viên chưa được chấp nhận';
  const noteBlock = reviewNote ? `\n\nGhi chú từ ban quản trị:\n${reviewNote}` : '';
  const text = `Xin chào ${name},

Đơn xin quyền giảng viên của bạn hiện chưa được chấp nhận.${noteBlock}

Bạn có thể gửi đơn mới sau khi bổ sung thông tin tại trang xin quyền giảng viên trên ứng dụng.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

module.exports = {
  isMailConfigured,
  sendMail,
  sendTeacherApplicationDecisionEmail,
};

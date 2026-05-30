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
      pass: process.env.SMTP_PASS.trim().replace(/\s+/g, ''),
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
      from: normalizeMailFrom(process.env.MAIL_FROM) || process.env.MAIL_FROM.trim(),
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

function clientBaseUrl() {
  return (process.env.CLIENT_URL || '').replace(/\/$/, '');
}

/** Chuẩn hóa MAIL_FROM khi thiếu <> (vd. "CosmoLearn user@gmail.com"). */
function normalizeMailFrom(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/<[^>]+@[^>]+>/.test(s)) return s;
  const emailMatch = s.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    const email = emailMatch[0];
    const name = s.replace(email, '').trim() || 'Cosmo Learn';
    return `${name} <${email}>`;
  }
  return s;
}

function formatMoney(amount, currency = 'VND') {
  const n = Math.round(Number(amount) || 0);
  if (currency === 'USD') return `$${n.toLocaleString('en-US')}`;
  return `${n.toLocaleString('vi-VN')} ₫`;
}

/**
 * Mã 6 số xác nhận email khi đăng ký.
 */
async function sendEmailVerificationCode({ to, displayName, code }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const name = displayName?.trim() || 'Bạn';
  const subject = '[Cosmo Learn] Mã xác nhận đăng ký';
  const text = `Xin chào ${name},

Mã xác nhận Cosmo Learn của bạn:
${code}

Mã có hiệu lực 15 phút. Không chia sẻ mã với người khác.

Nếu bạn không đăng ký, hãy bỏ qua email này.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Chào mừng sau đăng ký tài khoản local (sau khi xác nhận email).
 */
async function sendWelcomeEmail({ to, displayName }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const base = clientBaseUrl();
  const loginUrl = base ? `${base}/login` : '/login';
  const name = displayName?.trim() || 'Bạn';
  const subject = '[Cosmo Learn] Chào mừng bạn đến Cosmo Learn';
  const text = `Xin chào ${name},

Tài khoản Cosmo Learn của bạn đã được tạo thành công.

Đăng nhập tại:
${loginUrl}

Bạn có thể khám phá khóa học, lộ trình học và cộng đồng ngay sau khi đăng nhập.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Link đặt lại mật khẩu (hết hạn sau ~1 giờ).
 */
async function sendPasswordResetEmail({ to, displayName, resetLink }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  if (!resetLink) {
    return { sent: false, skipped: true, error: 'missing_reset_link' };
  }
  const name = displayName?.trim() || 'Bạn';
  const subject = '[Cosmo Learn] Đặt lại mật khẩu';
  const text = `Xin chào ${name},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Cosmo Learn của bạn.

Nhấn link sau (có hiệu lực khoảng 1 giờ):
${resetLink}

Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu sẽ không đổi.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Hóa đơn / xác nhận thanh toán khóa học.
 */
async function sendPaymentReceiptEmail({
  to,
  displayName,
  courseTitle,
  courseSlug,
  txnRef,
  listPrice,
  discountAmount,
  amount,
  currency,
  paidAt,
  promoCode,
  cohortTitle,
  cohortInviteNote,
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const base = clientBaseUrl();
  const courseUrl = base ? `${base}/courses/${courseSlug}` : `/courses/${courseSlug}`;
  const name = displayName?.trim() || 'Bạn';
  const paidLine = paidAt
    ? new Date(paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const lines = [
    `Xin chào ${name},`,
    '',
    'Cảm ơn bạn đã thanh toán trên Cosmo Learn. Chi tiết hóa đơn:',
    '',
    `Khóa học: ${courseTitle}`,
    txnRef ? `Mã đơn: ${txnRef}` : null,
    `Thời gian: ${paidLine}`,
    listPrice != null && listPrice > amount ? `Giá gốc: ${formatMoney(listPrice, currency)}` : null,
    discountAmount > 0
      ? `Giảm giá: −${formatMoney(discountAmount, currency)}${promoCode ? ` (mã ${promoCode})` : ''}`
      : null,
    `Đã thanh toán: ${formatMoney(amount, currency)}`,
    cohortTitle ? `Lớp: ${cohortTitle}` : null,
    '',
    `Vào khóa học: ${courseUrl}`,
  ].filter(Boolean);

  if (cohortInviteNote) {
    lines.push('', cohortInviteNote);
  }

  lines.push('', 'Trân trọng,', 'Cosmo Learn');

  const subject = `[Cosmo Learn] Hóa đơn — ${courseTitle}`;
  return sendMail({ to, subject, text: lines.join('\n') });
}

/**
 * Xác nhận đã nhận đơn ứng tuyển giảng viên.
 */
async function sendTeacherApplicationReceivedEmail({ to, displayName }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const name = displayName?.trim() || 'Bạn';
  const subject = '[Cosmo Learn] Đã nhận đơn ứng tuyển giảng viên';
  const text = `Xin chào ${name},

Chúng tôi đã nhận đơn ứng tuyển giảng viên của bạn. Ban quản trị sẽ xem CV và hồ sơ, sau đó gửi email thông báo kết quả.

Bạn không cần gửi lại đơn trong lúc chờ duyệt.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Thông báo kết quả đơn xin quyền giảng viên (không throw — lỗi chỉ log).
 */
async function sendTeacherApplicationDecisionEmail({
  to,
  displayName,
  action,
  reviewNote,
  loginEmail,
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  const name = displayName?.trim() || 'Bạn';

  if (action === 'approve') {
    const studioUrl = clientUrl ? `${clientUrl}/studio` : '/studio';
    const profileUrl = clientUrl ? `${clientUrl}/profile` : '/profile';
    const subject = '[Cosmo Learn] Đơn ứng tuyển giảng viên đã được duyệt';
    const loginBlock = loginEmail
      ? `\n\nBạn đã có tài khoản — đăng nhập bằng email ${loginEmail} và mật khẩu hiện tại (hoặc Google/Facebook nếu bạn đã dùng). Không cần mật khẩu mới.`
      : '';
    const text = `Xin chào ${name},

Đơn ứng tuyển giảng viên của bạn đã được phê duyệt.${loginBlock}

Studio (soạn khóa học): ${studioUrl}
Hoàn thiện hồ sơ giáo viên (ảnh đại diện, tiểu sử): ${profileUrl}

Học viên sẽ thấy hồ sơ của bạn trên trang khóa học để xác minh giảng viên.

Nếu trang vẫn hiển thị vai trò cũ, hãy đăng xuất và đăng nhập lại.

Trân trọng,
Cosmo Learn`;
    return sendMail({ to, subject, text });
  }

  const subject = '[Cosmo Learn] Đơn xin quyền giảng viên chưa được chấp nhận';
  const noteBlock = reviewNote
    ? `\n\nLý do từ chối:\n${reviewNote}`
    : '\n\n(Vui lòng liên hệ ban quản trị nếu cần làm rõ.)';
  const text = `Xin chào ${name},

Đơn xin quyền giảng viên của bạn hiện chưa được chấp nhận.${noteBlock}

Bạn có thể gửi đơn mới sau khi bổ sung thông tin tại trang xin quyền giảng viên trên ứng dụng.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Mã lớp — chỉ qua email, không hiển thị trên app.
 */
async function sendCohortInviteEmail({
  to,
  displayName,
  courseTitle,
  courseSlug,
  cohortTitle,
  inviteCode,
  startAt,
  timezone,
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  const hubUrl = clientUrl ? `${clientUrl}/courses/${courseSlug}` : `/courses/${courseSlug}`;
  const name = displayName?.trim() || 'Bạn';
  const startLine = startAt
    ? `\nKhai giảng (theo lịch lớp): ${new Date(startAt).toLocaleString('vi-VN', { timeZone: timezone || 'Asia/Ho_Chi_Minh' })}`
    : '';
  const subject = `[Cosmo Learn] Mã lớp «${cohortTitle}» — ${courseTitle}`;
  const text = `Xin chào ${name},

Bạn đã đăng ký thành công khóa «${courseTitle}», lớp «${cohortTitle}».

Mã lớp của bạn (giữ bí mật, không chia sẻ công khai):
${inviteCode}
${startLine}

Sau khi đăng nhập Cosmo Learn, vào trang khóa học và mục «Lớp của bạn» để học:
${hubUrl}

Lưu ý: Mã lớp không hiển thị trên website vì lý do bảo mật — chỉ gửi qua email này.

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

/**
 * Thông báo tài khoản bị xóa vĩnh viễn (gửi trước khi xóa khỏi DB).
 */
async function sendAccountDeletedEmail({ to, displayName, reason }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { sent: false, skipped: true };
  }
  const name = displayName?.trim() || 'Bạn';
  const reasonText = String(reason || '').trim() || 'Không có ghi chú bổ sung.';
  const subject = '[Cosmo Learn] Tài khoản đã bị xóa vĩnh viễn';
  const text = `Xin chào ${name},

Tài khoản Cosmo Learn liên kết với email này đã được quản trị viên xóa vĩnh viễn khỏi hệ thống.

Lý do:
${reasonText}

Hành động này không thể hoàn tác. Dữ liệu học tập, ghi danh khóa và nội dung liên quan trên nền tảng đã được gỡ theo chính sách của Cosmo Learn.

Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ đội ngũ Cosmo Learn qua kênh hỗ trợ chính thức (phản hồi kèm email tài khoản và thời điểm nhận thư này).

Trân trọng,
Cosmo Learn`;
  return sendMail({ to, subject, text });
}

module.exports = {
  isMailConfigured,
  sendMail,
  sendEmailVerificationCode,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentReceiptEmail,
  sendTeacherApplicationReceivedEmail,
  sendTeacherApplicationDecisionEmail,
  sendCohortInviteEmail,
  sendAccountDeletedEmail,
};

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'course_purchase',
        'enrollment',
        'cohort_enrollment',
        'cohort_invite_email',
        'enrollment_revoked',
        'assignment_submitted',
        'assignment_graded',
        'promo',
        'system',
        'teacher_application',
        'community_comment',
        'community_reply',
        'moderation_warning',
        'admin_broadcast',
        'community_post_upvote',
        'community_comment_upvote',
      ],
      default: 'system',
      index: true,
    },
    titleVi: { type: String, required: true },
    bodyVi: { type: String, default: '' },
    href: { type: String, default: null },
    readAt: { type: Date, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

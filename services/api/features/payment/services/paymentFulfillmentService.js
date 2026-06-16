const mongoose = require('mongoose');

const Order = require('../models/Order');
const Course = require('../../courses/models/Course');
const Enrollment = require('../../courses/models/Enrollment');
const { burnCommittedGemsForOrder } = require('./courseCheckoutService');
const { recordPromoRedemption } = require('../../promotions/services/promoCodeService');
const {
  notifyCoursePurchase,
  pushNotificationRealtime,
} = require('../../notifications/services/notificationService');
const Cohort = require('../../courses/models/Cohort');
const User = require('../../auth/models/User');
const { placeStudentInCohort } = require('../../courses/services/cohortEnrollmentService');
const { sendPaymentReceiptEmail } = require('../../../shared/mailer');
const { cancelOtherPendingOrders } = require('../lib/orderPurchaseGuard');

async function completeOrderAndEnroll({ txnRef, transactionId }) {
  const session = await mongoose.startSession();

  try {
    let result = null;
    let purchaseNotification = null;
    let receiptContext = null;
    await session.withTransaction(async () => {
      const order = await Order.findOne({ txnRef }).session(session);
      if (!order) {
        const err = new Error('Khong tim thay don hang');
        err.code = 'ORDER_NOT_FOUND';
        throw err;
      }

      const course = await Course.findOne({ _id: order.courseId, published: true }).session(session);
      if (!course) {
        const err = new Error('Khong tim thay khoa hoc');
        err.code = 'COURSE_NOT_FOUND';
        throw err;
      }

      let enrollment = await Enrollment.findOne({
        userId: order.userId,
        courseId: course._id,
      }).session(session);

      if (!enrollment) {
        const progress = (course.lessons || []).map((lesson) => ({
          lessonSlug: lesson.slug,
          completed: false,
          completedAt: null,
        }));

        enrollment = await Enrollment.create(
          [
            {
              userId: order.userId,
              courseId: course._id,
              progress,
            },
          ],
          { session },
        ).then((docs) => docs[0]);
      }

      const completingNow = order.status !== 'completed';
      if (completingNow) {
        if ((order.gemsCommitted || 0) > 0 && !order.gemsBurnedAt) {
          await burnCommittedGemsForOrder(order, session);
          order.gemsBurnedAt = new Date();
        }
        if (order.discountSource === 'promo' && order.promoCodeId) {
          await recordPromoRedemption(
            {
              promoCodeId: order.promoCodeId,
              code: order.promoCode,
              userId: order.userId,
              courseId: String(course._id),
              orderId: String(order._id),
              txnRef: order.txnRef,
              discountAmount: order.discountAmount,
            },
            session,
          );
        }
        order.status = 'completed';
        order.transactionId = transactionId;
        order.paidAt = new Date();
        await order.save({ session });
        purchaseNotification = await notifyCoursePurchase(
          {
            userId: order.userId,
            courseTitle: course.title,
            courseSlug: order.courseSlug,
            txnRef: order.txnRef,
            amount: order.amount,
            currency: order.currency,
          },
          { session, deferRealtime: true },
        );
      }

      let cohortPlacement = null;
      let cohortDoc = null;
      if (order.cohortId) {
        cohortDoc = await Cohort.findById(order.cohortId).session(session);
        if (cohortDoc && cohortDoc.status === 'open') {
          cohortPlacement = await placeStudentInCohort({
            userId: order.userId,
            course,
            cohort: cohortDoc,
            session,
          });
        }
      }

      if (completingNow) {
        receiptContext = {
          order,
          course,
          cohortTitle: cohortDoc?.title || null,
          cohortEmailSent: cohortPlacement?.emailSent || false,
        };
      }

      result = {
        orderId: String(order._id),
        courseSlug: order.courseSlug,
        enrollmentId: String(enrollment._id),
        cohortId: cohortPlacement?.cohortId || null,
        cohortEmailSent: cohortPlacement?.emailSent || false,
      };
    });

    if (purchaseNotification) {
      pushNotificationRealtime(purchaseNotification);
    }

    if (receiptContext?.order && !receiptContext.order.cohortId) {
      await cancelOtherPendingOrders({
        userId: receiptContext.order.userId,
        courseId: receiptContext.order.courseId,
        cohortId: null,
        exceptTxnRef: receiptContext.order.txnRef,
      });
    }

    if (receiptContext) {
      const buyer = await User.findById(receiptContext.order.userId)
        .select('email displayName')
        .lean();
      if (buyer?.email) {
        let cohortInviteNote = null;
        if (receiptContext.cohortTitle) {
          cohortInviteNote = receiptContext.cohortEmailSent
            ? `Lớp «${receiptContext.cohortTitle}»: email xác nhận đăng ký đã gửi (nếu SMTP đã cấu hình).`
            : `Lớp «${receiptContext.cohortTitle}»: kiểm tra thông báo trên app hoặc liên hệ giáo viên nếu chưa nhận mã qua email.`;
        }
        void sendPaymentReceiptEmail({
          to: buyer.email,
          displayName: buyer.displayName,
          courseTitle: receiptContext.course.title,
          courseSlug: receiptContext.order.courseSlug,
          txnRef: receiptContext.order.txnRef,
          listPrice: receiptContext.order.listPrice,
          discountAmount: receiptContext.order.discountAmount,
          amount: receiptContext.order.amount,
          currency: receiptContext.order.currency,
          paidAt: receiptContext.order.paidAt,
          promoCode: receiptContext.order.promoCode,
          cohortTitle: receiptContext.cohortTitle,
          cohortInviteNote,
        }).catch((e) => {
          console.error('[payment] receipt email:', e?.message || e);
        });
      }
    }

    return { success: true, ...result };
  } finally {
    await session.endSession();
  }
}

module.exports = { completeOrderAndEnroll };

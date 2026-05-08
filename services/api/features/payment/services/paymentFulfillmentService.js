const mongoose = require('mongoose');

const Order = require('../models/Order');
const Course = require('../../courses/models/Course');
const Enrollment = require('../../courses/models/Enrollment');

async function completeOrderAndEnroll({ txnRef, transactionId }) {
  const session = await mongoose.startSession();

  try {
    let result = null;
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

      if (order.status !== 'completed') {
        order.status = 'completed';
        order.transactionId = transactionId;
        order.paidAt = new Date();
        await order.save({ session });
      }

      result = {
        orderId: String(order._id),
        courseSlug: order.courseSlug,
        enrollmentId: String(enrollment._id),
      };
    });

    return { success: true, ...result };
  } finally {
    await session.endSession();
  }
}

module.exports = { completeOrderAndEnroll };

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { validateApiEnv } = require('./config/env');
const { bootstrapCoreData } = require('./bootstrap/seedCoreData');
const { errorMiddleware } = require('./shared/errors');
const { requestContextMiddleware } = require('./shared/requestContext');
const { applyPlatformSecurity, securityAuditMiddleware } = require('./shared/security');
const authRouter = require('./features/auth');
const { coursesRouter, tutorialsRouter } = require('./features/courses');
const { learningPathRouter } = require('./features/learning-path');
const { conceptsRouter } = require('./features/concepts');
const {
  showcaseEntitiesRouter,
  showcaseCatalogRouter,
  showcaseOrbitsJplRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  planetNarrativeRouter,
  exploreContextualQuizRouter,
  exploreSkyTargetsRouter,
  explorePassportRouter,
} = require('./features/content3d');
const { gemsRouter, showcaseGamificationRouter } = require('./features/rewards');
const paymentRouter = require('./features/payment');
const promotionsRouter = require('./features/promotions');
const notificationsRouter = require('./features/notifications');
const usersRouter = require('./features/users');
const messagesRouter = require('./features/messages');
const { forumsRouter, postsRouter, commentsRouter, newsRouter, communityRouter } = require('./features/community');
const { bootstrapCommunityForums } = require('./features/community/services/forumBootstrapService');
const { startNewsCrawlScheduler } = require('./features/community/jobs/newsCrawlScheduler');
const { startOrderMaintenanceScheduler } = require('./features/payment/jobs/orderMaintenanceScheduler');
const mediaRouter = require('./features/media');
const adminRouter = require('./features/admin');
const { agentRouter } = require('./features/agent');
const { learningStateRouter } = require('./features/learning-state');
const { onboardingRouter } = require('./features/onboarding');
const { astronomyCalendarRouter } = require('./features/astronomy-calendar');
const { startAstronomyReminderScheduler } = require('./features/astronomy-calendar/jobs/reminderScheduler');
const { ensurePublishedSeed } = require('./features/astronomy-calendar/services/astronomyCalendarService');
const { attachNotificationWebSocket, WS_PATH } = require('./features/notifications/ws/attachNotificationWs');
const { isMailConfigured, getMailTransport, verifySmtpConnection } = require('./shared/mailer');
const { hasS3 } = require('./features/media/uploadStorage');

const env = validateApiEnv();
const app = express();
const PORT = env.port;
const corsOrigin = env.clientUrl;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
applyPlatformSecurity(app);
app.use(express.json({ limit: '10mb' }));
app.use(requestContextMiddleware);
app.use(securityAuditMiddleware);

// Feature routes (one API, feature-based structure for clear Git/module boundaries)
app.use('/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/tutorials', tutorialsRouter);
app.use('/api/learning-path', learningPathRouter);
app.use('/api/concepts', conceptsRouter);
app.use('/api/showcase-entities', showcaseEntitiesRouter);
app.use('/api/showcase-catalog', showcaseCatalogRouter);
app.use('/api/showcase-orbits', showcaseOrbitsJplRouter);
app.use('/api/explore/contextual-quiz', exploreContextualQuizRouter);
app.use('/api/explore/sky-targets', exploreSkyTargetsRouter);
app.use('/api/explore/passport', explorePassportRouter);
app.use('/api/gems', gemsRouter);
app.use('/api/showcase', showcaseGamificationRouter);
app.use('/api/earth-history', earthHistoryRouter);
app.use('/api/planet-narratives', planetNarrativeRouter);
app.use('/api/fossils', fossilsRouter);
app.use('/api/phyla', phylaRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/forums', forumsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/news', newsRouter);
app.use('/api/community', communityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/agent', agentRouter);
app.use('/api/learning-state', learningStateRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/astronomy-calendar', astronomyCalendarRouter);
app.use(mediaRouter); // POST /upload, GET /files/*
app.use(errorMiddleware);

app.get('/health', async (req, res) => {
  const smtpConfigured = isMailConfigured();
  const mailTransport = getMailTransport();
  let smtp = { configured: smtpConfigured, transport: mailTransport };
  if (req.query.verifySmtp === '1' && smtpConfigured) {
    const verified = await verifySmtpConnection();
    smtp = {
      ...smtp,
      verified: verified.ok,
      error: verified.error || null,
      transport: verified.transport || mailTransport,
    };
  }
  res.json({
    status: 'OK',
    service: 'api',
    timestamp: new Date().toISOString(),
    smtpConfigured,
    smtp,
    s3UploadConfigured: hasS3,
  });
});

async function start() {
  await connectDB();
  await bootstrapCoreData();
  try {
    const seed = await ensurePublishedSeed();
    if (seed.seeded) {
      console.log(`[astronomy-calendar] Seeded ${seed.created} published events`);
    }
  } catch (err) {
    console.error('[astronomy-calendar] seed error:', err);
  }
  const forumBootstrap = await bootstrapCommunityForums();
  if (forumBootstrap.removedForums > 0) {
    console.log(
      `[community] Đã xóa ${forumBootstrap.removedForums} forum cũ (${forumBootstrap.removedPosts} bài)`,
    );
  }

  const server = http.createServer(app);
  attachNotificationWebSocket(server);
  startNewsCrawlScheduler({ info: (msg, meta) => console.log(msg, meta || ''), error: (msg, meta) => console.error(msg, meta || '') });
  startOrderMaintenanceScheduler({ info: (msg, meta) => console.log(msg, meta || ''), error: (msg, meta) => console.error(msg, meta || '') });
  startAstronomyReminderScheduler();

  server.listen(PORT, '0.0.0.0', () => {
    if (!isMailConfigured()) {
      console.warn(
        '[mailer] Email chưa cấu hình — xác nhận đăng ký, xóa tài khoản, mã lớp… sẽ không gửi. Thêm RESEND_API_KEY + MAIL_FROM (Render) hoặc SMTP_* vào env API.',
      );
    } else {
      const transport = getMailTransport();
      console.log('[mailer] Email env OK — transport:', transport, 'MAIL_FROM:', process.env.MAIL_FROM?.trim());
      verifySmtpConnection()
        .then((r) => {
          if (r.ok) {
            console.log(`[mailer] ${r.transport || transport} verify OK`);
            return;
          }
          console.error(
            `[mailer] ${r.transport || transport} verify FAILED:`,
            r.error || r.reason,
          );
        })
        .catch((e) => {
          console.error('[mailer] SMTP verify error:', e?.message || e);
        });
    }
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Galaxies Unified API (Modular Monolith)            ║
╠══════════════════════════════════════════════════════════════╣
║  ${env.clientUrl.padEnd(54)}║
║  (listen PORT=${PORT})                                           ║
║  ${WS_PATH.padEnd(54)}║
║  /auth          - register, login, Firebase, me, admin      ║
║  /api/courses   - courses, enroll, progress, editor           ║
║  /api/tutorials - tutorials, categories, editor               ║
║  /api/learning-path - curriculum (public + editor)            ║
║  /api/payments  - checkout-quote, checkout, confirm, orders  ║
║  /api/notifications - inbox + WebSocket push                ║
║  /api/forums    - forums, posts                               ║
║  /api/posts     - post detail, comments, vote                  ║
║  /api/news      - tin thiên văn                               ║
║  /upload        - media upload (teacher/admin)                  ║
║  /files         - static uploaded files                       ║
╚══════════════════════════════════════════════════════════════╝
  `);
  });
}

start().catch((error) => {
  console.error('Khởi động API thất bại:', error);
  process.exit(1);
});

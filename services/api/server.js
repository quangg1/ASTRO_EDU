require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { validateApiEnv } = require('./config/env');
const { bootstrapCoreData } = require('./bootstrap/seedCoreData');
const { errorMiddleware } = require('./shared/errors');
const { requestContextMiddleware } = require('./shared/requestContext');
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
} = require('./features/content3d');
const { gemsRouter, showcaseGamificationRouter } = require('./features/rewards');
const paymentRouter = require('./features/payment');
const promotionsRouter = require('./features/promotions');
const notificationsRouter = require('./features/notifications');
const usersRouter = require('./features/users');
const { forumsRouter, postsRouter, commentsRouter, newsRouter, communityRouter } = require('./features/community');
const { bootstrapCommunityForums } = require('./features/community/services/forumBootstrapService');
const { startNewsCrawlScheduler } = require('./features/community/jobs/newsCrawlScheduler');
const mediaRouter = require('./features/media');
const adminRouter = require('./features/admin');
const { agentRouter } = require('./features/agent');
const { attachNotificationWebSocket, WS_PATH } = require('./features/notifications/ws/attachNotificationWs');
const { isMailConfigured } = require('./shared/mailer');

const env = validateApiEnv();
const app = express();
const PORT = env.port;
const corsOrigin = env.clientUrl;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestContextMiddleware);

// Feature routes (one API, feature-based structure for clear Git/module boundaries)
app.use('/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/tutorials', tutorialsRouter);
app.use('/api/learning-path', learningPathRouter);
app.use('/api/concepts', conceptsRouter);
app.use('/api/showcase-entities', showcaseEntitiesRouter);
app.use('/api/showcase-catalog', showcaseCatalogRouter);
app.use('/api/showcase-orbits', showcaseOrbitsJplRouter);
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
app.use('/api/forums', forumsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/news', newsRouter);
app.use('/api/community', communityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/agent', agentRouter);
app.use(mediaRouter); // POST /upload, GET /files/*
app.use(errorMiddleware);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'api',
    timestamp: new Date().toISOString(),
    smtpConfigured: isMailConfigured(),
  });
});

async function start() {
  await connectDB();
  await bootstrapCoreData();
  const forumBootstrap = await bootstrapCommunityForums();
  if (forumBootstrap.removedForums > 0) {
    console.log(
      `[community] Đã xóa ${forumBootstrap.removedForums} forum cũ (${forumBootstrap.removedPosts} bài)`,
    );
  }

  const server = http.createServer(app);
  attachNotificationWebSocket(server);
  startNewsCrawlScheduler({ info: (msg, meta) => console.log(msg, meta || ''), error: (msg, meta) => console.error(msg, meta || '') });

  server.listen(PORT, '0.0.0.0', () => {
    if (!isMailConfigured()) {
      console.warn(
        '[mailer] SMTP chưa cấu hình — email (xác nhận đăng ký, xóa tài khoản, hóa đơn…) sẽ không gửi. Thêm biến vào services/api/.env',
      );
    } else {
      console.log('[mailer] SMTP đã bật (MAIL_FROM:', process.env.MAIL_FROM?.trim(), ')');
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

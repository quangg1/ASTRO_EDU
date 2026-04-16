require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { validateApiEnv } = require('./config/env');
const { bootstrapCoreData } = require('./bootstrap/seedCoreData');
const { errorMiddleware } = require('./shared/errors');
const { requestContextMiddleware } = require('./shared/requestContext');
const authRouter = require('./features/auth');
const { coursesRouter, tutorialsRouter, learningPathRouter, conceptsRouter } = require('./features/courses');
const paymentRouter = require('./features/payment');
const { forumsRouter, postsRouter, newsRouter } = require('./features/community');
const mediaRouter = require('./features/media');
const adminRouter = require('./features/admin');

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
app.use('/api/payments', paymentRouter);
app.use('/api/forums', forumsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/news', newsRouter);
app.use('/api/admin', adminRouter);
app.use(mediaRouter); // POST /upload, GET /files/*
app.use(errorMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'api', timestamp: new Date().toISOString() });
});

async function start() {
  await connectDB();
  await bootstrapCoreData();

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Galaxies Unified API (Modular Monolith)            ║
╠══════════════════════════════════════════════════════════════╣
║  http://localhost:${PORT}                                        ║
║  /auth          - register, login, Firebase, me, admin      ║
║  /api/courses   - courses, enroll, progress, editor           ║
║  /api/tutorials - tutorials, categories, editor               ║
║  /api/learning-path - curriculum (public + editor)            ║
║  /api/payments  - create, callback/vnpay, orders              ║
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

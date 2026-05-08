require('dotenv').config();
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
  narrativeSpacesRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  spaceContextRouter,
} = require('./features/content3d');
const { gemsRouter, showcaseGamificationRouter } = require('./features/rewards');
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
app.use('/api/showcase-entities', showcaseEntitiesRouter);
app.use('/api/showcase-catalog', showcaseCatalogRouter);
app.use('/api/showcase-orbits', showcaseOrbitsJplRouter);
app.use('/api/gems', gemsRouter);
app.use('/api/showcase', showcaseGamificationRouter);
app.use('/api/narrative-spaces', narrativeSpacesRouter);
app.use('/api/earth-history', earthHistoryRouter);
app.use('/api/fossils', fossilsRouter);
app.use('/api/phyla', phylaRouter);
app.use('/api/content-3d', spaceContextRouter);
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

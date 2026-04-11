require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const authRouter = require('./features/auth');
const { coursesRouter, tutorialsRouter, learningPathRouter, conceptsRouter } = require('./features/courses');
const paymentRouter = require('./features/payment');
const { forumsRouter, postsRouter, newsRouter } = require('./features/community');
const mediaRouter = require('./features/media');

const app = express();
const PORT = process.env.PORT || 3002;

connectDB();

const corsOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

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
app.use(mediaRouter); // POST /upload, GET /files/*

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'api', timestamp: new Date().toISOString() });
});

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

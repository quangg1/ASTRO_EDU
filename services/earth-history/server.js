const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const earthHistoryRoutes = require('./routes/earthHistory');
const fossilRoutes = require('./routes/fossils');
const phylaRoutes = require('./routes/phyla');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/earth-history', earthHistoryRoutes);
app.use('/api/fossils', fossilRoutes);
app.use('/api/phyla', phylaRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     Earth History Simulator Server         ║
╠════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}  ║
║  API endpoint: /api/earth-history          ║
╚════════════════════════════════════════════╝
    `);
});

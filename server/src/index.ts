import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import progressRoutes from './routes/progress.js';
import activityRoutes from './routes/activity.js';
import { initSocket } from './services/socketService.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 4000;
const FRONTEND_URL = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(
  /\/+$/,
  '',
);

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/activity', activityRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io
initSocket(httpServer, FRONTEND_URL);

// Connect to MongoDB and start server
async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placementsync';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

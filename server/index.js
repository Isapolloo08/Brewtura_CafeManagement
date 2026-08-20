import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import gmailRoutes from './routes/gmailRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { attachSocket } from './services/socketService.js';
import { startAutoPolling } from './services/gmailService.js';
import { startSmsPolling } from './services/smsService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/gmail', gmailRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/reports', reportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large', details: 'Uploaded file or data exceeds the size limit. Please use a smaller image (under 10MB).' });
  }
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const httpServer = http.createServer(app);
attachSocket(httpServer);
httpServer.listen(PORT, () => {
  console.log(`☕ Coffee Shop REST API Server running on port ${PORT}`);
  console.log(`⚡ WebSocket (Socket.IO) server listening on port ${PORT}`);
  startAutoPolling();
  startSmsPolling();
});

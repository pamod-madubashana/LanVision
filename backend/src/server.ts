import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';
import logger from './utils/logger';
import apiRoutes from './routes/index';
import { initializeDefaultAdmin } from './utils/initializeAdmin';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
));

// Request logging
// app.use((req, res, next) => {
//   logger.info(`${req.method} ${req.path}`, {
//     ip: req.ip,
//     userAgent: req.get('User-Agent')
//   });
//   next();
// });

// API Routes
app.use('/api', apiRoutes);

// Legacy health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Network Scanner Dashboard API is running',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || '');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  // Initialize default admin user if database is empty
  await initializeDefaultAdmin();
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Public scan override: ${process.env.ADMIN_ALLOW_PUBLIC_SCAN}`);
  });
};

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'staging' 
  ? '.env.staging' 
  : '.env.development';

dotenv.config({ path: path.join(__dirname, envFile) });

// Fallback environment variables for development
if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
  process.env.PORT = process.env.PORT || '5000';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/twitter-scheduler-dev';
  process.env.JWT_SECRET = 'dev_jwt_secret_key_12345_development_only';
  process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.LOG_LEVEL = 'debug';
  console.log('Development environment variables set (fallback)');
}

console.log('Environment Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL);

const app = express();

// Security middleware for production
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tweets', require('./routes/tweets'));
app.use('/api/analytics', require('./routes/analytics'));

// Schedule tweet posting (runs every minute) - only if enabled
if (process.env.CRON_ENABLED === 'true') {
  cron.schedule('* * * * *', () => {
    const Tweet = require('./models/Tweet');
    const now = new Date();
    
    Tweet.find({ 
      scheduledTime: { $lte: now }, 
      status: 'scheduled' 
    })
    .then(tweets => {
      if (tweets.length > 0) {
        console.log(`[${process.env.NODE_ENV}] Processing ${tweets.length} scheduled tweets`);
      }
      
      tweets.forEach(tweet => {
        // In a real app, this would post to Twitter API
        console.log(`[${process.env.NODE_ENV}] Posting tweet: ${tweet.content.substring(0, 50)}...`);
        tweet.status = 'posted';
        tweet.save();
      });
    })
    .catch(err => console.error(`[${process.env.NODE_ENV}] Error posting scheduled tweets:`, err));
  }, {
    timezone: process.env.CRON_TIMEZONE || 'UTC'
  });
  
  console.log(`[${process.env.NODE_ENV}] Cron job enabled - tweet scheduler active`);
} else {
  console.log(`[${process.env.NODE_ENV}] Cron job disabled`);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/twitter-scheduler', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log(`[${process.env.NODE_ENV}] Connected to MongoDB`);
    console.log(`[${process.env.NODE_ENV}] Database: ${process.env.MONGODB_URI?.split('/').pop()?.split('?')[0] || 'twitter-scheduler'}`);
  })
  .catch(err => {
    console.error(`[${process.env.NODE_ENV}] MongoDB connection error:`, err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${process.env.NODE_ENV}] SIGTERM received, shutting down gracefully`);
  mongoose.connection.close(() => {
    console.log(`[${process.env.NODE_ENV}] MongoDB connection closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[${process.env.NODE_ENV}] SIGINT received, shutting down gracefully`);
  mongoose.connection.close(() => {
    console.log(`[${process.env.NODE_ENV}] MongoDB connection closed`);
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[${process.env.NODE_ENV}] Server running on port ${PORT}`);
  console.log(`[${process.env.NODE_ENV}] Health check: http://localhost:${PORT}/health`);
  console.log(`[${process.env.NODE_ENV}] API base URL: http://localhost:${PORT}/api`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });


if (!process.env.PORT) {
  process.env.PORT = '5000';
  process.env.MONGODB_URI = 'mongodb+srv://shreyasingh:shreyasingh199@cluster0.xa5kt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  process.env.JWT_SECRET = 'b2acdc9628786979b9c1e4666a515da5';
  process.env.GEMINI_API_KEY = 'AIzaSyDcdAvO3PGoyegj5CFteiREG34c1EXouJ0';
  process.env.NODE_ENV = 'development';
  console.log('Environment variables set manually (fallback)');
}

console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tweets', require('./routes/tweets'));
app.use('/api/analytics', require('./routes/analytics'));

// Schedule tweet posting (runs every minute)
cron.schedule('* * * * *', () => {
  const Tweet = require('./models/Tweet');
  const now = new Date();
  
  Tweet.find({ 
    scheduledTime: { $lte: now }, 
    status: 'scheduled' 
  })
  .then(tweets => {
    tweets.forEach(tweet => {
      // In a real app, this would post to Twitter API
      console.log(`Posting tweet: ${tweet.content}`);
      tweet.status = 'posted';
      tweet.save();
    });
  })
  .catch(err => console.error('Error posting scheduled tweets:', err));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/twitter-scheduler')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

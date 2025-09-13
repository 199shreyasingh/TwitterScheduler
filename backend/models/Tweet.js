const mongoose = require('mongoose');

const tweetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 280
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'posted', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  analytics: {
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  postedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Tweet', tweetSchema);

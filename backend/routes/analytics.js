const express = require('express');
const mongoose = require('mongoose');
const Tweet = require('../models/Tweet');
const auth = require('../middleware/auth');

const router = express.Router();

// Get analytics overview
router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get total tweets
    const totalTweets = await Tweet.countDocuments({ userId });
    
    // Get scheduled tweets
    const scheduledTweets = await Tweet.countDocuments({ 
      userId, 
      status: 'scheduled' 
    });
    
    // Get posted tweets
    const postedTweets = await Tweet.countDocuments({ 
      userId, 
      status: 'posted' 
    });
    
    // Get total engagement
    const engagementData = await Tweet.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'posted' } },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$analytics.likes' },
          totalRetweets: { $sum: '$analytics.retweets' },
          totalReplies: { $sum: '$analytics.replies' },
          totalImpressions: { $sum: '$analytics.impressions' }
        }
      }
    ]);

    const engagement = engagementData[0] || {
      totalLikes: 0,
      totalRetweets: 0,
      totalReplies: 0,
      totalImpressions: 0
    };

    res.json({
      totalTweets,
      scheduledTweets,
      postedTweets,
      engagement
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get engagement trends over time
router.get('/trends', auth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const userId = req.userId;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const trends = await Tweet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'posted',
          postedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$postedAt' },
            month: { $month: '$postedAt' },
            day: { $dayOfMonth: '$postedAt' }
          },
          likes: { $sum: '$analytics.likes' },
          retweets: { $sum: '$analytics.retweets' },
          replies: { $sum: '$analytics.replies' },
          impressions: { $sum: '$analytics.impressions' },
          tweetCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json(trends);
  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top performing tweets
router.get('/top-tweets', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.userId;

    const topTweets = await Tweet.find({
      userId,
      status: 'posted'
    })
    .sort({ 'analytics.impressions': -1 })
    .limit(parseInt(limit))
    .populate('userId', 'username twitterHandle')
    .select('content analytics postedAt');

    res.json(topTweets);
  } catch (error) {
    console.error('Top tweets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posting schedule analytics
router.get('/schedule', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const scheduleData = await Tweet.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'posted' } },
      {
        $group: {
          _id: { $hour: '$postedAt' },
          count: { $sum: 1 },
          avgEngagement: { $avg: { $add: ['$analytics.likes', '$analytics.retweets', '$analytics.replies'] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json(scheduleData);
  } catch (error) {
    console.error('Schedule analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

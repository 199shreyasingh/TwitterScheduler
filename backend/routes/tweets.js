const express = require('express');
const { body, validationResult } = require('express-validator');
const Tweet = require('../models/Tweet');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

router.post('/ai-suggestions', auth, async (req, res) => {
  try {
    const { topic, tone = 'professional' } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    console.log('Gemini API Key available:', !!process.env.GEMINI_API_KEY);
    console.log('Using Gemini Pro for AI suggestions');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('No Gemini API key found, using fallback suggestions');
      // Fallback to mock suggestions if no API key
      const suggestions = [
        `Excited to share insights about ${topic}! Here's what I've learned...`,
        `Just discovered something fascinating about ${topic}. Thoughts?`,
        `The future of ${topic} looks promising. Here's why:`,
        `Quick tip about ${topic}: Always remember to...`,
        `Breaking down ${topic} in simple terms:`
      ];
      return res.json({ suggestions });
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Generate content using Gemini Pro
    const prompt = `Generate 5 creative and engaging Twitter post suggestions about "${topic}". Make them ${tone} in tone, under 280 characters each, and include hashtags where appropriate. Format each suggestion on a new line.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // Extract suggestions from Gemini Pro response
    const suggestions = content
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 280)
      .slice(0, 5); // Limit to 5 suggestions

    if (suggestions.length < 3) {
      const fallbacks = [
        `Excited to share insights about ${topic}! Here's what I've learned...`,
        `Just discovered something fascinating about ${topic}. Thoughts?`,
        `The future of ${topic} looks promising. Here's why:`
      ];
      suggestions.push(...fallbacks.slice(0, 5 - suggestions.length));
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('AI suggestions error:', error);
    
    if (error.response && (error.response.status === 429 || error.response.status === 403)) {
      console.log('Gemini Pro Rate Limit Exceeded - Using fallback suggestions');
      return res.status(429).json({ 
        message: 'Gemini Pro rate limit exceeded. Please try again in a few minutes.',
        suggestions: [
          `Excited to share insights about ${req.body.topic}! Here's what I've learned...`,
          `Just discovered something fascinating about ${req.body.topic}. Thoughts?`,
          `The future of ${req.body.topic} looks promising. Here's why:`,
          `Quick tip about ${req.body.topic}: Always remember to...`,
          `Breaking down ${req.body.topic} in simple terms:`
        ],
        fallback: true
      });
    }
    
    const { topic } = req.body;
    const suggestions = [
      `Excited to share insights about ${topic}! Here's what I've learned...`,
      `Just discovered something fascinating about ${topic}. Thoughts?`,
      `The future of ${topic} looks promising. Here's why:`,
      `Quick tip about ${topic}: Always remember to...`,
      `Breaking down ${topic} in simple terms:`
    ];
    
    res.json({ suggestions, fallback: true });
  }
});

// Create a new tweet
router.post('/', auth, [
  body('content').isLength({ min: 1, max: 280 }).withMessage('Tweet content must be between 1 and 280 characters'),
  body('scheduledTime').isISO8601().withMessage('Please provide a valid scheduled time')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, scheduledTime, aiGenerated = false } = req.body;

    const tweet = new Tweet({
      userId: req.userId,
      content,
      scheduledTime: new Date(scheduledTime),
      aiGenerated
    });

    await tweet.save();
    await tweet.populate('userId', 'username twitterHandle');

    res.status(201).json(tweet);
  } catch (error) {
    console.error('Create tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's tweets
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const tweets = await Tweet.find(query)
      .sort({ scheduledTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username twitterHandle');

    const total = await Tweet.countDocuments(query);

    res.json({
      tweets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get tweets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific tweet
router.get('/:id', auth, async (req, res) => {
  try {
    const tweet = await Tweet.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    }).populate('userId', 'username twitterHandle');

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    res.json(tweet);
  } catch (error) {
    console.error('Get tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a tweet
router.put('/:id', auth, [
  body('content').optional().isLength({ min: 1, max: 280 }).withMessage('Tweet content must be between 1 and 280 characters'),
  body('scheduledTime').optional().isISO8601().withMessage('Please provide a valid scheduled time')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tweet = await Tweet.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    if (tweet.status === 'posted') {
      return res.status(400).json({ message: 'Cannot edit posted tweets' });
    }

    const { content, scheduledTime } = req.body;
    
    if (content) tweet.content = content;
    if (scheduledTime) tweet.scheduledTime = new Date(scheduledTime);

    await tweet.save();
    await tweet.populate('userId', 'username twitterHandle');

    res.json(tweet);
  } catch (error) {
    console.error('Update tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a tweet
router.delete('/:id', auth, async (req, res) => {
  try {
    const tweet = await Tweet.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    if (tweet.status === 'posted') {
      return res.status(400).json({ message: 'Cannot delete posted tweets' });
    }

    await Tweet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tweet deleted successfully' });
  } catch (error) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

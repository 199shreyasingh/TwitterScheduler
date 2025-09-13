import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TweetScheduler = () => {
  const [formData, setFormData] = useState({
    content: '',
    scheduledTime: '',
    aiGenerated: false
  });
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isFallbackSuggestions, setIsFallbackSuggestions] = useState(false);
  const [lastAiRequest, setLastAiRequest] = useState(0);

  useEffect(() => {
    fetchTweets();
  }, []);

  const fetchTweets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/tweets', {
        headers: { 'x-auth-token': token }
      });
      setTweets(res.data.tweets);
    } catch (error) {
      console.error('Error fetching tweets:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast.error('Please enter tweet content');
      return;
    }

    if (!formData.scheduledTime) {
      toast.error('Please select a scheduled time');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/tweets', formData, {
        headers: { 'x-auth-token': token }
      });

      toast.success('Tweet scheduled successfully!');
      setFormData({ content: '', scheduledTime: '', aiGenerated: false });
      fetchTweets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule tweet');
    } finally {
      setLoading(false);
    }
  };

  const getAiSuggestions = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic for AI suggestions');
      return;
    }

    // Rate limiting: prevent requests more than once per 30 seconds
    const now = Date.now();
    if (now - lastAiRequest < 30000) {
      const remainingTime = Math.ceil((30000 - (now - lastAiRequest)) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before requesting again`);
      return;
    }

    setLastAiRequest(now);
    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/tweets/ai-suggestions', 
        { topic: aiTopic, tone: aiTone },
        { headers: { 'x-auth-token': token } }
      );
      setAiSuggestions(res.data.suggestions);
      setShowAiSuggestions(true);
      setIsFallbackSuggestions(res.data.fallback || false);
      
      if (res.data.fallback) {
        toast.warning('Using fallback suggestions (Gemini Pro rate limit exceeded)');
      } else {
        toast.success('AI suggestions generated with Gemini Pro!');
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        toast.error('Gemini Pro rate limit exceeded. Please wait a few minutes and try again.');
      } else {
        toast.error('Failed to get AI suggestions');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseSuggestion = (suggestion) => {
    setFormData({ ...formData, content: suggestion });
    setShowAiSuggestions(false);
    setAiTopic('');
  };

  const deleteTweet = async (tweetId) => {
    if (!window.confirm('Are you sure you want to delete this tweet?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/tweets/${tweetId}`, {
        headers: { 'x-auth-token': token }
      });

      toast.success('Tweet deleted successfully');
      fetchTweets();
    } catch (error) {
      toast.error('Failed to delete tweet');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Schedule Tweet</h1>
          <p className="mt-2 text-gray-600">Create and schedule your tweets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Schedule Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">New Tweet</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Tweet Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={4}
                  maxLength={280}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-twitter-blue focus:border-twitter-blue sm:text-sm"
                  placeholder="What's happening?"
                  value={formData.content}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.content.length}/280 characters
                </p>
              </div>

              <div>
                <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                  Schedule Time
                </label>
                <input
                  id="scheduledTime"
                  name="scheduledTime"
                  type="datetime-local"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-twitter-blue focus:border-twitter-blue sm:text-sm"
                  value={formData.scheduledTime}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="aiGenerated"
                  name="aiGenerated"
                  type="checkbox"
                  className="h-4 w-4 text-twitter-blue focus:ring-twitter-blue border-gray-300 rounded"
                  checked={formData.aiGenerated}
                  onChange={(e) => setFormData({ ...formData, aiGenerated: e.target.checked })}
                />
                <label htmlFor="aiGenerated" className="ml-2 block text-sm text-gray-900">
                  AI Generated Content
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-twitter-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-twitter-blue disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule Tweet'}
              </button>
            </form>

            {/* AI Suggestions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">AI Content Suggestions</h3>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter a topic..."
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-twitter-blue focus:border-twitter-blue sm:text-sm"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={getAiSuggestions}
                    disabled={aiLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-twitter-blue disabled:opacity-50"
                  >
                    {aiLoading ? 'Generating...' : 'Get Suggestions'}
                  </button>
                </div>
                <div>
                  <label htmlFor="aiTone" className="block text-sm font-medium text-gray-700 mb-1">
                    Tone
                  </label>
                  <select
                    id="aiTone"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-twitter-blue focus:border-twitter-blue sm:text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="humorous">Humorous</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </div>
              </div>

              {showAiSuggestions && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-700">AI Suggestions:</h4>
                    {isFallbackSuggestions ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⚠️ Fallback Mode
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        🤖 AI Generated
                      </span>
                    )}
                  </div>
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md border border-blue-200">
                      <p className="text-sm text-gray-900 mb-2">{suggestion}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{suggestion.length}/280 characters</span>
                        <button
                          type="button"
                          onClick={() => handleUseSuggestion(suggestion)}
                          className="text-xs text-twitter-blue hover:text-blue-700 font-medium"
                        >
                          Use this suggestion
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Tweets */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Tweets</h2>
            
            {tweets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tweets scheduled yet.</p>
            ) : (
              <div className="space-y-4">
                {tweets.map((tweet) => (
                  <div key={tweet._id} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-900 mb-2">{tweet.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {format(new Date(tweet.scheduledTime), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tweet.status === 'scheduled' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : tweet.status === 'posted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tweet.status}
                        </span>
                        {tweet.status === 'scheduled' && (
                          <button
                            onClick={() => deleteTweet(tweet._id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetScheduler;

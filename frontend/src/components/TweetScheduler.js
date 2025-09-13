import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_URL; 
// Make sure this is set in Vercel Environment Variables

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTweets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/tweets`, {
        headers: { 'x-auth-token': token }
      });
      setTweets(res.data?.tweets || []);
    } catch (error) {
      console.error('Error fetching tweets:', error.message);
      toast.error('Failed to fetch tweets');
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
      await axios.post(`${API_BASE_URL}/api/tweets`, formData, {
        headers: { 'x-auth-token': token }
      });

      toast.success('Tweet scheduled successfully!');
      setFormData({ content: '', scheduledTime: '', aiGenerated: false });
      fetchTweets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule tweet');
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
      const res = await axios.post(
        `${API_BASE_URL}/api/tweets/ai-suggestions`,
        { topic: aiTopic, tone: aiTone },
        { headers: { 'x-auth-token': token } }
      );
      setAiSuggestions(res.data?.suggestions || []);
      setShowAiSuggestions(true);
      setIsFallbackSuggestions(res.data?.fallback || false);

      if (res.data?.fallback) {
        toast.warning('Using fallback suggestions (Gemini Pro rate limit exceeded)');
      } else {
        toast.success('AI suggestions generated!');
      }
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Gemini Pro rate limit exceeded. Please wait a few minutes and try again.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to get AI suggestions');
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
      await axios.delete(`${API_BASE_URL}/api/tweets/${tweetId}`, {
        headers: { 'x-auth-token': token }
      });

      toast.success('Tweet deleted successfully');
      fetchTweets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete tweet');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* UI unchanged */}
        {/* ... */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form on left */}
          {/* Scheduled tweets on right */}
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
                        {tweet.scheduledTime
                          ? format(new Date(tweet.scheduledTime), 'MMM dd, yyyy HH:mm')
                          : 'No time set'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tweet.status === 'scheduled'
                              ? 'bg-yellow-100 text-yellow-800'
                              : tweet.status === 'posted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tweet.status || 'unknown'}
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

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");
const path = require("path");

// Load environment file depending on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.development";

dotenv.config({ path: path.join(__dirname, envFile) });

// ✅ Fallback for missing env variables
if (!process.env.PORT) {
  process.env.PORT = "5000";
  process.env.MONGODB_URI = "mongodb://localhost:27017/twitter-scheduler-dev";
  process.env.JWT_SECRET = "dev_fallback_secret_key";
  process.env.GEMINI_API_KEY = "your_gemini_api_key_here";
  process.env.NODE_ENV = "development";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  console.log("⚠️ Environment variables set manually (fallback)");
}

// Debug logs
console.log("============================");
console.log("🌍 Environment variables loaded:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Not set");
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN || "Not set");
console.log("============================");

const app = express();

// ✅ CORS setup (allow OPTIONS preflight)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight OPTIONS requests globally
app.options("*", cors());

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tweets", require("./routes/tweets"));
app.use("/api/analytics", require("./routes/analytics"));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});


// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Schedule tweet posting (runs every minute)
cron.schedule("* * * * *", () => {
  const Tweet = require("./models/Tweet");
  const now = new Date();

  Tweet.find({ scheduledTime: { $lte: now }, status: "scheduled" })
    .then((tweets) => {
      if (tweets.length > 0) {
        console.log(
          `[${process.env.NODE_ENV}] Processing ${tweets.length} scheduled tweets`
        );
      }
      tweets.forEach((tweet) => {
        // In a real app, this would post to Twitter API
        console.log(`Posting tweet: ${tweet.content}`);
        tweet.status = "posted";
        tweet.save();
      });
    })
    .catch((err) => console.error("Error posting scheduled tweets:", err));
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`[${process.env.NODE_ENV}] ✅ Connected to MongoDB`);
  })
  .catch((err) => {
    console.error(`[${process.env.NODE_ENV}] ❌ MongoDB connection error:`, err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[${process.env.NODE_ENV}] 🚀 Server running on port ${PORT}`);
  console.log(
    `[${process.env.NODE_ENV}] Health check: http://localhost:${PORT}/health`
  );
});

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token =
    req.header("x-auth-token") ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    console.warn(`[AUTH] No token provided for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_fallback_secret_key"
    );
    req.userId = decoded.userId;

    console.log(`[AUTH] ✅ Token verified for userId: ${req.userId}`);
    next();
  } catch (error) {
    console.error(`[AUTH] ❌ Invalid token on ${req.method} ${req.originalUrl}`, error.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

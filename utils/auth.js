// ======================================================
// auth.js — Authentication Middleware
// Simple token-based auth using Base64 encoding
// Token format: base64("role:username")
// ======================================================

/**
 * Create an auth token from role and username
 * @param {string} role - 'user' or 'shopkeeper'
 * @param {string} username - The username
 * @returns {string} - Base64 encoded token
 */
function createToken(role, username) {
  return Buffer.from(`${role}:${username}`).toString('base64');
}

/**
 * Decode a token back to role and username
 * @param {string} token - Base64 encoded token
 * @returns {object|null} - { role, username } or null if invalid
 */
function decodeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [role, username] = decoded.split(':');
    if (role && username) return { role, username };
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Authenticate any logged-in user
 * Reads the Authorization header: "Bearer <token>"
 * Attaches req.user = { role, username }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in first.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = decodeToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }

  // Attach user info to the request
  req.user = decoded;
  next();
}

/**
 * Middleware: Allow only shopkeepers
 * Must be used AFTER authenticate
 */
function shopkeeperOnly(req, res, next) {
  if (req.user.role !== 'shopkeeper') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Shopkeeper privileges required.'
    });
  }
  next();
}

/**
 * Middleware: Allow only users
 * Must be used AFTER authenticate
 */
function userOnly(req, res, next) {
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User account required.'
    });
  }
  next();
}

module.exports = { createToken, decodeToken, authenticate, shopkeeperOnly, userOnly };

// ======================================================
// authController.js — Register & Login Logic
// Handles both User and Shopkeeper auth
// ======================================================

const store = require('../models/jsonStore');
const { createToken } = require('../utils/auth');

/**
 * POST /api/auth/register
 * Body: { name, username, password, role }
 * role = 'user' or 'shopkeeper'
 */
function register(req, res) {
  const { name, username, password, role } = req.body;

  // Validate all fields
  if (!name || !username || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, username, password, and role'
    });
  }

  // Validate role
  if (role !== 'user' && role !== 'shopkeeper') {
    return res.status(400).json({
      success: false,
      message: 'Role must be "user" or "shopkeeper"'
    });
  }

  // Validate lengths
  if (username.length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  // Choose the correct JSON file based on role
  const filename = role === 'user' ? 'users.json' : 'shopkeepers.json';
  const prefix = role === 'user' ? 'USR' : 'SHOP';

  const data = store.readData(filename);

  // Check if username already exists
  if (data.find(u => u.username === username)) {
    return res.status(409).json({
      success: false,
      message: 'Username already taken. Try a different one.'
    });
  }

  // Create new account
  const newAccount = {
    id: store.getNextId(filename, prefix),
    name,
    username,
    password,
    createdAt: new Date().toISOString()
  };

  data.push(newAccount);
  store.writeData(filename, data);

  res.status(201).json({
    success: true,
    message: `${role === 'user' ? 'User' : 'Shopkeeper'} account created! Please sign in.`,
    account: { id: newAccount.id, name, username, role }
  });
}

/**
 * POST /api/auth/login
 * Body: { username, password, role }
 * Returns: token + user info
 */
function login(req, res) {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Please provide username, password, and role'
    });
  }

  // Choose the correct JSON file
  const filename = role === 'user' ? 'users.json' : 'shopkeepers.json';
  const data = store.readData(filename);

  // Find the user
  const account = data.find(u => u.username === username && u.password === password);

  if (!account) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }

  // Create auth token
  const token = createToken(role, username);

  res.json({
    success: true,
    message: `Welcome back, ${account.name}!`,
    token,
    user: {
      id: account.id,
      name: account.name,
      username: account.username,
      role
    }
  });
}

module.exports = { register, login };

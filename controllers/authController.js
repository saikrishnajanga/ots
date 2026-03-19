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
async function register(req, res) {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Please provide name, username, password, and role' });
  }
  if (role !== 'user' && role !== 'shopkeeper') {
    return res.status(400).json({ success: false, message: 'Role must be "user" or "shopkeeper"' });
  }
  if (username.length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  const filename = role === 'user' ? 'users.json' : 'shopkeepers.json';
  const prefix = role === 'user' ? 'USR' : 'SHOP';
  const data = await store.readData(filename);

  if (data.find(u => u.username === username)) {
    return res.status(409).json({ success: false, message: 'Username already taken. Try a different one.' });
  }

  const newAccount = {
    id: await store.getNextId(filename, prefix),
    name, username, password,
    createdAt: new Date().toISOString()
  };

  data.push(newAccount);
  await store.writeData(filename, data);

  res.status(201).json({
    success: true,
    message: `${role === 'user' ? 'User' : 'Shopkeeper'} account created! Please sign in.`,
    account: { id: newAccount.id, name, username, role }
  });
}

/**
 * POST /api/auth/login
 * Body: { username, password, role }
 */
async function login(req, res) {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Please provide username, password, and role' });
  }

  const filename = role === 'user' ? 'users.json' : 'shopkeepers.json';
  const data = await store.readData(filename);
  const account = data.find(u => u.username === username && u.password === password);

  if (!account) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  const token = createToken(role, username);

  res.json({
    success: true,
    message: `Welcome back, ${account.name}!`,
    token,
    user: { id: account.id, name: account.name, username: account.username, role }
  });
}

module.exports = { register, login };

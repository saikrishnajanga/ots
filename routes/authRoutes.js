// authRoutes.js — Authentication Routes
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — Register a new user or shopkeeper
router.post('/register', register);

// POST /api/auth/login — Login and get auth token
router.post('/login', login);

module.exports = router;

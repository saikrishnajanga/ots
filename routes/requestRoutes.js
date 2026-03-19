// requestRoutes.js — Product Request Routes
const express = require('express');
const router = express.Router();
const { authenticate, shopkeeperOnly, userOnly } = require('../utils/auth');
const { createRequest, getRequests, updateRequest } = require('../controllers/requestController');

// POST /api/requests — User only, request a product
router.post('/', authenticate, userOnly, createRequest);

// GET /api/requests — Authenticated, role-based
router.get('/', authenticate, getRequests);

// PUT /api/requests/:id — Shopkeeper only, approve/reject
router.put('/:id', authenticate, shopkeeperOnly, updateRequest);

module.exports = router;

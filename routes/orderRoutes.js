// orderRoutes.js — Order Routes
const express = require('express');
const router = express.Router();
const { authenticate, shopkeeperOnly, userOnly } = require('../utils/auth');
const { placeOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');

// POST /api/orders — User only, place an order
router.post('/', authenticate, userOnly, placeOrder);

// GET /api/orders — Authenticated, role-based view
router.get('/', authenticate, getOrders);

// PUT /api/orders/:id/status — Shopkeeper only, update status
router.put('/:id/status', authenticate, shopkeeperOnly, updateOrderStatus);

module.exports = router;

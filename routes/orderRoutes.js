// orderRoutes.js — Order Routes
const express = require('express');
const router = express.Router();
const { authenticate, shopkeeperOnly, userOnly } = require('../utils/auth');
const { placeOrder, getOrders, updateOrderStatus, deleteOrder } = require('../controllers/orderController');

// POST /api/orders — User only, place an order
router.post('/', authenticate, userOnly, placeOrder);

// GET /api/orders — Authenticated, role-based view
router.get('/', authenticate, getOrders);

// PUT /api/orders/:id/status — Shopkeeper only, update status
router.put('/:id/status', authenticate, shopkeeperOnly, updateOrderStatus);

// DELETE /api/orders/:id — Shopkeeper only, delete order
router.delete('/:id', authenticate, shopkeeperOnly, deleteOrder);

module.exports = router;

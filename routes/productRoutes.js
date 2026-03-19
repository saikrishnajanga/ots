// productRoutes.js — Product Routes
const express = require('express');
const router = express.Router();
const { authenticate, shopkeeperOnly } = require('../utils/auth');
const { getAllProducts, getProduct, addProduct, updateProduct, deleteProduct } = require('../controllers/productController');

// GET /api/products — Public, list all products
router.get('/', getAllProducts);

// GET /api/products/:id — Public, get single product
router.get('/:id', getProduct);

// POST /api/products — Shopkeeper only, add product
router.post('/', authenticate, shopkeeperOnly, addProduct);

// PUT /api/products/:id — Shopkeeper only, update product
router.put('/:id', authenticate, shopkeeperOnly, updateProduct);

// DELETE /api/products/:id — Shopkeeper only, delete product
router.delete('/:id', authenticate, shopkeeperOnly, deleteProduct);

module.exports = router;

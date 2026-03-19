// ======================================================
// productController.js — Product CRUD Logic
// Shopkeeper: Add, Update, Delete
// User: View all products
// ======================================================

const store = require('../models/jsonStore');
const math = require('../mathmodule');

/**
 * GET /api/products
 * Public — returns all products
 */
function getAllProducts(req, res) {
  const products = store.readData('products.json');
  res.json({ success: true, count: products.length, products });
}

/**
 * GET /api/products/:id
 * Public — returns a single product
 */
function getProduct(req, res) {
  const products = store.readData('products.json');
  const product = products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, product });
}

/**
 * POST /api/products
 * Shopkeeper only — add a new product
 * Body: { name, price, description, image, stock }
 */
function addProduct(req, res) {
  const { name, price, description, image, stock } = req.body;

  if (!name || !price) {
    return res.status(400).json({
      success: false,
      message: 'Product name and price are required'
    });
  }

  if (!math.isPositiveNumber(Number(price))) {
    return res.status(400).json({ success: false, message: 'Price must be a positive number' });
  }

  const products = store.readData('products.json');

  // Look up shopkeeper's ID from their username
  const shopkeepers = store.readData('shopkeepers.json');
  const shopkeeper = shopkeepers.find(s => s.username === req.user.username);

  const newProduct = {
    id: store.getNextId('products.json', 'PRD'),
    name,
    price: Number(price),
    description: description || '',
    image: image || 'https://placehold.co/300x200/1a1a2e/94a3b8?text=No+Image',
    stock: Number(stock) || 0,
    shopkeeperId: shopkeeper ? shopkeeper.id : 'SHOP-001',
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);
  store.writeData('products.json', products);

  res.status(201).json({
    success: true,
    message: `Product "${name}" added successfully!`,
    product: newProduct
  });
}

/**
 * PUT /api/products/:id
 * Shopkeeper only — update a product
 */
function updateProduct(req, res) {
  const products = store.readData('products.json');
  const index = products.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const { name, price, description, image, stock } = req.body;

  if (name) products[index].name = name;
  if (price) products[index].price = Number(price);
  if (description !== undefined) products[index].description = description;
  if (image) products[index].image = image;
  if (stock !== undefined) products[index].stock = Number(stock);

  store.writeData('products.json', products);

  res.json({
    success: true,
    message: `Product "${products[index].name}" updated!`,
    product: products[index]
  });
}

/**
 * DELETE /api/products/:id
 * Shopkeeper only — delete a product
 */
function deleteProduct(req, res) {
  const products = store.readData('products.json');
  const index = products.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const deleted = products.splice(index, 1)[0];
  store.writeData('products.json', products);

  res.json({
    success: true,
    message: `Product "${deleted.name}" deleted!`,
    product: deleted
  });
}

module.exports = { getAllProducts, getProduct, addProduct, updateProduct, deleteProduct };

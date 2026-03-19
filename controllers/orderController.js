// ======================================================
// orderController.js — Order Logic
// User: Place order, view own orders, mock payment
// Shopkeeper: View all orders, approve/reject, update status
// ======================================================

const store = require('../models/jsonStore');
const math = require('../mathmodule');

/**
 * POST /api/orders
 * User only — place a new order (stock is NOT reduced yet — waits for shopkeeper approval)
 * Body: { items: [{ productId, qty }], paymentMethod }
 */
function placeOrder(req, res) {
  const { items, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Please add at least one item to your order' });
  }

  const products = store.readData('products.json');
  const users = store.readData('users.json');
  const user = users.find(u => u.username === req.user.username);

  let orderItems = [];
  let total = 0;

  // Validate each item and calculate totals (but do NOT reduce stock yet)
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
    }

    const qty = Number(item.qty) || 1;
    if (qty < 1 || qty > 100) {
      return res.status(400).json({ success: false, message: `Quantity must be between 1 and 100` });
    }

    if (product.stock < qty) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} units of "${product.name}" available` });
    }

    // Use mathmodule to calculate line total
    const lineTotal = math.calculateTotal(qty, product.price);
    orderItems.push({
      productId: product.id,
      name: product.name,
      qty,
      price: product.price,
      lineTotal
    });
    total += lineTotal;
  }

  // NOTE: Stock is NOT reduced here — it will be reduced when shopkeeper approves

  // Create the order with status 'pending' (awaiting shopkeeper approval)
  const orders = store.readData('orders.json');
  const newOrder = {
    id: store.getNextId('orders.json', 'ORD'),
    userId: user ? user.id : 'USR-000',
    userName: user ? user.name : req.user.username,
    items: orderItems,
    total,
    status: 'pending',
    paymentStatus: paymentMethod ? 'paid' : 'unpaid',
    paymentMethod: paymentMethod || 'cash',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  store.writeData('orders.json', orders);

  res.status(201).json({
    success: true,
    message: `Order ${newOrder.id} submitted! Awaiting shopkeeper approval. Total: ₹${total.toFixed(2)}`,
    order: newOrder
  });
}

/**
 * GET /api/orders
 * User: sees own orders | Shopkeeper: sees all orders
 */
function getOrders(req, res) {
  const orders = store.readData('orders.json');

  if (req.user.role === 'shopkeeper') {
    // Shopkeeper sees all orders
    return res.json({ success: true, count: orders.length, orders });
  }

  // User sees only their own orders
  const users = store.readData('users.json');
  const user = users.find(u => u.username === req.user.username);
  const myOrders = user ? orders.filter(o => o.userId === user.id) : [];

  res.json({ success: true, count: myOrders.length, orders: myOrders });
}

/**
 * PUT /api/orders/:id/status
 * Shopkeeper only — update order status
 * Body: { status } — 'pending', 'approved', 'shipped', 'delivered', 'cancelled'
 *
 * Stock management:
 *   - 'approved'  → reduces stock for each item
 *   - 'cancelled' → restores stock if order was previously approved
 */
function updateOrderStatus(req, res) {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'shipped', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }

  const orders = store.readData('orders.json');
  const index = orders.findIndex(o => o.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const previousStatus = orders[index].status;

  // ── Stock management on status change ──
  const products = store.readData('products.json');

  // Approving: reduce stock for each item
  if (status === 'approved' && previousStatus === 'pending') {
    for (const item of orders[index].items) {
      const pIdx = products.findIndex(p => p.id === item.productId);
      if (pIdx !== -1) {
        if (products[pIdx].stock < item.qty) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for "${item.name}". Available: ${products[pIdx].stock}, Requested: ${item.qty}`
          });
        }
        products[pIdx].stock -= item.qty;
      }
    }
    store.writeData('products.json', products);
  }

  // Cancelling an approved/shipped order: restore stock
  if (status === 'cancelled' && ['approved', 'shipped'].includes(previousStatus)) {
    for (const item of orders[index].items) {
      const pIdx = products.findIndex(p => p.id === item.productId);
      if (pIdx !== -1) {
        products[pIdx].stock += item.qty;
      }
    }
    store.writeData('products.json', products);
  }

  orders[index].status = status;
  orders[index].updatedAt = new Date().toISOString();
  if (status === 'approved') orders[index].approvedAt = new Date().toISOString();
  store.writeData('orders.json', orders);

  res.json({
    success: true,
    message: `Order ${orders[index].id} ${status === 'approved' ? 'approved ✓' : status === 'cancelled' ? 'cancelled' : `status updated to "${status}"`}`,
    order: orders[index]
  });
}

module.exports = { placeOrder, getOrders, updateOrderStatus };

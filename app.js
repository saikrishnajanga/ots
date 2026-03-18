// ======================================================
// app.js — Order Tracking System (OTS) — Main Server
// Built with: Node.js + Express
// Features: Login, Add/View/Update/Delete Orders
// ======================================================

// ── Step 1: Import required modules ──────────────────
const express = require('express');          // Web framework
const path = require('path');                // File path utilities
const math = require('./mathmodule');        // Our local math module

// ── Step 2: Create the Express app ───────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ── Step 3: Middleware setup ─────────────────────────
// Parse JSON request bodies (for POST/PUT requests)
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ── Step 4: In-Memory Data (no database needed) ─────
// Simple user credentials for login
const users = [
  { username: 'admin', password: 'admin123', name: 'Admin User' },
  { username: 'user', password: 'user123', name: 'Regular User' },
  { username: 'demo', password: 'demo', name: 'Demo User' }
];

// Store orders in memory (they reset when server restarts)
let orders = [
  {
    id: 'OTS-100001',
    name: 'Wireless Headphones',
    qty: 2,
    price: 3999,
    total: 7998,
    status: 'delivered',
    customer: 'John Doe',
    createdAt: new Date('2026-03-15T10:30:00'),
    updatedAt: new Date('2026-03-17T14:20:00')
  },
  {
    id: 'OTS-100002',
    name: 'USB-C Charging Cable',
    qty: 5,
    price: 999,
    total: 4995,
    status: 'shipped',
    customer: 'Jane Smith',
    createdAt: new Date('2026-03-16T09:15:00'),
    updatedAt: new Date('2026-03-17T16:45:00')
  },
  {
    id: 'OTS-100003',
    name: 'Laptop Stand',
    qty: 1,
    price: 2499,
    total: 2499,
    status: 'processing',
    customer: 'Mike Johnson',
    createdAt: new Date('2026-03-17T11:00:00'),
    updatedAt: new Date('2026-03-17T11:00:00')
  }
];

// ══════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════

// ── LOGIN Route ──────────────────────────────────────
// POST /api/login
// Body: { username, password }
// Returns: user info if credentials match
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Check if username and password were provided
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both username and password'
    });
  }

  // Find the user in our users array
  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (user) {
    // Login successful!
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: { username: user.username, name: user.name }
    });
  } else {
    // Wrong credentials
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// ── REGISTER Route ───────────────────────────────────
// POST /api/register
// Body: { name, username, password }
// Creates a new user account (stored in memory)
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;

  // Check all fields are provided
  if (!name || !username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, username, and password'
    });
  }

  // Username must be at least 3 characters
  if (username.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username must be at least 3 characters'
    });
  }

  // Password must be at least 4 characters
  if (password.length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 4 characters'
    });
  }

  // Check if username already exists
  const exists = users.find(u => u.username === username);
  if (exists) {
    return res.status(409).json({
      success: false,
      message: 'Username already taken. Try a different one.'
    });
  }

  // Create the new user and add to array
  const newUser = { username, password, name };
  users.push(newUser);

  res.status(201).json({
    success: true,
    message: `Account created! Welcome, ${name}. Please sign in.`,
    user: { username, name }
  });
});

// ── VIEW ALL ORDERS ──────────────────────────────────
// GET /api/orders
// Returns: array of all orders with formatted dates
app.get('/api/orders', (req, res) => {
  // Use our mathmodule to format dates
  const formattedOrders = orders.map(order => ({
    ...order,
    createdAtFormatted: math.formatDate(order.createdAt),
    updatedAtFormatted: math.formatDate(order.updatedAt)
  }));

  res.json({
    success: true,
    count: orders.length,
    orders: formattedOrders
  });
});

// ── VIEW SINGLE ORDER ────────────────────────────────
// GET /api/orders/:id
// Returns: single order by ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (order) {
    res.json({
      success: true,
      order: {
        ...order,
        createdAtFormatted: math.formatDate(order.createdAt),
        updatedAtFormatted: math.formatDate(order.updatedAt)
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Order ${req.params.id} not found`
    });
  }
});

// ── ADD ORDER ────────────────────────────────────────
// POST /api/orders
// Body: { name, qty, price, customer }
// Uses mathmodule to calculate total and generate ID
app.post('/api/orders', (req, res) => {
  const { name, qty, price, customer } = req.body;

  // Validate required fields
  if (!name || !qty || !price) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, qty, and price'
    });
  }

  // Validate qty is an integer between 1 and 100
  const qtyNum = Number(qty);
  if (!Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be a whole number between 1 and 100'
    });
  }

  // Validate that price is a positive number
  if (!math.isPositiveNumber(Number(price))) {
    return res.status(400).json({
      success: false,
      message: 'Price must be a positive number (in ₹)'
    });
  }

  // Use our local mathmodule to calculate total and generate ID
  const total = math.calculateTotal(Number(qty), Number(price));
  const id = math.generateOrderId();

  // Create the new order object
  const newOrder = {
    id,
    name,
    qty: Number(qty),
    price: Number(price),
    total,
    status: 'processing',
    customer: customer || 'Guest',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Add to our orders array
  orders.push(newOrder);

  res.status(201).json({
    success: true,
    message: `Order ${id} created successfully!`,
    order: newOrder
  });
});

// ── UPDATE ORDER ─────────────────────────────────────
// PUT /api/orders/:id
// Body: { name?, qty?, price?, status?, customer? }
// Only updates fields that are provided
app.put('/api/orders/:id', (req, res) => {
  // Find the order index
  const index = orders.findIndex(o => o.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Order ${req.params.id} not found`
    });
  }

  const { name, qty, price, status, customer } = req.body;

  // Update only the fields that were provided
  if (name) orders[index].name = name;
  if (qty) {
    orders[index].qty = Number(qty);
    // Recalculate total using mathmodule
    orders[index].total = math.calculateTotal(
      Number(qty),
      orders[index].price
    );
  }
  if (price) {
    orders[index].price = Number(price);
    // Recalculate total using mathmodule
    orders[index].total = math.calculateTotal(
      orders[index].qty,
      Number(price)
    );
  }
  if (status) orders[index].status = status;
  if (customer) orders[index].customer = customer;

  // Update the timestamp
  orders[index].updatedAt = new Date();

  res.json({
    success: true,
    message: `Order ${req.params.id} updated successfully!`,
    order: orders[index]
  });
});

// ── DELETE ORDER ─────────────────────────────────────
// DELETE /api/orders/:id
// Removes order from the array
app.delete('/api/orders/:id', (req, res) => {
  // Find the order index
  const index = orders.findIndex(o => o.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Order ${req.params.id} not found`
    });
  }

  // Remove the order from the array
  const deletedOrder = orders.splice(index, 1)[0];

  res.json({
    success: true,
    message: `Order ${deletedOrder.id} deleted successfully!`,
    order: deletedOrder
  });
});

// ── EXPORT ROUTE (uses mathmodule) ───────────────────
// POST /api/export
// Demonstrates using multiple mathmodule functions
app.post('/api/export', (req, res) => {
  const { discountPercent } = req.body;

  // Calculate grand total of all orders using mathmodule
  let grandTotal = 0;
  orders.forEach(order => {
    grandTotal += math.calculateTotal(order.qty, order.price);
  });

  // Apply discount if provided
  let finalTotal = grandTotal;
  if (discountPercent && math.isPositiveNumber(Number(discountPercent))) {
    finalTotal = math.applyDiscount(grandTotal, Number(discountPercent));
  }

  res.json({
    success: true,
    message: 'Export and Function Call return no3 executed successfully!',
    data: {
      totalOrders: orders.length,
      grandTotal,
      discountPercent: discountPercent || 0,
      finalTotal,
      exportedAt: math.formatDate(new Date())
    }
  });
});

// ── Serve the main page ──────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Step 5: Start the server ─────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   Order Tracking System (OTS)            ║');
  console.log(`  ║   Server running: http://localhost:${PORT}  ║`);
  console.log('  ║   Press Ctrl+C to stop                   ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║   Login Credentials:                     ║');
  console.log('  ║   admin / admin123                       ║');
  console.log('  ║   user  / user123                        ║');
  console.log('  ║   demo  / demo                           ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

// ── Export for Vercel serverless deployment ───────────
module.exports = app;

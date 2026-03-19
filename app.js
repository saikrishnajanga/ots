// ======================================================
// app.js — Order Tracking System (OTS) — Main Server
// Advanced version with User & Shopkeeper roles
// Built with: Node.js + Express
// Data: JSON file persistence
// ======================================================

// ── Step 1: Import modules ──────────────────────────
const express = require('express');
const path = require('path');
const math = require('./mathmodule');     // Local module example

// ── Step 2: Import route files ──────────────────────
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const requestRoutes = require('./routes/requestRoutes');

// ── Step 3: Create Express app ──────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ── Step 4: Middleware ──────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Step 5: Mount API routes ────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/requests', requestRoutes);

// ── Step 6: Serve HTML pages ────────────────────────
// Login / Register page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User dashboard
app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Shopkeeper dashboard
app.get('/shopkeeper', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shopkeeper.html'));
});

// ── Step 7: Math module demo endpoint ───────────────
// Example: shows how mathmodule is used
app.get('/api/math-demo', (req, res) => {
  const qty = 5;
  const price = 999;
  res.json({
    success: true,
    message: 'mathmodule.js demo — local module example',
    demo: {
      'calculateTotal(5, 999)': math.calculateTotal(qty, price),
      'applyDiscount(4995, 10)': math.applyDiscount(4995, 10),
      'generateOrderId()': math.generateOrderId(),
      'formatDate(now)': math.formatDate(new Date()),
      'isPositiveNumber(42)': math.isPositiveNumber(42),
      'isPositiveNumber(-5)': math.isPositiveNumber(-5)
    }
  });
});

// ── Step 8: Start the server ────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   Order Tracking System (OTS) — Advanced     ║');
  console.log(`  ║   Server: http://localhost:${PORT}              ║`);
  console.log('  ║   Press Ctrl+C to stop                       ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║   Pages:                                     ║');
  console.log('  ║     /            → Login / Register          ║');
  console.log('  ║     /user        → User Dashboard            ║');
  console.log('  ║     /shopkeeper  → Shopkeeper Dashboard      ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║   Demo Accounts:                             ║');
  console.log('  ║     User:       sai / sai123                 ║');
  console.log('  ║     User:       demo / demo                  ║');
  console.log('  ║     Shopkeeper: admin / admin123             ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║   API Routes:                                ║');
  console.log('  ║     POST /api/auth/register                  ║');
  console.log('  ║     POST /api/auth/login                     ║');
  console.log('  ║     GET  /api/products                       ║');
  console.log('  ║     POST /api/orders                         ║');
  console.log('  ║     GET  /api/orders                         ║');
  console.log('  ║     POST /api/requests                       ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

// Export for Vercel
module.exports = app;

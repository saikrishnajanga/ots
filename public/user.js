// ======================================================
// user.js — User Dashboard Logic
// Browse products, place orders, manage requests
// ======================================================

let session = null;
let allProducts = [];
let selectedProduct = null;

// ── Init ──
function init() {
  try {
    const s = localStorage.getItem('ots_session');
    if (!s) { window.location.href = '/'; return; }
    session = JSON.parse(s);
    // Validate session has all required fields
    if (!session || !session.role || !session.token || session.role !== 'user') {
      localStorage.removeItem('ots_session');
      window.location.href = '/';
      return;
    }
    document.getElementById('user-name').textContent = `Welcome, ${session.name || 'User'}`;
    const theme = localStorage.getItem('ots_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    loadProducts();
    loadOrders();
    loadRequests();
  } catch (e) {
    // Corrupt session — clear and redirect
    localStorage.removeItem('ots_session');
    window.location.href = '/';
  }
}


function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` };
}

// ── Tabs ──
function switchTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = 'block';
  el.classList.add('active');
}

// ── Theme ──
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ots_theme', next);
}

function logout() { localStorage.removeItem('ots_session'); window.location.href = '/'; }

// ══════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) { allProducts = data.products; renderProducts(allProducts); }
  } catch (e) { document.getElementById('product-list').innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center;">Could not load products</p>'; }
}

function filterProducts() {
  const q = document.getElementById('product-search').value.toLowerCase();
  renderProducts(allProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
}

function renderProducts(products) {
  const el = document.getElementById('product-list');
  if (products.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No products found</h3></div>'; return; }
  el.innerHTML = products.map(p => `
    <div class="product-card">
      <img class="product-img" src="${p.image}" alt="${esc(p.name)}" onerror="this.src='https://placehold.co/300x200/1a1a2e/94a3b8?text=No+Image'" />
      <div class="product-body">
        <h3 class="product-name">${esc(p.name)}</h3>
        <p class="product-desc">${esc(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">₹${p.price.toFixed(2)}</span>
          <span class="product-stock ${p.stock > 0 ? 'in-stock' : 'out-stock'}">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
        </div>
        <button class="btn-primary btn-full" ${p.stock < 1 ? 'disabled style="opacity:0.5"' : ''} onclick='openOrderModal(${JSON.stringify(p).replace(/'/g, "\\'")})'>
          <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
          <span>${p.stock < 1 ? 'Out of Stock' : 'Buy Now'}</span>
        </button>
      </div>
    </div>
  `).join('');
}

// ── Order Modal ──
function openOrderModal(product) {
  selectedProduct = product;
  document.getElementById('order-modal').style.display = 'flex';
  document.getElementById('order-product-name').textContent = product.name;
  document.getElementById('order-product-price').textContent = `₹${product.price.toFixed(2)} per unit`;
  document.getElementById('order-qty').value = 1;
  document.getElementById('order-qty').max = product.stock;
  updateOrderTotal();
}

function closeOrderModal(e) {
  if (e && e.target !== document.getElementById('order-modal')) return;
  document.getElementById('order-modal').style.display = 'none';
}

function stepOrderQty(d) {
  const inp = document.getElementById('order-qty');
  let v = parseInt(inp.value) || 1;
  v = Math.min(selectedProduct.stock, Math.max(1, v + d));
  inp.value = v;
  updateOrderTotal();
}

function updateOrderTotal() {
  const qty = parseInt(document.getElementById('order-qty').value) || 1;
  document.getElementById('order-total-display').textContent = `₹${(selectedProduct.price * qty).toFixed(2)}`;
}

document.addEventListener('input', (e) => { if (e.target.id === 'order-qty') updateOrderTotal(); });

async function placeOrder() {
  const qty = parseInt(document.getElementById('order-qty').value) || 1;
  const pm = document.getElementById('order-payment').value;
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true; btn.innerHTML = '<span>Processing...</span>';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ items: [{ productId: selectedProduct.id, qty }], paymentMethod: pm })
    });
    const data = await res.json();
    btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg><span>Pay & Place Order</span>';
    if (data.success) {
      showToast(data.message, 'success');
      closeOrderModal();
      loadProducts();
      loadOrders();
    } else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); btn.disabled = false; }
}

// ══════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════

async function loadOrders() {
  try {
    const res = await fetch('/api/orders', { headers: headers() });
    const data = await res.json();
    if (data.success) renderOrders(data.orders);
  } catch (e) {}
}

function renderOrders(orders) {
  const el = document.getElementById('order-list');
  if (orders.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No orders yet</h3><p>Browse products and place your first order!</p></div>'; return; }

  el.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => `
    <div class="order-card">
      <div class="order-info" style="flex:1;">
        <div class="order-name">${o.id}</div>
        <div class="order-meta">${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
        <div class="order-meta">${new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
      </div>
      <div class="order-right">
        <span class="status-badge status-${o.status}">${o.status}</span>
        <span class="status-badge ${o.paymentStatus === 'paid' ? 'status-delivered' : 'status-pending'}">${o.paymentStatus}</span>
        <span class="order-total">₹${o.total.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
//  REQUESTS
// ══════════════════════════════════════════

function showRequestForm() { document.getElementById('request-form-area').style.display = 'block'; }
function hideRequestForm() { document.getElementById('request-form-area').style.display = 'none'; }

async function submitRequest() {
  const name = document.getElementById('req-name').value.trim();
  const desc = document.getElementById('req-desc').value.trim();
  if (!name) { showToast('Please enter a product name', 'error'); return; }

  try {
    const res = await fetch('/api/requests', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ productName: name, description: desc })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('req-name').value = '';
      document.getElementById('req-desc').value = '';
      hideRequestForm();
      loadRequests();
    } else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

async function loadRequests() {
  try {
    const res = await fetch('/api/requests', { headers: headers() });
    const data = await res.json();
    if (data.success) renderRequests(data.requests);
  } catch (e) {}
}

function renderRequests(reqs) {
  const el = document.getElementById('request-list');
  if (reqs.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No requests yet</h3><p>Can\'t find a product? Send a request to the shopkeeper!</p></div>'; return; }

  el.innerHTML = reqs.map(r => `
    <div class="order-card">
      <div class="order-info" style="flex:1;">
        <div class="order-name">${esc(r.productName)}</div>
        <div class="order-meta">${r.description || 'No description'}</div>
        ${r.shopkeeperNote ? `<div class="order-meta" style="color:var(--blue);">Note: ${esc(r.shopkeeperNote)}</div>` : ''}
      </div>
      <div class="order-right">
        <span class="status-badge status-${r.status === 'approved' ? 'delivered' : r.status === 'rejected' ? 'cancelled' : 'pending'}">${r.status}</span>
      </div>
    </div>
  `).join('');
}

// ── Utils ──
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

let toastTimeout;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.toggle('error', type === 'error');
  document.getElementById('toast-icon').innerHTML = type === 'error'
    ? '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>'
    : '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>';
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

init();

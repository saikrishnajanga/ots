// ======================================================
// user.js — User Dashboard Logic
// Browse products, place orders, manage requests
// ======================================================

let session = null;
let allProducts = [];
let allOrders = [];
let selectedProduct = null;
let _currentFilter = 'all';

// ── Anti-flicker ──
let _lastProductData = '';
let _lastOrderData = '';
let _lastRequestData = '';
let _loadingProducts = false;
let _loadingOrders = false;
let _loadingRequests = false;

function quickHash(arr) {
  if (!arr || arr.length === 0) return '[]';
  return arr.map(item => item.id + '|' + (item.stock ?? '') + '|' + (item.status ?? '') + '|' + (item.name ?? '')).join(',');
}

// ── Init ──
function init() {
  try {
    let s = localStorage.getItem('ots_session');
    if (!s) s = sessionStorage.getItem('ots_session');
    if (!s) { window.location.href = '/'; return; }
    session = JSON.parse(s);
    if (!session || !session.role || !session.token || session.role !== 'user') {
      localStorage.removeItem('ots_session'); sessionStorage.removeItem('ots_session');
      window.location.href = '/'; return;
    }
    localStorage.setItem('ots_session', JSON.stringify(session));
    sessionStorage.setItem('ots_session', JSON.stringify(session));
    document.getElementById('user-name').textContent = `Welcome, ${session.name || 'User'}`;
    const theme = localStorage.getItem('ots_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    loadProducts(); loadOrders(); loadRequests();
  } catch (e) {
    localStorage.removeItem('ots_session'); sessionStorage.removeItem('ots_session');
    window.location.href = '/';
  }
}

function headers() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` }; }

function switchTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = 'block';
  el.classList.add('active');
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ots_theme', next);
}

function logout() { localStorage.removeItem('ots_session'); sessionStorage.removeItem('ots_session'); window.location.href = '/'; }

// ══════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════

async function loadProducts(forceRender) {
  if (_loadingProducts) return;
  _loadingProducts = true;
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      allProducts = data.products;
      const hash = quickHash(data.products);
      if (forceRender || hash !== _lastProductData) {
        _lastProductData = hash;
        renderProducts(allProducts);
      }
    }
  } catch (e) { console.error('Network error loading products:', e); }
  finally { _loadingProducts = false; }
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
        <button class="btn-primary btn-full" ${p.stock < 1 ? 'disabled style="opacity:0.5"' : ''} onclick='openOrderModal(${JSON.stringify(p).replace(/'/g, "\\\\\\'")})'>
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
function closeOrderModal(e) { if (e && e.target !== document.getElementById('order-modal')) return; document.getElementById('order-modal').style.display = 'none'; }
function stepOrderQty(d) { const inp = document.getElementById('order-qty'); let v = parseInt(inp.value) || 1; v = Math.min(selectedProduct.stock, Math.max(1, v + d)); inp.value = v; updateOrderTotal(); }
function updateOrderTotal() { const qty = parseInt(document.getElementById('order-qty').value) || 1; document.getElementById('order-total-display').textContent = `₹${(selectedProduct.price * qty).toFixed(2)}`; }
document.addEventListener('input', (e) => { if (e.target.id === 'order-qty') updateOrderTotal(); });

async function placeOrder() {
  const qty = parseInt(document.getElementById('order-qty').value) || 1;
  const pm = document.getElementById('order-payment').value;
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true; btn.innerHTML = '<span>Processing...</span>';
  try {
    const res = await fetch('/api/orders', { method: 'POST', headers: headers(), body: JSON.stringify({ items: [{ productId: selectedProduct.id, qty }], paymentMethod: pm }) });
    const data = await res.json();
    btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg><span>Pay & Place Order</span>';
    if (data.success) {
      showToast(data.message, 'success');
      closeOrderModal();
      launchConfetti();
      loadProducts(true); loadOrders(true);
    } else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); btn.disabled = false; }
}

// ══════════════════════════════════════════
//  ORDERS — with timeline, filter, invoice
// ══════════════════════════════════════════

async function loadOrders(forceRender) {
  if (_loadingOrders) return;
  _loadingOrders = true;
  try {
    const res = await fetch('/api/orders', { headers: headers() });
    const data = await res.json();
    if (data.success) {
      allOrders = data.orders;
      const hash = quickHash(data.orders);
      if (forceRender || hash !== _lastOrderData) {
        _lastOrderData = hash;
        updateUserStats(data.orders);
        renderFilteredOrders();
      }
    }
  } catch (e) { console.error('Network error loading orders:', e); }
  finally { _loadingOrders = false; }
}

function updateUserStats(orders) {
  document.getElementById('us-total').textContent = orders.length;
  document.getElementById('us-pending').textContent = orders.filter(o => o.status === 'pending').length;
  document.getElementById('us-delivered').textContent = orders.filter(o => o.status === 'delivered').length;
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('us-spent').textContent = `₹${totalSpent.toFixed(0)}`;
}

function filterOrders(status, el) {
  _currentFilter = status;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderFilteredOrders();
}

function filterOrdersBySearch() {
  renderFilteredOrders();
}

function renderFilteredOrders() {
  let filtered = allOrders;
  if (_currentFilter !== 'all') filtered = filtered.filter(o => o.status === _currentFilter);
  const search = document.getElementById('order-search')?.value?.toLowerCase() || '';
  if (search) filtered = filtered.filter(o => o.id.toLowerCase().includes(search));
  renderOrders(filtered);
}

function buildTimeline(status) {
  const steps = ['pending', 'approved', 'shipped', 'delivered'];
  const icons = { pending: '⏳', approved: '✓', shipped: '🚚', delivered: '✅' };

  if (status === 'cancelled') {
    return `<div class="order-timeline">
      <div class="timeline-step cancelled"><div class="timeline-dot">✗</div><span class="timeline-label">Cancelled</span></div>
    </div>`;
  }

  const currentIdx = steps.indexOf(status);
  return `<div class="order-timeline">${steps.map((step, i) => {
    let cls = '';
    if (i < currentIdx) cls = 'completed';
    else if (i === currentIdx) cls = 'active';
    const line = i < steps.length - 1 ? `<div class="timeline-line"></div>` : '';
    return `<div class="timeline-step ${cls}"><div class="timeline-dot">${icons[step]}</div><span class="timeline-label">${step}</span>${line}</div>`;
  }).join('')}</div>`;
}

function renderOrders(orders) {
  const el = document.getElementById('order-list');
  if (orders.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No orders found</h3><p>Browse products and place your first order!</p></div>'; return; }

  el.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => `
    <div class="order-card-enhanced">
      <div class="order-card-top">
        <div class="order-info" style="flex:1;">
          <div class="order-name">${o.id}</div>
          <div class="order-meta">${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
          <div class="order-meta">${new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
        </div>
        <div class="order-card-actions">
          <span class="status-badge status-${o.status}">${o.status}</span>
          <span class="status-badge ${o.paymentStatus === 'paid' ? 'status-delivered' : 'status-pending'}">${o.paymentStatus}</span>
          <span class="order-total">₹${o.total.toFixed(2)}</span>
          <button class="btn-invoice" onclick='showInvoice(${JSON.stringify(o).replace(/'/g, "\\\\\\'")})'>
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Invoice
          </button>
        </div>
      </div>
      ${buildTimeline(o.status)}
    </div>
  `).join('');
}

// ══════════════════════════════════════════
//  INVOICE
// ══════════════════════════════════════════

function showInvoice(order) {
  const invoiceHTML = `
    <div class="invoice-paper" id="invoice-content">
      <div class="invoice-header">
        <h2>🧾 Order Invoice</h2>
        <p>Order Tracking System</p>
      </div>
      <div class="invoice-row"><span>Order ID</span><strong>${order.id}</strong></div>
      <div class="invoice-row"><span>Date</span><span>${new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span></div>
      <div class="invoice-row"><span>Customer</span><span>${esc(order.userName)}</span></div>
      <div class="invoice-row"><span>Payment</span><span>${order.paymentMethod} (${order.paymentStatus})</span></div>
      <div class="invoice-row"><span>Status</span><span style="text-transform:capitalize;">${order.status}</span></div>
      <div class="invoice-items">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Items</div>
        ${order.items.map(i => `<div class="invoice-item"><span>${esc(i.name)} × ${i.qty}</span><span>₹${(i.price * i.qty).toFixed(2)}</span></div>`).join('')}
      </div>
      <div class="invoice-row total"><span>Total</span><span>₹${order.total.toFixed(2)}</span></div>
      <div class="invoice-footer">Thank you for your order! • Generated on ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-card" style="max-width:540px;" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h2>Invoice</h2>
        <button class="btn-icon-only" onclick="this.closest('.modal-overlay').remove()"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
      </div>
      ${invoiceHTML}
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-primary" onclick="downloadInvoice('${order.id}')"><svg viewBox="0 0 24 24" style="fill:#fff;width:16px;height:16px;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Download</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function downloadInvoice(orderId) {
  const content = document.getElementById('invoice-content');
  if (!content) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice ${orderId}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:600px;margin:0 auto;}h2{margin:0 0 4px;}p{margin:0;}.invoice-header{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;}.invoice-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;}.invoice-row.total{border-top:2px solid #1e293b;border-bottom:none;font-size:18px;font-weight:800;margin-top:8px;padding-top:12px;}.invoice-items{margin:12px 0;}.invoice-item{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}.invoice-footer{text-align:center;margin-top:24px;font-size:12px;color:#94a3b8;}</style></head><body>${content.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

// ══════════════════════════════════════════
//  CONFETTI 🎉
// ══════════════════════════════════════════

function launchConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 1.5 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
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
    const res = await fetch('/api/requests', { method: 'POST', headers: headers(), body: JSON.stringify({ productName: name, description: desc }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); document.getElementById('req-name').value = ''; document.getElementById('req-desc').value = ''; hideRequestForm(); loadRequests(true); }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

async function loadRequests(forceRender) {
  if (_loadingRequests) return;
  _loadingRequests = true;
  try {
    const res = await fetch('/api/requests', { headers: headers() });
    const data = await res.json();
    if (data.success) {
      const hash = quickHash(data.requests);
      if (forceRender || hash !== _lastRequestData) { _lastRequestData = hash; renderRequests(data.requests); }
    }
  } catch (e) { console.error('Network error loading requests:', e); }
  finally { _loadingRequests = false; }
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

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session) { loadProducts(); loadOrders(); loadRequests(); }
});

init();

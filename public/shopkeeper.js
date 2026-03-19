// ======================================================
// shopkeeper.js — Shopkeeper Dashboard Logic
// Manage products, orders, and user requests
// ======================================================

let session = null;

// ── Anti-lag: loading guards ──
let _loadingProducts = false;
let _loadingOrders = false;
let _loadingRequests = false;

// ── Init ──
function init() {
  try {
    // Try localStorage first, then sessionStorage as fallback
    let s = localStorage.getItem('ots_session');
    if (!s) s = sessionStorage.getItem('ots_session');
    if (!s) { window.location.href = '/'; return; }
    session = JSON.parse(s);
    // Validate session has all required fields
    if (!session || !session.role || !session.token || session.role !== 'shopkeeper') {
      localStorage.removeItem('ots_session');
      sessionStorage.removeItem('ots_session');
      window.location.href = '/';
      return;
    }
    // Keep both storages in sync
    localStorage.setItem('ots_session', JSON.stringify(session));
    sessionStorage.setItem('ots_session', JSON.stringify(session));
    document.getElementById('shop-name').textContent = `Welcome, ${session.name || 'Shopkeeper'}`;
    const theme = localStorage.getItem('ots_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    loadAll();
  } catch (e) {
    // Corrupt session — clear and redirect
    localStorage.removeItem('ots_session');
    sessionStorage.removeItem('ots_session');
    window.location.href = '/';
  }
}


function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` };
}

// Load all data — notifications are updated once after all loads complete
async function loadAll() {
  await Promise.all([loadProducts(), loadOrders(true), loadRequests(true)]);
  updateNotifications(cachedOrders, cachedRequests);
}

// ── Notification Panel ──
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-bell-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});

function updateNotifications(orders, requests) {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const totalPending = pendingOrders.length + pendingRequests.length;

  // Update badge
  const badge = document.getElementById('notif-badge');
  if (totalPending > 0) {
    badge.textContent = totalPending;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  // Update panel body
  const body = document.getElementById('notif-panel-body');
  if (totalPending === 0) {
    body.innerHTML = '<p style="color:var(--text-muted);padding:16px;text-align:center;">No pending items ✓</p>';
    return;
  }

  let html = '';
  pendingOrders.forEach(o => {
    html += `
      <div class="notif-item notif-order">
        <div class="notif-icon">🛒</div>
        <div class="notif-content">
          <strong>${o.id}</strong> from <strong>${esc(o.userName)}</strong>
          <div class="notif-meta">${o.items.map(i => i.name + ' x' + i.qty).join(', ')} — ₹${o.total.toFixed(2)}</div>
          <div class="notif-meta">${new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
        <div class="notif-actions">
          <button class="notif-btn notif-approve" onclick="quickApproveOrder('${o.id}')" title="Approve">✓</button>
          <button class="notif-btn notif-reject" onclick="quickRejectOrder('${o.id}')" title="Reject">✗</button>
        </div>
      </div>`;
  });
  pendingRequests.forEach(r => {
    html += `
      <div class="notif-item notif-request">
        <div class="notif-icon">📝</div>
        <div class="notif-content">
          <strong>${esc(r.productName)}</strong> requested by <strong>${esc(r.userName)}</strong>
          <div class="notif-meta">${r.description || 'No description'}</div>
        </div>
        <div class="notif-actions">
          <button class="notif-btn notif-approve" onclick="openReqModal('${r.id}', '${esc(r.productName).replace(/'/g, "\\\\'")}')" title="Handle">⚡</button>
        </div>
      </div>`;
  });
  body.innerHTML = html;
}

async function quickApproveOrder(id) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: 'approved' }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); loadAll(); }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

async function quickRejectOrder(id) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: 'cancelled' }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); loadAll(); }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

// ── Tabs ──
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

async function loadProducts() {
  if (_loadingProducts) return;
  _loadingProducts = true;
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      document.getElementById('s-products').textContent = data.products.length;
      renderProducts(data.products);
    } else {
      console.error('Failed to load products:', data.message);
      showToast('Failed to load products: ' + (data.message || 'Unknown error'), 'error');
    }
  } catch (e) {
    console.error('Network error loading products:', e);
    showToast('Could not load products. Check your connection.', 'error');
  } finally {
    _loadingProducts = false;
  }
}

function renderProducts(products) {
  const el = document.getElementById('shop-product-list');
  if (products.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No products</h3><p>Click "Add Product" to create one.</p></div>'; return; }

  el.innerHTML = products.map(p => `
    <div class="product-card">
      <img class="product-img" src="${p.image}" alt="${esc(p.name)}" onerror="this.src='https://placehold.co/300x200/1a1a2e/94a3b8?text=No+Image'" />
      <div class="product-body">
        <h3 class="product-name">${esc(p.name)}</h3>
        <p class="product-desc">${esc(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">₹${p.price.toFixed(2)}</span>
          <span class="product-stock ${p.stock > 0 ? 'in-stock' : 'out-stock'}">Stock: ${p.stock}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn-primary btn-full" style="flex:1;" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "\\\\'")})'>
            <svg viewBox="0 0 24 24" style="fill:#fff;width:16px;height:16px;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            <span>Edit</span>
          </button>
          <button class="btn-delete-full" onclick="deleteProduct('${p.id}')">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Product Modal ──
function openProductModal(product) {
  document.getElementById('product-modal').style.display = 'flex';
  document.getElementById('product-form').reset();
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('prod-modal-title').textContent = 'Add Product';
  document.getElementById('prod-submit-btn').innerHTML = '<span>Add Product</span>';
}

function editProduct(p) {
  document.getElementById('product-modal').style.display = 'flex';
  document.getElementById('prod-modal-title').textContent = 'Edit Product';
  document.getElementById('prod-submit-btn').innerHTML = '<span>Save Changes</span>';
  document.getElementById('prod-edit-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-desc').value = p.description;
  document.getElementById('prod-image').value = p.image;
}

function closeProductModal(e) {
  if (e && e.target !== document.getElementById('product-modal')) return;
  document.getElementById('product-modal').style.display = 'none';
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-edit-id').value;
  const body = {
    name: document.getElementById('prod-name').value.trim(),
    price: document.getElementById('prod-price').value,
    stock: document.getElementById('prod-stock').value,
    description: document.getElementById('prod-desc').value.trim(),
    image: document.getElementById('prod-image').value.trim()
  };

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeProductModal();
      loadProducts();
    }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: headers() });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadProducts();
    }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

// ══════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════

let cachedOrders = [];
let cachedRequests = [];

async function loadOrders(skipNotif) {
  if (_loadingOrders) return;
  _loadingOrders = true;
  try {
    const res = await fetch('/api/orders', { headers: headers() });
    const data = await res.json();
    if (data.success) {
      cachedOrders = data.orders;
      document.getElementById('s-orders').textContent = data.orders.length;
      document.getElementById('s-pending').textContent = data.orders.filter(o => o.status === 'pending').length;
      renderOrders(data.orders);
      if (!skipNotif) updateNotifications(cachedOrders, cachedRequests);
    } else {
      console.error('Failed to load orders:', data.message);
      showToast('Failed to load orders: ' + (data.message || 'Unknown error'), 'error');
    }
  } catch (e) {
    console.error('Network error loading orders:', e);
    showToast('Could not load orders. Check your connection.', 'error');
  } finally {
    _loadingOrders = false;
  }
}

function renderOrders(orders) {
  const el = document.getElementById('shop-order-list');
  if (orders.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No orders yet</h3></div>'; return; }

  el.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => `
    <div class="order-card">
      <div class="order-info" style="flex:1;">
        <div class="order-name">${o.id} — ${esc(o.userName)}</div>
        <div class="order-meta">${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
        <div class="order-meta">${new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} • Payment: ${o.paymentStatus}</div>
      </div>
      <div class="order-right">
        <span class="status-badge status-${o.status}">${o.status}</span>
        <span class="order-total">₹${o.total.toFixed(2)}</span>
        <button class="btn-edit" onclick="openStatusModal('${o.id}', '${o.status}')" title="Update Status"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
      </div>
    </div>
  `).join('');
}

// ── Status Modal ──
function openStatusModal(id, current) {
  document.getElementById('status-modal').style.display = 'flex';
  document.getElementById('status-order-id').value = id;
  document.getElementById('status-select').value = current;
}
function closeStatusModal(e) { if (e && e.target !== document.getElementById('status-modal')) return; document.getElementById('status-modal').style.display = 'none'; }

async function updateOrderStatus() {
  const id = document.getElementById('status-order-id').value;
  const status = document.getElementById('status-select').value;
  try {
    const res = await fetch(`/api/orders/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeStatusModal();
      loadAll();
    }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
}

// ══════════════════════════════════════════
//  REQUESTS
// ══════════════════════════════════════════

async function loadRequests(skipNotif) {
  if (_loadingRequests) return;
  _loadingRequests = true;
  try {
    const res = await fetch('/api/requests', { headers: headers() });
    const data = await res.json();
    if (data.success) {
      cachedRequests = data.requests;
      document.getElementById('s-requests').textContent = data.requests.filter(r => r.status === 'pending').length;
      renderRequests(data.requests);
      if (!skipNotif) updateNotifications(cachedOrders, cachedRequests);
    } else {
      console.error('Failed to load requests:', data.message);
      showToast('Failed to load requests: ' + (data.message || 'Unknown error'), 'error');
    }
  } catch (e) {
    console.error('Network error loading requests:', e);
    showToast('Could not load requests. Check your connection.', 'error');
  } finally {
    _loadingRequests = false;
  }
}

function renderRequests(reqs) {
  const el = document.getElementById('shop-request-list');
  if (reqs.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No requests</h3></div>'; return; }

  el.innerHTML = reqs.map(r => `
    <div class="order-card">
      <div class="order-info" style="flex:1;">
        <div class="order-name">${esc(r.productName)}</div>
        <div class="order-meta">From: ${esc(r.userName)} • ${r.description || 'No description'}</div>
      </div>
      <div class="order-right">
        <span class="status-badge status-${r.status === 'approved' ? 'delivered' : r.status === 'rejected' ? 'cancelled' : 'pending'}">${r.status}</span>
        ${r.status === 'pending' ? `<button class="btn-edit" onclick="openReqModal('${r.id}', '${esc(r.productName)}')" title="Handle"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>` : ''}
      </div>
    </div>
  `).join('');
}

// ── Request Modal ──
function openReqModal(id, name) {
  document.getElementById('req-modal').style.display = 'flex';
  document.getElementById('req-action-id').value = id;
  document.getElementById('req-action-info').textContent = `Request: "${name}"`;
  document.getElementById('req-note').value = '';
}
function closeReqModal(e) { if (e && e.target !== document.getElementById('req-modal')) return; document.getElementById('req-modal').style.display = 'none'; }

async function handleRequestAction(status) {
  const id = document.getElementById('req-action-id').value;
  const note = document.getElementById('req-note').value.trim();
  try {
    const res = await fetch(`/api/requests/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status, shopkeeperNote: note }) });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeReqModal();
      loadAll();
    }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
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

// Auto-refresh data when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session) {
    loadAll();
  }
});

// Auto-poll every 60 seconds for new orders/requests
setInterval(() => {
  if (session && document.visibilityState === 'visible') {
    loadAll();
  }
}, 60000);

init();

// ======================================================
// app.js — OTS Client-Side Logic
// Features: Login, Register, CRUD, Search, Filter,
//   Session Persistence, Donut Chart, Notifications,
//   CSV Export, PDF Report, Theme Toggle
// ======================================================

// ── App State ────────────────────────────────────────
let currentUser = null;       // Logged-in user info
let allOrders = [];           // Local cache of orders
let editMode = false;         // Editing or adding?
let isRegisterMode = false;   // Login or Register?
let currentFilter = 'all';    // Active filter tab

// ══════════════════════════════════════════════════════
//  1. SESSION PERSISTENCE (localStorage)
// ══════════════════════════════════════════════════════

// Check on page load if a session exists
function checkSession() {
  const saved = localStorage.getItem('ots_session');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('dashboard-screen').style.display = 'block';
      document.getElementById('nav-user-name').textContent = `Welcome, ${currentUser.name}`;
      loadOrders();
    } catch (e) {
      localStorage.removeItem('ots_session');
    }
  }
}

function saveSession(user) {
  localStorage.setItem('ots_session', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('ots_session');
}

// Load saved theme
function loadTheme() {
  const saved = localStorage.getItem('ots_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

// ══════════════════════════════════════════════════════
//  6. THEME TOGGLE (Dark / Light)
// ══════════════════════════════════════════════════════

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ots_theme', next);
  updateThemeIcon(next);

  // Redraw chart because canvas colors are static
  if (allOrders.length > 0) drawDonutChart(allOrders);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'light') {
    icon.innerHTML = '<path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>';
  } else {
    icon.innerHTML = '<path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
  }
}

// ══════════════════════════════════════════════════════
//  AUTH: LOGIN & REGISTER
// ══════════════════════════════════════════════════════

function toggleAuthMode(e) {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;

  const nameGroup = document.getElementById('reg-name-group');
  const subtitle = document.getElementById('login-subtitle');
  const btn = document.getElementById('login-btn');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleLink = document.getElementById('auth-toggle-link');
  const hint = document.getElementById('credentials-hint');
  document.getElementById('login-error').style.display = 'none';

  if (isRegisterMode) {
    nameGroup.style.display = 'block';
    subtitle.textContent = 'Create a new account';
    btn.innerHTML = '<span>Create Account</span><svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    toggleText.textContent = 'Already have an account?';
    toggleLink.textContent = 'Sign In';
    hint.style.display = 'none';
  } else {
    nameGroup.style.display = 'none';
    subtitle.textContent = 'Sign in to manage your orders';
    btn.innerHTML = '<span>Sign In</span><svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Register';
    hint.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value.trim();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errorEl.style.display = 'none';
  btn.disabled = true;

  // ── REGISTER ──
  if (isRegisterMode) {
    const name = document.getElementById('reg-name').value.trim();
    btn.innerHTML = '<span>Creating account...</span>';
    if (!name) { showError(errorEl, 'Please enter your full name'); resetRegBtn(btn); return; }
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, password }) });
      const data = await res.json();
      if (data.success) { showToast(data.message, 'success'); isRegisterMode = true; toggleAuthMode(new Event('click')); }
      else { showError(errorEl, data.message); }
    } catch (err) { showError(errorEl, 'Network error. Is the server running?'); }
    resetRegBtn(btn);
    return;
  }

  // ── LOGIN ──
  btn.innerHTML = '<span>Signing in...</span>';
  try {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      saveSession(currentUser);
      showToast(data.message, 'success');
      setTimeout(() => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'block';
        document.getElementById('nav-user-name').textContent = `Welcome, ${currentUser.name}`;
        loadOrders();
      }, 500);
    } else { showError(errorEl, data.message); }
  } catch (err) { showError(errorEl, 'Network error. Is the server running?'); }

  btn.disabled = false;
  btn.innerHTML = '<span>Sign In</span><svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
}

function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function resetRegBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = '<span>Create Account</span><svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
}

function handleLogout() {
  currentUser = null;
  allOrders = [];
  isRegisterMode = false;
  clearSession();
  document.getElementById('dashboard-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-name-group').style.display = 'none';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('credentials-hint').style.display = 'block';
  document.getElementById('login-subtitle').textContent = 'Sign in to manage your orders';
  document.getElementById('auth-toggle-text').textContent = "Don't have an account?";
  document.getElementById('auth-toggle-link').textContent = 'Register';
  document.getElementById('login-btn').innerHTML = '<span>Sign In</span><svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
  showToast('Logged out successfully', 'success');
}

// ══════════════════════════════════════════════════════
//  LOAD & DISPLAY ORDERS
// ══════════════════════════════════════════════════════

async function loadOrders() {
  const listEl = document.getElementById('orders-list');
  listEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading orders...</p></div>';

  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      allOrders = data.orders;
      currentFilter = 'all';
      // Reset active filter tab
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
      document.getElementById('search-input').value = '';
      renderOrders(allOrders);
      updateStats(allOrders);
      drawDonutChart(allOrders);
      updateNotifications(allOrders);
    }
  } catch (err) {
    listEl.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><h3>Connection Error</h3><p>Could not load orders. Check server connection.</p></div>';
  }
}

function renderOrders(orders) {
  const listEl = document.getElementById('orders-list');
  if (orders.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><h3>No Orders Found</h3><p>Try a different search or filter, or click "Add Order" to create one.</p></div>';
    return;
  }

  const colors = [
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #f97316, #f59e0b)',
    'linear-gradient(135deg, #ef4444, #ec4899)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
    'linear-gradient(135deg, #06b6d4, #0ea5e9)'
  ];

  listEl.innerHTML = orders.map((order, i) => `
    <div class="order-card" style="animation-delay: ${i * 0.05}s">
      <div class="order-avatar" style="background: ${colors[i % colors.length]}">
        ${order.name.charAt(0).toUpperCase()}
      </div>
      <div class="order-info">
        <div class="order-name">${escapeHtml(order.name)}</div>
        <div class="order-meta">
          <span>${order.id}</span><span>•</span><span>Qty: ${order.qty}</span><span>•</span><span>${order.customer || 'Guest'}</span>
        </div>
      </div>
      <div class="order-right">
        <span class="status-badge status-${order.status}">${order.status}</span>
        <span class="order-total">₹${order.total.toFixed(2)}</span>
        <div class="order-actions">
          <button class="btn-edit" onclick="editOrder('${order.id}')" title="Edit"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
          <button class="btn-delete" onclick="deleteOrder('${order.id}')" title="Delete"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateStats(orders) {
  document.getElementById('stat-total').textContent = orders.length;
  document.getElementById('stat-processing').textContent = orders.filter(o => o.status === 'processing').length;
  document.getElementById('stat-shipped').textContent = orders.filter(o => o.status === 'shipped').length;
  document.getElementById('stat-delivered').textContent = orders.filter(o => o.status === 'delivered').length;
}

// ══════════════════════════════════════════════════════
//  1. SEARCH & FILTER
// ══════════════════════════════════════════════════════

function filterOrders() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  let filtered = allOrders;

  // Apply status filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(o => o.status === currentFilter);
  }

  // Apply search query
  if (query) {
    filtered = filtered.filter(o =>
      o.name.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query) ||
      (o.customer && o.customer.toLowerCase().includes(query))
    );
  }

  renderOrders(filtered);
}

function setFilter(status, el) {
  currentFilter = status;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  filterOrders();
}

// ══════════════════════════════════════════════════════
//  3. DONUT CHART (Pure Canvas)
// ══════════════════════════════════════════════════════

function drawDonutChart(orders) {
  const canvas = document.getElementById('status-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, R = 80, r = 50;

  ctx.clearRect(0, 0, W, H);

  const counts = {
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  const total = orders.length;
  document.getElementById('chart-total-num').textContent = total;

  const segments = [
    { label: 'Processing', count: counts.processing, color: '#f97316' },
    { label: 'Shipped',    count: counts.shipped,    color: '#3b82f6' },
    { label: 'Delivered',  count: counts.delivered,  color: '#22c55e' }
  ];

  if (total === 0) {
    // Draw empty ring
    ctx.beginPath();
    ctx.arc(cx, cy, (R + r) / 2, 0, Math.PI * 2);
    ctx.lineWidth = R - r;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(255,255,255,0.06)';
    ctx.stroke();
  } else {
    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
      if (seg.count === 0) return;
      const sliceAngle = (seg.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (R + r) / 2, startAngle, startAngle + sliceAngle);
      ctx.lineWidth = R - r;
      ctx.strokeStyle = seg.color;
      ctx.lineCap = 'butt';
      ctx.stroke();
      startAngle += sliceAngle;
    });
  }

  // Legend
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = segments.map(s =>
    `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${s.label}: ${s.count}</div>`
  ).join('');
}

// ══════════════════════════════════════════════════════
//  4. NOTIFICATIONS
// ══════════════════════════════════════════════════════

function updateNotifications(orders) {
  const processing = orders.filter(o => o.status === 'processing');
  const shipped = orders.filter(o => o.status === 'shipped');
  const badge = document.getElementById('notif-badge');
  const notifList = document.getElementById('notif-list');

  const totalNotifs = processing.length + shipped.length;

  if (totalNotifs > 0) {
    badge.textContent = totalNotifs;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  // Build notification items
  let html = '';

  if (processing.length > 0) {
    html += `<div class="notif-item"><div class="notif-dot orange"></div><span><strong>${processing.length}</strong> order(s) still <strong>processing</strong> — awaiting shipment</span></div>`;
  }
  if (shipped.length > 0) {
    html += `<div class="notif-item"><div class="notif-dot blue"></div><span><strong>${shipped.length}</strong> order(s) currently <strong>in transit</strong></span></div>`;
  }

  const delivered = orders.filter(o => o.status === 'delivered');
  if (delivered.length > 0) {
    html += `<div class="notif-item"><div class="notif-dot green"></div><span><strong>${delivered.length}</strong> order(s) successfully <strong>delivered</strong></span></div>`;
  }

  if (!html) {
    html = '<div class="notif-empty">No new notifications 🎉</div>';
  }

  notifList.innerHTML = html;
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Close notif panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('btn-notif');
  if (panel && panel.style.display === 'block' && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// ══════════════════════════════════════════════════════
//  MODAL — ADD / UPDATE ORDER
// ══════════════════════════════════════════════════════

function openModal(mode) {
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('order-form').reset();
  document.getElementById('order-edit-id').value = '';

  if (mode === 'add') {
    editMode = false;
    document.getElementById('modal-title').textContent = 'Add New Order';
    document.getElementById('modal-submit-btn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg><span>Add Order</span>';
    document.getElementById('status-group').style.display = 'none';
    document.getElementById('order-qty').value = 1;
  } else {
    editMode = true;
    document.getElementById('modal-title').textContent = 'Update Order';
    document.getElementById('modal-submit-btn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg><span>Update Order</span>';
    document.getElementById('status-group').style.display = 'block';
    if (!document.getElementById('order-edit-id').value) {
      showToast('Select an order to update by clicking its edit button', 'success');
      closeModal();
      return;
    }
  }
}

function closeModal(e) {
  if (e && e.target && e.target !== document.getElementById('modal-overlay') && e.type === 'click') return;
  document.getElementById('modal-overlay').style.display = 'none';
}

function editOrder(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  editMode = true;
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('modal-title').textContent = `Update: ${order.id}`;
  document.getElementById('modal-submit-btn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg><span>Save Changes</span>';
  document.getElementById('status-group').style.display = 'block';

  document.getElementById('order-edit-id').value = order.id;
  document.getElementById('order-name').value = order.name;
  document.getElementById('order-qty').value = order.qty;
  document.getElementById('order-price').value = order.price;
  document.getElementById('order-customer').value = order.customer || '';
  document.getElementById('order-status').value = order.status;
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('order-edit-id').value;
  const name = document.getElementById('order-name').value.trim();
  const qty = parseFloat(document.getElementById('order-qty').value);
  const price = parseFloat(document.getElementById('order-price').value);
  const customer = document.getElementById('order-customer').value.trim();
  const status = document.getElementById('order-status').value;

  try {
    let res;
    if (editMode && id) {
      res = await fetch(`/api/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, qty, price, customer, status }) });
    } else {
      res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, qty, price, customer }) });
    }
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); closeModal(); loadOrders(); }
    else { showToast(data.message, 'error'); }
  } catch (err) { showToast('Network error. Please try again.', 'error'); }
}

function stepQty(delta) {
  const input = document.getElementById('order-qty');
  let val = parseInt(input.value) || 1;
  val = Math.min(100, Math.max(1, val + delta));
  input.value = val;
}

// ══════════════════════════════════════════════════════
//  DELETE ORDER
// ══════════════════════════════════════════════════════

async function deleteOrder(id) {
  if (!confirm(`Are you sure you want to delete order ${id}?`)) return;
  try {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); loadOrders(); }
    else { showToast(data.message, 'error'); }
  } catch (err) { showToast('Network error. Please try again.', 'error'); }
}

// ══════════════════════════════════════════════════════
//  5. CSV EXPORT
// ══════════════════════════════════════════════════════

function downloadCSV() {
  if (allOrders.length === 0) {
    showToast('No orders to export', 'error');
    return;
  }

  const headers = ['Order ID', 'Name', 'Customer', 'Qty', 'Price (₹)', 'Total (₹)', 'Status'];
  const rows = allOrders.map(o => [
    o.id,
    `"${o.name}"`,
    `"${o.customer || 'Guest'}"`,
    o.qty,
    o.price.toFixed(2),
    o.total.toFixed(2),
    o.status
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(r => csv += r.join(',') + '\n');

  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OTS_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`${allOrders.length} orders exported as CSV`, 'success');
}

// ══════════════════════════════════════════════════════
//  PDF REPORT
// ══════════════════════════════════════════════════════

async function handleExport() {
  const btn = document.getElementById('cta-export');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div><span>Generating Report...</span>';
  btn.style.opacity = '0.8';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.style.opacity = '1';
    btn.disabled = false;
    generatePDFReport();
    showToast(`Report generated for ${allOrders.length} orders`, 'success');
  }, 800);
}

function generatePDFReport() {
  const totalOrders = allOrders.length;
  const totalQty = allOrders.reduce((sum, o) => sum + o.qty, 0);
  const grandTotal = allOrders.reduce((sum, o) => sum + o.total, 0);
  const processing = allOrders.filter(o => o.status === 'processing').length;
  const shipped = allOrders.filter(o => o.status === 'shipped').length;
  const delivered = allOrders.filter(o => o.status === 'delivered').length;
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  const orderRows = allOrders.map((order, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(order.name)}</strong><br><small style="color:#666">${order.id}</small></td>
      <td>${order.customer || 'Guest'}</td>
      <td style="text-align:center">${order.qty}</td>
      <td style="text-align:right">₹${order.price.toFixed(2)}</td>
      <td style="text-align:right"><strong>₹${order.total.toFixed(2)}</strong></td>
      <td><span class="status status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
    </tr>
  `).join('');

  const reportHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>OTS Order Report — ${now}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;padding:40px;background:#fff;font-size:13px;line-height:1.5}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #16a34a;padding-bottom:20px;margin-bottom:30px}
    .header-left h1{font-size:24px;color:#16a34a;margin-bottom:4px}.header-left p{color:#666;font-size:12px}
    .header-right{text-align:right;font-size:12px;color:#555}.header-right strong{display:block;font-size:14px;color:#1a1a2e}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:30px}
    .stat-box{background:#f8f9fa;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center}
    .stat-box .number{font-size:28px;font-weight:800;display:block}.stat-box .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
    .stat-box.green .number{color:#16a34a}.stat-box.blue .number{color:#3b82f6}.stat-box.orange .number{color:#f97316}.stat-box.purple .number{color:#7c3aed}
    .section-title{font-size:16px;font-weight:700;margin-bottom:12px;color:#1a1a2e;display:flex;align-items:center;gap:8px}
    .section-title::before{content:'';width:4px;height:18px;background:#16a34a;border-radius:2px;display:inline-block}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    th:first-child{border-radius:8px 0 0 0}th:last-child{border-radius:0 8px 0 0}
    td{padding:10px 12px;border-bottom:1px solid #eee;font-size:12px}tr:nth-child(even) td{background:#fafafa}
    .status{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase}
    .status-processing{background:#fff7ed;color:#f97316;border:1px solid #fed7aa}
    .status-shipped{background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe}
    .status-delivered{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
    .summary-row{display:flex;justify-content:flex-end;gap:30px;padding:16px 0;border-top:2px solid #1a1a2e;margin-top:8px}
    .summary-item{text-align:right}.summary-item .label{font-size:11px;color:#666}.summary-item .value{font-size:20px;font-weight:800;color:#16a34a}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#999}
    @media print{body{padding:20px}.no-print{display:none!important}}</style></head><body>
    <div class="no-print" style="text-align:center;margin-bottom:20px">
      <button onclick="window.print()" style="padding:12px 32px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">📄 Save as PDF / Print</button>
      <p style="margin-top:8px;color:#888;font-size:12px">Tip: Select <strong>"Save as PDF"</strong> as destination</p></div>
    <div class="header"><div class="header-left"><h1>📦 Order Tracking System (OTS)</h1><p>E-Commerce Order Report</p></div>
    <div class="header-right"><strong>Order Report</strong>Generated: ${now}<br>User: ${currentUser ? currentUser.name : 'Admin'}</div></div>
    <div class="stats-grid">
      <div class="stat-box purple"><span class="number">${totalOrders}</span><span class="label">Total Orders</span></div>
      <div class="stat-box orange"><span class="number">${processing}</span><span class="label">Processing</span></div>
      <div class="stat-box blue"><span class="number">${shipped}</span><span class="label">Shipped</span></div>
      <div class="stat-box green"><span class="number">${delivered}</span><span class="label">Delivered</span></div></div>
    <div class="section-title">Order Details</div>
    <table><thead><tr><th>#</th><th>Order</th><th>Customer</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th><th>Status</th></tr></thead>
    <tbody>${orderRows}</tbody></table>
    <div class="summary-row"><div class="summary-item"><div class="label">Total Items</div><div class="value">${totalQty}</div></div>
    <div class="summary-item"><div class="label">Grand Total</div><div class="value">₹${grandTotal.toFixed(2)}</div></div></div>
    <div class="footer">Order Tracking System (OTS) &mdash; Report generated on ${now}<br>This is a system-generated report.</div></body></html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHTML);
  printWindow.document.close();
}

// ══════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ══════════════════════════════════════════════════════

let toastTimeout;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  const iconEl = document.getElementById('toast-icon');
  msgEl.textContent = message;
  toast.classList.toggle('error', type === 'error');
  iconEl.innerHTML = type === 'error'
    ? '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>'
    : '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>';
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('modal-overlay').style.display = 'none';
});

// ═══════════════════════════════════════════════════
//  INIT — Run on page load
// ═══════════════════════════════════════════════════
loadTheme();
checkSession();

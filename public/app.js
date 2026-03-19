// ======================================================
// app.js — Login & Register Client Logic
// Handles auth for both User and Shopkeeper roles
// ======================================================

let selectedRole = 'user';
let isRegister = false;

// Check if already logged in
function checkSession() {
  try {
    const raw = localStorage.getItem('ots_session');
    if (raw) {
      const session = JSON.parse(raw);
      // Validate session has required fields (prevents old/corrupt sessions from crashing)
      if (session && session.role && session.token) {
        window.location.href = session.role === 'shopkeeper' ? '/shopkeeper' : '/user';
        return;
      }
      // Invalid session — remove it
      localStorage.removeItem('ots_session');
    }
  } catch (e) {
    // Corrupt localStorage data — clear it
    localStorage.removeItem('ots_session');
  }
  const theme = localStorage.getItem('ots_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}


function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-user').classList.toggle('active', role === 'user');
  document.getElementById('role-shopkeeper').classList.toggle('active', role === 'shopkeeper');
}

function toggleMode(e) {
  e.preventDefault();
  isRegister = !isRegister;
  document.getElementById('name-group').style.display = isRegister ? 'block' : 'none';
  document.getElementById('auth-btn').innerHTML = isRegister
    ? '<span>Create Account</span><svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
    : '<span>Sign In</span><svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
  document.getElementById('login-subtitle').textContent = isRegister ? 'Create a new account' : 'Sign in to your account';
  document.getElementById('toggle-text').textContent = isRegister ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('toggle-link').textContent = isRegister ? 'Sign In' : 'Register';
  document.getElementById('hint').style.display = isRegister ? 'none' : 'block';
  document.getElementById('auth-error').style.display = 'none';
}

async function handleAuth(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorEl = document.getElementById('auth-error');
  errorEl.style.display = 'none';

  if (isRegister) {
    const name = document.getElementById('auth-name').value.trim();
    if (!name) { showErr(errorEl, 'Please enter your name'); return; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role: selectedRole })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        isRegister = true;
        toggleMode(new Event('click')); // Switch back to login
      } else { showErr(errorEl, data.message); }
    } catch (err) { showErr(errorEl, 'Network error'); }
    return;
  }

  // Login
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: selectedRole })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('ots_session', JSON.stringify({ token: data.token, ...data.user }));
      showToast(data.message, 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'shopkeeper' ? '/shopkeeper' : '/user';
      }, 600);
    } else { showErr(errorEl, data.message); }
  } catch (err) { showErr(errorEl, 'Network error'); }
}

function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }

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

checkSession();

// ======================================================
// jsonStore.js — SQLite-backed Data Store for OTS
// Always uses SQLite (local: data/ots.db, Vercel: /tmp/ots.db)
// Same API: readData, writeData, getNextId
// ======================================================

const db = require('./database');

const TABLE_MAP = {
  'users.json': 'users',
  'shopkeepers.json': 'shopkeepers',
  'products.json': 'products',
  'orders.json': 'orders',
  'requests.json': 'requests'
};

function readData(filename) {
  const table = TABLE_MAP[filename];
  if (!table) { console.error(`[jsonStore] Unknown file: ${filename}`); return []; }

  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();

    if (table === 'orders') {
      return rows.map(row => ({
        ...row,
        items: JSON.parse(row.items || '[]'),
        total: Number(row.total)
      }));
    }
    if (table === 'products') {
      return rows.map(row => ({
        ...row,
        price: Number(row.price),
        stock: Number(row.stock)
      }));
    }
    return rows;
  } catch (err) {
    console.error(`[jsonStore] Error reading ${filename}:`, err.message);
    return [];
  }
}

function writeData(filename, data) {
  const table = TABLE_MAP[filename];
  if (!table) { console.error(`[jsonStore] Unknown file: ${filename}`); return; }

  try {
    const transaction = db.transaction(() => {
      db.prepare(`DELETE FROM ${table}`).run();
      if (!data || data.length === 0) return;

      if (table === 'orders') {
        const stmt = db.prepare(`INSERT INTO orders (id, userId, userName, items, total, status, paymentStatus, paymentMethod, createdAt, updatedAt, approvedAt) VALUES (@id, @userId, @userName, @items, @total, @status, @paymentStatus, @paymentMethod, @createdAt, @updatedAt, @approvedAt)`);
        for (const row of data) {
          stmt.run({ id: row.id, userId: row.userId, userName: row.userName, items: JSON.stringify(row.items), total: row.total, status: row.status || 'pending', paymentStatus: row.paymentStatus || 'unpaid', paymentMethod: row.paymentMethod || 'cash', createdAt: row.createdAt, updatedAt: row.updatedAt || null, approvedAt: row.approvedAt || null });
        }
      } else if (table === 'requests') {
        const stmt = db.prepare(`INSERT INTO requests (id, userId, userName, productName, description, status, shopkeeperNote, createdAt, updatedAt) VALUES (@id, @userId, @userName, @productName, @description, @status, @shopkeeperNote, @createdAt, @updatedAt)`);
        for (const row of data) {
          stmt.run({ id: row.id, userId: row.userId, userName: row.userName, productName: row.productName, description: row.description || '', status: row.status || 'pending', shopkeeperNote: row.shopkeeperNote || '', createdAt: row.createdAt, updatedAt: row.updatedAt || null });
        }
      } else if (table === 'products') {
        const stmt = db.prepare(`INSERT INTO products (id, name, price, description, image, stock, shopkeeperId, createdAt) VALUES (@id, @name, @price, @description, @image, @stock, @shopkeeperId, @createdAt)`);
        for (const row of data) {
          stmt.run({ id: row.id, name: row.name, price: row.price, description: row.description || '', image: row.image || '', stock: row.stock || 0, shopkeeperId: row.shopkeeperId || 'SHOP-001', createdAt: row.createdAt });
        }
      } else {
        const stmt = db.prepare(`INSERT INTO ${table} (id, name, username, password, createdAt) VALUES (@id, @name, @username, @password, @createdAt)`);
        for (const row of data) {
          stmt.run({ id: row.id, name: row.name, username: row.username, password: row.password, createdAt: row.createdAt });
        }
      }
    });
    transaction();
    console.log(`[jsonStore] ✓ ${filename} saved (${data.length} items) [SQLite]`);
  } catch (err) {
    console.error(`[jsonStore] Error writing ${filename}:`, err.message);
  }
}

function getNextId(filename, prefix) {
  const data = readData(filename);
  if (data.length === 0) return `${prefix}-001`;

  const nums = data.map(item => {
    const parts = item.id.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  });
  const max = Math.max(...nums);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

module.exports = { readData, writeData, getNextId };

// ======================================================
// jsonStore.js — Async Data Store for OTS
// Works with both Turso (cloud) and better-sqlite3 (local)
// Same API: readData, writeData, getNextId (all async now)
// ======================================================

const { client, dbReady } = require('./database');

const TABLE_MAP = {
  'users.json': 'users',
  'shopkeepers.json': 'shopkeepers',
  'products.json': 'products',
  'orders.json': 'orders',
  'requests.json': 'requests'
};

async function readData(filename) {
  await dbReady;
  const table = TABLE_MAP[filename];
  if (!table) { console.error(`[jsonStore] Unknown file: ${filename}`); return []; }

  try {
    const result = await client.execute(`SELECT * FROM ${table}`);
    let rows = result.rows;

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

async function writeData(filename, data) {
  await dbReady;
  const table = TABLE_MAP[filename];
  if (!table) { console.error(`[jsonStore] Unknown file: ${filename}`); return; }

  try {
    await client.execute(`DELETE FROM ${table}`);

    if (!data || data.length === 0) return;

    for (const row of data) {
      if (table === 'orders') {
        await client.execute({ sql: `INSERT INTO orders (id, userId, userName, items, total, status, paymentStatus, paymentMethod, createdAt, updatedAt, approvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.userId, row.userName, JSON.stringify(row.items), row.total, row.status || 'pending', row.paymentStatus || 'unpaid', row.paymentMethod || 'cash', row.createdAt, row.updatedAt || null, row.approvedAt || null] });
      } else if (table === 'requests') {
        await client.execute({ sql: `INSERT INTO requests (id, userId, userName, productName, description, status, shopkeeperNote, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.userId, row.userName, row.productName, row.description || '', row.status || 'pending', row.shopkeeperNote || '', row.createdAt, row.updatedAt || null] });
      } else if (table === 'products') {
        await client.execute({ sql: `INSERT INTO products (id, name, price, description, image, stock, shopkeeperId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.name, row.price, row.description || '', row.image || '', row.stock || 0, row.shopkeeperId || 'SHOP-001', row.createdAt] });
      } else {
        await client.execute({ sql: `INSERT INTO ${table} (id, name, username, password, createdAt) VALUES (?, ?, ?, ?, ?)`, args: [row.id, row.name, row.username, row.password, row.createdAt] });
      }
    }
    console.log(`[jsonStore] ✓ ${filename} saved (${data.length} items)`);
  } catch (err) {
    console.error(`[jsonStore] Error writing ${filename}:`, err.message);
  }
}

async function getNextId(filename, prefix) {
  const data = await readData(filename);
  if (data.length === 0) return `${prefix}-001`;

  const nums = data.map(item => {
    const parts = item.id.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  });
  const max = Math.max(...nums);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

module.exports = { readData, writeData, getNextId };

// ======================================================
// database.js — Database Layer for OTS
// Uses Turso (cloud) when TURSO_DATABASE_URL is set
// Falls back to better-sqlite3 (local) otherwise
// ======================================================

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USE_TURSO = !!(TURSO_URL && TURSO_TOKEN);

let client;

if (USE_TURSO) {
  const { createClient } = require('@libsql/client');
  client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  console.log('[database] Using Turso cloud database');
} else {
  // Local: use better-sqlite3 wrapper that mimics the Turso client API
  const Database = require('better-sqlite3');
  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DATA_DIR, 'ots.db');

  const sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');

  // Wrap better-sqlite3 to match Turso's async API
  client = {
    execute: async (opts) => {
      const sql = typeof opts === 'string' ? opts : opts.sql;
      const args = (typeof opts === 'object' && opts.args) ? opts.args : [];
      const stmt = sqliteDb.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
        const rows = args.length > 0 ? stmt.all(...args) : stmt.all();
        return { rows };
      } else {
        const result = args.length > 0 ? stmt.run(...args) : stmt.run();
        return { rowsAffected: result.changes };
      }
    },
    batch: async (stmts) => {
      const results = [];
      for (const s of stmts) {
        results.push(await client.execute(s));
      }
      return results;
    }
  };
  console.log(`[database] Using local SQLite at: ${DB_PATH}`);
}

// ── Create Tables ─────────────────────────────────────
async function initDatabase() {
  const createSQL = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shopkeepers (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, description TEXT DEFAULT '', image TEXT DEFAULT '', stock INTEGER DEFAULT 0, shopkeeperId TEXT DEFAULT 'SHOP-001', createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT NOT NULL, items TEXT NOT NULL, total REAL NOT NULL, status TEXT DEFAULT 'pending', paymentStatus TEXT DEFAULT 'unpaid', paymentMethod TEXT DEFAULT 'cash', createdAt TEXT NOT NULL, updatedAt TEXT, approvedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT NOT NULL, productName TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'pending', shopkeeperNote TEXT DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT)`
  ];

  for (const sql of createSQL) {
    await client.execute(sql);
  }
  console.log('[database] ✓ Tables ready');
}

// ── Seed from JSON files (only if tables are empty) ───
async function seedFromJSON() {
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const tables = ['users', 'shopkeepers', 'products', 'orders', 'requests'];

  for (const table of tables) {
    const result = await client.execute(`SELECT COUNT(*) as c FROM ${table}`);
    const count = result.rows[0].c || result.rows[0]['COUNT(*)'] || 0;
    if (count > 0) continue;

    const jsonFile = path.join(DATA_DIR, `${table}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      if (!Array.isArray(data) || data.length === 0) continue;

      console.log(`[database] Seeding ${table} (${data.length} rows)...`);

      for (const row of data) {
        if (table === 'orders') {
          await client.execute({ sql: `INSERT OR IGNORE INTO orders (id, userId, userName, items, total, status, paymentStatus, paymentMethod, createdAt, updatedAt, approvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.userId, row.userName, JSON.stringify(row.items), row.total, row.status || 'pending', row.paymentStatus || 'unpaid', row.paymentMethod || 'cash', row.createdAt, row.updatedAt || null, row.approvedAt || null] });
        } else if (table === 'requests') {
          await client.execute({ sql: `INSERT OR IGNORE INTO requests (id, userId, userName, productName, description, status, shopkeeperNote, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.userId, row.userName, row.productName, row.description || '', row.status || 'pending', row.shopkeeperNote || '', row.createdAt, row.updatedAt || null] });
        } else if (table === 'products') {
          await client.execute({ sql: `INSERT OR IGNORE INTO products (id, name, price, description, image, stock, shopkeeperId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [row.id, row.name, row.price, row.description || '', row.image || '', row.stock || 0, row.shopkeeperId || 'SHOP-001', row.createdAt] });
        } else {
          await client.execute({ sql: `INSERT OR IGNORE INTO ${table} (id, name, username, password, createdAt) VALUES (?, ?, ?, ?, ?)`, args: [row.id, row.name, row.username, row.password, row.createdAt] });
        }
      }
      console.log(`[database] ✓ ${table} seeded`);
    } catch (err) {
      console.error(`[database] Error seeding ${table}:`, err.message);
    }
  }
}

// Run init
const dbReady = (async () => {
  await initDatabase();
  await seedFromJSON();
  console.log('[database] ✓ Database fully initialized');
})();

module.exports = { client, dbReady };

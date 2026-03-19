// ======================================================
// database.js — SQLite Database Layer for OTS
// Replaces JSON file storage with reliable SQLite
// ======================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'ots.db');

// Open (or create) the database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ── Create Tables ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shopkeepers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    shopkeeperId TEXT DEFAULT 'SHOP-001',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    paymentStatus TEXT DEFAULT 'unpaid',
    paymentMethod TEXT DEFAULT 'cash',
    createdAt TEXT NOT NULL,
    updatedAt TEXT,
    approvedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    productName TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    shopkeeperNote TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );
`);

// ── Seed from JSON files (only if tables are empty) ────
function seedFromJSON() {
  const tables = ['users', 'shopkeepers', 'products', 'orders', 'requests'];

  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    if (count > 0) continue; // Already has data — skip

    const jsonFile = path.join(DATA_DIR, `${table}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      if (!Array.isArray(data) || data.length === 0) continue;

      console.log(`[database] Seeding ${table} from ${table}.json (${data.length} rows)...`);

      if (table === 'orders') {
        // Orders have nested 'items' array — store as JSON string
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO orders (id, userId, userName, items, total, status, paymentStatus, paymentMethod, createdAt, updatedAt, approvedAt)
          VALUES (@id, @userId, @userName, @items, @total, @status, @paymentStatus, @paymentMethod, @createdAt, @updatedAt, @approvedAt)
        `);
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            stmt.run({
              id: row.id,
              userId: row.userId,
              userName: row.userName,
              items: JSON.stringify(row.items),
              total: row.total,
              status: row.status || 'pending',
              paymentStatus: row.paymentStatus || 'unpaid',
              paymentMethod: row.paymentMethod || 'cash',
              createdAt: row.createdAt,
              updatedAt: row.updatedAt || null,
              approvedAt: row.approvedAt || null
            });
          }
        });
        insertMany(data);
      } else if (table === 'requests') {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO requests (id, userId, userName, productName, description, status, shopkeeperNote, createdAt, updatedAt)
          VALUES (@id, @userId, @userName, @productName, @description, @status, @shopkeeperNote, @createdAt, @updatedAt)
        `);
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            stmt.run({
              id: row.id,
              userId: row.userId,
              userName: row.userName,
              productName: row.productName,
              description: row.description || '',
              status: row.status || 'pending',
              shopkeeperNote: row.shopkeeperNote || '',
              createdAt: row.createdAt,
              updatedAt: row.updatedAt || null
            });
          }
        });
        insertMany(data);
      } else if (table === 'products') {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO products (id, name, price, description, image, stock, shopkeeperId, createdAt)
          VALUES (@id, @name, @price, @description, @image, @stock, @shopkeeperId, @createdAt)
        `);
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            stmt.run({
              id: row.id,
              name: row.name,
              price: row.price,
              description: row.description || '',
              image: row.image || '',
              stock: row.stock || 0,
              shopkeeperId: row.shopkeeperId || 'SHOP-001',
              createdAt: row.createdAt
            });
          }
        });
        insertMany(data);
      } else {
        // users / shopkeepers — same schema
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO ${table} (id, name, username, password, createdAt)
          VALUES (@id, @name, @username, @password, @createdAt)
        `);
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            stmt.run({
              id: row.id,
              name: row.name,
              username: row.username,
              password: row.password,
              createdAt: row.createdAt
            });
          }
        });
        insertMany(data);
      }

      console.log(`[database] ✓ ${table} seeded (${data.length} rows)`);
    } catch (err) {
      console.error(`[database] Error seeding ${table}:`, err.message);
    }
  }
}

seedFromJSON();

// ── Export the database instance ───────────────────────
module.exports = db;

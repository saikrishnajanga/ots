// ======================================================
// jsonStore.js — JSON File Read/Write Helper
// Works on local (file I/O) and Vercel (in-memory fallback)
// ======================================================

const fs = require('fs');
const path = require('path');

// Path to the data folder
const DATA_DIR = path.join(__dirname, '..', 'data');

// Detect if running on Vercel (read-only filesystem)
const IS_SERVERLESS = !!process.env.VERCEL;

// In-memory cache — always kept in sync with disk on local
const memoryStore = {};

/**
 * Read data from a JSON file
 * @param {string} filename - Name of JSON file (e.g., 'users.json')
 * @returns {Array} - Parsed array from the file
 */
function readData(filename) {
  // On serverless, always use memory cache after first load
  if (IS_SERVERLESS && memoryStore[filename]) {
    return memoryStore[filename];
  }

  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Always update memory cache to stay in sync
    memoryStore[filename] = data;

    return data;
  } catch (err) {
    console.error(`[jsonStore] Error reading ${filename}:`, err.message);
    if (IS_SERVERLESS) {
      memoryStore[filename] = [];
    }
    return [];
  }
}

/**
 * Write data to a JSON file
 * On Vercel: saves to memory only (read-only filesystem)
 * On local: saves to actual JSON file on disk + verifies the write
 * @param {string} filename - Name of JSON file
 * @param {Array} data - Array of objects to save
 */
function writeData(filename, data) {
  // Always update memory cache
  memoryStore[filename] = data;

  // On local: write to disk AND verify
  if (!IS_SERVERLESS) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonStr, 'utf-8');

      // Verify write: read back and compare length
      const verify = fs.readFileSync(filePath, 'utf-8');
      const verifyData = JSON.parse(verify);
      if (verifyData.length !== data.length) {
        console.error(`[jsonStore] WRITE VERIFICATION FAILED for ${filename}! Expected ${data.length} items, got ${verifyData.length}`);
      } else {
        console.log(`[jsonStore] ✓ ${filename} saved (${data.length} items)`);
      }
    } catch (err) {
      console.error(`[jsonStore] Error writing ${filename}:`, err.message);
    }
  } else {
    console.log(`[jsonStore] ✓ ${filename} saved to memory (${data.length} items) [serverless]`);
  }
}

/**
 * Generate the next sequential ID for a collection
 * @param {string} filename - JSON file to check
 * @param {string} prefix - ID prefix (e.g., 'USR', 'ORD', 'PRD')
 * @returns {string} - New ID like 'ORD-005'
 */
function getNextId(filename, prefix) {
  const data = readData(filename);
  if (data.length === 0) return `${prefix}-001`;

  // Find the highest numeric portion
  const nums = data.map(item => {
    const parts = item.id.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  });
  const max = Math.max(...nums);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

module.exports = { readData, writeData, getNextId };

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

// In-memory cache — always kept in sync with disk
const memoryStore = {};

/**
 * Read data from a JSON file
 * Uses in-memory cache after first load to avoid repeated disk I/O
 * @param {string} filename - Name of JSON file (e.g., 'users.json')
 * @returns {Array} - Parsed array from the file
 */
function readData(filename) {
  // Use memory cache after first load (both local and serverless)
  if (memoryStore[filename]) {
    return memoryStore[filename];
  }

  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Cache for future reads
    memoryStore[filename] = data;

    return data;
  } catch (err) {
    console.error(`[jsonStore] Error reading ${filename}:`, err.message);
    memoryStore[filename] = [];
    return [];
  }
}

/**
 * Write data to a JSON file
 * On Vercel: saves to memory only (read-only filesystem)
 * On local: saves to actual JSON file on disk
 * @param {string} filename - Name of JSON file
 * @param {Array} data - Array of objects to save
 */
function writeData(filename, data) {
  // Always update memory cache
  memoryStore[filename] = data;

  // On local: write to disk (no verification re-read — cache is the source of truth)
  if (!IS_SERVERLESS) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonStr, 'utf-8');
      console.log(`[jsonStore] ✓ ${filename} saved (${data.length} items)`);
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

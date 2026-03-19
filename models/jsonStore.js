// ======================================================
// jsonStore.js — JSON File Read/Write Helper
// Provides simple functions to read/write JSON files
// This replaces a database for our beginner project
// ======================================================

const fs = require('fs');
const path = require('path');

// Path to the data folder
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read data from a JSON file
 * @param {string} filename - Name of JSON file (e.g., 'users.json')
 * @returns {Array} - Parsed array from the file
 */
function readData(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist or is corrupt, return empty array
    console.error(`Error reading ${filename}:`, err.message);
    return [];
  }
}

/**
 * Write data to a JSON file
 * @param {string} filename - Name of JSON file
 * @param {Array} data - Array of objects to save
 */
function writeData(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
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

// Export all functions
module.exports = { readData, writeData, getNextId };

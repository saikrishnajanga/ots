// ======================================================
// mathmodule.js — Local Module Example
// This module provides simple math/utility functions
// that are used throughout the Order Tracking System.
// ======================================================

/**
 * Calculate the total price for an order
 * @param {number} qty - Quantity of items
 * @param {number} pricePerUnit - Price per unit
 * @returns {number} Total price
 */
function calculateTotal(qty, pricePerUnit) {
  return parseFloat((qty * pricePerUnit).toFixed(2));
}

/**
 * Apply discount percentage to a total
 * @param {number} total - Original total
 * @param {number} discountPercent - Discount percentage (e.g., 10 for 10%)
 * @returns {number} Discounted total
 */
function applyDiscount(total, discountPercent) {
  const discount = total * (discountPercent / 100);
  return parseFloat((total - discount).toFixed(2));
}

/**
 * Generate a unique order ID
 * Format: OTS-XXXXXX (random 6-digit number)
 * @returns {string} Order ID
 */
function generateOrderId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `OTS-${randomNum}`;
}

/**
 * Format a date to a readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Validate that a value is a positive number
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid positive number
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0 && isFinite(value);
}

// Export all functions so other files can use them
// Usage: const math = require('./mathmodule');
//        math.calculateTotal(5, 10.99);
module.exports = {
  calculateTotal,
  applyDiscount,
  generateOrderId,
  formatDate,
  isPositiveNumber
};

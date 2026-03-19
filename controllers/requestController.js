// ======================================================
// requestController.js — Product Request Logic
// User: Request a product that's not available
// Shopkeeper: View requests, approve/reject
// ======================================================

const store = require('../models/jsonStore');

/**
 * POST /api/requests
 * User only — request a product
 * Body: { productName, description }
 */
function createRequest(req, res) {
  const { productName, description } = req.body;

  if (!productName) {
    return res.status(400).json({ success: false, message: 'Please provide a product name' });
  }

  const users = store.readData('users.json');
  const user = users.find(u => u.username === req.user.username);
  const requests = store.readData('requests.json');

  const newRequest = {
    id: store.getNextId('requests.json', 'REQ'),
    userId: user ? user.id : 'USR-000',
    userName: user ? user.name : req.user.username,
    productName,
    description: description || '',
    status: 'pending',
    shopkeeperNote: '',
    createdAt: new Date().toISOString()
  };

  requests.push(newRequest);
  store.writeData('requests.json', requests);

  res.status(201).json({
    success: true,
    message: `Request for "${productName}" submitted!`,
    request: newRequest
  });
}

/**
 * GET /api/requests
 * User: own requests | Shopkeeper: all requests
 */
function getRequests(req, res) {
  const requests = store.readData('requests.json');

  if (req.user.role === 'shopkeeper') {
    return res.json({ success: true, count: requests.length, requests });
  }

  // User sees only own requests
  const users = store.readData('users.json');
  const user = users.find(u => u.username === req.user.username);
  const myReqs = user ? requests.filter(r => r.userId === user.id) : [];

  res.json({ success: true, count: myReqs.length, requests: myReqs });
}

/**
 * PUT /api/requests/:id
 * Shopkeeper only — approve or reject a request
 * Body: { status, shopkeeperNote }
 */
function updateRequest(req, res) {
  const { status, shopkeeperNote } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be "approved" or "rejected"' });
  }

  const requests = store.readData('requests.json');
  const index = requests.findIndex(r => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  requests[index].status = status;
  requests[index].shopkeeperNote = shopkeeperNote || '';
  requests[index].updatedAt = new Date().toISOString();
  store.writeData('requests.json', requests);

  res.json({
    success: true,
    message: `Request ${requests[index].id} ${status}!`,
    request: requests[index]
  });
}

module.exports = { createRequest, getRequests, updateRequest };

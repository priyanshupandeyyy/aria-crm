const express = require('express');
const router = express.Router();
const { simulateDelivery } = require('../simulator/deliveryEngine');

// POST /api/send
// Body: { msg_id, recipient, channel, message, callback_url }
// Validate all 5 fields present, return 400 if missing
// Immediately return 202: { accepted: true, msg_id }
// AFTER sending response, fire simulateDelivery() without awaiting it (fire and forget) using setImmediate
router.post('/', (req, res) => {
  try {
    const { msg_id, recipient, channel, message, callback_url } = req.body;

    // Validate all 5 fields are present
    if (!msg_id || !recipient || !channel || !message || !callback_url) {
      return res.status(400).json({
        error: 'Missing required fields. All of msg_id, recipient, channel, message, and callback_url must be provided.'
      });
    }

    // Immediately return 202 Accepted
    res.status(202).json({
      accepted: true,
      msg_id
    });

    // Fire and forget simulator delivery process
    setImmediate(() => {
      simulateDelivery(msg_id, recipient, channel, message, callback_url);
    });
  } catch (error) {
    console.error('Error in /api/send route handler:', error);
    // Note: Since we might have already sent a response, check headersSent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Communication = require('../models/Communication');
const Campaign = require('../models/Campaign');

// Valid status order for lifecycle validation
const STATUS_ORDER = ["queued", "sent", "delivered", "failed", "opened", "read", "clicked"];

// POST /api/receipts
// Handles delivery callbacks from the Channel Service
router.post('/', async (req, res) => {
  try {
    const { msg_id, status, timestamp, meta } = req.body;

    if (!msg_id || !status) {
      return res.status(400).json({ error: 'msg_id and status are required fields.' });
    }

    if (!mongoose.Types.ObjectId.isValid(msg_id)) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    const communication = await Communication.findById(msg_id);
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    const currentIndex = STATUS_ORDER.indexOf(communication.status);
    const newIndex = STATUS_ORDER.indexOf(status);

    if (newIndex === -1) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Validate status transition: only update if the new status is later in STATUS_ORDER than current status,
    // OR if status is "failed" (which can come after "sent")
    const isValidTransition = newIndex > currentIndex || (status === 'failed' && communication.status === 'sent');

    if (isValidTransition) {
      // Update communication status and history
      communication.status = status;
      communication.status_history.push({
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        meta
      });
      await communication.save();

      // If status is "delivered", "failed", "opened", or "clicked", increment campaign stats
      let incField = null;
      if (status === 'delivered') {
        incField = 'stats.delivered';
      } else if (status === 'failed') {
        incField = 'stats.failed';
      } else if (status === 'opened') {
        incField = 'stats.opened';
      } else if (status === 'clicked') {
        incField = 'stats.clicked';
      } else if (status === 'sent') {
        incField = 'stats.sent';
      }

      if (incField) {
        const campaign = await Campaign.findByIdAndUpdate(
          communication.campaign_id,
          { $inc: { [incField]: 1 } },
          { new: true }
        );

        // Check if the campaign is complete: if stats.delivered + stats.failed >= stats.total, update campaign status to "completed"
        if (campaign && campaign.stats) {
          const delivered = campaign.stats.delivered || 0;
          const failed = campaign.stats.failed || 0;
          const total = campaign.stats.total || 0;

          if (delivered + failed >= total) {
            campaign.status = 'completed';
            await campaign.save();
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

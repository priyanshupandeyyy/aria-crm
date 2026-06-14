const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');

const Campaign = require('../models/Campaign');
const Segment = require('../models/Segment');
const Communication = require('../models/Communication');
const Customer = require('../models/Customer');
const segmentEngine = require('../services/segmentEngine');
const { generateMessageVariants, analyzeCampaign } = require('../services/gemini');

// GET /api/campaigns
// Return all campaigns sorted by created_at desc
// Populate segment_id with name and customer_count fields only
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ created_at: -1 })
      .populate('segment_id', 'name customer_count');

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns/generate-message
// Generate AI-powered WhatsApp message variants for a given segment
router.post('/generate-message', async (req, res) => {
  try {
    const { segment_id } = req.body;

    // 1. Find the segment
    if (!mongoose.Types.ObjectId.isValid(segment_id)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = await Segment.findById(segment_id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // 2. Build mongo query from segment rules
    const mongoQuery = segmentEngine.buildMongoQuery(segment.rules || []);

    // 3. Fetch 3 sample customers for context
    const sampleCustomers = await Customer.find(mongoQuery)
      .limit(3)
      .select('name total_orders total_spend last_order_date');

    // 4. Call Gemini to generate message variants
    let variants;
    try {
      variants = await generateMessageVariants(segment.name, segment.description, sampleCustomers);
    } catch {
      return res.status(422).json({ error: 'AI could not generate messages. Please try again.' });
    }

    // 5. Return variants
    res.json({ variants });
  } catch (error) {
    console.error('Error generating message variants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns
// Body: { name, segment_id, channel, message_template, ai_generated, scheduled_at }
// Validate segment exists, return 404 if not
// Create campaign with status "draft"
// Return 201
router.post('/', async (req, res) => {
  try {
    const { name, segment_id, channel, message_template, ai_generated, scheduled_at } = req.body;

    // Validate segment_id is a valid ObjectId format and check if segment exists
    if (!mongoose.Types.ObjectId.isValid(segment_id)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segmentExists = await Segment.findById(segment_id);
    if (!segmentExists) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const campaign = new Campaign({
      name,
      segment_id,
      channel,
      message_template,
      ai_generated,
      scheduled_at,
      status: 'draft'
    });

    const savedCampaign = await campaign.save();
    res.status(201).json(savedCampaign);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/:id
// Return campaign with segment populated
// Return 404 if not found
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = await Campaign.findById(id).populate('segment_id');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const communications = await Communication.find({ campaign_id: id })
      .populate('customer_id', 'name')
      .sort({ updated_at: -1 });
    const campaignObj = campaign.toObject();
    campaignObj.communications = communications;

    res.json(campaignObj);
  } catch (error) {
    console.error(`Error fetching campaign ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns/:id/launch
// This is the most important route
// Find the campaign, check it's in "draft" status
// Find the segment and build its mongo query using segmentEngine
// Get all customers matching the segment query (select _id, name, phone, email, channel_preference)
// Update campaign status to "sending", set sent_at to now, set stats.total to customer count
// For each customer, create a Communication document
// Save all communications using Communication.insertMany()
// Then for each communication, call Channel Service: POST to process.env.CHANNEL_SERVICE_URL + "/api/send"
// Fire the channel service calls with Promise.allSettled()
// Update campaign status to "active"
// Return { message: "Campaign launched", total: customerCount }
router.post('/:id/launch', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // 1. Find the campaign and verify draft status
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign is not in draft status' });
    }

    // 2. Find the segment to build customer query
    const segment = await Segment.findById(campaign.segment_id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const query = segmentEngine.buildMongoQuery(segment.rules || []);

    // 3. Get all matching customers
    const customers = await Customer.find(query).select('_id name phone email channel_preference');
    const customerCount = customers.length;

    // 4. Update campaign to "sending"
    campaign.status = 'sending';
    campaign.sent_at = new Date();
    if (!campaign.stats) {
      campaign.stats = {};
    }
    campaign.stats.total = customerCount;
    await campaign.save();

    let savedCommunications = [];

    if (customerCount > 0) {
      // 5. Create communication data
      const communicationsData = customers.map(customer => {
        // Personalize the template by replacing {name} with customer.name
        const personalizedMessage = campaign.message_template.replace(/\{name\}/g, customer.name);
        return {
          campaign_id: campaign._id,
          customer_id: customer._id,
          channel: campaign.channel,
          message: personalizedMessage,
          status: 'queued'
        };
      });

      // 6. Save all communications using Communication.insertMany()
      savedCommunications = await Communication.insertMany(communicationsData);

      // 7. Prepare channel service calls
      const customerMap = new Map(customers.map(c => [c._id.toString(), c]));
      const channelServiceCalls = savedCommunications.map(comm => {
        const customer = customerMap.get(comm.customer_id.toString());
        const recipientPhone = customer ? customer.phone : '';

        return axios.post(`${process.env.CHANNEL_SERVICE_URL}/api/send`, {
          msg_id: comm._id.toString(),
          recipient: recipientPhone,
          channel: campaign.channel,
          message: comm.message,
          callback_url: process.env.CHANNEL_CALLBACK_URL
        });
      });

      // 8. Fire the channel service calls with Promise.allSettled()
      await Promise.allSettled(channelServiceCalls);
    }

    // 9. Update campaign status to "active"
    campaign.status = 'active';
    await campaign.save();

    // 10. Return success message
    res.json({
      message: 'Campaign launched',
      total: customerCount
    });
  } catch (error) {
    console.error(`Error launching campaign ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/:id/stats
// Aggregate communications for this campaign
// Return: { total, sent, delivered, failed, opened, clicked } counts
// Also return campaign status
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Aggregate status counts using aggregation pipeline
    const statsResult = await Communication.aggregate([
      { $match: { campaign_id: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the result to return all required count properties
    const counts = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0
    };

    let currentSent = 0, currentDelivered = 0, currentOpened = 0, currentClicked = 0, currentFailed = 0;

    for (const item of statsResult) {
      counts.total += item.count;
      
      if (item._id === 'sent') {
        currentSent += item.count;
      } else if (item._id === 'delivered') {
        currentDelivered += item.count;
      } else if (item._id === 'failed') {
        currentFailed += item.count;
      } else if (item._id === 'opened' || item._id === 'read') {
        currentOpened += item.count;
      } else if (item._id === 'clicked') {
        currentClicked += item.count;
      }
    }

    counts.clicked = currentClicked;
    counts.opened = currentOpened + currentClicked;
    counts.delivered = currentDelivered + counts.opened;
    counts.failed = currentFailed;
    counts.sent = currentSent + counts.delivered + counts.failed;

    const recentCommunications = await Communication.find({ campaign_id: id })
      .populate('customer_id', 'name')
      .sort({ updated_at: -1 })
      .limit(5);

    res.json({
      total: counts.total,
      sent: counts.sent,
      delivered: counts.delivered,
      failed: counts.failed,
      opened: counts.opened,
      clicked: counts.clicked,
      status: campaign.status,
      recentCommunications
    });
  } catch (error) {
    console.error(`Error fetching campaign stats for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns/:id/analyze
// Generate a plain-English campaign performance insight using Gemini
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // 1. Find campaign with populated segment
    const campaign = await Campaign.findById(id).populate('segment_id');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // 2. Ensure there is delivery data to analyze
    if (!campaign.stats || !campaign.stats.total || campaign.stats.total <= 0) {
      return res.status(400).json({ error: 'Campaign has no data to analyze yet.' });
    }

    // 3. Build account-wide averages by aggregating all campaigns
    const aggregation = await Campaign.aggregate([
      {
        $match: {
          'stats.sent': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$stats.sent' },
          totalDelivered: { $sum: '$stats.delivered' },
          totalOpened: { $sum: '$stats.opened' }
        }
      }
    ]);

    const totals = aggregation[0] || { totalSent: 0, totalDelivered: 0, totalOpened: 0 };
    const accountAverages = {
      avg_delivery_rate: totals.totalSent > 0
        ? totals.totalDelivered / totals.totalSent
        : 0,
      avg_open_rate: totals.totalDelivered > 0
        ? totals.totalOpened / totals.totalDelivered
        : 0
    };

    // 4. Call Gemini for insight
    const segmentName = campaign.segment_id ? campaign.segment_id.name : 'Unknown segment';
    const insight = await analyzeCampaign(
      campaign.name,
      segmentName,
      campaign.stats,
      accountAverages
    );

    // 5. Return insight
    res.json({ insight });
  } catch (error) {
    console.error(`Error analyzing campaign ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

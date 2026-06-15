const express = require('express');
const Groq = require('groq-sdk');

const Customer = require('../models/Customer');
const Segment = require('../models/Segment');
const Campaign = require('../models/Campaign');
const Communication = require('../models/Communication');
const { generateMessageVariants } = require('../services/groq');
const { buildMongoQuery } = require('../services/segmentEngine');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ═══════════════════════════════════════════════════════════════
   HELPER: callGroq
   Reusable wrapper for Groq chat completions used only in this file.
   ═══════════════════════════════════════════════════════════════ */

async function callGroq(prompt, useJsonMode = true) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
    ...(useJsonMode && { response_format: { type: 'json_object' } }),
  });
  const text = response.choices[0].message.content.trim();
  if (useJsonMode) {
    return JSON.parse(text);
  }
  return text;
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: getRecommendedChannel
   Queries real campaign history to find best performing channel.
   ═══════════════════════════════════════════════════════════════ */

async function getRecommendedChannel() {
  const results = await Campaign.aggregate([
    { $match: { 'stats.sent': { $gt: 0 } } },
    {
      $group: {
        _id: '$channel',
        avgDeliveryRate: {
          $avg: {
            $cond: [
              { $gt: ['$stats.sent', 0] },
              { $divide: ['$stats.delivered', '$stats.sent'] },
              0,
            ],
          },
        },
        totalCampaigns: { $sum: 1 },
      },
    },
    { $sort: { avgDeliveryRate: -1 } },
  ]);

  if (results.length === 0) {
    return {
      channel: 'whatsapp',
      reason:
        'WhatsApp is recommended as the default channel for highest engagement',
      delivery_rate: 0.85,
    };
  }

  const best = results[0];
  const channelNames = {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    email: 'Email',
    rcs: 'RCS',
  };

  return {
    channel: best._id,
    reason: `Your ${channelNames[best._id] || best._id} campaigns average ${(best.avgDeliveryRate * 100).toFixed(1)}% delivery rate — highest among all your channels`,
    delivery_rate: best.avgDeliveryRate,
    based_on_campaigns: best.totalCampaigns,
  };
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: buildSegmentFromIntent
   Converts classified intent + params into segment rules and
   queries the DB for matching customer count.
   ═══════════════════════════════════════════════════════════════ */

async function buildSegmentFromIntent(intent, params) {
  let rules = [];
  let segmentName = '';
  let segmentDescription = '';

  if (intent === 'reengagement') {
    const days = params.time_window_days || 45;
    rules = [
      { field: 'last_order_date', operator: 'older_than_days', value: days },
      { field: 'total_orders', operator: 'gte', value: 2 },
    ];
    segmentName = `Lapsed Customers (${days}+ days)`;
    segmentDescription = `Customers who haven't ordered in ${days}+ days but have ordered before`;
  } else if (intent === 'reward_vip') {
    const threshold = params.spend_threshold || 3000;
    rules = [
      { field: 'total_spend', operator: 'gte', value: threshold },
      { field: 'total_orders', operator: 'gte', value: 5 },
    ];
    segmentName = 'VIP High-Value Customers';
    segmentDescription = `Customers who spent ₹${threshold}+ and ordered 5+ times`;
  } else if (intent === 'welcome_new') {
    rules = [{ field: 'total_orders', operator: 'eq', value: 1 }];
    segmentName = 'First-Time Customers';
    segmentDescription = 'Customers who have placed exactly one order';
  } else {
    // General intent — use Groq to generate rules from the natural language
    const nlResult = await callGroq(`
You are a CRM analyst for Brew & Co. coffee brand.
Convert this marketing goal into MongoDB filter rules.
Today's date: ${new Date().toISOString()}

Customer schema:
- total_spend: Number (rupees)
- total_orders: Number
- last_order_date: Date
- avg_order_value: Number
- visit_frequency_days: Number
- is_churned: Boolean
- tags: Array of strings

Operators: gt, gte, lt, lte, eq, between, in_last_days, older_than_days

Goal: "${params.original_message}"

Respond with JSON only:
{
  "segment_name": "string",
  "description": "string",
  "rules": [
    { "field": "string", "operator": "string", "value": "any" }
  ]
}`);
    rules = nlResult.rules || [];
    segmentName = nlResult.segment_name || 'Custom Segment';
    segmentDescription = nlResult.description || '';
  }

  // Build MongoDB query and count matching customers
  const mongoQuery = buildMongoQuery(rules);
  const customerCount = await Customer.countDocuments(mongoQuery);
  const sampleCustomers = await Customer.find(mongoQuery)
    .limit(3)
    .select('name email total_orders total_spend last_order_date');

  return {
    name: segmentName,
    description: segmentDescription,
    rules,
    customer_count: customerCount,
    sample_customers: sampleCustomers,
  };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTE 1: POST /api/aria/plan
   ─────────────────────────────────────────────────────────────
   Main ARIA endpoint.  Takes a natural-language campaign goal
   and returns a complete campaign plan (audience, channel,
   message variants, suggested name).
   ═══════════════════════════════════════════════════════════════ */

router.post('/plan', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 3) {
      return res
        .status(400)
        .json({ error: 'Please describe what you want to achieve' });
    }

    // STEP 1: Classify intent with Groq
    const classification = await callGroq(`
You are analyzing a marketing manager's request for Brew & Co. coffee brand.
Classify this request and extract any parameters mentioned.

Request: "${message}"

Classify as one of:
- reengagement (inactive/lapsed customers)
- reward_vip (high value, loyal, top customers)
- welcome_new (new customers, first time visitors)
- general (anything else)

Respond with JSON only:
{
  "intent": "reengagement|reward_vip|welcome_new|general",
  "time_window_days": null,
  "spend_threshold": null,
  "order_count_threshold": null,
  "summary": "one sentence describing what the marketer wants"
}`);

    // STEP 2: Build segment + recommend channel (in parallel)
    const [segment, channelRec] = await Promise.all([
      buildSegmentFromIntent(classification.intent, {
        ...classification,
        original_message: message,
      }),
      getRecommendedChannel(),
    ]);

    // STEP 3: Generate message variants using existing Groq service
    const messageVariants = await generateMessageVariants(
      segment.name,
      segment.description,
      segment.sample_customers
    );

    // STEP 4: Generate campaign name
    const campaignName = await callGroq(`
Generate a short, professional campaign name (3-5 words) for:
Segment: "${segment.name}"
Goal: "${message}"
Brand: Brew & Co. coffee

Respond with JSON only: { "campaign_name": "string" }`);

    // STEP 5: Return complete plan
    return res.status(200).json({
      intent: classification.intent,
      summary: classification.summary,
      segment,
      recommended_channel: channelRec,
      message_variants: messageVariants,
      suggested_campaign_name: campaignName.campaign_name,
    });
  } catch (err) {
    console.error('ARIA plan error:', err);
    return res.status(500).json({
      error: 'ARIA encountered an error. Please try again.',
      details: err.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTE 2: POST /api/aria/launch
   ─────────────────────────────────────────────────────────────
   Creates segment + campaign, responds immediately, then sends
   messages to customers in the background.
   ═══════════════════════════════════════════════════════════════ */

router.post('/launch', async (req, res) => {
  try {
    const {
      segment_name,
      segment_description,
      segment_rules,
      channel,
      message,
      campaign_name,
    } = req.body;

    // Validate required fields
    if (!segment_rules || !channel || !message || !campaign_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // STEP 1: Create the segment
    const mongoQuery = buildMongoQuery(segment_rules);
    const customerCount = await Customer.countDocuments(mongoQuery);

    const segment = await Segment.create({
      name: segment_name,
      description: segment_description,
      type: 'ai_generated',
      rules: segment_rules,
      customer_count: customerCount,
      last_computed_at: new Date(),
    });

    // STEP 2: Create the campaign
    const campaign = await Campaign.create({
      name: campaign_name,
      segment_id: segment._id,
      channel: channel.toLowerCase(),
      message_template: message,
      ai_generated: true,
      status: 'sending',
      sent_at: new Date(),
      stats: {
        total: customerCount,
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
      },
    });

    // STEP 3: Respond immediately — send messages in background
    res.status(201).json({
      success: true,
      campaign_id: campaign._id,
      segment_id: segment._id,
      customer_count: customerCount,
      message: `Campaign launched! Sending to ${customerCount} customers via ${channel}.`,
    });

    // ── Background: fetch customers & dispatch via channel service ──
    (async () => {
      try {
        const customers = await Customer.find(mongoQuery).select(
          'name phone email channel_preference'
        );

        const CHANNEL_SERVICE_URL =
          process.env.CHANNEL_SERVICE_URL || 'http://localhost:3002';
        const CALLBACK_URL =
          process.env.CHANNEL_CALLBACK_URL || 'http://localhost:3001/api/receipts';
        const axios = require('axios');

        const batchSize = 50;
        let totalSent = 0;

        for (let i = 0; i < customers.length; i += batchSize) {
          const batch = customers.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (customer) => {
              const personalizedMessage = message.replace(
                /\{name\}/g,
                customer.name.split(' ')[0]
              );

              const communication = await Communication.create({
                campaign_id: campaign._id,
                customer_id: customer._id,
                channel: channel.toLowerCase(),
                message: personalizedMessage,
                status: 'queued',
                retry_count: 0,
                status_history: [{ status: 'queued', timestamp: new Date() }],
              });

              try {
                await axios.post(`${CHANNEL_SERVICE_URL}/api/send`, {
                  msg_id: communication._id.toString(),
                  recipient: customer.phone || customer.email,
                  channel: channel.toLowerCase(),
                  message: personalizedMessage,
                  callback_url: CALLBACK_URL,
                });

                await Communication.findByIdAndUpdate(communication._id, {
                  status: 'sent',
                  external_msg_id: communication._id.toString(),
                  $push: {
                    status_history: { status: 'sent', timestamp: new Date() },
                  },
                });
                totalSent++;
              } catch (sendErr) {
                console.error(
                  `Failed to send to ${customer._id}:`,
                  sendErr.message
                );
              }
            })
          );
        }

        // Update campaign stats after all sends complete
        await Campaign.findByIdAndUpdate(campaign._id, {
          status: totalSent > 0 ? 'active' : 'draft',
          'stats.sent': totalSent,
          'stats.total': customerCount,
        });

        console.log(
          `✅ ARIA campaign ${campaign._id}: ${totalSent}/${customerCount} messages sent`
        );
      } catch (bgErr) {
        console.error('Background send error:', bgErr);
        await Campaign.findByIdAndUpdate(campaign._id, {
          status: 'draft',
        }).catch(() => {});
      }
    })();
  } catch (err) {
    console.error('ARIA launch error:', err);
    return res.status(500).json({
      error: 'Failed to launch campaign',
      details: err.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTE 3: POST /api/aria/draft
   ─────────────────────────────────────────────────────────────
   Creates segment + campaign as draft WITHOUT sending messages.
   ═══════════════════════════════════════════════════════════════ */

router.post('/draft', async (req, res) => {
  try {
    const {
      segment_name,
      segment_description,
      segment_rules,
      channel,
      message,
      campaign_name,
    } = req.body;

    if (!segment_rules || !channel || !message || !campaign_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the segment
    const mongoQuery = buildMongoQuery(segment_rules);
    const customerCount = await Customer.countDocuments(mongoQuery);

    const segment = await Segment.create({
      name: segment_name,
      description: segment_description,
      type: 'ai_generated',
      rules: segment_rules,
      customer_count: customerCount,
      last_computed_at: new Date(),
    });

    // Create campaign as draft — no messages sent
    const campaign = await Campaign.create({
      name: campaign_name,
      segment_id: segment._id,
      channel: channel.toLowerCase(),
      message_template: message,
      ai_generated: true,
      status: 'draft',
      stats: {
        total: customerCount,
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
      },
    });

    return res.status(201).json({
      success: true,
      campaign_id: campaign._id,
      segment_id: segment._id,
      customer_count: customerCount,
      message: `Campaign saved as draft with ${customerCount} customers.`,
    });
  } catch (err) {
    console.error('ARIA draft error:', err);
    return res.status(500).json({
      error: 'Failed to save campaign draft',
      details: err.message,
    });
  }
});

module.exports = router;


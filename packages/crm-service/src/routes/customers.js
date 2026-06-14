const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// GET /api/customers/stats/summary
// Return aggregate stats: { total, active, churned, high_value }
// where active = is_churned false, churned = is_churned true, high_value = total_spend > 5000
// IMPORTANT: Defined before GET /:id route so it doesn't get treated as a customer ID parameter.
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, churned, high_value] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ is_churned: false }),
      Customer.countDocuments({ is_churned: true }),
      Customer.countDocuments({ total_spend: { $gt: 5000 } })
    ]);

    res.json({
      total,
      active,
      churned,
      high_value
    });
  } catch (error) {
    console.error('Error fetching customer stats summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/ai-recommendations
// Queries DB for interesting audience patterns and returns 3 actionable suggestions
// IMPORTANT: Defined before GET /:id route so it doesn't get treated as a customer ID parameter.
router.get('/ai-recommendations', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Run all 3 queries in parallel
    const [countA, countB, countC] = await Promise.all([
      // Query A — Lapsed regulars
      Customer.countDocuments({
        total_orders: { $gte: 5 },
        last_order_date: { $lt: thirtyDaysAgo },
        is_churned: false
      }),
      // Query B — High value, never messaged (approximate)
      Customer.countDocuments({
        total_spend: { $gt: 3000 },
        total_orders: { $gte: 8 },
        first_order_date: { $lt: sixtyDaysAgo }
      }),
      // Query C — New customers
      Customer.countDocuments({
        total_orders: 1,
        first_order_date: { $gte: fourteenDaysAgo }
      })
    ]);

    // 2. Build recommendations (only include if count > 0)
    const recommendations = [];

    if (countA > 0) {
      recommendations.push({
        id: 'lapsed_regulars',
        title: 'Win back your regulars',
        description: `${countA} loyal customers haven't ordered in 30+ days`,
        count: countA,
        suggested_segment_rules: [
          { field: 'total_orders', operator: 'gte', value: 5 },
          { field: 'last_order_date', operator: 'older_than_days', value: 30 },
          { field: 'is_churned', operator: 'eq', value: false }
        ],
        suggested_message: "Hey {name}, we miss you at Brew & Co.! ☕ Come back and your next drink is on us."
      });
    }

    if (countB > 0) {
      recommendations.push({
        id: 'high_value',
        title: 'Reward your VIPs',
        description: `${countB} high-value customers deserve exclusive treatment`,
        count: countB,
        suggested_segment_rules: [
          { field: 'total_spend', operator: 'gt', value: 3000 },
          { field: 'total_orders', operator: 'gte', value: 8 }
        ],
        suggested_message: "Hey {name}, you're one of our top fans! 🌟 Here's an exclusive early access offer just for you."
      });
    }

    if (countC > 0) {
      recommendations.push({
        id: 'new_customers',
        title: 'Nurture new visitors',
        description: `${countC} first-time customers need a reason to return`,
        count: countC,
        suggested_segment_rules: [
          { field: 'total_orders', operator: 'eq', value: 1 }
        ],
        suggested_message: "Thanks for visiting Brew & Co., {name}! ☕ Your second cup is 20% off — see you soon!"
      });
    }

    // 3. Return recommendations
    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers
// Support query params: search (searches name or email with regex, case-insensitive),
// tag (filters by tag in tags array), is_churned (boolean filter), page (default 1), limit (default 25, max 100)
// Return: { customers: [...], total, page, totalPages }
// Sort by created_at descending, select all fields
router.get('/', async (req, res) => {
  try {
    const { search, tag, is_churned } = req.query;
    const filter = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    if (tag) {
      filter.tags = tag;
    }

    if (is_churned !== undefined) {
      filter.is_churned = is_churned === 'true';
    }

    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 25;
    } else if (limit > 100) {
      limit = 100;
    }

    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      customers,
      total,
      page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/:id
// Return the customer document and their last 10 orders (sorted by ordered_at desc)
// Return 404 with { error: "Customer not found" } if not found
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const recentOrders = await Order.find({ customer_id: customer._id })
      .sort({ ordered_at: -1 })
      .limit(10);

    res.json({
      customer,
      recentOrders
    });
  } catch (error) {
    console.error(`Error fetching customer ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers
// Create a new customer, validate required fields (name, email, phone)
// Return 201 with created customer
// Return 400 with validation error message if mongoose validation fails
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields explicitly
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email, and phone are required fields.' });
    }

    const customer = new Customer(req.body);
    const savedCustomer = await customer.save();

    res.status(201).json(savedCustomer);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    // Handle unique constraint (e.g. duplicate email)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

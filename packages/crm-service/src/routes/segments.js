const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const segmentEngine = require('../services/segmentEngine');
const { generateSegmentRules } = require('../services/gemini');

// GET /api/segments
// Return all segments sorted by created_at desc
// Include customer_count field
router.get('/', async (req, res) => {
  try {
    const segments = await Segment.find().sort({ created_at: -1 });
    res.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/segments/preview
// Takes a rules array in body
// Returns { count, sampleCustomers } without saving anything
// Useful for the UI to show a live preview count before saving
router.post('/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    const query = segmentEngine.buildMongoQuery(rules || []);
    const count = await Customer.countDocuments(query);
    const sampleCustomers = await Customer.find(query).limit(5);

    res.json({
      count,
      sampleCustomers
    });
  } catch (error) {
    console.error('Error previewing segment rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/segments/generate-from-nl
// Accept a natural-language query, call Gemini to generate segment rules,
// then preview the results without saving.
const VALID_FIELDS = new Set([
  'total_spend',
  'total_orders',
  'last_order_date',
  'avg_order_value',
  'visit_frequency_days',
  'is_churned',
  'tags'
]);

router.post('/generate-from-nl', async (req, res) => {
  try {
    const { query } = req.body;

    // 1. Validate query length
    if (!query || typeof query !== 'string' || query.length < 5 || query.length > 500) {
      return res.status(400).json({ error: 'Query must be between 5 and 500 characters' });
    }

    // 2. Sanitize: trim + strip anything that isn't letters, numbers, spaces, or basic punctuation
    const sanitizedQuery = query
      .trim()
      .replace(/[^a-zA-Z0-9\s.,?!'\-]/g, '');

    // 3. Call Gemini
    let aiResult;
    try {
      aiResult = await generateSegmentRules(sanitizedQuery);
    } catch {
      return res.status(422).json({ error: 'AI could not generate segment. Try rephrasing your query.' });
    }

    // 4. Validate the returned rules
    const { segment_name, description, rules } = aiResult;

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(422).json({ error: 'AI returned invalid segment rules' });
    }

    const rulesValid = rules.every(
      (r) => r.field && r.operator && r.value !== undefined && VALID_FIELDS.has(r.field)
    );

    if (!rulesValid) {
      return res.status(422).json({ error: 'AI returned invalid segment rules' });
    }

    // 5. Build MongoDB query from validated rules
    const mongoQuery = segmentEngine.buildMongoQuery(rules);

    // 6. Preview count
    const preview_count = await Customer.countDocuments(mongoQuery);

    // 7. Sample customers
    const sample_customers = await Customer.find(mongoQuery)
      .limit(5)
      .select('name email total_orders total_spend last_order_date');

    // 8. Return preview (not saved)
    res.json({
      segment_name,
      description,
      rules,
      preview_count,
      sample_customers
    });
  } catch (error) {
    console.error('Error generating segment from NL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/segments/:id/preview
// Takes a rules array in body (some systems specify :id in preview url)
// Returns { count, sampleCustomers } without saving anything
router.post('/:id/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    const query = segmentEngine.buildMongoQuery(rules || []);
    const count = await Customer.countDocuments(query);
    const sampleCustomers = await Customer.find(query).limit(5);

    res.json({
      count,
      sampleCustomers
    });
  } catch (error) {
    console.error(`Error previewing segment rules for id ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/segments
// Create segment, compute count, and save
router.post('/', async (req, res) => {
  try {
    const { name, description, type, rules, natural_language_query } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required fields.' });
    }

    const query = segmentEngine.buildMongoQuery(rules || []);
    const customerCount = await Customer.countDocuments(query);

    const segment = new Segment({
      name,
      description,
      type,
      rules,
      natural_language_query,
      customer_count: customerCount,
      last_computed_at: new Date()
    });

    const savedSegment = await segment.save();
    res.status(201).json(savedSegment);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/segments/:id
// Return segment and 5 sample customers matching the rules
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = await Segment.findById(id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const query = segmentEngine.buildMongoQuery(segment.rules || []);
    const sampleCustomers = await Customer.find(query).limit(5);

    res.json({
      segment,
      sampleCustomers,
      customerCount: segment.customer_count
    });
  } catch (error) {
    console.error(`Error fetching segment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/segments/:id
// Delete segment, return { message: "Segment deleted" }
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = await Segment.findByIdAndDelete(id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ message: 'Segment deleted' });
  } catch (error) {
    console.error(`Error deleting segment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

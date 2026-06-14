const mongoose = require('mongoose');

// Schema for defining dynamic filters/rules (e.g. total_spend > 500)
const ruleSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true
    },
    operator: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    value2: {
      type: mongoose.Schema.Types.Mixed // Optional: e.g. for "between" operators
    }
  },
  { _id: false }
);

const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['rule_based', 'ai_generated'],
      required: true
    },
    rules: {
      type: [ruleSchema],
      default: []
    },
    natural_language_query: {
      type: String,
      trim: true
    },
    customer_count: {
      type: Number,
      default: 0
    },
    last_computed_at: {
      type: Date
    }
  },
  {
    // Automatically manage created_at and updated_at database timestamps
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const Segment = mongoose.models.Segment || mongoose.model('Segment', segmentSchema);

module.exports = Segment;
module.exports.default = Segment;

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // Validates format: +91 followed by exactly 10 digits (e.g. +919876543210)
          return /^\+91\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number! Please use the format +91XXXXXXXXXX.`
      }
    },
    channel_preference: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'rcs'],
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    total_orders: {
      type: Number,
      default: 0
    },
    total_spend: {
      type: Number,
      default: 0
    },
    avg_order_value: {
      type: Number,
      default: 0
    },
    last_order_date: {
      type: Date
    },
    first_order_date: {
      type: Date
    },
    visit_frequency_days: {
      type: Number
    },
    is_churned: {
      type: Boolean,
      default: false
    }
  },
  {
    // Automatically manage created_at and updated_at timestamps
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// --- Indexes ---

// Index on last_order_date:
// Enables fast querying and sorting of customers based on their last purchase activity (e.g. finding churn candidates).
customerSchema.index({ last_order_date: 1 });

// Index on total_orders:
// Speeds up segmenting customers by loyalty tiers or order frequency.
customerSchema.index({ total_orders: 1 });

// Index on total_spend:
// Facilitates fast targeting and value-based segmentation based on customer lifetime spend.
customerSchema.index({ total_spend: 1 });

// Index on is_churned:
// Optimizes filtering active vs. inactive/churned customer profiles.
customerSchema.index({ is_churned: 1 });

// Multikey index on tags:
// Speeds up queries searching for customers carrying specific behavioral tags or preferences.
customerSchema.index({ tags: 1 });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

module.exports = Customer;
module.exports.default = Customer;

const mongoose = require('mongoose');

// Schema for tracking communication delivery status updates history
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['queued', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked']
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { _id: false }
);

const communicationSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    channel: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked'],
      default: 'queued',
      required: true
    },
    status_history: {
      type: [statusHistorySchema],
      default: []
    },
    external_msg_id: {
      type: String,
      // unique: true, // Note: We use sparse: true in the index specification below to handle null/undefined fields
      trim: true
    },
    retry_count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    // Automatically manage created_at and updated_at database timestamps
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// --- Indexes ---

// Compound Index on campaign_id and status:
// Optimizes campaign analytics dashboard queries that retrieve delivery status breakdown counts.
communicationSchema.index({ campaign_id: 1, status: 1 });

// Unique Sparse Index on external_msg_id:
// 1. Ensures message IDs from external gateways (e.g. Twilio, Gupshup) are unique.
// 2. The 'sparse' property permits multiple documents to have no external_msg_id (e.g. when status is queued),
//    preventing duplicate key errors for null/undefined fields.
communicationSchema.index({ external_msg_id: 1 }, { unique: true, sparse: true });

// Compound Index on campaign_id and customer_id:
// Optimizes checks for ensuring a customer is not messaged twice in the context of the same campaign.
communicationSchema.index({ campaign_id: 1, customer_id: 1 });

const Communication = mongoose.models.Communication || mongoose.model('Communication', communicationSchema);

module.exports = Communication;
module.exports.default = Communication;

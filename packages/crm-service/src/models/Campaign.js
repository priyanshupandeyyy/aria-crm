const mongoose = require('mongoose');

// Schema for tracking delivery and interaction statistics
const campaignStatsSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    converted: { type: Number, default: 0 }
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    segment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Segment',
      required: true
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'rcs'],
      required: true
    },
    message_template: {
      type: String,
      required: true
    },
    ai_generated: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'sending', 'active', 'completed'],
      default: 'draft',
      required: true
    },
    scheduled_at: {
      type: Date
    },
    sent_at: {
      type: Date
    },
    stats: {
      type: campaignStatsSchema,
      default: () => ({})
    }
  },
  {
    // Automatically manage created_at and updated_at database timestamps
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
module.exports.default = Campaign;

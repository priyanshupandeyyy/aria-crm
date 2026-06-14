const mongoose = require('mongoose');

// Schema for items inside an order
const orderItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    }
  },
  { _id: false } // Disable _id for order items to keep the document structure cleaner
);

const orderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [val => val && val.length > 0, 'An order must contain at least one item.']
    },
    total_amount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    channel: {
      type: String,
      enum: ['in-store', 'app', 'online'],
      required: true
    },
    ordered_at: {
      type: Date,
      required: true,
      default: Date.now
    },
    outlet: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    // Automatically manage created_at and updated_at database timestamps
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// --- Indexes ---

// Compound Index on customer_id and ordered_at:
// 1. Speeds up queries retrieving the order history of a specific customer.
// 2. Optimizes sorting by date in descending order to fetch the latest orders of a customer.
orderSchema.index({ customer_id: 1, ordered_at: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.default = Order;

const mongoose = require('mongoose');

const RefundJobSchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },
  userid: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: null },
  razorpayRefundId: { type: String, default: null },
  idempotencyKey: { type: String, default: null, index: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

RefundJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RefundJob', RefundJobSchema);

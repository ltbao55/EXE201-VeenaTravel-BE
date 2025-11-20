import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Thông tin đơn hàng
  orderCode: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  
  // Thông tin thanh toán
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Trạng thái thanh toán
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'failed', 'expired', 'refunded'],
    default: 'pending'
  },
  
  // Thông tin sản phẩm/dịch vụ
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Thông tin khách hàng
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: String,
    name: String
  },
  
  // Thông tin PayOS
  paymentLinkId: String,
  checkoutUrl: String,
  returnUrl: String,
  cancelUrl: String,
  
  // Phương thức thanh toán
  paymentMethod: {
    type: String,
    enum: ['payos', 'momo', 'zalopay'],
    default: 'payos'
  },
  
  // Thông tin giao dịch từ PayOS
  transactionInfo: {
    reference: String, // Mã tham chiếu từ ngân hàng
    accountNumber: String, // Số tài khoản thụ hưởng
    transactionDateTime: Date, // Thời gian giao dịch
    currency: {
      type: String,
      default: 'VND'
    },
    counterAccountBankId: String, // Mã ngân hàng người gửi
    counterAccountBankName: String, // Tên ngân hàng người gửi
    counterAccountName: String, // Tên người gửi
    counterAccountNumber: String, // Số tài khoản người gửi
    virtualAccountName: String, // Tên tài khoản ảo
    virtualAccountNumber: String, // Số tài khoản ảo
    errorMessage: String // Thông báo lỗi
  },
  
  // Thông tin webhook
  webhookData: {
    received: {
      type: Boolean,
      default: false
    },
    receivedAt: Date,
    signature: String,
    rawData: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Thời gian
  expiresAt: {
    type: Date,
    default: function() {
      // Link thanh toán hết hạn sau 15 phút
      return new Date(Date.now() + 15 * 60 * 1000);
    }
  },
  
  paidAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ orderCode: 1 });
paymentSchema.index({ 'customer.userId': 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ expiresAt: 1 });

// Virtual fields
paymentSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

paymentSchema.virtual('isPaid').get(function() {
  return this.status === 'paid';
});

paymentSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Methods
paymentSchema.methods.markAsPaid = function(transactionInfo = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.transactionInfo = { ...this.transactionInfo, ...transactionInfo };
  return this.save();
};

paymentSchema.methods.markAsCancelled = function() {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

paymentSchema.methods.updateWebhookData = function(webhookData, signature) {
  this.webhookData = {
    received: true,
    receivedAt: new Date(),
    signature,
    rawData: webhookData
  };
  return this.save();
};

// Static methods
paymentSchema.statics.findByOrderCode = function(orderCode) {
  return this.findOne({ orderCode });
};

paymentSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { 'customer.userId': userId };
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

paymentSchema.statics.findPendingPayments = function() {
  return this.find({ 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

paymentSchema.statics.findExpiredPayments = function() {
  return this.find({ 
    status: 'pending',
    expiresAt: { $lte: new Date() }
  });
};

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  // Tự động cập nhật trạng thái nếu hết hạn
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// Post-save middleware
paymentSchema.post('save', function(doc) {
  console.log(`Payment ${doc.orderCode} saved with status: ${doc.status}`);
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // User reference
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  
  // Plan reference
  planId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Plan',
    required: true
  },
  
  // Payment amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Currency
  currency: {
    type: String,
    default: 'VND'
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // VNPAY specific fields
  vnpay: {
    // Transaction reference from VNPAY
    vnp_TxnRef: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // VNPAY transaction ID
    vnp_TransactionNo: String,
    
    // VNPAY response code
    vnp_ResponseCode: String,
    
    // VNPAY transaction status
    vnp_TransactionStatus: String,
    
    // Payment date from VNPAY
    vnp_PayDate: String,
    
    // Bank code
    vnp_BankCode: String,
    
    // Card type
    vnp_CardType: String,
    
    // Order info
    vnp_OrderInfo: String,
    
    // Secure hash
    vnp_SecureHash: String
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['vnpay', 'momo', 'zalopay', 'bank_transfer'],
    default: 'vnpay'
  },
  
  // Payment description
  description: String,
  
  // Refund information
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundTransactionId: String
  },
  
  // Payment completion date
  paidAt: Date,
  
  // Failure reason
  failureReason: String
  
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ planId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'vnpay.vnp_TxnRef': 1 });
paymentSchema.index({ 'vnpay.vnp_TransactionNo': 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ paidAt: 1 });

// Compound indexes
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;

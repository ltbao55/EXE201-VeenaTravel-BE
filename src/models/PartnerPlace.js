import mongoose from "mongoose";

/**
 * =================================================================
 * Partner Place Model - Địa điểm đối tác
 * =================================================================
 * Schema cho các địa điểm đối tác (khách sạn, nhà hàng, điểm tham quan)
 * Data lưu trong MongoDB (source of truth) và sync sang Pinecone
 * =================================================================
 */

const partnerPlaceSchema = new mongoose.Schema({
  // =============== Basic Information ===============
  name: {
    type: String,
    required: [true, 'Tên địa điểm là bắt buộc'],
    trim: true,
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Mô tả là bắt buộc'],
    trim: true
  },
  
  // =============== Location ===============
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: [true, 'Tọa độ là bắt buộc'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&  // longitude
                 coords[1] >= -90 && coords[1] <= 90;       // latitude
        },
        message: 'Tọa độ không hợp lệ (longitude: -180 to 180, latitude: -90 to 90)'
      }
    }
  },
  
  address: {
    type: String,
    trim: true
  },
  
  // =============== Category & Tags ===============
  category: {
    type: String,
    required: [true, 'Danh mục là bắt buộc'],
    enum: {
      values: [
        // 🏨 Lưu trú
        'khách sạn', 'resort', 'homestay', 'hostel', 'villa', 'apartment',
        
        // 🍽️ Ẩm thực
        'nhà hàng', 'quán ăn', 'cafe', 'bar', 'pub', 'bistro', 'food court', 'street food',
        
        // 🎯 Điểm tham quan
        'điểm tham quan', 'di tích lịch sử', 'bảo tàng', 'chùa', 'nhà thờ', 'công viên', 'vườn thú',
        
        // 🏖️ Du lịch tự nhiên
        'bãi biển', 'núi', 'thác nước', 'hồ', 'sông', 'đảo', 'hang động', 'rừng',
        
        // 🎪 Giải trí
        'khu vui chơi', 'công viên giải trí', 'casino', 'club', 'karaoke', 'cinema', 'theater',
        
        // 🛍️ Mua sắm
        'trung tâm thương mại', 'chợ', 'cửa hàng', 'siêu thị', 'outlet', 'night market',
        
        // 🏥 Dịch vụ
        'spa', 'massage', 'salon', 'gym', 'yoga', 'bệnh viện', 'phòng khám', 'ngân hàng',
        
        // 🚗 Giao thông
        'sân bay', 'bến xe', 'ga tàu', 'bến cảng', 'trạm xăng', 'bãi đỗ xe',
        
        // 🎓 Giáo dục & Văn hóa
        'trường học', 'thư viện', 'trung tâm văn hóa', 'phòng triển lãm', 'studio',
        
        // 🏢 Công sở
        'văn phòng', 'công ty', 'nhà máy', 'khu công nghiệp', 'co-working space',
        
        // 🏠 Khác
        'other'
      ],
      message: '{VALUE} không phải danh mục hợp lệ'
    },
    index: true
  },
  
  tags: {
    type: [String],
    default: []
  },
  
  // =============== Priority & Status ===============
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority tối thiểu là 1'],
    max: [10, 'Priority tối đa là 10'],
    index: true
  },
  
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'pending'],
      message: '{VALUE} không phải status hợp lệ'
    },
    default: 'active',
    index: true
  },
  
  // =============== Rating & Reviews ===============
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // =============== Contact Information ===============
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  
  // =============== Media ===============
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(images) {
        return images.length <= 10;
      },
      message: 'Tối đa 10 hình ảnh'
    }
  },
  
  thumbnail: {
    type: String,
    trim: true
  },
  
  // =============== Pricing ===============
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$', null],
    default: null
  },
  
  averagePrice: {
    type: Number,
    min: 0
  },
  
  // =============== Operating Hours ===============
  openingHours: {
    type: String,
    trim: true
  },
  
  // =============== Additional Info ===============
  amenities: {
    type: [String],
    default: []
  },
  
  // =============== Pinecone Sync Tracking ===============
  pineconeId: {
    type: String,
    index: true,
    unique: true,
    sparse: true  // Allow null values
  },
  
  lastSyncedAt: {
    type: Date,
    default: null
  },
  
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending',
    index: true
  },
  
  syncErrorMessage: {
    type: String,
    default: null
  },
  
  syncRetryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // =============== Audit Trail ===============
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  deactivatedAt: {
    type: Date,
    default: null
  },
  
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
  
}, {
  timestamps: true,  // Tự động thêm createdAt và updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// =============== Indexes ===============

// Geospatial index for location-based queries
partnerPlaceSchema.index({ location: '2dsphere' });

// Compound indexes for common queries
partnerPlaceSchema.index({ status: 1, priority: -1 });
partnerPlaceSchema.index({ category: 1, rating: -1 });
partnerPlaceSchema.index({ syncStatus: 1, syncRetryCount: 1 });

// Text search index
partnerPlaceSchema.index({ 
  name: 'text', 
  description: 'text',
  address: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 3,
    address: 1
  }
});

// =============== Virtual Fields ===============

// Latitude (for easier access)
partnerPlaceSchema.virtual('latitude').get(function() {
  return this.location && this.location.coordinates ? this.location.coordinates[1] : null;
});

// Longitude (for easier access)
partnerPlaceSchema.virtual('longitude').get(function() {
  return this.location && this.location.coordinates ? this.location.coordinates[0] : null;
});

// Is synced?
partnerPlaceSchema.virtual('isSynced').get(function() {
  return this.syncStatus === 'synced';
});

// =============== Instance Methods ===============

/**
 * Mark place as needing sync
 */
partnerPlaceSchema.methods.markForSync = async function() {
  this.syncStatus = 'pending';
  this.syncErrorMessage = null;
  await this.save();
};

/**
 * Mark sync as successful
 */
partnerPlaceSchema.methods.markSyncSuccess = async function(pineconeId) {
  this.syncStatus = 'synced';
  this.pineconeId = pineconeId;
  this.lastSyncedAt = new Date();
  this.syncErrorMessage = null;
  this.syncRetryCount = 0;
  await this.save();
};

/**
 * Mark sync as failed
 */
partnerPlaceSchema.methods.markSyncFailed = async function(errorMessage) {
  this.syncStatus = 'failed';
  this.syncErrorMessage = errorMessage;
  this.syncRetryCount += 1;
  await this.save();
};

// =============== Static Methods ===============

/**
 * Find places needing sync
 */
partnerPlaceSchema.statics.findNeedingSync = function(limit = 10) {
  return this.find({
    $or: [
      { syncStatus: 'pending' },
      { syncStatus: 'failed', syncRetryCount: { $lt: 5 } }  // Max 5 retries
    ]
  }).limit(limit);
};

/**
 * Find nearby places
 */
partnerPlaceSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance  // meters
      }
    },
    status: 'active'
  });
};

/**
 * Get sync statistics
 */
partnerPlaceSchema.statics.getSyncStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$syncStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    synced: 0,
    pending: 0,
    failed: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// =============== Middleware ===============

// Pre-save: Generate thumbnail if not provided
partnerPlaceSchema.pre('save', function(next) {
  if (!this.thumbnail && this.images && this.images.length > 0) {
    this.thumbnail = this.images[0];
  }
  next();
});

// Pre-save: Update coordinates if latitude/longitude are set
partnerPlaceSchema.pre('validate', function(next) {
  // Ensure location object exists
  if (!this.location) {
    this.location = { type: 'Point', coordinates: [] };
  }
  next();
});

const PartnerPlace = mongoose.model("PartnerPlace", partnerPlaceSchema);

export default PartnerPlace;



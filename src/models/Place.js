import mongoose from "mongoose";

const placeSchema = new mongoose.Schema({
  // Basic place information
  name: {
    type: String,
    required: true
  },
  
  // Full text address for Geocoding API
  address: { 
    type: String, 
    required: true 
  },
  
  // Description and categorization
  description: String,
  tags: [{
    type: String
  }],
  
  // Coordinates from Google Geocoding API
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  
  // Additional information
  category: {
    type: String,
    enum: [
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
    default: 'other'
  },
  
  // Image URLs
  images: [String],
  
  // Rating and reviews
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  // Contact information
  contact: {
    phone: String,
    website: String,
    email: String
  },
  
  // Operating hours
  openingHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String
  },
  
  // Price range
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$'],
    default: '$$'
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Admin who added this place
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
placeSchema.index({ tags: 1 });
placeSchema.index({ category: 1 });
placeSchema.index({ 'location.lat': 1, 'location.lng': 1 });
placeSchema.index({ isActive: 1 });

// Text search index for name and description
placeSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

const Place = mongoose.model("Place", placeSchema);
export default Place;

# 🎯 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG EXPLORE ĐA DẠNG

## 📋 Tổng quan

Hệ thống Explore đã được mở rộng để hỗ trợ **60+ danh mục địa điểm** thay vì chỉ giới hạn ở khách sạn và quán cà phê như trước.

## 🏷️ Các danh mục mới

### 🏨 **Lưu trú**
- `khách sạn`, `resort`, `homestay`, `hostel`, `villa`, `apartment`

### 🍽️ **Ẩm thực**
- `nhà hàng`, `quán ăn`, `cafe`, `bar`, `pub`, `bistro`, `food court`, `street food`

### 🎯 **Điểm tham quan**
- `điểm tham quan`, `di tích lịch sử`, `bảo tàng`, `chùa`, `nhà thờ`, `công viên`, `vườn thú`

### 🏖️ **Du lịch tự nhiên**
- `bãi biển`, `núi`, `thác nước`, `hồ`, `sông`, `đảo`, `hang động`, `rừng`

### 🎪 **Giải trí**
- `khu vui chơi`, `công viên giải trí`, `casino`, `club`, `karaoke`, `cinema`, `theater`

### 🛍️ **Mua sắm**
- `trung tâm thương mại`, `chợ`, `cửa hàng`, `siêu thị`, `outlet`, `night market`

### 🏥 **Dịch vụ**
- `spa`, `massage`, `salon`, `gym`, `yoga`, `bệnh viện`, `phòng khám`, `ngân hàng`

### 🚗 **Giao thông**
- `sân bay`, `bến xe`, `ga tàu`, `bến cảng`, `trạm xăng`, `bãi đỗ xe`

### 🎓 **Giáo dục & Văn hóa**
- `trường học`, `thư viện`, `trung tâm văn hóa`, `phòng triển lãm`, `studio`

### 🏢 **Công sở**
- `văn phòng`, `công ty`, `nhà máy`, `khu công nghiệp`, `co-working space`

### 🏠 **Khác**
- `other`

## 🔧 Các thay đổi đã thực hiện

### 1. **Models được cập nhật**
- ✅ `PartnerPlace.js` - Thêm 60+ danh mục mới
- ✅ `Place.js` - Thêm 60+ danh mục mới

### 2. **Google Maps Integration**
- ✅ `integrated-search-service.js` - Mapping đầy đủ từ danh mục tiếng Việt sang Google Maps types

### 3. **Scripts và Tools**
- ✅ `add-diverse-places.js` - Script để thêm dữ liệu mẫu
- ✅ `test-diverse-categories-simple.js` - Script test danh mục
- ✅ `test-explore-api.js` - API test server

## 🚀 Cách sử dụng

### **API Explore chính**
```bash
# Lấy tất cả địa điểm
GET /api/explore

# Lọc theo danh mục cụ thể
GET /api/explore?category=bảo tàng
GET /api/explore?category=spa
GET /api/explore?category=công viên giải trí

# Lọc theo nguồn dữ liệu
GET /api/explore?source=partners
GET /api/explore?source=places
GET /api/explore?source=google

# Kết hợp nhiều filter
GET /api/explore?category=nhà hàng&city=Hà Nội&minRating=4.0
```

### **API Categories**
```bash
# Lấy danh sách tất cả danh mục
GET /api/explore/categories

# Lấy danh mục theo thành phố
GET /api/explore/categories?city=Hà Nội
```

### **API Nearby Places**
```bash
# Tìm địa điểm gần đây với hybrid search
GET /api/explore/nearby?lat=21.0285&lng=105.8542&radius=5000&category=spa
```

## 🧪 Test và Demo

### **Chạy Test Server**
```bash
# Chạy test server để demo
node src/scripts/test-explore-api.js

# Test các endpoint
curl http://localhost:3001/api/test-explore
curl http://localhost:3001/api/test-explore?category=bảo tàng
curl http://localhost:3001/api/test-categories
```

### **Test Scripts**
```bash
# Test danh mục đa dạng
node src/scripts/test-diverse-categories-simple.js

# Thêm dữ liệu mẫu (cần MongoDB)
npm run add-diverse-places
```

## 📊 Ví dụ Response

### **Explore API Response**
```json
{
  "success": true,
  "message": "Explore places fetched successfully",
  "data": {
    "items": [
      {
        "id": "1",
        "title": "Bảo tàng Lịch sử Việt Nam",
        "category": "bảo tàng",
        "address": "1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
        "rating": {
          "average": 4.5,
          "count": 1250
        },
        "images": ["https://example.com/museum1.jpg"],
        "source": "places",
        "isPartner": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 24,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "category": "bảo tàng",
      "city": null,
      "minRating": null,
      "sort": "recent",
      "source": "all"
    },
    "sources": {
      "places": 1,
      "partners": 0,
      "google": 0
    }
  }
}
```

### **Categories API Response**
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": {
    "categories": [
      { "name": "bảo tàng", "count": 15 },
      { "name": "chùa", "count": 12 },
      { "name": "bãi biển", "count": 8 },
      { "name": "công viên giải trí", "count": 6 }
    ],
    "total": 4,
    "city": "all"
  }
}
```

## 🎯 Lợi ích

### **Trước đây**
- ❌ Chỉ có 8 danh mục: khách sạn, nhà hàng, điểm tham quan, khu vui chơi, resort, cafe, spa, other
- ❌ Hạn chế trong việc phân loại địa điểm
- ❌ Không tận dụng được Google Maps API đầy đủ

### **Bây giờ**
- ✅ **60+ danh mục** đa dạng
- ✅ **10 nhóm chính** bao phủ mọi nhu cầu du lịch
- ✅ **Google Maps integration** hoàn chỉnh
- ✅ **Hybrid search** thông minh
- ✅ **Caching** hiệu quả
- ✅ **API** linh hoạt và mạnh mẽ

## 🔮 Tương lai

### **Có thể mở rộng thêm**
- 🎨 **Nghệ thuật**: gallery, studio, workshop
- 🏃 **Thể thao**: sân golf, sân tennis, hồ bơi
- 🎪 **Sự kiện**: convention center, wedding venue
- 🏥 **Y tế**: clinic, pharmacy, dental
- 🚗 **Du lịch**: tour operator, car rental

### **Tính năng nâng cao**
- 🤖 **AI Recommendation** dựa trên danh mục
- 📊 **Analytics** theo danh mục
- 🎯 **Personalized** filtering
- 🌍 **Multi-language** support

## 📞 Hỗ trợ

Nếu có vấn đề gì với hệ thống explore mới, hãy:
1. Kiểm tra logs trong console
2. Test với API endpoints
3. Verify database connection
4. Check Google Maps API key

---

**🎉 Chúc mừng! Hệ thống Explore giờ đã đa dạng và mạnh mẽ hơn rất nhiều!**

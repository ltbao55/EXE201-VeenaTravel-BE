# 📱 HƯỚNG DẪN TÍCH HỢP FRONTEND

## 🚀 QUICK START

### 1. API Endpoint Chính:
```
Base URL: http://localhost:5001/api
```

### 2. API Quan Trọng Nhất:

**Chat AI (với Itinerary & Photos):**
```javascript
POST /api/chat/message
{
  "message": "Tôi muốn đi Đà Nẵng 2 ngày, thích biển",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "AI text...",
    "conversationId": "conv_xxx",
    "locations": [
      {
        "name": "Bãi biển Mỹ Khê",
        "photoUrl": "https://...",  // ✅ Ảnh chính
        "photos": [                  // ✅ 8-10 ảnh
          {
            "url_small": "...400px",
            "url_medium": "...800px",
            "url_large": "...1200px"
          }
        ],
        "coordinates": { "lat": 16.054, "lng": 108.202 },
        "day": 1,
        "time": "08:00"
      }
    ],
    "itinerary": { ... },
    "suggestions": ["Chỉnh sửa lịch trình", ...]
  }
}
```

---

## 📸 PHOTOS - CẢI TIẾN MỚI

### ✨ Điểm nổi bật:
- **8-10 ảnh/location** (trước đây: 1 ảnh)
- **3 sizes:** small (400px), medium (800px), large (1200px)
- **100% locations** có photos

### 💻 Cách dùng:

**1. Hiển thị ảnh đơn:**
```jsx
<img src={location.photoUrl} alt={location.name} />
```

**2. Photo Gallery (Swiper):**
```jsx
<Swiper>
  {location.photos?.map((photo, idx) => (
    <SwiperSlide key={idx}>
      <img src={photo.url_large} alt={location.name} />
    </SwiperSlide>
  ))}
</Swiper>
```

**3. Responsive:**
```jsx
<picture>
  <source srcSet={photo.url_large} media="(min-width: 1200px)" />
  <source srcSet={photo.url_medium} media="(min-width: 768px)" />
  <img src={photo.url_small} alt={location.name} />
</picture>
```

---

## 🗺️ MAPS & SEARCH

**Hybrid Search:**
```javascript
POST /api/hybrid-search/search
{
  "query": "nhà hàng hải sản Đà Nẵng",
  "partnerLimit": 2,
  "googleLimit": 5
}
// Returns: Partners + Google Places với photos
```

**Maps Nearby:**
```javascript
POST /api/maps/nearby
{
  "lat": 16.0544,
  "lng": 108.2022,
  "radius": 5000,
  "type": "restaurant"
}
```

**Directions:**
```javascript
POST /api/maps/directions
{
  "origin": "Đà Nẵng",
  "destination": "Hội An",
  "mode": "driving"
}
```

---

## 📊 RESPONSE STATISTICS

| Metric | Giá trị |
|--------|---------|
| **Response Time** | 15-25s (Chat AI) |
| **Photos/location** | 8-10 ảnh |
| **Photo Coverage** | 100% |
| **AI Optimization** | ✅ (4-6 locations/ngày) |

---

## 🔗 TÀI LIỆU KHÁC

1. **`COMPLETE_API_LIST.md`** - Danh sách đầy đủ API
2. **`PHOTOS_UPDATE_SUMMARY.md`** - Chi tiết về photos
3. **`FRONTEND_INTEGRATION_DEMO.html`** - Demo code

---

## 🎨 DEMO HTML

Mở file `FRONTEND_INTEGRATION_DEMO.html` trong browser để test ngay!

---

## 📝 NOTES

- ✅ Tất cả locations có photos (100%)
- ✅ AI tối ưu số locations theo số ngày
- ✅ 3 sizes cho responsive images
- ✅ Suggestions cho quick replies
- ✅ Trip ID để lấy chi tiết sau

---

**🚀 READY TO INTEGRATE!**






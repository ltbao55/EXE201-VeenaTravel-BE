# Dự án Veena Travel: Tài liệu Kỹ thuật Tổng thể & Nguồn Chân lý Duy nhất

## 1. Tổng quan Dự án

### 1.1. Mục tiêu
Xây dựng một hệ thống API RESTful hoàn chỉnh, mạnh mẽ và có khả năng mở rộng cho nền tảng lập kế hoạch du lịch thông minh **Veena Travel**. Mục tiêu cốt lõi là sử dụng Trí tuệ Nhân tạo (AI) để tự động tạo ra các lịch trình du lịch cá nhân hóa, tích hợp bản đồ trực quan, và vận hành theo mô hình kinh doanh gói đăng ký (subscription) với cổng thanh toán VNPAY, hướng đến thị trường Việt Nam.

### 1.2. Kiến trúc
Hệ thống được xây dựng theo kiến trúc **Monolithic API** để phục vụ cho một ứng dụng Frontend duy nhất (xây dựng bằng React/Next.js). Kiến trúc này tập trung vào việc xây dựng một lõi dịch vụ (service core) ổn định, xử lý toàn bộ logic nghiệp vụ, quản lý dữ liệu, và giao tiếp với các dịch vụ của bên thứ ba.

---

## 2. Bộ Công nghệ (Tech Stack)

| Hạng mục            | Công nghệ                               | Chi tiết & Lý do lựa chọn                                                                                                       |
| :------------------ | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Runtime & Framework** | `Node.js` + `Express.js`                  | Tối ưu cho các tác vụ I/O-bound (gọi API, truy vấn DB). Hiệu năng cao, non-blocking, và hệ sinh thái NPM mạnh mẽ giúp tăng tốc phát triển. |
| **Database & ODM** | `MongoDB` + `Mongoose`                    | Cơ sở dữ liệu NoSQL linh hoạt, phù hợp tự nhiên với dữ liệu dạng JSON từ AI. Mongoose cung cấp schema validation và business logic hooks mạnh mẽ. |
| **Xác thực** | `Firebase Authentication`                 | Ủy thác hoàn toàn việc xác thực cho một dịch vụ chuyên biệt, bảo mật cao, giảm thiểu rủi ro và thời gian phát triển cho backend.         |
| **Mô hình AI** | **Google Gemini API (Gemini 1.5 Flash)** | Cung cấp gói miễn phí hào phóng (60 QPM), hiệu suất cao, và có **chế độ JSON Mode** cực kỳ quan trọng để đảm bảo đầu ra luôn có cấu trúc. |
| **Dịch vụ Bản đồ** | **Google Maps Platform** | Cung cấp bộ API toàn diện: `Geocoding API` (lấy tọa độ từ địa chỉ), `Maps API`, `Directions API` (vẽ lộ trình).                     |
| **Thanh toán** | `VNPAY`                                   | Cổng thanh toán nội địa phổ biến, tích hợp dễ dàng và phù hợp với người dùng cuối tại Việt Nam.                                    |
| **Triển khai** | `Render` / `Vercel`                       | Nền tảng PaaS hiện đại, tự động hóa quy trình CI/CD, quản lý biến môi trường và scaling mà không cần quản trị hạ tầng phức tạp. |

---

## 3. Cấu trúc Database (MongoDB Schemas)

### 3.1. `users`
Lưu thông tin người dùng được đồng bộ từ Firebase.
```javascript
{
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  name: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}
```

### 3.2. `places`
Lưu thông tin địa điểm, là trái tim của hệ thống.
```javascript
{
  name: { type: String, required: true },
  address: { type: String, required: true }, // Địa chỉ đầy đủ, dùng để gọi Geocoding API
  description: String,
  tags: [String],
  location: { // Đối tượng lưu tọa độ, được lấy tự động từ address
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
}
```

### 3.3. `plans`
Lưu thông tin các gói cước (subscription plans).
```javascript
{
  name: { type: String, required: true },
  price: { type: Number, required: true },
  trip_limit: { type: Number, required: true },
  message_limit: { type: Number, required: true },
  is_active: { type: Boolean, default: true }
}
```

### 3.4. `userSubscriptions`
Liên kết người dùng với gói cước và theo dõi mức độ sử dụng.
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: { type: String, enum: ['active', 'canceled'], default: 'active' },
  current_trip_count: { type: Number, default: 0 },
  current_message_count: { type: Number, default: 0 },
  endDate: Date
}
```

### 3.5. `trips`
Lưu lịch trình chi tiết do AI tạo ra cho mỗi người dùng.
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary: Object, // Đối tượng JSON chi tiết từ AI sau khi đã được làm giàu dữ liệu
  places: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }] // Tham chiếu đến các địa điểm trong chuyến đi
}
```

### 3.6. `payments`
Lịch sử giao dịch VNPAY.
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  amount: Number,
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' }
}
```

---

## 4. Các Luồng Xử lý Chính (Core Workflows)

### 4.1. Luồng Dữ liệu Nền (Data Preparation Flow)
1. **Cào Dữ liệu (Data Scraping)**: Chạy các script (sử dụng Node.js với Puppeteer/Cheerio) để thu thập thông tin địa điểm (tên, địa chỉ, mô tả, tags) từ các nguồn công khai, sau đó import vào collection `places` trong MongoDB.

2. **Lấy Tọa độ Hàng loạt (Batch Geocoding)**: Chạy một script riêng để duyệt qua tất cả các địa điểm chưa có tọa độ. Với mỗi địa điểm, script lấy trường `address`, gọi Google Geocoding API để lấy `lat` và `lng`, và cập nhật lại vào document tương ứng trong database.

### 4.2. Luồng Quản trị viên & Geocoding (Admin & Geocoding Flow)
Khi Admin thêm hoặc sửa một địa điểm qua Admin Panel, hệ thống sẽ tự động gọi Google Geocoding API để lấy tọa độ từ địa chỉ được cung cấp trước khi lưu vào database. Luồng này đảm bảo dữ liệu mới luôn có tọa độ chính xác.

### 4.3. Luồng Xác thực (Authentication Flow)
1. **Frontend**: Người dùng đăng nhập bằng Google qua Firebase SDK và nhận về một `idToken` (JWT).

2. **Backend**: `idToken` được gửi lên trong Header `Authorization: Bearer <idToken>`. Middleware `isAuthenticated` sử dụng Firebase Admin SDK để xác minh token. Nếu hợp lệ, tìm hoặc tạo người dùng trong collection `users`, gán Gói Miễn phí mặc định, và gắn đối tượng `user` từ DB vào `req.user`.

### 4.4. Luồng AI Tạo Lịch trình (Core AI Planning Flow)
Đây là luồng xử lý phức tạp và thông minh nhất của hệ thống.

1. **Trích xuất Thông tin (Extraction)**: Backend nhận yêu cầu dạng văn bản thô từ người dùng. Nó gửi một prompt đơn giản đến Gemini yêu cầu trích xuất các thực thể (destination, duration, interests) và trả về dưới dạng JSON.

2. **Truy vấn Database (Retrieval)**: Backend dùng các thực thể này để xây dựng một câu lệnh query vào collection `places` nhằm tìm ra danh sách các địa điểm phù hợp nhất.

3. **Tạo "Siêu Mệnh Lệnh" (Super-prompt Generation)**: Backend xây dựng một prompt rất chi tiết và có cấu trúc. Nó nhúng danh sách các địa điểm tìm được vào prompt và ra lệnh cho Gemini tạo một lịch trình tối ưu.

4. **Nhận kết quả từ AI (Generation)**: Backend gọi Gemini API với JSON Mode được bật để đảm bảo nhận về một JSON lịch trình hợp lệ. Kết quả ở bước này chỉ chứa `place_name`.

5. **Làm giàu Dữ liệu (Enrichment)**: Backend duyệt qua JSON lịch trình từ AI. Với mỗi `place_name`, nó tra cứu trong danh sách địa điểm đã lấy ở Bước 2 để gắn thêm các dữ liệu quan trọng như `_id` và `location` (tọa độ).

6. **Phản hồi Frontend**: Backend gửi JSON đã được "làm giàu" và hoàn chỉnh về cho Frontend để hiển thị cả lịch trình và bản đồ.

### 4.5. Luồng Tương tác Nâng cao (Advanced Interaction Flows)
1. **Tái lập kế hoạch (Regeneration)**: Khi người dùng muốn đổi địa điểm, backend tạo "siêu mệnh lệnh" mới với ràng buộc chặt hơn (ví dụ: PHẢI CÓ địa điểm A, KHÔNG CÓ địa điểm B) và yêu cầu AI tạo lại một lịch trình tối ưu mới.

2. **Kế hoạch Dự phòng (Backup Plans)**: "Siêu mệnh lệnh" có thể yêu cầu AI đề xuất các hoạt động dự phòng (ví dụ: trong nhà) cho mỗi hoạt động ngoài trời, và dữ liệu này sẽ được trả về trong cấu trúc JSON.

### 4.6. Luồng Thanh toán (Payment Flow)
Backend tạo URL thanh toán VNPAY, người dùng hoàn tất giao dịch. VNPAY gọi về Webhook (IPN) của backend. Backend xác thực `secure_hash`, cập nhật payment status và `userSubscriptions` (bao gồm việc reset các bộ đếm sử dụng).

---

## 5. Xử lý Trường hợp Ngoại lệ (Edge Case Handling)

1. **Input Mơ hồ**: Backend yêu cầu người dùng làm rõ nếu không trích xuất được địa điểm.

2. **Không tìm thấy Địa điểm**: Backend dừng luồng ngay sau khi truy vấn DB, không gọi AI, và thông báo cho người dùng.

3. **AI "Bịa" Địa điểm (Hallucination)**: Backend xác thực lại mọi `place_name` từ AI so với danh sách đã lấy từ DB trong bước làm giàu. Các địa điểm không hợp lệ sẽ bị loại bỏ.

4. **JSON từ AI bị lỗi**: Backend sử dụng khối try-catch khi parse JSON và có cơ chế thử lại (retry) 1-2 lần trước khi báo lỗi.

---

## 6. Quy trình Phát triển & Kiểm thử

### 6.1. Lộ trình Phát triển theo Giai đoạn
- **Giai đoạn 0 (Chuẩn bị)**: Cào và chuẩn bị dữ liệu địa điểm, bao gồm cả việc lấy tọa độ hàng loạt.
- **Giai đoạn 1 (Nền tảng)**: Hoàn thành Xác thực, Admin Panel, và các API CRUD cơ bản.
- **Giai đoạn 2 (Lõi AI 1.0)**: Xây dựng luồng AI cơ bản để tạo lịch trình. Tích hợp thanh toán VNPAY.
- **Giai đoạn 3 (Tích hợp)**: Kết nối logic gói cước, hoàn thiện các API phụ, thêm validation.
- **Giai đoạn 4 (Hoàn thiện)**: Xây dựng các tính năng AI nâng cao (tái lập kế hoạch, dự phòng), bảo mật, và viết tài liệu.

### 6.2. Quy trình Hợp tác (Git Workflow)
- **Quản lý Task**: Sử dụng Trello hoặc GitHub Projects.
- **Phân nhánh (Branching)**: Mỗi tính năng mới được phát triển trên một nhánh riêng (ví dụ: `feature/ai-flow`). Không code trực tiếp trên nhánh `main`.
- **Pull Request (PR)**: Sau khi hoàn thành, tạo PR để merge vào `main`.
- **Code Review**: Thành viên còn lại trong nhóm review code trước khi merge để đảm bảo chất lượng.

### 6.3. Quy trình Kiểm thử (Testing Strategy)
- Sử dụng **Thunder Client** (tích hợp trong VS Code) làm công cụ chính.
- **Kiểm thử API Đơn lẻ**: Người code tính năng tự test API của mình với các trường hợp thành công (happy path), thất bại (bad path), và xác thực.
- **Kiểm thử Tích hợp**: Cả nhóm cùng test các luồng nghiệp vụ có sự tương tác giữa các module (ví dụ: Thanh toán thành công có cập nhật đúng gói cước không).
- **Kiểm thử End-to-End (E2E)**: Test trên giao diện website hoàn chỉnh để đảm bảo toàn bộ luồng người dùng hoạt động trơn tru.

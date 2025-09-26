## **Luồng Xử lý Tổng quan (Backend)**

Khi người dùng gửi một yêu cầu (ví dụ: "Gợi ý lịch trình 2 ngày ở Đà Lạt cho cặp đôi, thích cà phê và ngắm cảnh"), luồng xử lý của backend sẽ diễn ra như sau:

1.  **Tiếp nhận & Phân tích (Parse & Understand):** Nhận chuỗi văn bản thô từ người dùng. Gọi đến **OpenRouter** (Lần 1) để trích xuất các thông tin cốt lõi (ý định) thành dạng JSON có cấu trúc.
2.  **Tìm kiếm & Lọc (Search & Filter):** Dựa vào ý định vừa trích xuất, tạo vector embedding và truy vấn **Pinecone** để lấy ra danh sách các `_id` của địa điểm phù hợp nhất.
3.  **Làm giàu Dữ liệu (Enrich Data):** Dùng danh sách `_id` ở trên để truy vấn vào **MongoDB Atlas** và lấy ra toàn bộ thông tin chi tiết (tên, tọa độ, mô tả...) của các địa điểm đó.
4.  **Tính toán Lộ trình (Calculate Routes):** Lấy tọa độ của tất cả các địa điểm tiềm năng và gọi API của **Mapbox** để tính toán ma trận thời gian di chuyển giữa tất cả các cặp địa điểm.
5.  **Tổng hợp & Lên Lịch trình (Synthesize & Schedule):** Gom tất cả thông tin (yêu cầu gốc của người dùng + danh sách địa điểm chi tiết + ma trận thời gian di chuyển) vào một "siêu mệnh lệnh" (super-prompt). Gọi **OpenRouter** (Lần 2) để AI sắp xếp và tạo ra lịch trình cuối cùng dưới dạng JSON.
6.  **Phản hồi (Respond):** Trả JSON lịch trình hoàn chỉnh về cho Frontend.

-----

## **Chia Task Chi Tiết cho Lập trình Backend**

Dưới đây là các task được chia nhỏ theo thứ tự, bạn có thể thực hiện tuần tự.
Lưu ý, tạo giao diện html đơn giản để test api.
### **Bước 0: Chuẩn bị Môi trường & Cấu trúc**

  * **Mục tiêu:** Thiết lập nền tảng để các module có thể giao tiếp với nhau và với các dịch vụ bên ngoài.
  * **Các bước thực hiện:**
    1.  Cài đặt các thư viện cần thiết: `axios` (để gọi API), `dotenv` (quản lý biến môi trường), `mongodb`, `@pinecone-database/pinecone`.
    2.  Tạo file `.env` và định nghĩa tất cả các biến cần thiết:
        ```
        MONGO_URI=...
        PINECONE_API_KEY=...
        PINECONE_ENVIRONMENT=...
        OPENROUTER_API_KEY=...
        MAPBOX_SECRET_TOKEN=...
        EMBEDDING_API_KEY=... (Ví dụ: Google AI Key)
        ```
    3.  Tạo cấu trúc thư mục, ví dụ:
        ```
        /src
        |-- /controllers  (Chứa logic xử lý request/response)
        |-- /services     (Chứa logic giao tiếp với API bên ngoài)
        |   |-- openRouterService.js
        |   |-- pineconeService.js
        |   |-- mapboxService.js
        |   |-- embeddingService.js
        |-- /routes       (Định nghĩa các API endpoint)
        |-- server.js     (Điểm khởi đầu của ứng dụng)
        ```

-----

### **Task 1: Module Trích xuất Ý định với OpenRouter 🤖**

  * **Mục tiêu:** Xây dựng một hàm có khả năng biến câu nói tự nhiên của người dùng thành một object JSON.
  * **File làm việc:** `src/services/openRouterService.js`
  * **Input:** Một chuỗi văn bản, ví dụ: `"tìm quán ăn gia đình ở Đà Lạt"`
  * **Output:** Một object JSON, ví dụ: `{ "category": "food", "tags": ["family-friendly", "restaurant"], "destination": "Đà Lạt" }`
  * **Các bước thực hiện:**
    1.  Viết hàm `extractIntent(userQuery: string)`.
    2.  Bên trong hàm, xây dựng một prompt cho LLM. Prompt này phải yêu cầu LLM phân tích `userQuery` và **chỉ trả về một đối tượng JSON** với các trường đã định nghĩa (ví dụ: `category`, `tags`, `destination`, `duration`, `pax`...).
    3.  Sử dụng `axios` để gọi API của OpenRouter với prompt đã xây dựng.
    4.  Xử lý kết quả trả về: parse chuỗi JSON và trả về object. **Quan trọng:** phải có `try-catch` để xử lý trường hợp AI trả về văn bản không phải JSON.

-----

### **Task 2: Module Tìm kiếm Ngữ nghĩa với Pinecone 🔎**

  * **Mục tiêu:** Xây dựng hàm tìm kiếm các địa điểm liên quan dựa trên các `tags`/`interests` đã trích xuất.
  * **File làm việc:** `src/services/pineconeService.js` và `src/services/embeddingService.js`
  * **Input:** Một mảng các `tags`, ví dụ: `["quán ăn", "gia đình"]`
  * **Output:** Một mảng các `_id` của địa điểm, ví dụ: `['65f123...', '65f456...']`
  * **Các bước thực hiện:**
    1.  **Trong `embeddingService.js`:** Viết hàm `createEmbedding(text: string)` để gọi API embedding (ví dụ: Google AI, OpenAI) và trả về một vector số thực.
    2.  **Trong `pineconeService.js`:** Viết hàm `queryByTags(tags: string[])`.
    3.  Bên trong hàm này:
          * Nối các tags thành một chuỗi duy nhất (ví dụ: `"quán ăn, gia đình"`).
          * Gọi `createEmbedding()` để tạo vector truy vấn từ chuỗi này.
          * Sử dụng Pinecone client để thực hiện truy vấn `query` với vector vừa tạo, yêu cầu trả về top N (ví dụ: 20) kết quả gần nhất.
          * Trích xuất và trả về danh sách các `id` từ kết quả.

-----

### **Task 3: Module Tính toán Lộ trình với Mapbox 🗺️**

  * **Mục tiêu:** Xây dựng một hàm nhận vào danh sách các địa điểm và trả về ma trận thời gian di chuyển giữa chúng.
  * **File làm việc:** `src/services/mapboxService.js`
  * **Input:** Một mảng các object địa điểm (lấy từ MongoDB sau khi có `_id`), mỗi object chứa tọa độ. Ví dụ: `[{ name: 'A', location: { coordinates: [lng1, lat1] } }, { name: 'B', location: { coordinates: [lng2, lat2] } }]`
  * **Output:** Một ma trận 2D hoặc một object lồng nhau chứa thời gian di chuyển (bằng giây). Ví dụ: `[[0, 1200], [1150, 0]]` (Thời gian từ A-\>A là 0, A-\>B là 1200s).
  * **Các bước thực hiện:**
    1.  Viết hàm `getDurationMatrix(places: Place[])`.
    2.  Từ mảng `places`, trích xuất danh sách các tọa độ theo định dạng mà Mapbox Matrix API yêu cầu (`longitude,latitude;longitude,latitude;...`).
    3.  Sử dụng `axios` để gọi Mapbox Matrix API với danh sách tọa độ và `MAPBOX_SECRET_TOKEN`.
    4.  Xử lý kết quả JSON trả về từ Mapbox để xây dựng và trả về ma trận thời gian.

-----

### **Task 4: Kết hợp Tất cả thành API Endpoint Chính 🧩**

  * **Mục tiêu:** Tạo một API endpoint duy nhất để điều phối tất cả các module đã xây dựng ở trên.
  * **File làm việc:** `src/controllers/tripController.js` và `src/routes/tripRoutes.js`
  * **Endpoint:** `POST /api/v1/trips/generate`
  * **Input:** Body của request chứa query của người dùng: `{ "query": "..." }`
  * **Output:** JSON chứa lịch trình hoàn chỉnh.
  * **Các bước thực hiện (Logic trong `tripController.js`):**
    1.  Nhận `query` từ `req.body`.
    2.  Gọi `extractIntent(query)` từ **Task 1**.
    3.  Lấy `tags` từ kết quả và gọi `queryByTags(tags)` từ **Task 2** để lấy danh sách `_id`.
    4.  Sử dụng danh sách `_id` để truy vấn MongoDB và lấy ra thông tin chi tiết của các địa điểm (bao gồm tọa độ).
    5.  Gọi `getDurationMatrix(places)` từ **Task 3** để lấy ma trận thời gian.
    6.  **Xây dựng "siêu mệnh lệnh" cuối cùng:**
          * Tạo một prompt lớn gửi cho OpenRouter (Lần 2).
          * Prompt này bao gồm:
              * Yêu cầu gốc của người dùng.
              * Một danh sách các địa điểm tiềm năng (dạng JSON, chỉ chứa thông tin cần thiết như tên, mô tả ngắn, loại hình).
              * Ma trận thời gian di chuyển (dạng JSON).
              * Hướng dẫn cụ thể cho AI: "Dựa vào các thông tin trên, hãy tạo một lịch trình du lịch hợp lý nhất. Sắp xếp các địa điểm theo từng ngày, tối ưu hóa thời gian di chuyển. **CHỈ TRẢ VỀ KẾT QUẢ DƯỚI DẠNG JSON** theo cấu trúc sau...".
    7.  Gọi API OpenRouter với "siêu mệnh lệnh" này.
    8.  Nhận kết quả JSON cuối cùng và gửi về cho client qua `res.json()`. Nhớ bọc toàn bộ logic trong `try-catch` để xử lý lỗi.
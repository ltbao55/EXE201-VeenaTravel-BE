Luồng này được chia thành hai giai đoạn chính: **Chuẩn bị (Offline)** và **Tương tác (Online)**.

---
### ## Giai đoạn 1: Chuẩn bị Dữ liệu (Offline) ⚙️

*Mục tiêu: Nạp toàn bộ kiến thức về các địa điểm vào các "bộ não" lưu trữ.*

1.  **Điểm Khởi đầu:** Bạn có một file dữ liệu thô là **`destinations.json`** 📂. File này chứa danh sách các địa điểm, mỗi địa điểm có đầy đủ thông tin (tên, mô tả, địa chỉ, tọa độ...).

2.  **Thực thi Script:** Bạn chạy một script duy nhất là **`scripts/seeder.js`**. Script này là "người công nhân" làm hai việc song song cho mỗi địa điểm trong file JSON:

    * **Việc A -> Gửi cho "Thủ kho" (MongoDB):**
        * Nó lấy **toàn bộ object JSON** của một địa điểm.
        * Lưu thẳng vào **MongoDB Atlas**. MongoDB sẽ gán cho địa điểm này một `_id` duy nhất.

    * **Việc B -> Gửi cho "Trợ lý Tìm kiếm" (Pinecone):**
        * Nó lấy phần **TEXT** (`name`, `description`, `tags`) của địa điểm đó.
        * Nó gọi đến dịch vụ embedding (ví dụ: Google AI) để biến text này thành một **vector "vân tay" số**.
        * Nó gửi **vector "vân tay"** này cùng với **`_id`** đã nhận từ MongoDB vào **Pinecone**.

3.  **Kết quả:** Sau khi script chạy xong, hệ thống của bạn đã sẵn sàng.
    * **MongoDB** đóng vai trò là kho lưu trữ chi tiết, là "nguồn chân lý".
    * **Pinecone** đóng vai trò là bộ chỉ mục thông minh, đã học và ghi nhớ "ý nghĩa" của từng địa điểm.

---
### ## Giai đoạn 2: Tương tác với Người dùng (Online) 🤖

*Mục tiêu: Khi người dùng chat, hệ thống sẽ thực hiện một chuỗi logic để đưa ra câu trả lời thông minh và tối ưu nhất.*

**[ Sơ đồ luồng: User -> OpenRouter -> Pinecone -> MongoDB -> Mapbox -> OpenRouter -> User ]**

1.  **Bước 1: Hiểu Yêu cầu (Intent Extraction)**
    * Người dùng gửi một câu chat, ví dụ: "Gợi ý vài điểm check-in sống ảo ở Đà Lạt".
    * **Backend** nhận câu này và gửi nó đến **OpenRouter** (Bộ não Sáng tạo).
    * **Kết quả:** OpenRouter trả về một JSON đơn giản: `{ "interests": ["check-in", "sống ảo"], "destination": "Đà Lạt" }`.

2.  **Bước 2: Tìm kiếm Ứng viên (Semantic Search)**
    * **Backend** tạo một vector từ `["check-in", "sống ảo"]`.
    * Nó gửi vector này đến **Pinecone** (Bộ não Tìm kiếm) 🧠.
    * **Kết quả:** Pinecone trả về một danh sách các `_id` của những địa điểm có ý nghĩa phù hợp nhất.

3.  **Bước 3: Lấy Hồ sơ Chi tiết (Data Hydration)**
* **Backend** dùng danh sách `_id` này để truy vấn **MongoDB Atlas** (Thủ kho) 🗄️.
    * **Kết quả:** Backend nhận về một mảng chứa toàn bộ thông tin chi tiết (tên, mô tả, tọa độ...) của các địa điểm ứng viên.

4.  **Bước 4: Tính toán Lộ trình (Route Calculation)**
    * **Backend** nhìn vào danh sách các địa điểm chi tiết vừa lấy được.
    * Nó gọi đến **Mapbox Directions API** để xây dựng một "ma trận thời gian di chuyển" giữa tất cả các cặp địa điểm đó.
    * **Kết quả:** Một object JSON chứa dữ kiện về thời gian đi lại, ví dụ: `{ "from_A_to_B": 300, "from_A_to_C": 480, ... }`.

5.  **Bước 5: Tổng hợp & Lập kế hoạch (Response Generation)**
    * **Backend** tập hợp tất cả "nguyên liệu" đã thu thập:
        1.  Yêu cầu ban đầu của người dùng.
        2.  Danh sách hồ sơ địa điểm chi tiết từ MongoDB.
        3.  Ma trận thời gian di chuyển từ Mapbox.
    * Nó gửi toàn bộ "bộ hồ sơ" này cho **OpenRouter** (Bộ não Sáng tạo) lần thứ hai.
    * **Kết quả:** OpenRouter, với đầy đủ dữ kiện, sẽ viết ra một câu trả lời hoàn chỉnh, sắp xếp các địa điểm theo thứ tự logic, và gói gọn trong một file JSON cuối cùng chứa cả ngôn ngữ tự nhiên và dữ liệu có cấu trúc.

6.  **Bước 6: Gửi về cho Người dùng**
    * **Backend** gửi file JSON cuối cùng này cho **Frontend** để hiển thị.
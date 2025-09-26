================================================== MAPBOX MATRIX API
Mapbox Matrix API trả về thời gian di chuyển giữa nhiều điểm. API này hữu ích cho việc tính toán ma trận thời gian hoặc khoảng cách, ví dụ như để xác định thời gian di chuyển từ một điểm đến nhiều điểm khác.

Lấy một ma trận (Retrieve a matrix)
GET https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/{profile}/{coordinates}

Trả về một ma trận thời gian, ma trận khoảng cách, hoặc cả hai. Phản hồi chứa thông tin về thời gian di chuyển (tính bằng giây) và khoảng cách (tính bằng mét) giữa các tọa độ.

Tham số bắt buộc (Required Parameters)
profile: (string) ID của hồ sơ định tuyến (ví dụ: mapbox/driving).

coordinates: (number) Danh sách các tọa độ {longitude},{latitude} được phân tách bằng dấu chấm phẩy.

Tham số tùy chọn (Optional Parameters)
annotations: (string) Chỉ định ma trận kết quả trả về. Giá trị có thể là duration (mặc định), distance, hoặc cả hai.

approaches: (string) Chỉ định hướng tiếp cận cho mỗi tọa độ (unrestricted hoặc curb).

destinations: (integer/string) Chỉ định các tọa độ sẽ được sử dụng làm điểm đến.

sources: (integer/string) Chỉ định các tọa độ sẽ được sử dụng làm điểm xuất phát.

fallback_speed: (integer) Tốc độ dự phòng (km/h) để sử dụng khi không tìm thấy tuyến đường.

depart_at: (string) Thời gian khởi hành mong muốn theo định dạng ISO 8601.

================================================== MAPBOX DIRECTIONS API
Mapbox Directions API cho phép bạn tính toán các tuyến đường tối ưu giữa các địa điểm cho nhiều phương thức di chuyển khác nhau.

Với Directions API, bạn có thể:

Tính toán các tuyến đường lái xe, đi bộ và đi xe đạp tối ưu có tính đến giao thông và sự cố.

Tạo ra các hướng dẫn chi tiết từng chặng.

Tạo ra các tuyến đường với tối đa 25 tọa độ.

Tính toán các tuyến đường cho xe điện với các điểm dừng sạc tối ưu.

Lấy chỉ đường (Retrieve directions)
GET https://www.google.com/search?q=https://api.mapbox.com/directions/v5/{profile}/{coordinates}

Lấy chỉ đường giữa các điểm tham chiếu. Yêu cầu phải chỉ định ít nhất hai điểm tham chiếu (điểm bắt đầu và điểm kết thúc).

Tham số bắt buộc (Required Parameters)
profile: (string) Hồ sơ định tuyến để sử dụng. Các giá trị có thể là mapbox/driving-traffic, mapbox/driving, mapbox/walking, hoặc mapbox/cycling.

coordinates: (number) Một danh sách các cặp tọa độ {longitude},{latitude} được phân tách bằng dấu chấm phẩy để đi qua theo thứ tự.

Hồ sơ định tuyến (Routing Profiles)
mapbox/driving-traffic: Dành cho định tuyến ô tô, có tính đến điều kiện giao thông hiện tại và lịch sử để tránh tắc nghẽn.

mapbox/driving: Dành cho định tuyến ô tô, ưu tiên các con đường tốc độ cao như đường cao tốc để có tuyến đường nhanh nhất.

mapbox/walking: Dành cho định tuyến cho người đi bộ, sử dụng vỉa hè và các lối đi bộ.

mapbox/cycling: Dành cho định tuyến xe đạp, ưu tiên các tuyến đường ngắn và an toàn, tránh đường cao tốc.

Tham số tùy chọn (Optional Parameters)
alternatives: (boolean) Trả về các tuyến đường thay thế (tối đa hai tuyến) nếu có. Mặc định là false.

annotations: (string) Trả về siêu dữ liệu bổ sung dọc theo tuyến đường. Các giá trị có thể là distance, duration, speed, congestion, v.v.

approaches: (string) Chỉ định hướng tiếp cận cho mỗi điểm tham chiếu (unrestricted hoặc curb).

banner_instructions: (boolean) Trả về hướng dẫn dạng biểu ngữ để hiển thị cho người dùng.

bearings: (string) Giúp định hướng tuyến đường tại các điểm tham chiếu.

continue_straight: (boolean) Cho phép tuyến đường tiếp tục đi thẳng qua các điểm tham chiếu trung gian.

exclude: (string) Loại trừ một số loại đường hoặc địa điểm khỏi định tuyến (ví dụ: motorway, toll, ferry).

geometries: (string) Định dạng của hình học được trả về (geojson, polyline, polyline6). Mặc định là polyline.

language: (string) Ngôn ngữ của các hướng dẫn từng chặng.

overview: (string) Mức độ chi tiết của hình học tổng quan của tuyến đường (full, simplified, false).

steps: (boolean) Trả về các bước hướng dẫn chi tiết từng chặng. Mặc định là false.

voice_instructions: (boolean) Trả về hướng dẫn bằng giọng nói dưới dạng văn bản được đánh dấu SSML.

voice_units: (string) Đơn vị đo lường cho hướng dẫn bằng giọng nói (imperial hoặc metric).

waypoints: (string) Chỉ định các tọa độ đầu vào nào được coi là điểm tham chiếu chính trên tuyến đường.

Đối tượng phản hồi (Response Object)
Phản hồi thành công từ Directions API là một đối tượng JSON chứa các thông tin sau:

code: Một chuỗi cho biết trạng thái của yêu cầu. Giá trị Ok có nghĩa là yêu cầu thành công.

routes: Một mảng chứa một hoặc nhiều đối tượng tuyến đường, mỗi đối tượng mô tả một lộ trình hoàn chỉnh từ điểm đầu đến điểm cuối. Mỗi tuyến đường chứa thông tin như duration (thời gian), distance (khoảng cách), geometry (hình học tuyến đường), và một mảng legs (các chặng đường).

waypoints: Một mảng các đối tượng điểm tham chiếu, chứa thông tin về điểm bắt đầu, điểm kết thúc và các điểm trung gian.

Mã lỗi (Error Codes)
API có thể trả về các mã lỗi khác nhau, ví dụ:

NoRoute: Không tìm thấy tuyến đường nào giữa các điểm đã cho.

InvalidInput: Đầu vào không hợp lệ, ví dụ như tọa độ sai định dạng.

ProfileNotFound: Hồ sơ định tuyến không tồn tại.

Forbidden: Token truy cập không hợp lệ hoặc có vấn đề về quyền.
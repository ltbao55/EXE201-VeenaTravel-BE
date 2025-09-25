================================================== MATRIX API
Mapbox Matrix API trả về thời gian di chuyển giữa nhiều điểm.

Ví dụ, cho ba địa điểm A, B và C, Matrix API sẽ trả về một ma trận của tất cả thời gian di chuyển tính bằng giây giữa các địa điểm đó:

  | A      | B      | C      

---+--------+--------+--------
A  | A → A  | A → B  | A → C

B  | B → A  | B → B  | B → C

C  | C → A  | C → B  | C → C

Matrix API sẽ luôn trả về khoảng thời gian hoặc khoảng cách cho tuyến đường nhanh nhất cho mỗi phần tử trong ma trận, trong đó một phần tử là một cặp điểm gốc-đích trong ma trận. Matrix API trả về khoảng thời gian tính bằng giây và khoảng cách tính bằng mét.

Thời gian hoặc khoảng cách giữa các tuyến đường có thể không đối xứng, vì các tuyến đường có thể khác nhau về hướng do đường một chiều hoặc các hạn chế về rẽ. Ví dụ, từ A đến B có thể có thời gian khác với từ B đến A.

Matrix API cho phép bạn kiểm tra hiệu quả khả năng tiếp cận của các tọa độ với nhau, lọc các điểm theo thời gian di chuyển hoặc chạy các thuật toán của riêng bạn để giải quyết các vấn đề tối ưu hóa.

Lấy một ma trận (Retrieve a matrix)
GET https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/{profile}/{coordinates}

Trả về một ma trận thời gian, ma trận khoảng cách, hoặc cả hai, hiển thị thời gian di chuyển và khoảng cách giữa các tọa độ.

Trong trường hợp mặc định, điểm cuối này trả về một ma trận đối xứng sử dụng tất cả các tọa độ đầu vào làm nguồn và đích (N×N). Sử dụng các tham số tùy chọn sources và destinations, bạn cũng có thể tạo một ma trận không đối xứng chỉ sử dụng một số tọa độ làm nguồn hoặc đích: một đến nhiều (1×N), nhiều đến một (N×1), và một số đến một số (M×N).

Tham số bắt buộc (Required parameters)
Tham số: profile

Kiểu dữ liệu: string

Mô tả: Một Mapbox Directions routing profile ID.

Tham số: coordinates

Kiểu dữ liệu: number

Mô tả: Một danh sách các tọa độ {longitude},{latitude} được phân tách bằng dấu chấm phẩy. Phải có từ hai đến 25 tọa độ. Đối với hồ sơ mapbox/driving-traffic, tối đa là 10 tọa độ.

Profile ID

Profile ID: mapbox/driving

Mô tả: Thời gian di chuyển bằng ô tô, khoảng cách, hoặc cả hai.

Profile ID: mapbox/walking

Mô tả: Thời gian di chuyển của người đi bộ, khoảng cách, hoặc cả hai.

Profile ID: mapbox/cycling

Mô tả: Thời gian di chuyển bằng xe đạp, khoảng cách, hoặc cả hai.

Profile ID: mapbox/driving-traffic

Mô tả: Thời gian di chuyển bằng ô tô, khoảng cách, hoặc cả hai, được thông báo bởi dữ liệu giao thông.

Tham số tùy chọn (Optional parameters)
Bạn có thể tinh chỉnh thêm kết quả từ điểm cuối này với các tham số tùy chọn sau:

Tham số: annotations

Kiểu dữ liệu: string

Mô tả: Được sử dụng để chỉ định ma trận kết quả. Các giá trị có thể là: duration (mặc định), distance, hoặc cả hai giá trị được phân tách bằng dấu phẩy.

Tham số: approaches

Kiểu dữ liệu: string

Mô tả: Một danh sách được phân tách bằng dấu chấm phẩy cho biết phía của con đường để tiếp cận các điểm tham chiếu trong một tuyến đường được yêu cầu. Chấp nhận unrestricted (mặc định, tuyến đường có thể đến điểm tham chiếu từ hai bên đường) hoặc curb (tuyến đường sẽ đến điểm tham chiếu ở phía driving_side của khu vực). Nếu được cung cấp, số lượng các cách tiếp cận phải giống với số lượng các điểm tham chiếu. Tuy nhiên, bạn có thể bỏ qua một tọa độ và hiển thị vị trí của nó trong danh sách bằng dấu phân cách ;.

Tham số: bearings

Kiểu dữ liệu: string

Mô tả: Một danh sách các tiêu đề được phân tách bằng dấu chấm phẩy và độ lệch cho phép cho biết hướng di chuyển. Được sử dụng để lọc đoạn đường mà một điểm tham chiếu sẽ được đặt trên hướng của thiết bị. Điều này hữu ích để đảm bảo các tuyến đường mới được định tuyến lại tiếp tục theo hướng mong muốn của chúng. Nhập dưới dạng hai giá trị được phân tách bằng dấu phẩy cho mỗi vị trí: một tiêu đề được đo theo chiều kim đồng hồ từ hướng bắc thực trong khoảng từ 0 đến 360 và phạm vi độ mà góc có thể lệch đi (khuyến nghị là 45° hoặc 90°), được định dạng là {angle},{degrees}. Nếu được cung cấp, số lượng các tiêu đề phải bằng số lượng các vị trí; bạn có thể bỏ qua một tọa độ và hiển thị vị trí của nó trong danh sách bằng dấu phân cách ;.

Tham số: destinations

Kiểu dữ liệu: integer hoặc string

Mô tả: Sử dụng các tọa độ tại một chỉ mục đã cho làm đích. Các giá trị có thể là: một danh sách các chỉ mục dựa trên 0 được phân tách bằng dấu chấm phẩy, hoặc all (mặc định). Tùy chọn all cho phép sử dụng tất cả các tọa độ làm đích.

Tham số: sources

Kiểu dữ liệu: integer hoặc string

Mô tả: Sử dụng các tọa độ tại một chỉ mục đã cho làm nguồn. Các giá trị có thể là: một danh sách các chỉ mục dựa trên 0 được phân tách bằng dấu chấm phẩy, hoặc all (mặc định). Tùy chọn all cho phép sử dụng tất cả các tọa độ làm nguồn.

Tham số: fallback_speed

Kiểu dữ liệu: integer

Mô tả: Theo mặc định, nếu không có tuyến đường khả thi giữa hai điểm, API Matrix sẽ đặt phần tử ma trận kết quả thành null. Để tránh hành vi này, hãy đặt tham số fallback_speed thành một giá trị lớn hơn 0 tính bằng kilômét trên giờ. API Matrix sẽ thay thế giá trị null bằng một đường thẳng giữa nguồn và đích dựa trên giá trị tốc độ được cung cấp.

Tham số: depart_at

Kiểu dữ liệu: string

Mô tả: Chỉ định thời gian khởi hành mong muốn để tính đến các điều kiện giao thông và hạn chế đường trong tương lai; thời gian sẽ được tính toán dựa trên một hồ sơ được chỉ định để xác định phương tiện chuyên chở và dữ liệu giao thông mong muốn hoặc yêu cầu. Được định dạng theo một trong ba định dạng ISO 8601: YYYY-MM-DDThh:mm:ssZ, YYYY-MM-DDThh:mm:ss, hoặc YYYY-MM-DDThh:mm. Trong định dạng cuối cùng, múi giờ được tính từ vị trí tuyến đường. Nếu để trống, depart_at sẽ được tính là thời gian hiện tại trong múi giờ địa phương của tọa độ đầu tiên. Đặt thuộc tính depart_at thành thời gian hiện tại hoặc một thời điểm nào đó trong tương lai. Nó không thể ở trong quá khứ.

Các tùy chọn không được nhận dạng trong chuỗi truy vấn sẽ dẫn đến lỗi InvalidInput.

Yêu cầu ví dụ: Lấy một ma trận (Example request)
Yêu cầu một ma trận đối xứng 3x3 cho ô tô với cách tiếp cận lề đường cho mỗi điểm đến
$ curl "https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/mapbox/driving/-122.42,37.78%3B-122.45,37.91%3B-122.48,37.73%3Fapproaches%3Dcurb%3Bcurb%3Bcurb%26DEPARTURE_TIME%3D%24(date -r $((date +%s) + 30 * 60))"

Yêu cầu một ma trận 3x3 không đối xứng cho xe đạp
$ curl "https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/mapbox/cycling/-122.42,37.78%3B-122.45,37.91%3B-122.48,37.73%3Fsources%3D0%3B2%26destinations%3D1"

Yêu cầu một ma trận 1x3 cho người đi bộ bao gồm cả thời gian và khoảng cách
$ curl "https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/mapbox/walking/-122.418563,37.751659%3B-122.422969,37.75529%3B-122.426904,37.759695%3Fsources%3D0%26annotations%3Dduration,distance"

Yêu cầu một ma trận 3x2 không đối xứng với các tiêu đề
$ curl "https://www.google.com/search?q=https://api.mapbox.com/directions-matrix/v1/mapbox/driving/-73.985738,40.757958%3B-74.043030,40.750292%3B-73.986440,40.761899%3Fsources%3D0%3B1%26destinations%3D1%3B2%26bearings%3D45,90%3B210,90"

Phản hồi: Lấy một ma trận (Response)
Phản hồi cho một yêu cầu Matrix API là một đối tượng JSON chứa các thuộc tính sau:

Thuộc tính: code

Kiểu dữ liệu: string

Mô tả: Một chuỗi cho biết trạng thái của phản hồi. Đây là một mã trạng thái riêng biệt với mã trạng thái HTTP. Trên các phản hồi hợp lệ bình thường, giá trị sẽ là ok. Xem phần lỗi bên dưới để biết thêm thông tin.

Thuộc tính: durations

Kiểu dữ liệu: array

Mô tả: Một mảng của các mảng đại diện cho ma trận theo thứ tự hàng-chính. durations[i][j] cho thời gian di chuyển từ nguồn thứ i đến đích thứ j. Tất cả các giá trị đều tính bằng giây. Thời gian từ một nguồn đến chính nó luôn là 0. Nếu không tìm thấy thời gian, kết quả sẽ là null.

Thuộc tính: distances

Kiểu dữ liệu: array

Mô tả: Một mảng của các mảng đại diện cho ma trận theo thứ tự hàng-chính. distances[i][j] cho khoảng cách di chuyển từ nguồn thứ i đến đích thứ j. Tất cả các giá trị đều tính bằng mét. Khoảng cách từ một nguồn đến chính nó luôn là 0. Nếu không tìm thấy khoảng cách, kết quả sẽ là null.

Thuộc tính: sources

Kiểu dữ liệu: array

Mô tả: Một mảng các đối tượng waypoint. Mỗi điểm tham chiếu là một tọa độ đầu vào được khớp với đường và mạng lưới đường đi. Các điểm tham chiếu xuất hiện theo thứ tự của các tọa độ đầu vào, hoặc theo thứ tự được chỉ định trong tham số truy vấn sources.

Thuộc tính: destinations

Kiểu dữ liệu: array

Mô tả: Một mảng các đối tượng waypoint. Mỗi điểm tham chiếu là một tọa độ đầu vào được khớp với đường và mạng lưới đường đi. Các điểm tham chiếu xuất hiện theo thứ tự của các tọa độ đầu vào, hoặc theo thứ tự được chỉ định trong tham số truy vấn destinations.

Lưu ý: Khi không tìm thấy tuyến đường giữa một nguồn và một đích, giá trị tương ứng trong ma trận durations hoặc distances sẽ là null.

Phản hồi ví dụ (Example response)
{
"code": "Ok",
"durations": [
[0, 573, 1169.5],
[573, 0, 597],
[1169.5, 597, 0]
],
"destinations": [
{
"name": "Mission Street",
"location": [-122.418408, 37.751668],
"distance": 5
},
{
"name": "22nd Street",
"location": [-122.422959, 37.755184],
"distance": 8
},
{
"name": "",
"location": [-122.426911, 37.759695],
"distance": 10
}
],
"sources": [
{
"name": "Mission Street",
"location": [-122.418408, 37.751668],
"distance": 5
},
{
"name": "22nd Street",
"location": [-122.422959, 37.755184],
"distance": 8
},
{
"name": "",
"location": [-122.426911, 37.759695],
"distance": 10
}
]
}

Các thư viện được hỗ trợ (Supported libraries)
Các thư viện bao bọc của Mapbox giúp bạn tích hợp các API Mapbox vào ứng dụng hiện có của mình. Các SDK sau hỗ trợ điểm cuối này:

Mapbox Java SDK

Mapbox JavaScript SDK

Xem tài liệu SDK để biết chi tiết và ví dụ về cách sử dụng các phương pháp liên quan để truy vấn điểm cuối này.

================================================== LỖI MATRIX API (MATRIX API ERRORS)
Khi có lỗi, máy chủ sẽ phản hồi với các mã trạng thái HTTP khác nhau:

Đối với các phản hồi có mã trạng thái HTTP thấp hơn 500, nội dung phản hồi JSON bao gồm thuộc tính code, có thể được sử dụng bởi các chương trình máy khách để quản lý luồng điều khiển. Nội dung phản hồi cũng có thể bao gồm thuộc tính message với một lời giải thích có thể đọc được bằng con người về lỗi.

Nếu xảy ra lỗi máy chủ, mã trạng thái HTTP sẽ là 500 hoặc cao hơn và phản hồi sẽ không bao gồm thuộc tính code.

Bảng Lỗi

Nội dung phản hồi code: Ok

Mã trạng thái HTTP: 200

Mô tả: Trường hợp thành công bình thường.

Nội dung phản hồi code: NoRoute

Mã trạng thái HTTP: 200

Mô tả: Không tìm thấy tuyến đường cho các tọa độ đã cho. Kiểm tra các tuyến đường không thể (ví dụ: các tuyến đường qua đại dương mà không có kết nối phà) hoặc các tọa độ được định dạng không chính xác.

Nội dung phản hồi code: null

Mã trạng thái HTTP: 200

Mô tả: Yêu cầu chứa cả các cặp tọa độ có thể định tuyến và không thể định tuyến; null chỉ được trả về cho các cặp tọa độ không thể định tuyến.

Nội dung phản hồi code: Not Authorized - No Token

Mã trạng thái HTTP: 401

Mô tả: Không có token nào được sử dụng trong truy vấn.

Nội dung phản hồi code: Not Authorized - Invalid Token

Mã trạng thái HTTP: 401

Mô tả: Kiểm tra token truy cập bạn đã sử dụng.

Nội dung phản hồi code: Forbidden

Mã trạng thái HTTP: 403

Mô tả: Có thể có vấn đề với tài khoản của bạn. Kiểm tra trang tài khoản của bạn để biết thêm chi tiết. Trong một số trường hợp, việc sử dụng các token truy cập có các hạn chế về URL cũng có thể dẫn đến lỗi 403.

Nội dung phản hồi code: ProfileNotFound

Mã trạng thái HTTP: 404

Mô tả: Sử dụng một hồ sơ hợp lệ như được mô tả trong Lấy một ma trận.

Nội dung phản hồi code: InvalidInput

Mã trạng thái HTTP: 422

Mô tả: Yêu cầu đã cho không hợp lệ. Khóa message của phản hồi sẽ chứa một lời giải thích về đầu vào không hợp lệ.

================================================== CÁC HẠN CHẾ VÀ GIỚI HẠN CỦA MATRIX API
Đối với các hồ sơ mapbox/driving, mapbox/walking, và mapbox/cycling:

Tối đa 25 tọa độ mỗi yêu cầu

Tối đa 60 yêu cầu mỗi phút

Đối với hồ sơ mapbox/driving-traffic:

Tối đa 10 tọa độ đầu vào mỗi yêu cầu

Tối đa 30 yêu cầu mỗi phút

Nếu bạn yêu cầu giới hạn tốc độ cao hơn, hãy liên hệ với chúng tôi.

================================================== GIÁ MATRIX API
Thanh toán theo elements

Xem giá và chiết khấu cho mỗi phần tử Matrix API trong trang giá của phần Navigation.

Matrix API xử lý các yêu cầu hàng loạt có kích thước rất khác nhau, vì vậy việc thanh toán được theo dõi bởi số lượng elements được trả về thay vì số lượng yêu cầu được thực hiện. Ví dụ, một yêu cầu từ Matrix API có thể có nhiều cặp điểm gốc và đích khác nhau, vì vậy một yêu cầu từ Matrix API bằng với số lượng nguồn nhân với số lượng đích.

Số lượng phần tử tối thiểu cho mỗi yêu cầu là hai (một nguồn × hai đích, hoặc hai nguồn × một đích); các yêu cầu với các phần tử đơn không được hỗ trợ.

Số lượng phần tử tối đa cho mỗi yêu cầu là 625 (25 nguồn × 25 đích).
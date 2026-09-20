# DUSTGUARD VN — SLIDE THUYẾT TRÌNH FINAL PROJECT (10 SLIDES)
## Samsung Innovation Campus 2026 — Vạn Vật Kết Nối (IoT)

- **Sinh viên thực hiện**: Phạm Phú Nguyễn Hưng
- **MSSV**: 26730023 — Trường Đại học Công nghệ Thông tin — ĐHQG-HCM (UIT), Ngành CNTT
- **Đơn vị đào tạo SIC 2026**: Khoa Điện - Điện tử, Trường ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)
- **Giảng viên hướng dẫn**: TS. Nguyễn Văn Thái
- **Số thứ tự nhóm**: 11
- **File PDF chính thức**: [`11/11-Slide.pdf`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/11/11-Slide.pdf) (hoặc xem trực tiếp qua [`11/11.pdf`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/11/11.pdf))

---

# SLIDE 01 — TRANG BÌA ĐỀ TÀI

**BÁO CÁO ĐỀ TÀI FINAL PROJECT — SAMSUNG INNOVATION CAMPUS 2026**

# DUSTGUARD VN
### Hệ thống giám sát bụi mịn thời gian thực & cảnh báo sớm rủi ro môi trường cho công trình
**IoT Node ESP32 + Cảm biến laser APM2000 + Web Dashboard**

* **Môn học**: Vạn vật kết nối - IoT (Internet-of-Things)
* **Trường**: Đại học Công nghệ Thông tin — ĐHQG-HCM (UIT)
* **Đơn vị đào tạo SIC 2026**: Khoa Điện - Điện tử, Trường ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)
* **Giảng viên hướng dẫn**: TS. Nguyễn Văn Thái
* **Sinh viên thực hiện**: Phạm Phú Nguyễn Hưng
* **MSSV**: 26730023
* **Ngành**: Công nghệ Thông tin
* **Số thứ tự nhóm**: 11

> **Thông điệp cốt lõi**:  
> *"Phát hiện sớm — xử lý sớm — giảm tác động môi trường ngay từ công trường."*  
> *Công trường xanh hơn — Cộng đồng khỏe hơn.*

---

# SLIDE 02 — VẤN ĐỀ THỰC TẾ & BÀI TOÁN CẦN GIẢI QUYẾT

### Thực trạng
* **Bụi tại công trình thường tăng theo từng thời điểm, từng vị trí** cụ thể (đào móng, đổ vật liệu, xe tải ra vào).
* **Người quản lý không thể giám sát liên tục** mọi điểm trên công trường 24/7.
* Nhiều vấn đề chỉ được biết **khi người dân đã phản ánh hoặc khi có đoàn kiểm tra** môi trường đến lập biên bản.
* **Thiếu dữ liệu định lượng** khiến việc xác định nguyên nhân và đánh giá biện pháp xử lý còn chậm trễ.

### Bài toán
* Làm sao **phát hiện bụi bất thường** ngay khi vấn đề vừa xuất hiện?
* Làm sao giúp tổng thầu / phụ thầu **xử lý sớm thay vì phản ứng muộn**?
* Làm sao **theo dõi trước và sau (Before / After)** khi can thiệp?
* Làm sao **tạo dữ liệu phục vụ quản lý môi trường bền vững**?

### So sánh hai quy trình
* **Cách truyền thống**:  
  `Thi công` ➔ `Bụi tăng` ➔ `Không có dữ liệu` ➔ `Người dân phản ánh` ➔ `Kiểm tra` ➔ `Xử lý (Muộn & Bị động)`
* **Cách DustGuard**:  
  `Thi công` ➔ `IoT phát hiện` ➔ `Cảnh báo sớm` ➔ `Kiểm tra nguyên nhân` ➔ `Can thiệp` ➔ `Theo dõi kết quả (Chủ động)`

> **Thông điệp**:  
> *"Đo không phải để phạt thêm — đo để phát hiện sớm, xử lý sớm và giảm sự cố không đáng có."*

---

# SLIDE 03 — TRƯỚC KHI NGƯỜI DÂN PHẢN ÁNH: AI CẦN HÀNH ĐỘNG?

### 1. Tổng thầu (Chủ động quản lý toàn công trình)
* Tổ chức biện pháp bảo vệ môi trường toàn công trình.
* Giám sát hiện trường và điều phối xử lý.
* Theo dõi hiệu quả sau can thiệp.

### 2. Phụ thầu / Đội thi công (Thực hiện đúng – Xử lý kịp thời)
* Tuân thủ che chắn, tưới nước, vệ sinh, vận chuyển đúng quy trình.
* Xử lý nhanh khi xuất hiện điểm bụi bất thường.
* Phối hợp báo cáo và khắc phục.

### 3. DustGuard (Cung cấp dữ liệu – Hỗ trợ quyết định)
* Cung cấp dữ liệu bụi theo thời gian thực (PM1.0, PM2.5, PM10).
* Phát hiện tín hiệu bất thường tại từng khu vực.
* Hỗ trợ quyết định nhanh, **không thay thế con người**.

### Vòng lặp hành động tại hiện trường
`Dấu hiệu bụi tăng` ➔ `Node phát hiện` ➔ `Người phụ trách kiểm tra` ➔ `Tưới nước / che chắn / vệ sinh / điều chỉnh thi công` ➔ `Đo lại để kiểm chứng`

> **Thông điệp**:  
> *"DustGuard không nhằm kết luận vi phạm. DustGuard giúp công trường nhìn thấy vấn đề môi trường sớm hơn."*

---

# SLIDE 04 — GIỚI THIỆU SẢN PHẨM & TIẾN ĐỘ HIỆN TẠI

### DustGuard là gì?
Một **IoT Node tối giản** để phát hiện sớm rủi ro bụi và đưa dữ liệu lên web.

* **APM2000**: Cảm biến laser đo chính xác PM1.0, PM2.5, PM10.
* **ESP32 NodeMCU-32S**: Đọc dữ liệu UART và kết nối mạng Wi-Fi.
* **Web Dashboard**: Hiển thị dữ liệu trực quan theo thời gian thực.
* **LED trạng thái**: Kiểm tra nhanh tình trạng node tại hiện trường mà không cần màn hình phức tạp.

### Bảng tiến độ triển khai
| Đã hoàn thành (Đã có) | Đang phát triển (Định hướng) |
|---|---|
| ✅ ESP32 NodeMCU-32S | 🔄 Vỏ thiết bị đồng nhất |
| ✅ Cảm biến laser APM2000 | 🔄 PCB / connector công nghiệp ổn định hơn |
| ✅ Đấu nối chuẩn UART (RX16/TX17) | 🔄 Cảnh báo ngưỡng tự động qua SMS/Telegram |
| ✅ Đọc PM1.0 / PM2.5 / PM10 thời gian thực | 🔄 Quản lý cụm đa node (Multi-node mesh) |
| ✅ Kết nối Wi-Fi & Offline queue | 🔄 Hiệu chuẩn định kỳ (Calibration) |
| ✅ Web Dashboard trực quan | 🔄 Thử nghiệm Pilot tại công trình thực tế |
| ✅ Backend Cloudflare Edge & D1 Database | |

> **Triết lý thiết kế**:  
> *"Node càng đơn giản càng tốt, phần thông minh nằm trên phần mềm."*  
> *(Node nhỏ gọn, chi phí thấp, bền bỉ ngoài trời; toàn bộ tính toán phức tạp đưa lên Web Dashboard).*

* **Lộ trình tương lai**: Mở rộng cho trường học, nhà ở; tích hợp điều khiển máy lọc không khí qua relay hoặc nền tảng Smart Home.

---

# SLIDE 05 — KIẾN TRÚC TỔNG THỂ HỆ THỐNG
**Từ dữ liệu bụi mịn đến hành động vì một môi trường an toàn hơn**

### Luồng tương tác 4 tầng
1. **Physical Layer (Không khí & cảm biến)**: Đo PM1.0, PM2.5, PM10 tại khu vực cần giám sát (cổng trước, cổng sau công trình).
2. **Edge Layer (Node xử lý dữ liệu)**: ESP32 đọc dữ liệu từ APM2000, tiền xử lý, kiểm tra checksum và truyền dữ liệu an toàn qua Wi-Fi.
3. **Cloud Layer (API, lưu trữ, đồng bộ)**: Cloudflare Worker Ingest API, lưu trữ bền vững trên CSDL D1, cung cấp REST API thời gian thực.
4. **Application Layer (Dashboard & hỗ trợ quyết định)**: Giao diện Web hiển thị số đo trực tiếp, biểu đồ xu hướng, chỉ số Dust Risk Score và hỗ trợ ra quyết định.

* **Điểm lắp đặt ưu tiên**: Cổng trước và cổng sau — nơi xe tải ra vào thường xuyên và bụi phát sinh mạnh nhất.
* **Vòng lặp giá trị cốt lõi**:  
  $$\mathbf{SENSE} \longrightarrow \mathbf{DETECT} \longrightarrow \mathbf{ACT} \longrightarrow \mathbf{VERIFY}$$

---

# SLIDE 06 — SƠ ĐỒ ĐẤU NỐI PHẦN CỨNG & THIẾT KẾ VỎ

### Sơ đồ đấu nối chân (APM2000 ➔ ESP32)
| Chân | Tín hiệu APM2000 | Chân nối ESP32 | Ghi chú kỹ thuật |
|:---:|:---:|:---:|---|
| **1** | **VCC** | **VIN / 5V** | APM2000 dùng laser quang học, bắt buộc cấp nguồn 5V |
| **2** | **GND** | **GND** | Nối mass chung hệ thống |
| **3** | **TX** | **GPIO16 (RX2)** | Nhận dữ liệu UART tốc độ 9600 bps (8N1) |
| **4** | **RX** | **GPIO17 (TX2)** | Gửi lệnh cấu hình cảm biến |
| **5** | **SET** | **3V3 hoặc để hở** | Chân kích hoạt chế độ làm việc liên tục |
| **6** | **RESET** | **Không nối (NC)** | Để hở ở chế độ vận hành bình thường |

### Quy ước đèn LED trạng thái
* **Nhấp nháy nhanh**: Đang kết nối Wi-Fi.
* **Nháy đúp**: Nhận được frame dữ liệu hợp lệ từ cảm biến.
* **Sáng giữ 1 giây**: Upload dữ liệu lên Cloud thành công.
* **Tắt / Báo lỗi**: Mất mạng Wi-Fi hoặc cảm biến gặp trục trặc.

### Thiết kế vỏ công nghiệp ngoài trời
1. **Nhỏ gọn**: Kích thước hộp tối ưu, dễ triển khai lắp đặt.
2. **Khe thoát khí**: Tản nhiệt đối lưu hiệu quả cho linh kiện.
3. **Khe hút khí**: Đón luồng không khí môi trường vào buồng laser.
4. **Dễ bảo trì**: Nắp vỏ bắt vít tháo lắp nhanh chóng tại hiện trường.
5. **Gắn tường / Cột**: Ngàm treo linh hoạt cả ngoài trời và trong nhà.

> **3 Lưu ý quan trọng**:  
> ⚠️ **APM2000 dùng nguồn 5V, tuyệt đối không cấp vào 3V3.**  
> ⚠️ **Chân TX của cảm biến phải nối vào chân RX của ESP32.**  
> ⚠️ **Không che đường dẫn khí vào và ra của cảm biến.**

---

# SLIDE 07 — KIẾN TRÚC PHẦN MỀM: FIRMWARE ➔ WEBSITE
**Từ thiết bị đo đến dữ liệu trực quan, phục vụ cộng đồng**

1. **Firmware (ESP32)**:
   - Boot & kết nối Wi-Fi.
   - Đọc cảm biến APM2000 qua UART2.
   - Kiểm tra checksum frame dữ liệu.
   - Trích xuất thông số PM1.0 / PM2.5 / PM10.
   - Đóng gói telemetry và upload định kỳ.
2. **Ingestion API (Cloud Edge)**:
   - Nhận request từ node qua HTTP POST `/api/iot/v1/readings`.
   - Nhận diện `device_id`, xác thực tính toàn vẹn (HMAC-SHA256).
   - Validate payload hợp lệ.
   - Đẩy vào hệ thống lưu trữ.
3. **Database (Cloudflare D1)**:
   - Quản lý danh mục `Devices`, chuỗi thời gian `Readings`, `Timestamp`, `Location`.
   - Lưu trữ dữ liệu an toàn, ổn định, sẵn sàng mở rộng quy mô.
4. **Web Dashboard**:
   - Hiển thị Live PM1.0, PM2.5, PM10.
   - Biểu đồ xu hướng và phân loại theo QCVN 05:2023/BTNMT.
   - Trạng thái Online / Offline của từng node.
   - Truy xuất lịch sử dữ liệu và tính toán Dust Risk Score.

> **Thông điệp**:  
> *"Node đơn giản — dữ liệu tập trung — giao diện hiển thị trên web để tối ưu chi phí trên mỗi node."*

---

# SLIDE 08 — TIỀM NĂNG ỨNG DỤNG THỰC TẾ & ĐÓNG GÓP CHO MÔI TRƯỜNG
**Giải pháp giám sát bụi thông minh, linh hoạt, dễ triển khai cho nhiều bối cảnh**

### 4 Nhóm ứng dụng thực tế
1. **Công trường xây dựng**: Giám sát bụi theo khu vực thi công, hỗ trợ đội ngũ HSE/EHS phát hiện sớm nguy cơ.
2. **Trường học / Khu dân cư gần công trình**: Theo dõi mức độ ảnh hưởng của bụi mịn đến cộng đồng xung quanh.
3. **Kho bãi / Vận chuyển vật liệu**: Giám sát bụi phát sinh theo khung giờ xe tải bốc dỡ và lưu thông.
4. **Khu sản xuất nhỏ**: Hỗ trợ quan sát xu hướng phát thải và phát hiện các thời điểm bất thường.

### 5 Đóng góp thiết thực cho môi trường
* 🔔 **Phát hiện sớm thay vì chờ phản ánh**: Chủ động can thiệp trước khi phát sinh sự cố.
* ⏱️ **Giảm thời gian xử lý sự cố bụi**: Rút ngắn chu kỳ phản ứng từ vài ngày xuống vài phút.
* 📈 **Hỗ trợ kiểm chứng hiệu quả giảm bụi**: So sánh dữ liệu trước và sau khi tưới nước/che chắn.
* 💾 **Tạo dữ liệu phục vụ quản lý môi trường**: Lưu trữ bằng chứng số minh bạch cho thanh tra và báo cáo ESG.
* 🌐 **Mở đường cho mô hình chi phí thấp**: Triển khai mạng lưới dày đặc với chi phí hợp lý.

> **Thông điệp**:  
> *"DustGuard không chỉ đo bụi — DustGuard tạo dữ liệu để con người hành động sớm hơn."*

---

# SLIDE 09 — THƯƠNG MẠI HÓA & TIỀM NĂNG SINH LỜI
**Từ giải pháp công nghệ đến giá trị thực tế cho công trường xanh hơn, an toàn hơn**

### Khách hàng mục tiêu
* **Chủ đầu tư**: Hướng tới công trình xanh, bền vững, tuân thủ quy định môi trường.
* **Tổng thầu**: Quản lý rủi ro dự án, đảm bảo tiến độ thi công không bị đình chỉ.
* **Phụ thầu / Đội thi công**: Tuân thủ yêu cầu môi trường, nâng cao năng lực đấu thầu.
* **Bộ phận HSE / EHS**: Công cụ giám sát trực quan, bảo vệ an toàn sức khỏe lao động.

### DustGuard bán gì? (Mô hình giải pháp trọn gói)
* 🛠️ **Hardware**: IoT Node độ tin cậy cao, tối ưu chi phí (~460.000đ/node).
* 🔧 **Deployment**: Dịch vụ khảo sát hiện trường, lắp đặt và cấu hình theo yêu cầu.
* 💻 **Software**: Web Dashboard đa node, biểu đồ thời gian thực, lưu trữ lịch sử & cảnh báo.
* 🤝 **Service**: Dịch vụ bảo trì, kiểm định cảm biến định kỳ và xuất báo cáo dữ liệu.

### Bức tranh kinh tế dự kiến
* **BOM lõi hiện tại**: ~460.000 VNĐ / node.
* **BOM mục tiêu thương mại**: ~300.000 VNĐ / node (khi sản xuất hàng loạt).
* **Giá bán đề xuất**: ~599.000 VNĐ / node.
* **Gói phần mềm Dashboard**: 99.000 VNĐ / tháng / site.
* **Chính sách miễn phí**: Miễn phí phần mềm trọn đời cho cơ quan quản lý nhà nước và công trình cộng đồng.
* **Biên lợi nhuận gộp mục tiêu**: **45–50%** đối với phần cứng.

> **Vì sao khách hàng sẵn sàng trả tiền?**  
> `Phát hiện sớm` | `Giảm khiếu nại` | `Tránh gián đoạn thi công` | `Tiết kiệm nhân lực kiểm tra thủ công` | `Có dữ liệu chuẩn cho báo cáo môi trường`  
>  
> *"DustGuard không bán một cảm biến — DustGuard bán khả năng nhìn thấy vấn đề sớm."*

---

# SLIDE 10 — KẾ HOẠCH PHÁT TRIỂN & TẦM NHÌN
**Từng bước hiện thực hóa một môi trường trong lành hơn bằng công nghệ IoT**

### Lộ trình 5 giai đoạn
1. **Giai đoạn 1: Prototype**: Hoàn thiện ESP32 + APM2000 + Wi-Fi + Web Dashboard.
2. **Giai đoạn 2: Engineering**: Thiết kế bo mạch PCB chuyên dụng, hoàn thiện vỏ chống nước IP54/IP65, nguồn nuôi ngoài trời và thuật toán hiệu chuẩn.
3. **Giai đoạn 3: Pilot**: Triển khai thử nghiệm 5–10 node tại các công trình xây dựng thực tế.
4. **Giai đoạn 4: Reporting**: Đánh giá hiệu quả biện pháp giảm bụi, đo lường Before/After và thời gian phản ứng.
5. **Giai đoạn 5: Modular Platform**: Giữ vững khung kiến trúc ESP32 + Cloud Edge + Dashboard, thay đổi linh hoạt các module cảm biến theo từng bài toán.

### Hướng mở rộng Sensor đa thông số
* 💨 **AIR**: Mở rộng dải đo bụi mịn PM1.0, PM2.5, PM10.
* 🔊 **NOISE**: Đo cường độ tiếng ồn công trường (dB).
* ☁️ **GAS**: Cảm biến khí độc hại CO2, VOC, NO2.
* 💧 **WATER**: Cảm biến nước thải công trường (pH, TDS, độ đục Turbidity).

### Mục tiêu tiếp theo
* ✅ Hoàn thiện prototype ổn định cao.
* 🤝 Tìm kiếm đối tác nhà thầu để triển khai pilot.
* 📊 Chuẩn hóa dữ liệu đo lường và dashboard.
* 🏆 Tham gia các cuộc thi Sáng kiến IoT / Môi trường / Phát triển bền vững (SDGs) / Đô thị thông minh.

> **Tầm nhìn lớn**:  
> *"Từ một bài Final Project ➔ Một IoT Node ➔ Một mạng cảm biến ➔ Một nền tảng Environmental IoT."*  
>  
> **Xin trân trọng cảm ơn TS. Nguyễn Văn Thái và Chương trình Samsung Innovation Campus 2026!**

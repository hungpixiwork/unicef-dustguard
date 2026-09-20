# Kịch Bản Trình Diễn Báo Cáo Thực Tế (Demo Script)

## Trình Diễn Hội Đồng Chấm Điểm Samsung Innovation Campus 2026

**Đề tài**: DUSTGUARD VN — IOT NODE QUAN TRẮC BỤI MỊN THỜI GIAN THỰC (APM2000 & ESP32)  
**Sinh viên thực hiện**: Phạm Phú Nguyễn Hưng (MSSV: 26730023 — UIT CNTT)  
**Giảng viên hướng dẫn**: TS. Nguyễn Văn Thái (Khoa Điện-Điện tử, HCM-UTE)  
**STT Nhóm**: **11**

---

### Phần 1: Khởi Động Thiết Bị & Kết Nối (00:00 - 01:00)
1. **Cắm nguồn USB 5V vào ESP32**:
   - Màn hình cảm ứng 3.5" TFT sáng lên với tiêu đề **DustGuard**, mã trạm `DG-NODE-011`.
   - Cảm biến APM2000 kích hoạt quạt hút khí và tia laser vi tán xạ.
   - ESP32 kết nối Wi-Fi phòng lab. Icon `WiFi ●` và `Cloud ●` đổi từ màu đỏ sang **xanh lục (OK)**.

2. **Màn hình Home / Live hiển thị số liệu thực**:
   - Chỉ số **PM2.5** hiển thị lớn nổi bật (56–72px): ví dụ `28.5 µg/m³`.
   - Banner chất lượng không khí: `AIR STATUS: MODERATE (CAUTION)` theo QCVN 05:2023.
   - Chỉ số **PM1.0** và **PM10** hiển thị tại cột phụ bên phải.
   - Dòng trạng thái bên dưới: `Sensor: APM2000 | Read: 2s ago | Upload: 5s ago`.

---

### Phần 2: Thao Tác Trực Tiếp Trên Màn Hình Cảm Ứng (01:00 - 02:30)
1. **Chuyển sang màn hình Đồ thị (CHART)**:
   - Dùng ngón tay chạm vào nút **[ CHART ]** ở thanh điều hướng dưới cùng.
   - Màn hình chuyển sang đồ thị đường thời gian thực với 60 điểm đo trong bộ nhớ đệm (Circular buffer).
   - Chạm vào tab **PM10** hoặc **PM1.0** để xem biến thiên từng loại bụi.
   - Cột bên phải hiển thị ngay thống kê: `Current`, `Average`, `Max`, `Min` mà không cần mở máy tính.

2. **Chuyển sang màn hình Trạng thái Thiết bị (DEVICE)**:
   - Chạm vào nút **[ DEVICE ]**.
   - Màn hình thể hiện: Uptime, số mẫu đo đã gửi lên Cloud (`Readings sent: 48`), số lần lỗi (`Failed: 0`), cường độ sóng Wi-Fi RSSI (`-54 dBm`).
   - Bấm nút cảm ứng **[ SYNC NOW ]**: Node ngay lập tức bắn gói tin hiện tại lên Cloud, Serial và Web ghi nhận tức thì.

3. **Xem màn hình Chẩn đoán Cảm biến (MORE -> SENSOR)**:
   - Chạm vào nút **[ MORE ]**:
   - Màn hình thể hiện số khung UART hợp lệ (`Valid Frames: 142`), số frame lỗi (`Invalid Frames: 0`), chứng minh dữ liệu đến từ cảm biến vật lý thực tế.

4. **Xem màn hình Thông tin Đề tài (ABOUT)**:
   - Thể hiện rõ tên đề tài, Samsung Innovation Campus 2026, SVTH Phạm Phú Nguyễn Hưng - UIT, GVHD TS. Nguyễn Văn Thái - HCM-UTE.

---

### Phần 3: Đối Chứng Với Nền Tảng Cloud & Web Dashboard (02:30 - 03:45)
1. **Mở trình duyệt trên máy tính**:
   - Truy cập trang bìa môn học `/sic`: Giới thiệu đầy đủ thông tin chuẩn yêu cầu của Thầy Thái.
   - Bấm nút lớn **"VÀO HỆ THỐNG CHÍNH DUSTGUARD IOT"** -> Chuyển sang `/iot`.
2. **Đối chiếu số liệu thời gian thực (Zero Fake Data)**:
   - Chỉ số PM2.5 trên màn hình cảm ứng vật lý và trên Web Dashboard trên laptop trùng khớp hoàn toàn (ví dụ cùng là `28.5 µg/m³`).
   - CSDL Cloudflare D1 lưu trữ bền vững từng bản ghi. Bấm F5 tải lại trang Web, dữ liệu không hề bị mất.

---

### Phần 4: Thử Nghiệm Ngắt Kết Nối & Khôi Phục (Offline Resilience) (03:45 - 04:30)
1. **Tắt hotspot / ngắt Wi-Fi tạm thời**:
   - Trên màn hình cảm ứng: Icon `Cloud x` đổi sang màu đỏ.
   - Cảm biến vẫn tiếp tục đo đều đặn mỗi 2 giây, số liệu PM2.5 vẫn cập nhật liên tục trên màn hình.
   - Bộ đếm hàng đợi offline tăng dần (`Pending Queue: 1... 2... 3...`).
2. **Bật lại Wi-Fi**:
   - Node tự động kết nối lại, icon `Cloud ●` chuyển về màu xanh lục.
   - Toàn bộ các bản ghi trong hàng đợi offline được tự động đẩy lên Cloudflare D1 theo thứ tự cũ trước mới sau (FIFO).
   - Web Dashboard hiển thị đầy đủ chuỗi thời gian không bị gián đoạn.

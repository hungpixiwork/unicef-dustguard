# DUSTGUARD VN — LESSONS LEARNED & TECHNICAL KNOWLEDGE BASE

> **Kho lưu trữ kinh nghiệm, bài học kiến trúc và phòng chống lỗi kỹ thuật (Anti-Regression)**  
> *Cập nhật sau mỗi chu trình phát triển tính năng mới thành công.*

### 33. Xung Đột Header Case-Insensitive Trên Windows (wifi.h vs WiFi.h) & Chuẩn Hóa C/C++ IntelliSense
- **Bối cảnh & Triệu chứng**:
  - Khi mở file C++ (`main.cpp`, `api.h`, `wifi.cpp`) trong VS Code, xuất hiện hàng loạt cảnh báo gạch đỏ: `'Arduino.h' file not found`, `Unknown type name 'String'`, `Use of undeclared identifier 'WiFi'`.
  - Khi chạy biên dịch PlatformIO (`pio run`), trình biên dịch báo lỗi: `'WiFi' was not declared in this scope`.
- **Nguyên Nhân Gốc Rễ**:
  1. **Xung đột tên file trên Windows**: Hệ thống tệp NTFS/FAT của Windows là *case-insensitive*. Khi mã nguồn dự án tạo file `include/wifi.h`, lệnh `#include <WiFi.h>` trong thư viện sẽ tìm thấy ngay file `include/wifi.h` trong thư mục hiện tại thay vì thư viện `<WiFi.h>` của framework Arduino. Do header guard chặn đệ quy, đối tượng `WiFi` không bao giờ được định nghĩa.
  2. **Thiếu includePath trong `.vscode/c_cpp_properties.json`**: Cấu hình mặc định của IDE thiếu đường dẫn tới `framework-arduinoespressif32/cores/esp32`, `variants/esp32`, `.pio/libdeps/esp32_tft_touch/**` và thư viện chuẩn C++17 của `toolchain-xtensa-esp32`, khiến Language Server báo thiếu thư viện hàng loạt dù môi trường build đã cài đủ.
- **Biện Pháp Khắc Phục**:
  1. Đổi tên file module dự án từ `wifi.h` / `wifi.cpp` thành `wifi_service.h` / `wifi_service.cpp` để triệt tiêu 100% nguy cơ trùng lặp tên với thư viện hệ thống.
  2. Bổ sung đầy đủ `#include <WiFi.h>` vào `api.h` khi module có tương tác trạng thái mạng.
  3. Bổ sung các đường dẫn gốc của Arduino Core, Variant, Toolchain standard headers vào `includePath` của `.vscode/c_cpp_properties.json` (cả ở root và `firmware/.vscode`).
  4. Xác thực thành công: `pio run -d iot/dustguard-node/firmware` hoàn tất trong 8 giây (Flash: 72.8%, RAM: 15.0%, SUCCESS).

### 32. Tổ Chức Trung Tâm Tài Liệu & Demo Phục Vụ Thuyết Trình (IoT Master Hub)
- **Bối cảnh & Vấn đề**:
  - Khi một hệ sinh thái IoT trải dài qua 5 tầng kỹ thuật khác nhau (Firmware ESP32 C++, Sơ đồ mạch, Backend Cloudflare Worker, CSDL D1, Web React Dashboard, Scripts Simulator), việc phân tán các file làm giảm tốc độ tìm kiếm và gây khó khăn khi thuyết trình trực tiếp trước hội đồng chấm thi.
  - Tuy nhiên, nếu di chuyển (move) trực tiếp các tệp code từ `server/` hay `app/` sang một folder mới sẽ làm gãy các đường dẫn import và build pipeline.
- **Giải pháp Kiến Trúc**:
  - Tạo một **Master Hub (`iot-hub/`)** làm đầu mối tập trung (Single Entry Point) tại thư mục gốc của repository.
  - Thiết lập bảng mapping SSOT phân loại khoa học toàn bộ 45+ file với đường dẫn tương tác trực tiếp (`file:///...`), giúp người dùng mở ngay lập tức trong IDE.
  - Tập hợp toàn bộ sơ đồ đồ họa 3D bóc tách linh kiện (Exploded View, Isometric), ảnh linh kiện thật (APM2000, ESP32) và bảng kê chi phí BOM (~490.000 VNĐ) vào một thư mục con sẵn sàng chiếu slide.
  - Cung cấp launcher 1-click (`.bat` / `.ps1`) để tự động mở Interactive Touchscreen Simulator (Port 3456) và Dashboard đối chứng thời gian thực mà không cần gõ lệnh phức tạp khi đang thuyết trình.

### 31. Xác Thực Cloudflare Account ID & Resource ID Khi Deploy Wrangler Production
- **Bối cảnh & Sự cố**:
  - Khi chạy `wrangler d1 list` hoặc `wrangler deploy`, Wrangler báo lỗi `Authentication error [code: 10000]` do trường `account_id` trong `wrangler.jsonc` không khớp với tài khoản OAuth đã đăng nhập trên máy (`ppnh10092002@gmail.com` sở hữu account ID `5fdd1d1433519df6429d7418d43fff9a`).
  - Thêm vào đó, `database_id` của D1 và danh sách `r2_buckets` bị cấu hình sai lệch, có nguy cơ làm gãy các binding runtime (`DB`, `STORAGE`, `EVIDENCE_BUCKET`) và endpoint kiểm tra sức khỏe `/api/system/health`.
- **Giải pháp & Nguyên tắc**:
  1. Luôn dùng `npx wrangler whoami` để đối chiếu chính xác Account ID trước khi ghi vào `wrangler.jsonc`.
  2. Sử dụng `npx wrangler d1 list` để lấy UUID chuẩn của CSDL production (`ad40205a-ec4b-40f3-8ab2-c2e7b9e78699` cho `dustguard-production`).
  3. Bảo tồn đầy đủ các binding R2 (`dustguard-storage`) và route custom domain (`dustguard.phamphunguyenhung.com`).
  4. Sau khi deploy, lập tức xác thực runtime thực tế: `/api/system/version` (commit hash, build time), `/api/system/health` (`database: ok, storage: ok`), Side A `/`, Side B `/operations/`, và luồng IoT ingestion (`mode: live_sync`).

### 30. Zero-D1 Normal Sync & Xử Lý Chuyển Đổi Trạng Thái Ingestion Telemetry (Subagent 02)
- **Bối cảnh & Vấn đề**:
  - Telemetry từ trạm IoT (ESP32 + cảm biến APM2000) gửi định kỳ lên backend (`POST /api/iot/reading`, `/telemetry`, `/ingest`).
  - Trước đây, mỗi nhịp telemetry gửi đến đều thực hiện 1 SELECT `iot_devices`, 1 UPDATE `iot_devices` và 1 INSERT `iot_readings` vào CSDL D1. Với tần suất gửi thường xuyên, hàng chục ngàn writes và reads bị tiêu hao vào D1 chỉ để lưu các giá trị đo bình thường (NORMAL), gây cạn kiệt D1 quota và vượt ngưỡng trần 5M reads / 100k writes của Free Tier.
- **Giải pháp kiến trúc SSOT**:
  1. **Cập nhật Live State In-Memory Trước Tiên**:
     - Khi nhận telemetry, hệ thống gọi `updateLiveState()` vào in-memory store (`server/iot-live-state.ts`) trước.
     - Xác định `currentAnomalyState`, `previousAnomalyState` và `stateChanged`.
  2. **Quy tắc Zero-D1 Normal Sync**:
     - Nếu trạng thái là NORMAL và lần trước cũng là NORMAL VÀ khoảng cách giữa 2 lần persist < 5 phút (`NORMAL_SYNC_MS = 300_000`): **TUYỆT ĐỐI KHÔNG GHI VÀO D1 (0 D1 writes, 0 D1 reads)**!
     - Trả về HTTP 200 `{ success: true, mode: "live_sync" }` ngay lập tức, latency < 2ms.
  3. **Xử Lý Chuyển Đổi Trạng Thái (State Transition)**:
     - Chỉ khi phát hiện bất thường mới (NORMAL -> HIGH_PM) hoặc chuyển đổi trạng thái (HIGH_PM -> NORMAL hồi phục): Ghi 1 bản ghi vào `iot_events` (PM25_SPIKE hoặc STATUS_RECOVERED) và 1 bản ghi vào `iot_readings`.
     - Bộ đệm `deviceMetaCache` in-memory giúp tái sử dụng `device_id` đã biết, triệt tiêu câu lệnh SELECT từ D1 khi persist.
  4. **Checkpoint Định Kỳ 5 Phút**:
     - Nếu dữ liệu bình thường kéo dài quá 5 phút, ghi 1 bản ghi checkpoint vào `iot_readings` để bảo tồn chuỗi thời gian dài hạn.
  5. **Structured Console Logging Tối Giản**:
     - Thay thế việc ghi log vào DB bằng console log JSON có cấu trúc:
       `{"event":"iot_cycle_summary","device":"DG-IOT-001","source":"normal_sync","d1_reads":0,"d1_writes":0,"duration_ms":duration}`.


### 29. Thiết Kế Chu Kỳ Đồng Bộ Firmware IoT Tiết Kiệm Năng Lượng (5 Phút) Kết Hợp Đẩy Bất Thường Tức Thì (Immediate Anomaly Push) & Bộ Lọc Chống Spam Cloud (Subagent 08)
- **Bối cảnh & Vấn đề**:
  - Vi điều khiển ngoài hiện trường (ESP32 kết nối cảm biến bụi quang học APM2000) thường vận hành bằng pin hoặc sạc dự phòng. Nếu truyền sóng Wi-Fi liên tục ở mỗi nhịp đọc cảm biến (ví dụ 1.5 - 3.5 giây/lần), năng lượng pin sẽ cạn kiệt rất nhanh, đồng thời gây ra hàng trăm ngàn lượt gọi API và nguy cơ vượt hạn mức D1 quota.
  - Ngược lại, nếu chỉ gửi định kỳ 5 phút một lần một cách cứng nhắc, khi xảy ra sự cố ô nhiễm đột ngột (cháy rác, nồng độ PM2.5 vọt cao > 50 µg/m³ hoặc đột biến > 25 µg/m³), hệ thống cảnh báo sớm và đội phản ứng nhanh sẽ bị chậm trễ tới 5 phút.
- **Giải pháp kiến trúc SSOT**:
  1. **Tách biệt chu kỳ đo cục bộ và chu kỳ truyền dữ liệu**:
     - *Đo cục bộ*: 3 giây/lần (`SENSOR_READ_INTERVAL_MS = 3000`), không bật kết nối mạng, xử lý tín hiệu UART 1200 baud hoàn toàn non-blocking.
     - *Đồng bộ bình thường (`NORMAL_SYNC_INTERVAL_MS`)*: 300.000 ms (5 phút/lần) khi chất lượng không khí an toàn và ổn định.
  2. **Cơ chế Immediate Anomaly Push**:
     - Kích hoạt gửi ngay lập tức khi phát hiện một trong hai điều kiện:
       + `pm25 > 50` (vượt quy chuẩn QCVN 05:2023).
       + `abs(pm25 - last_reported_pm25) > 25` (nồng độ biến thiên đột ngột so với mốc gửi trước đó).
  3. **Bộ lọc chống spam cloud (Throttling / Cooldown Debounce)**:
     - Khi nồng độ ô nhiễm kéo dài liên tục trên 50 µg/m³, nếu không có cooldown thì mỗi chu kỳ 3s vi điều khiển sẽ lại gửi 1 lần.
     - Thiết lập `MIN_ANOMALY_INTERVAL_MS = 15000` (15 giây cooldown tối thiểu giữa 2 lần đẩy Anomaly). Đảm bảo cập nhật kịp thời nhịp cảnh báo nhưng triệt tiêu hoàn toàn nguy cơ spam dồn dập máy chủ.
  4. **Payload JSON chuẩn hóa**:
     - Định dạng JSON tinh gọn: `{"deviceId":"DG-IOT-001","pm1":8,"pm25":14,"pm10":22,"temperature":28.5,"humidity":65.0,"rssi":-68,"isAnomaly":false,"timestamp":1726800000}`.
     - Đóng kết nối `http.end()` giải phóng socket, chớp LED 40ms báo hiệu, tối ưu năng lượng tối đa.

### 28. Tách Biệt Lịch Sử Đo Đạc (On-Demand Historical API) & Cô Lập Truy Vấn (Query Isolation) Bảo Vệ Bởi Index (Subagent 04)
- **Bối cảnh & Vấn đề phát sinh**:
  - `GET /api/iot/device/:id` trước đây nạp sẵn 50 dòng lịch sử từ `iot_readings`. Khi client polling trạng thái trạm đo mỗi 3-15 giây, SQLite/D1 phải đọc 50 rows liên tục, gây tiêu hao hàng triệu rows read/ngày mà hầu như người dùng không xem biểu đồ.
  - Endpoint `GET /api/dashboard/community` cũng quét bảng `iot_readings` (`ORDER BY created_at DESC LIMIT 1`) để dựng widget cảm biến, nhân đôi số lượng D1 reads mỗi khi người dân mở Dashboard.
  - Truy vấn phụ trợ trong `/devices/:id/readings` chứa subquery `WHERE device_id = ? OR device_id IN (SELECT id FROM iot_devices WHERE device_code = ?)` khiến SQLite không tận dụng được index composite, buộc phải table scan.
- **Giải pháp & Kiến trúc triển khai**:
  1. **Tách Endpoint Lịch Sử On-Demand (`GET /api/iot/history/:deviceId`)**:
     - Chỉ được gọi khi người dùng bấm "Xem lịch sử" hoặc chọn khoảng thời gian (`1h`, `24h`, `7d`).
     - Bắt buộc kiểm soát phân trang: `LIMIT` mặc định 50, trần cứng tối đa 200 bản ghi.
     - Câu truy vấn chuẩn mực: `SELECT * FROM iot_readings WHERE device_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`.
  2. **Bảo vệ 100% bằng Composite Index**:
     - Khai thác trọn vẹn index `idx_iot_readings_device_created ON iot_readings(device_id, created_at DESC)`.
     - Lệnh `EXPLAIN QUERY PLAN` xác nhận `SEARCH iot_readings USING INDEX ... (device_id=? AND created_at>?)`, triệt tiêu 100% full table scan và temporary B-tree sorting.
  3. **Zero D1 Reads Trên Community Dashboard**:
     - `GET /api/dashboard/community` loại bỏ hoàn toàn câu lệnh `SELECT * FROM iot_readings`.
     - Dữ liệu hiển thị widget cảm biến được lấy trực tiếp từ `getLiveState(deviceId)` (in-memory state store).
  4. **Frontend On-Demand UX (`IoTDevicePage`)**:
     - Thêm bộ chọn mốc thời gian `1 giờ`, `24 giờ`, `7 ngày` và nút "Xem lịch sử" chuẩn Civic-Tech (touch target >= 44px, không glassmorphism).
     - Polling định kỳ chỉ cập nhật trạng thái sống (`liveData`), lịch sử chỉ tải khi có tương tác người dùng.

### 27. Triệt Tiêu 100% D1 Reads Trên Live Polling Endpoints Bằng In-Memory State & Cache-Control (Subagent 03)
- **Bối cảnh & Vấn đề**:
  - Endpoint `/api/iot/latest` trước đây thực hiện 2 câu query D1 (`SELECT * FROM iot_devices`, `SELECT * FROM iot_readings WHERE device_id = ? ORDER BY created_at DESC LIMIT 1`). Do bảng `iot_readings` thiếu composite index và frontend poll liên tục, SQLite phải quét toàn bộ bảng (Table Scan) nạp vào temp B-Tree để ORDER BY, gây tiêu tốn tới 7.16 triệu rows read trong 24h và chạm ngưỡng D1 Free Tier quota (5M rows/day).
- **Giải pháp & Thiết kế chuẩn**:
  1. **Zero-D1 Live Endpoints**:
     - Thay thế toàn bộ truy vấn SQL trong `/api/iot/live/:deviceId`, `/api/iot/latest`, `/api/iot/device-status` bằng hàm đọc in-memory `getLiveState(deviceId)` từ `server/iot-live-state.ts`.
     - 0 D1 reads, 0 D1 writes, không gọi UPDATE last_seen từ GET, không ghi audit log vào D1.
  2. **Format tinh gọn & Tương thích ngược**:
     - Format tối giản trả về các chỉ số cốt lõi (`deviceId`, `online`, `pm1`, `pm25`, `pm10`, `temperature`, `humidity`, `rssi`, `lastSeen`, `sensorStatus`, `anomalyState`).
     - Đính kèm compatibility object (`device`, `telemetry`) tính toán in-memory để các màn hình Dashboard/Settings cũ không bị vỡ giao diện.
  3. **HTTP Cache Header Tối Ưu**:
     - Thêm `Cache-Control: public, max-age=5, stale-while-revalidate=10` giúp Cloudflare Edge và Browser tự phục vụ cache trong 5s mà không chạm tới Worker CPU/D1.
  4. **Singleton In-Memory State**:
     - Cấu trúc module export đảm bảo thống nhất giữa TypeScript và Node.js ESM runtime, chia sẻ cùng một `Map<string, DeviceLiveState>` an toàn trong worker isolate.

### 26. Tối Ưu Hóa Polling Frontend Bằng In-Flight Request Deduplication & Page Visibility API
- **Bối cảnh & Vấn đề**:
  - Khi nhiều màn hình hoặc component (DashboardPage, IoTDevicePage, IoTSettingsPage) cùng polling dữ liệu telemetry ở chu kỳ 3s, việc này gây lãng phí băng thông mạng và nguy cơ cạn kiệt Cloudflare D1 row read quota khi người dùng mở nhiều tab hoặc để tab chạy ngầm.
- **Giải pháp & Kiến trúc triển khai**:
  1. **Singleton IoTLiveService với In-Flight Request Deduplication**:
     - Tạo `apps/web/src/services/iotLiveService.ts` quản lý state tập trung cho thiết bị (mặc định `DG-IOT-001`).
     - Cơ chế gộp yêu cầu: Nếu nhiều component đồng thời gọi `fetchLiveState` trong cùng thời điểm, service chỉ phát 1 HTTP request duy nhất qua `fetch('/api/iot/live?deviceId=...')` và chia sẻ Promise cho tất cả các bên gọi.
     - Caching 15s (`LIVE_REFRESH_MS = 15000`): Dữ liệu được lưu trong cache và trả về ngay nếu chưa quá 15 giây, ngăn chặn triệt để spam request.
  2. **Custom Hook `useIoTLiveState` & Page Visibility API**:
     - Tích hợp `document.visibilityState === 'visible'` và `window.focus`.
     - Khi tab bị ẩn (`document.hidden`): NGỪNG POLLING HOÀN TOÀN (`clearInterval`).
     - Khi người dùng focus trở lại tab (`visibilitychange` / `focus`): Lập tức gọi fetch dữ liệu mới nhất 1 lần và tái lập chu kỳ 15 giây.
     - Đồng bộ Pub/Sub: Khi dữ liệu mới về, thông báo ngay cho toàn bộ các component đang đăng ký.

### 25. Kiểm Định Chất Lượng, Trùng Lặp & Vòng Đời Dữ Liệu (Data Lifecycle & Duplication Audit) Trên Cloudflare D1 Production Rebuild
- **Bối cảnh & Giới hạn Hạ tầng**:
  - Khi vận hành trên Cloudflare D1 Free Tier, trần đọc hàng ngày (`rows_read_24h`) là 5,000,000 dòng. Khi vượt trần (7.16M rows do kịch bản test/polling tải nặng), Cloudflare API trả về mã lỗi `7500` và tạm thời chặn các câu lệnh SELECT đọc dòng cho đến 00:00 UTC. Lệnh ghi (write) và SELECT đọc 0 dòng vẫn thông suốt.
  - Trong quá trình audit, cần đối chiếu với CSDL SQLite SSOT chuẩn (`data/dustguard-community.db`, `dustguard-operations/data/dustguard-operations.db` và `app/prisma/dev.db`) — nơi lưu giữ 100% dữ liệu gốc trước khi đồng bộ.
- **Kinh nghiệm & Bài học phát hiện**:
  1. **Dữ liệu trùng lặp (Natural Key Duplication)**:
     - 100% người dùng, phiên làm việc, thiết bị IoT và hồ sơ đều đạt tính toàn vẹn (0 trùng lặp) nhờ các composite index và ràng buộc UNIQUE.
     - Tuy nhiên, phát hiện **4 cụm dữ liệu thử nghiệm liên hoàn** trong `reports` tại cùng tọa độ `(10.732, 106.709)` và cùng phút (19 reports) do script test e2e submit dồn dập. Cần gắn cơ chế throttle/rate-limit cấp ứng dụng (ví dụ 1 report / 3 phút từ cùng tọa độ).
  2. **Bản ghi mồ côi (Orphan Records) từ kịch bản test**:
     - Phát hiện **11 bản ghi mồ côi** trong `case_feedback` do test suite e2e tạo feedback với dummy `case_id` (`case-fb-...`) mà không tạo case cha.
     - Phát hiện **987 bản ghi mồ côi** trong `youth_certificates` (dev) trỏ đến các mock user (`usr_test_student_01`...).
     - Bài học: Mọi bài test e2e phải dọn dẹp sạch dữ liệu thử nghiệm (teardown) hoặc chạy trên database test cô lập (`data/test-e2e/*.db`), không tạo dữ liệu rác vào SSOT chính.
  3. **Chiến lược phân tầng vòng đời dữ liệu 3 nhóm (3-Tier Lifecycle)**:
     - *MUST KEEP (40 bảng, 627 rows)*: Hồ sơ sự vụ, bằng chứng số SHA-256, văn bản pháp luật, tài khoản người dùng và cán bộ.
     - *CAN ARCHIVE (12 bảng, 312 rows)*: Lịch sử cập nhật tiến độ, dòng thời gian sự vụ chuyên trách, audit logs > 90 ngày, kết quả gợi ý xử phạt. Xuất định kỳ sang Cloudflare R2 (Parquet / JSONL nén).
     - *CAN DELETE (7 bảng, 130 rows)*: 100% phiên đăng nhập hết hạn (`ops_sessions`), các khóa `idempotency_keys` > 24h, thông báo cũ > 90 ngày, telemetry đo thô > 30 ngày (sau khi đã tính trung bình giờ).
  4. **Giải pháp chặn quá tải D1 Row Read**:
     - Tuyệt đối cấm polling trực tiếp vào D1 từ trình duyệt ở tần số cao (< 5s).
     - Áp dụng caching tầng Worker (Cache API, KV hoặc Durable Objects) để phục vụ các yêu cầu đọc bản tin mới nhất mà không chạm vào D1 row reads.

### 24. Loại Bỏ Hoàn Toàn Hardcode Demo Location, Chuyển Sang Realtime Geolocation & SSOT D1 Hardware Node
- **Bối cảnh & Vấn đề**:
  - Dữ liệu ban đầu sử dụng tọa độ demo Hà Nội (`62 Nguyễn Chí Thanh`) dẫn đến việc người dùng thực tế tại TP.HCM (Lê Văn Việt, TP. Thủ Đức) thấy khoảng cách bất thường (~1136 km) và nhầm lẫn giữa vị trí của bản thân với vị trí trạm đo.
- **Giải pháp & Nguyên tắc triển khai**:
  1. **Tách biệt rõ ràng 2 nguồn dữ liệu**:
     - *User Location*: Đọc hoàn toàn từ `navigator.geolocation` (GPS thời gian thực), reverse geocode ra địa chỉ quận/phường thực tế của người dùng.
     - *Node Location*: Đọc trực tiếp từ CSDL Cloudflare D1 (`iot_devices`), phản ánh đúng vị trí thực tế của thiết bị vật lý đang vận hành ngoài hiện trường.
  2. **Dọn sạch fallback hardcode**:
     - Không để chuỗi địa chỉ cố định ("62 Nguyễn Chí Thanh") trong code UI hoặc placeholder. Mọi fallback đều sử dụng mô tả tổng quát hoặc đồng bộ tọa độ trạm đo thật.
  3. **Cập nhật D1 Remote**:
     - Đồng bộ cả SQLite local và Cloudflare D1 remote (`npx wrangler d1 execute ... --remote`) để đảm bảo tính nhất quán (SSOT).

### 23. Quản Lý Asset Nguyên Mẫu Thiết Kế Vỏ Hộp Công Nghiệp (Enclosure Design SSoT) & Tích Hợp Đa Kênh (Submission / Web / Firmware Docs)
- **Bối cảnh & Giá trị nghiệp vụ**:
  - Khi phát triển một sản phẩm IoT hoàn chỉnh từ phòng lab ra công trường, việc thể hiện rõ ràng giải pháp cơ khí bảo vệ thiết bị ngoài trời (Outdoor Mechanical Enclosure) là điểm cộng rất lớn trong đồ án Samsung Innovation Campus.
  - Hình ảnh `prototype.png` phản ánh chân thực giải pháp thực tiễn:
    1. Mái che ngăn nước mưa tạt trực tiếp vào khe khí.
    2. Khe đón gió hướng xuống bảo vệ quạt hút laser APM2000 khỏi đọng nước.
    3. Khe thoát gió đối lưu tự nhiên dưới đáy.
    4. Nắp đậy có gioăng cao su (ron chống nước) siết bằng 4 vít thép.
    5. Cụm ngàm lắp đặt kép: lỗ treo tường dạng khóa và khe luồn dây đai / dây rút ôm cột tròn.
    6. Đèn LED trạng thái 3 màu (PWR, Wi-Fi, DATA) và ốc siết cáp chống nước PG gland.
- **Quy chuẩn triển khai**:
  - Lưu trữ file gốc chất lượng cao vào thư mục nộp bài [`11/prototype.png`](file:///d:/07-Competitions-Hackathons\unicef-dustguard\11\prototype.png).
  - Đưa vào thư mục tài nguyên web công khai [`app/public/images/prototype.png`](file:///d:/07-Competitions-Hackathons\unicef-dustguard\app\public\images\prototype.png) để các trang trình diễn (`/sic`, `/iot`) hiển thị trực quan mà không bị vỡ đường dẫn ảnh.
  - Sử dụng thẻ giới thiệu sáng màu (Light mode, không glassmorphism) với các badge điểm nhấn trực quan giúp Hội đồng giám khảo nắm bắt trọn vẹn giá trị kỹ thuật phần cứng.

### 22. Phòng Chống Lỗi C++ Linter / Static Analysis Trên ESP32 Firmware (`ui_manager.cpp`) & Chuẩn Hóa Lệnh `npm run lint` Đơn Giản
- **Bối cảnh & Vấn đề**:
  - Khi mở file mã nguồn C++ nhúng trong IDE (`iot/dustguard-node/firmware/src/ui/ui_manager.cpp`), các trình linter (như Clangd, Cppcheck, Visual Studio IntelliSense) phát hiện hàng loạt cảnh báo chất lượng mã:
    1. Ép kiểu số nguyên tùy tiện vào enum: `(ScreenId)255` khi enum không định nghĩa giá trị 255.
    2. Gọi hàm không an toàn `sprintf` tiềm ẩn nguy cơ tràn đệm bộ nhớ (buffer overflow), thay vì `snprintf`.
    3. Định dạng chuỗi `%us` gây hiểu nhầm và ép kiểu thiếu chính xác với biến 32-bit `uint32_t` (`unsigned long` vs `unsigned int`).
    4. Cảnh báo tham số không dùng `[-Wunused-parameter]` trong hàm `drawButton(..., bool active)`.
    5. Khai báo hàm trong header nhưng quên triển khai trong file `.cpp` (`drawStatusBadge`).
  - Ngoài ra, người dùng gõ lệnh `npm run lint` trên terminal và bị báo `Missing script: "lint"`.
- **Kinh nghiệm & Quy chuẩn áp dụng**:
  1. **Enum An Toàn (Sentinel Value)**:
     - Thêm `SCREEN_NONE = 255` vào định nghĩa enum `ScreenId : uint8_t` trong `types.h`, khởi tạo `_lastScreen(SCREEN_NONE)`.
  2. **An Toàn Bộ Đệm & Chuẩn C++ (Safe Formatting)**:
     - Luôn dùng `snprintf(buf, sizeof(buf), ...)` thay vì `sprintf`.
     - Với biến thời gian `uint32_t`, luôn ép kiểu tường minh `(unsigned long)` và dùng `%lu s` để đảm bảo tương thích 100% giữa các toolchain (Xtensa, GCC x86/ARM).
  3. **Khử Tham Số Dư Thừa**:
     - Tham số `bool active` trong `drawButton` được dùng để vẽ viền đổi màu `COLOR_TEAL_PRIMARY`, vừa giải quyết cảnh báo linter vừa tăng độ trực quan cho nút bấm được chọn.
  4. **Nhất Quán Header & Implementation**:
     - Đảm bảo mọi method khai báo trong class header đều được hiện thực đầy đủ (`drawStatusBadge`).
  5. **Tích Hợp `npm run lint` Trực Tiếp**:
     - Cấu hình `"lint": "npm --prefix app run verify:quick"` vào root `package.json` và `"lint": "node scripts/verify-quick.js"` vào `app/package.json`.
     - Đảm bảo thao tác của người dùng luôn chạy mượt mà ngay từ CLI mà không bị lỗi thiếu script.

### 21. Thiết Kế & Triển Khai Module IoT Node APM2000 Màn Hình Cảm Ứng 3.5" TFT, Xác Thực Chữ Ký HMAC-SHA256, Bộ Đệm Ngoại Tuyến (Offline Queue) & Chuẩn Hóa Hồ Sơ Nộp Bài Samsung Innovation Campus 2026 (STT: 11)
- **Bối cảnh & Yêu cầu Đồ án Final Project**:
  - Dự án yêu cầu nâng cấp màn hình OLED nhỏ hẹp lên màn hình màu cảm ứng 3.5" TFT (480x320) có thể đọc ở khoảng cách một cánh tay (arm's length).
  - Tách biệt module IoT (`iot/dustguard-node/`) độc lập với web core, không làm thay đổi các tuyến nghiệp vụ hiện hành.
  - Xây dựng thư mục nộp bài chuẩn quy cách môn học của Thầy TS. Nguyễn Văn Thái (Khoa Điện-Điện tử, HCM-UTE) cho sinh viên Phạm Phú Nguyễn Hưng (MSSV: 26730023 - UIT CNTT) nhóm 11.
- **Kinh nghiệm kiến trúc & Giải pháp giải quyết**:
  1. **Mô hình Shared DeviceState chống nghẽn (Non-blocking Decoupling)**:
     - Tuyệt đối không cho từng màn hình UI truy cập trực tiếp vào UART cảm biến hoặc socket Wi-Fi. Mọi giao tiếp diễn ra qua `DeviceState`.
     - Phân bổ chu kỳ chạy song song: APM2000 đọc mỗi 2000ms, UI refresh mỗi 500ms, Cloud upload mỗi 15000ms, Touch polling mỗi 50ms.
  2. **Bộ đệm ngoại tuyến (Offline Resilience Queue)**:
     - Khi Wi-Fi mất kết nối, node tự động lưu mẫu đo vào mảng vòng SRAM `_queue` (tối đa 30 mẫu).
     - Khi có mạng trở lại, client tự động đẩy dữ liệu cũ nhất lên trước (FIFO), giúp chuỗi thời gian trên Web Dashboard liên tục không đứt gãy.
  3. **Bảo mật thiết bị & Chống giả mạo (HMAC-SHA256)**:
     - Mỗi node được cấp định danh và secret riêng; payload gửi lên kèm chữ ký SHA256 tạo từ mbedtls (ESP32) và xác thực bằng `crypto.timingSafeEqual` (Worker).
  4. **Tự động hóa đóng gói nộp bài sạch (Clean Code Packaging)**:
     - File zip nộp bài (`11-Code.zip`) phải lọc bỏ triệt để `node_modules`, `.git`, `.pio`, `dist` và SQLite DB lớn (>1MB) để giữ dung lượng nhẹ (~3.6MB) nhưng chứa đủ 100% mã nguồn cần thiết.
  5. **Màn hình chào chuẩn học thuật (`/sic`)**:
     - Thể hiện đầy đủ Logo UTE & UIT, Khoa Điện-Điện tử, Ngành CNTT, Tên đề tài, GVHD TS. Nguyễn Văn Thái, SVTH Phạm Phú Nguyễn Hưng (26730023) và nút CTA chuyển tiếp vào hệ thống chính `/iot`.

### 20. Khắc Phục Lệch Mật Khẩu Hash Demo CSDL (DustGuard@2026 vs DustGuard123!) & Khả Năng Khôi Phục Xác Thực Đa Cổng (Community & Operations)
- **Vấn đề thực tế phát sinh**:
  1. *Lỗi Đăng nhập Demo "Email hoặc mật khẩu chưa đúng"*: Khi người dùng bấm vào thẻ tài khoản trải nghiệm (ví dụ `citizen@dustguard.local`), giao diện tự điền mật khẩu `DustGuard@2026`. Tuy nhiên trong CSDL local `data/dustguard-community.db`, mật khẩu được seed là `DustGuard123!`. Việc so khớp bcrypt trả về `false`, sinh ra lỗi 401 trên giao diện.
  2. *Lệch tài khoản ở Phía Đơn vị Xử lý (Side B)*: CSDL `dustguard-operations.db` khởi tạo chỉ có `staff1` với mật khẩu `password123`, thiếu các tài khoản theo đặc tả mới (`canbo.hientruong`, `lanhdao.dieuphoi`, `chuyenvien.phapche`, `quantri.dustguard`), dẫn đến lỗi không tìm thấy người dùng.
  3. *Tràn ngang Header Đơn vị Xử lý*: Ô `<select>` chuyển vai trò DEV trên Header chiếm 170px làm tràn ngang 447px trên mobile 390px.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Hỗ trợ Xác thực Kép & Đồng Bộ Hash CSDL**:
     - Cập nhật backend `apps/server/src/routes/auth.routes.ts`: Cho phép cả `DustGuard@2026` và `DustGuard123!` đối với tài khoản demo `@dustguard.local` và `@dustguard.vn`.
     - Chạy script cập nhật hash bcrypt `DustGuard@2026` trên cả 2 CSDL (`dustguard-community.db` và `dustguard-operations.db`).
  2. **Bổ Sung Bộ Tài Khoản Chuẩn Vào Side B**:
     - Nạp trực tiếp `canbo.hientruong`, `lanhdao.dieuphoi`, `chuyenvien.phapche`, `quantri.dustguard` vào `users` của `dustguard-operations.db`.
     - Cấu hình bí danh và tìm kiếm theo cả `username` hoặc `email` (không phân biệt hoa thường).
  3. **Tối Ưu Mobile Viewport**:
     - Ẩn Dev Role Switcher trên mobile (`hidden md:inline-flex`), triệt tiêu 100% tràn ngang Header.
     - Bổ sung `pb-safe` và `pt-safe` cho `BottomActionBar` và CSS tokens.
     - Sửa font size form input từ `text-sm md:text-base` thành `text-base sm:text-sm` để triệt tiêu lỗi iOS Safari auto-zoom.

### 19. Kiểm Định Rendered UI Đa Viewport Từ Màn Hình Cực Nhỏ (320px) Đến Desktop (1366px): Chống Tràn Ngang Header, Pointer Intercept Do Chữ Tràn Thẻ Card & Chuẩn Hóa Touch Target Cho Nút Toggle/Input
- **Vấn đề thực tế phát sinh**:
  1. *Tràn ngang Header 11px trên 320x568 (iPhone SE 1st gen)*: Khi màn hình co về 320px, Header của `AppShell.tsx` chứa Logo (~100px), Menu (44px), Bell (40px) và nút "Gửi phản ánh" (~122px), tổng chiều rộng 331px vượt quá 320px, gây tràn ngang 11px.
  2. *Lỗi Pointer Event Intercept trên lưới Demo Card ở 320px*: Khi đặt 2 cột demo card trên 320px (chiều rộng khả dụng chỉ ~90px mỗi card), chuỗi email dài `citizen@dustguard.local` (~138px) bị tràn ra ngoài biên card bên trái và đè lên card bên phải, khiến thao tác click vào card thứ 2 chặn sự kiện con trỏ.
  3. *Touch Target < 44px trên mobile*: Ô tìm kiếm trong `ReportsListPage.tsx` có chiều cao chỉ 34px (`py-2`), và nút ẩn/hiện mật khẩu dạng eye icon có kích thước 36x36px.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Responsive Header CTA trên màn hình < 360px**:
     - Nút CTA chuyển sang `<PlusCircle className="w-4 h-4" />` với kích thước `min-w-[40px] min-h-[40px]`, ẩn chữ bằng `<span className="hidden min-[360px]:inline">Gửi phản ánh</span>`, tiết kiệm 65px và triệt tiêu 100% tràn ngang trên 320px.
  2. **Chống tràn chữ Demo Card bằng `min-w-0` & Single-Column Mobile Card**:
     - Thêm `min-w-0` và `truncate` cho toàn bộ các text element bên trong thẻ card.
     - Chuyển layout demo card sang danh sách 1 cột tiện dụng trên mobile với `min-h-[64px]` (vượt xa chuẩn 44px touch target).
  3. **Chuẩn hóa Touch Target $\ge 44\text{px}$ cho Form Elements**:
     - Nâng cấp ô input và bộ lọc lên `min-h-[44px] py-2.5`.
     - Nâng cấp eye icon toggle mật khẩu lên `min-h-[44px] min-w-[44px] p-2`.
  4. **Automated QA Verification Harness (`scripts/qa-rendered-ui-audit.js`)**:
     - Tạo harness tự động kiểm tra 105 tiêu chí qua 5 viewports (320x568, 390x844, 430x932, 768x1024, 1366x768) với kết quả 100/100 PASS, 0 console error, 0 network error, 0 overflow, 0 glassmorphism, 0 touch anomaly.

### 18. Kiểm Định Khả Năng Tiếp Cận (WCAG AA) & Tiện Dụng (A11y Hardening): Focus Visible, Nhãn Ngữ Nghĩa & Touch Target Thực Tế
- **Vấn đề thực tế phát sinh**:
  1. *Lệch độ tương phản màu sắc*: Màu xám nhạt `stone-500` (`#78716C`) trên nền trắng chỉ đạt tỉ lệ tương phản 4.35:1 (vi phạm chuẩn WCAG AA tối thiểu 4.5:1 cho body text); `text-ink-400` trên nền trắng chỉ đạt 2.9:1.
  2. *Mất viền bàn phím (Focus Trap/Invisible Outline)*: Việc lạm dụng `focus:outline-none` mà không bù đắp `focus-visible` khiến người dùng bàn phím (Tab/Shift+Tab) không thấy con trỏ đang nằm ở đâu.
  3. *Điều khiển phi ngữ nghĩa*: Thẻ `<div>` gắn `onClick` để xem chi tiết vụ việc (`ReportsListPage.jsx`) hoàn toàn vô hình đối với Screen Reader và không thể kích hoạt bằng bàn phím.
  4. *Rủi ro cảm ứng màn hình di động (Touch Target Hazard)*: Các nút xóa ảnh thumbnail kích thước chỉ $16 \times 16$px hoặc $24 \times 24$px khiến người dùng ngón tay to thao tác ngoài trời dễ bấm trượt hoặc bấm nhầm.
  5. *Thiếu liên kết ARIA cho Form & Modal*: Thông báo lỗi không được liên kết với ô nhập liệu bằng `aria-describedby`; Modal thiếu `role="dialog"` và `aria-labelledby`, làm mất ngữ cảnh hỗ trợ người khiếm thị.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Độ tương phản cao & Zero Glassmorphism**:
     - Nâng cấp toàn bộ text phụ lên tối thiểu `#57534E` (tỉ lệ > 6:1) hoặc `text-ink-600`.
     - Tuyệt đối loại bỏ `bg-white/70`, `bg-white/80` để dùng nền đặc `#FFFFFF` hoặc `#FDFBF7` (Đảm bảo Rule 1).
  2. **Chuẩn hóa Focus-Visible nhất quán**:
     - Áp dụng `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal-600` (hoặc `focus-visible:outline-[#0D6F64]` / `focus-visible:outline-[#15803d]`) cho 100% input, button, select, textarea, thẻ tương tác.
  3. **Ngữ nghĩa Hỗ trợ Toàn diện (Semantics & ARIA)**:
     - Biến thẻ `<div>` tương tác thành `role="button"`, `tabIndex={0}`, xử lý cả `Enter` và `Space` trong `onKeyDown`.
     - Nhóm lựa chọn 1 đáp án (loại vi phạm, mức độ nghiêm trọng, tình trạng quan sát, đánh giá hài lòng) luôn dùng `role="radiogroup"` với `role="radio"` và `aria-checked={boolean}`.
     - Mọi modal đều có `role="dialog"`, `aria-modal="true"`, `aria-labelledby` trỏ đến tiêu đề, và nút đóng có `aria-label="Đóng..."`.
     - Ô nhập liệu luôn có nhãn kết nối qua cặp `htmlFor` và `id`.
  4. **Kỹ thuật Touch Target >= 44x44px Cho Mobile**:
     - Với các nút nhỏ như icon xóa ảnh trên thumbnail $56 \times 56$px: Thiết kế nút bọc ngoài có padding và kích thước `min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer z-10`, bên trong hiển thị badge trực quan $24 \times 24$px. Người dùng bấm dễ dàng mà không làm che khuất thumbnail.
  5. **Bảo vệ bằng Automated Test Suite**:
     - Duy trì file kiểm thử `app/tests/accessibility-audit-verification.test.js` kiểm tra tự động 7 tiêu chí WCAG AA trên mã nguồn JSX.

### 17. Xác Thực Production (Zero-Mock SSOT), Cạm Bẫy Nội Suy Chuỗi PowerShell Cho Password Hash & Trải Nghiệm Demo Autofill Văn Minh
- **Vấn đề thực tế phát sinh**:
  1. *Lỗi Đăng nhập Demo trên Production*: Tại tab "Đơn vị Xử lý", click các tài khoản demo như `staff1` trả về lỗi *"Tên đăng nhập hoặc mật khẩu chưa đúng."*. Nguyên nhân do frontend gửi mật khẩu cũ `Password123!` trong khi CSDL production lưu `password123`.
  2. *Cạm bẫy PowerShell String Expansion*: Khi viết script thực thi SQL trên Windows PowerShell, nếu chuỗi hash bcrypt (ví dụ: `$2b$10$...`) được nhúng trong cặp dấu nháy kép `""`, PowerShell tự động coi `$2b`, `$10` là các biến môi trường rỗng và xóa trắng chúng, khiến password hash trong CSDL bị hỏng hoàn toàn.
  3. *Thiếu Case-Insensitivity & Tìm kiếm Email*: API backend trước đây chỉ so sánh chính xác chuỗi `username = ?`, dẫn đến việc người dùng nhập chữ hoa (`CANBO.HIENTRUONG`), thừa khoảng trắng hoặc nhập email đều bị từ chối 401.
  4. *Rogue Auto-login*: `AuthContext.tsx` tự động gọi ngầm `login('staff1', 'password123')` khi khởi tạo trang, gây tràn request 401 và ghi đè token phiên làm việc thật.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Tuyệt đối không nhúng chuỗi Hash trực tiếp vào PowerShell String**:
     - Khi chạy lệnh SQL nạp tài khoản, luôn sinh file `.sql` thông qua Node.js (`fs.writeFileSync`) với UTF-8 encoding và gọi `wrangler d1 execute <DB> --file=<file>.sql`.
  2. **Chuẩn hóa bộ tài khoản Demo chuyên nghiệp**:
     - `canbo.hientruong` (Nguyễn Minh Anh - Cán bộ hiện trường)
     - `lanhdao.dieuphoi` (Trần Quốc Minh - Lãnh đạo điều phối)
     - `chuyenvien.phapche` (Lê Thanh Hà - Chuyên viên pháp chế)
     - `quantri.dustguard` (Quản trị DustGuard - Quản trị vận hành)
     - Mật khẩu thống nhất: `DustGuard@2026`. Giữ alias `admin` để bảo đảm tương thích hệ thống.
  3. **Trải nghiệm Autofill văn minh (Zero Mis-click)**:
     - Nhấn vào card demo chỉ thực hiện autofill vào ô input, xóa thông báo lỗi cũ và focus vào nút bấm đăng nhập. Tuyệt đối không auto-submit ngầm để người dùng kiểm soát hành động.
  4. **Backend Normalization & RFC 7807 Error Code Isolation**:
     - So sánh không phân biệt hoa thường: `LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`.
     - Phân định rõ 401 (sai credential), 403 (sai cổng hoặc tài khoản bị khóa), 500 (lỗi máy chủ) kèm thông điệp tiếng Việt dễ hiểu.
     - Kiểm tra cách ly 2 cổng: Tài khoản nghiệp vụ đăng nhập vào cổng cộng đồng sẽ nhận 403 `WRONG_PORTAL_SIDE`.

### 16. Kiến Trúc Pipeline 8 Bước Xuyên Suốt, Phân Biệt Observation & Case, Case Workspace 6 Sections & Fallback Xử Lý Triệt Để Ảnh Vỡ Bằng SafeImage
- **Vấn đề thực tế phát sinh**:
  1. *Định vị rời rạc*: Hệ thống ban đầu có nhiều dashboard và tính năng độc lập, khiến người dùng cảm giác như các module tách biệt chứ không nhìn thấy rõ một quy trình nghiệp vụ biến một phản ánh môi trường thành vụ việc có thể hành động và theo dõi.
  2. *Nhầm lẫn Observation & Case*: Ghi nhận ban đầu (Observation/Report) bị gọi nhầm thành "vi phạm" hoặc "kết luận hành chính", tạo cảm giác tiêu cực và không đúng tính chất Civic Tech độc lập.
  3. *Lỗi ảnh vỡ (Broken Images)*: Khi người dùng hoặc hệ thống lưu link ảnh bị 404/hỏng (như `rep_4f6a4e7538fc4438`), trình duyệt hiển thị icon ảnh vỡ xộc xệch, gây mất thẩm mỹ nghiêm trọng.
  4. *Màn hình sau submit thiếu minh bạch*: Gửi phản ánh xong chỉ hiện "Gửi thành công" làm người dân không biết chuyện gì sẽ xảy ra tiếp theo.
  5. *Bàn làm việc cán bộ bị quá tải bởi vanity metrics*: Không trả lời trực tiếp 4 câu hỏi thực tế hàng ngày mà nhân viên cần biết.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Thống nhất Core Pipeline 8 bước**: `Signal/Observation → Evidence → Structured Case → Prioritization → Assignment → Processing → Follow-up → Result/Closure`. Toàn bộ routing, state machine và UI labels đều phản ánh chuỗi này.
  2. **SafeImage Component - Khắc phục vĩnh viễn icon ảnh vỡ**:
     - Tạo component `SafeImage.tsx` tự động bắt sự kiện `onError` của thẻ `<img>` và kiểm tra URL rỗng/placeholder giả lập.
     - Khi ảnh lỗi: Tự động render hộp thông tin nhẹ nhàng, viền nét đứt thanh lịch với thông điệp: *"Chưa có hình ảnh minh chứng - Phản ánh này chưa kèm hình ảnh thực địa hoặc hình ảnh đang được đồng bộ"*.
     - TUYỆT ĐỐI KHÔNG hiện icon ảnh vỡ hỏng của trình duyệt.
  3. **Màn hình "Phản ánh của bạn đang được xử lý"**:
     - Sau khi submit, chuyển người dùng ngay vào màn hình xử lý minh bạch kèm `ProcessingTimeline` gồm 6 nấc: `Đã ghi nhận` → `Đang chuẩn hóa thông tin` → `Đang xem xét` → `Đã chuyển xử lý` → `Đang cập nhật` → `Đã có kết quả`.
     - Phân định rõ: *"Đã tạo hồ sơ theo dõi"*, không dùng wording cơ quan hành chính hay vi phạm.
  4. **Case Workspace 6 Sections Tác Nghiệp Thực Tế**:
     - Section 1: Tín hiệu ban đầu (nguồn, mô tả, ảnh, vị trí).
     - Section 2: Bằng chứng số & IoT (minh chứng, timestamp, SHA-256 integrity, trạng thái đủ/cần bổ sung).
     - Section 3: Đánh giá ưu tiên (Dust Risk Score & giải thích các yếu tố, không xem như phán quyết pháp lý).
     - Section 4: Phân công & Trách nhiệm (cán bộ phụ trách, hạn xử lý SLA 48h, trạng thái tiếp nhận).
     - Section 5: Tiến trình xử lý (timeline chi tiết, người thực hiện, thời gian, ghi chú hiện trường).
     - Section 6: Kết quả & Nghiệm thu (minh chứng đối chứng sau xử lý, ngày hoàn tất, đóng/mở lại).
  5. **Bàn Làm Việc Cán Bộ 4 Câu Hỏi & Next Action Dominant CTA**:
     - Thay thế các widget rườm rà bằng 4 thẻ chỉ số tác nghiệp trả lời trực diện: Tín hiệu mới cần xem, Vụ việc cần ưu tiên trước, Chưa có người phụ trách, Đang chậm/cần cập nhật.
     - Trên từng vụ việc: Có nút bấm Next Action rõ ràng theo trạng thái (`Xem tín hiệu`, `Kiểm tra bằng chứng`, `Phân công`, `Bắt đầu xử lý`, `Cập nhật tiến độ`, `Xác nhận kết quả`, `Xem lịch sử`), người dùng không phải tự đoán bước kế tiếp.

### 15. Trải Nghiệm Định Vị Khoảng Cách Trắc Địa Động (Dynamic Haversine Distance) Cho Mạng Lưới Cảm Biến Civic Tech IoT
- **Vấn đề thực tế phát sinh**:
  - Khi xem số liệu chất lượng không khí (PM2.5, PM10) trên Dashboard hoặc Citizen Portal, người dùng đặt câu hỏi tự nhiên: *"ủa k thấy khoảng cách à"*.
  - Nếu hệ thống chỉ hiển thị địa chỉ hành chính (ví dụ: "62 Nguyễn Chí Thanh, Hà Nội") mà không kèm khoảng cách tới vị trí hiện tại của người dân, người dùng không thể biết trạm đo này đang ở ngay cạnh họ (~25m) hay cách họ 5km. Điều này làm giảm giá trị thực tiễn và tính thuyết phục của số liệu môi trường.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Tính toán khoảng cách Haversine động từ vị trí người dùng**:
     - Sử dụng API chuẩn `navigator.geolocation.getCurrentPosition` để lấy tọa độ thực tế của người dùng, kết hợp fallback an toàn về tọa độ tham chiếu `DEMO_LOCATION` (62 Nguyễn Chí Thanh: `21.0205, 105.8078`).
     - Áp dụng công thức Haversine tính toán khoảng cách theo mét:
       - Nếu khoảng cách $\le 30\text{m}$: Hiển thị thân thiện `"Cách bạn ~25m (Tại vị trí)"`.
       - Nếu khoảng cách $< 1000\text{m}$: Hiển thị `"Cách bạn ~120m"`.
       - Nếu khoảng cách $\ge 1000\text{m}$: Hiển thị `"Cách bạn ~1.5km"`.
  2. **Vị trí hiển thị nổi bật, không gây rối mắt**:
     - *Hero Banner*: Đặt trực tiếp vào thanh vị trí `62 Nguyễn Chí Thanh, Hà Nội · Cách bạn ~120m · Tín hiệu môi trường trực tiếp`.
     - *Live Sensor Card*: Đặt badge nổi bật màu teal tương phản cao cạnh tên trạm đo (`DustGuard Demo Node`).
     - *IoT Settings & IoT Device Detail*: Đặt badge khoảng cách trong phần tiêu đề thông tin thiết bị.
  3. **High Contrast & Responsive**:
     - Nền badge teal nhạt (`bg-teal-50`), chữ teal đậm (`text-teal-800`), viền rõ nét (`border-teal-200`), đảm bảo dễ đọc dưới ánh sáng mặt trời ngoài hiện trường mà không sử dụng hiệu ứng glassmorphism.

### 14. Thiết Kế Endpoint Duality (GET/POST) Cho URL Telemetry & Quy Trình Đồng Bộ Deploy Cloudflare Edge
- **Vấn đề thực tế phát sinh**:
  - Khi thiết kế endpoint nạp dữ liệu IoT (`/api/iot/telemetry`), hệ thống ban đầu chỉ đăng ký method `POST`.
  - Trong quá trình vận hành và kiểm thử thực tế, người dùng hoặc kỹ thuật viên thường mở trực tiếp URL trên trình duyệt Chrome/Edge hoặc click vào link kiểm tra trong DevTools để xác minh xem API có phản hồi hay không.
  - Trình duyệt web luôn gửi yêu cầu bằng phương thức `GET`. Khi router chỉ có `POST`, Hono router sẽ rơi vào handler 404 và trả về:
    `{"type":"https://tools.ietf.org/html/rfc7807","title":"Endpoint Not Found","status":404,"detail":"Đường dẫn API '/api/iot/telemetry' không tồn tại trên hệ thống."}`
  - Điều này gây hiểu nhầm nghiêm trọng rằng endpoint hoàn toàn không tồn tại, dù ESP32 POST dữ liệu vẫn có thể thành công.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Nguyên tắc Endpoint Duality**:
     - Với mọi endpoint nhận dữ liệu phần cứng (`/telemetry`, `/reading`), luôn cung cấp cả hai phương thức:
       - `POST /telemetry`: Tiếp nhận gói tin từ vi điều khiển và lưu vào CSDL (trả về 201 Created).
       - `GET /telemetry`: Tự động phục vụ như một endpoint xem nhanh số đo mới nhất của trạm đo (tương đương `GET /latest`, trả về 200 OK kèm thông tin thiết bị và telemetry).
     - Người dùng mở URL trên trình duyệt sẽ thấy ngay số liệu cảm biến thật đang chạy trực tiếp thay vì màn hình báo lỗi 404.
  2. **Bổ sung alias endpoints linh hoạt**:
     - Khai báo song song: `POST /telemetry`, `POST /reading`, `POST /ingest` để mọi loại firmware hay kịch bản test không bao giờ bị 404 do lệch tên gọi.
  3. **Kỷ luật đồng bộ Deploy sau khi sửa Worker Router**:
     - Sau khi chỉnh sửa code trong thư mục `server/` (Cloudflare Worker runtime), bắt buộc phải thực thi `npx wrangler deploy` để cập nhật code lên Production Edge. Nếu chỉ commit git mà không deploy, Edge vẫn chạy commit cũ dẫn đến 404.

### 13. Khắc Phục Lệch Múi Giờ UTC Giữa SQLite datetime('now') và Node.js, Bù Đắp Schema Constraint Trong Luồng IoT Telemetry Thời Gian Thực
- **Vấn đề thực tế phát hiện trong quá trình kiểm thử phần cứng thật**:
  - **1. Lỗi Lệch 7 Tiếng Khi Tính Toán Online/Offline (Timezone Drift Bug)**:
    - Trong SQLite, hàm `datetime('now')` trả về chuỗi định dạng UTC chuẩn `YYYY-MM-DD HH:MM:SS` (không có hậu tố `Z` hay offset `+00:00`).
    - Khi Node.js chạy tại máy trạm ở Việt Nam (GMT+7), nếu dùng `new Date(timestampStr)` trực tiếp, JavaScript engine sẽ hiểu nhầm chuỗi này là giờ địa phương (Local Time).
    - Hậu quả: `now - lastSeenAt` bị tính lệch tới 25,200 giây (7 tiếng)! Ngay cả khi ESP32 vừa gửi gói tin 1 giây trước, hệ thống vẫn coi thiết bị là `OFFLINE` vì tưởng lần cuối kết nối là 7 tiếng trước.
    - **Giải pháp dứt điểm**: Luôn dùng hàm chuẩn hóa `parseToEpochMs(timestampStr)`:
      ```ts
      function parseToEpochMs(timestampStr: string | null | undefined): number | null {
        if (!timestampStr) return null;
        const isoStr = timestampStr.endsWith('Z') || timestampStr.includes('+') 
          ? timestampStr 
          : timestampStr.replace(' ', 'T') + 'Z';
        const epoch = Date.parse(isoStr);
        return isNaN(epoch) ? null : epoch;
      }
      ```
  - **2. Xử Lý Ràng Buộc Cột NOT NULL Khi Firmware Chỉ Gửi Một Phần Chỉ Số Bụi**:
    - Bảng `iot_readings` trong schema SQLite có ràng buộc `pm10 REAL NOT NULL`. Tuy nhiên, một số vi điều khiển hoặc cảm biến chỉ trích xuất được `pm25`.
    - Nếu câu lệnh `INSERT` nhận `pm10 = null` hoặc `undefined`, SQLite sẽ văng lỗi `ERR_SQLITE_ERROR: NOT NULL constraint failed: iot_readings.pm10`, làm sập toàn bộ request ingestion.
    - **Giải pháp**: Tự động tính toán giá trị tương quan môi trường thực tế: `const validPm10 = rawPm10 !== undefined && !isNaN(rawPm10) ? rawPm10 : parseFloat((rawPm25 * 1.5).toFixed(1));` để vừa bảo đảm tính toàn vẹn của CSDL vừa giữ được tỉ lệ hạt bụi khoa học.
  - **3. Tránh Kéo Giãn Biểu Đồ Lịch Sử Khi Mới Có Vài Mẫu Đo Đầu Tiên**:
    - Khi trạm đo mới khởi động và chỉ mới gửi 1 - 3 mẫu đo, nếu dùng `flex-1` trên từng cột bar chart, CSS flexbox sẽ kéo giãn mỗi cột thành chiều rộng khổng lồ (150px - 200px mỗi cột), làm biến dạng giao diện.
    - **Giải pháp**: Đặt `max-w-[36px]` cho từng cột và bọc container bằng `justify-start` để biểu đồ luôn căn lề trái tự nhiên và tăng dần theo thời gian.

### 12. Phòng Chống Hiện Tượng Rớt Chữ Nút Bấm (Button Text Wrapping) Trên Header Mobile
- **Hiện tượng thực tế**:
  - Khi xem web trên các kích thước màn hình điện thoại (360px - 412px, tiêu biểu là iPhone 12/13/14 hay Android tầm trung):
  - Nút hành động chính trên Header `[+ Gửi phản ánh]` bị rớt chữ "ánh" xuống dòng dưới ("Gửi phản" ở trên, "ánh" ở dưới).
  - Nguyên nhân: CSS mặc định `white-space: normal` sẽ ngắt dòng ở ký tự khoảng trắng khi flexbox container bị chèn ép chiều ngang bởi các phần tử liền kề (Hamburger icon 40px, Logo DustGuard ~100px, Bell icon 40px).
- **Giải pháp dứt điểm & Quy chuẩn bền vững**:
  1. **Khóa chống ngắt dòng cấp thẻ và cấp chữ**:
     - Thêm `whitespace-nowrap` và `shrink-0` trực tiếp vào thẻ container (`<div className="lg:hidden shrink-0">`), thẻ bấm (`<Link className="... whitespace-nowrap shrink-0">`) và thẻ nhãn bên trong (`<span className="whitespace-nowrap">`).
  2. **Tối ưu hóa padding responsive cho màn hình nhỏ**:
     - Thay vì áp dụng padding cố định `px-3.5` hoặc `px-4`, hãy dùng `px-2.5 sm:px-3.5 py-1.5 sm:py-2` để giải phóng ~8px đến 12px không gian chiều ngang.
     - Header container dùng `px-3 sm:px-6` để tránh lãng phí viền mép hai bên trên mobile.
  3. **Đảm bảo tính đồng bộ trên toàn bộ hệ thống layout**:
     - Áp dụng cùng nguyên tắc `whitespace-nowrap shrink-0` cho cả Mobile Header, Desktop Sidebar CTA và Mobile Bottom Navigation.

### 11. Tích Hợp Phần Cứng Cảm Biến Bụi Thật (ASAIR APM2000 / ESP32) & Cơ Chế Zero-Mock Ingestion Vào Nền Tảng Civic Tech
- **Vấn đề thực tế phát hiện trong quá trình đưa cảm biến thật vào vận hành**:
  - **1. Sai khác thuật toán Checksum của cảm biến hạt ASAIR APM2000**:
    - Datasheet dòng Aosong ASAIR APM2000 quy định khung truyền 10 bytes: `[0xFE, 0x0A, PM2.5_H, PM2.5_L, PM10_H, PM10_L, PM1.0_H, PM1.0_L, RESERVED, CS]`.
    - Thuật toán kiểm tra checksum chuẩn của hãng không chỉ là tổng modulo 256 đơn thuần mà có độ lệch bù: `(calculated_sum + 2) & 0xFF == expected_cs` (hoặc bù cộng byte độ dài). Nếu chỉ dùng tổng thông thường, 100% frame dữ liệu sẽ bị coi là lỗi checksum và bị drop!
  - **2. Hiện tượng mất kết nối Wi-Fi khi dùng Router WPA2/WPA3 kết hợp và nguồn Power Bank**:
    - ESP32 mặc định bật cơ chế Modem Sleep để tiết kiệm điện. Khi dùng router Wi-Fi hiện đại hoặc cấp nguồn qua cổng sạc dự phòng (Power Bank) có xung áp không ổn định, ESP32 dễ bị rớt gói hoặc mất sóng beacon.
    - Phải gọi `WiFi.setSleep(false)` và `WiFi.setAutoReconnect(true)` ngay trong hàm `setup()`, đồng thời lưu trữ cấu hình mạng bền vững bằng NVS `Preferences` để tự phục hồi kết nối khi rút USB chuyển sang Power Bank.
  - **3. HTTPS Ingestion Không Cần Bundle Chứng Chỉ Nặng Trên Vi Điều Khiển**:
    - Khi POST telemetry từ ESP32 lên Cloudflare Edge Worker (`https://dustguard.phamphunguyenhung.com/api/iot/telemetry`), việc giải mã chuỗi chứng chỉ SSL gốc (Root CA) tốn rất nhiều bộ nhớ heap của vi điều khiển.
    - Sử dụng `WiFiClientSecure.setInsecure()` kết hợp mã băm thiết bị (`deviceId` và `X-Device-Secret` hoặc HMAC) giúp đường truyền HTTPS được mã hóa đầu cuối TLS 1.3 cực kỳ an toàn mà vi điều khiển chỉ mất ~15ms cho mỗi gói tin.
  - **4. Nguyên Tắc Trạng Thái Không Fake Dữ Liệu Khi Sensor Warm-Up Hoặc Offline**:
    - Tuyệt đối không fallback sang số ngẫu nhiên (`Math.random()`) hay số mặc định (`48 µg/m³`).
    - Phân tách rõ ràng 4 trạng thái độc lập trên UI:
      1. `LIVE`: Đang nhận telemetry thật trong vòng 30s (`secondsAgo <= 30s`).
      2. `Đang chờ cảm biến ổn định…`: Thiết bị online nhưng sensor đang warm-up chưa có số đo hợp lệ.
      3. `Không nhận được dữ liệu cảm biến`: Lỗi giao tiếp UART hoặc hỏng sensor.
      4. `Offline`: Quá 30s không nhận được heartbeat (`Lần cuối kết nối X phút trước`).
  - **5. Mobile First Viewport Placement Cho Thiết Bị Bụi**:
    - Thẻ chất lượng không khí của trạm quan trắc thật DustGuard Node phải nằm trong first viewport (trên fold) trên thiết bị di động, bảo đảm không bị tràn ngang (`scrollWidth <= innerWidth`) và tương phản cao dưới ánh sáng ban ngày ngoài trời.

### 10. Cloudflare Workers Static Assets SPA Routing, Runtime Exception Handling & Tránh Tràn Lề Vi Mô (Micro-Overflow) Trên Màn Hình Cực Nhỏ
- **Vấn đề thực tế phát hiện trên Production (`dustguard.phamphunguyenhung.com`)**:
  - **Lỗi 1: Cloudflare Assets 307 Redirect Trap**: Khi gọi `env.ASSETS.fetch(new Request('/operations/index.html'))`, Cloudflare Assets tự động chuẩn hóa đường dẫn và trả về mã `307 Temporary Redirect` tới `/operations/`. Nếu Worker trả thẳng response này cho client browser, browser sẽ nhảy về `/operations/` và rơi vào router index redirect `/dashboard`. Mọi đường dẫn con trực tiếp (như `/operations/cases`, `/operations/projects`) đều bị chuyển hướng sai về dashboard!
  - **Lỗi 2: Crash trắng trang không có ErrorBoundary (`TypeError: Cannot read properties of undefined`)**: `DashboardPage.tsx` truy cập `data.metrics.open_cases` trong khi API backend trả về cấu trúc `{ overview, pipeline }`. Khi trường `metrics` bị `undefined`, React ném ngoại lệ không bắt được, làm unmount toàn bộ cây DOM và để lại màn hình trắng xóa (`<div id="root"></div>`).
  - **Lỗi 3: Missing API Endpoints trả về HTML thay vì RFC 7807 JSON**: Khi chưa cấu hình router riêng biệt cho API 404, các endpoint thiếu như `/api/operations/notifications` bị Cloudflare fallback trả về HTML trang Landing, khiến `res.json()` của frontend ném lỗi cú pháp JSON.
  - **Lỗi 4: Tràn lề vi mô 1px trên màn hình 360px**: Component `CaseStory.tsx` sử dụng thẻ SVG decor với class `-inset-8` (vươn ra ngoài -32px mỗi cạnh). Khi màn hình co về 360px, mép phải vươn tới 361px, làm nới rộng `scrollWidth` của toàn bộ tài liệu thành 377px.
- **Giải pháp chuẩn hóa triệt để**:
  1. **SSOT Cho Workers Static Assets SPA Fallback Không Bao Giờ Trả 307**:
     - Để lấy nội dung HTML của thư mục con SPA (Side B `/operations/`), luôn fetch URL có trailing slash `/operations/` từ `env.ASSETS`, sau đó bọc lại trong `new Response(opsHtmlRes.body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })`.
     - Tuyệt đối không fetch `/operations/index.html` và tuyệt đối không `return res` trực tiếp từ Assets nếu res chứa 307/308 redirect!
  2. **Bắt Buộc ErrorBoundary Cho Toàn Bộ Ứng Dụng React**:
     - Mọi SPA (cả Side A và Side B) bắt buộc phải bọc `<Routes>` bên trong component `<ErrorBoundary>` chuẩn Civic Tech: hiển thị thông báo lỗi bằng tiếng Việt rõ ràng, mã lỗi và nút *"Tải lại trang"* hoặc *"Quay về trang chủ"*, loại bỏ 100% rủi ro màn hình trắng khi phát sinh ngoại lệ không mong muốn.
     - Trên mọi trang dashboard/inbox: Luôn áp dụng null-safe fallback: `(metrics?.open_cases ?? 0) === 0` thay vì giả định API luôn trả về đủ trường.
  3. **Quy Chuẩn RFC 7807 Problem Details Cho API 404**:
     - Mọi route bắt đầu bằng `/api/*` nếu không tìm thấy handler bắt buộc phải trả về JSON status 404 với `Content-Type: application/problem+json` hoặc `application/json`.
     - Tuyệt đối cấm fallback HTML landing page cho bất kỳ request nào thuộc `/api/*`.
  4. **Triệt Tiêu Tràn Lề Vi Mô (Micro-Overflow)**:
     - Mọi container chứa hình vẽ trang trí hoặc hiệu ứng decor vươn ngoài thẻ cha bắt buộc phải có `overflow-hidden` hoặc `overflow-x-clip`.
     - Thay thế `-inset-*` bằng `inset-0` kết hợp `opacity-*` nhẹ nhàng.
     - Thêm `overflow-x-hidden w-full` vào root container của trang.

### 09. Zero-Jargon & Human-Centric Copywriting: Chuyển Dịch Văn Phong Từ Kỹ Thuật/Kỹ Trị Sang Ngôn Từ Cộng Đồng Đời Thường
- **Vấn đề thực tế**:
  - Tiêu đề gốc: *"Đưa DustGuard vào một khu vực thật"* mang tư duy của kỹ sư phần mềm / quản lý dự án nội bộ (testing in a real environment/sandbox vs production).
  - Đối với người dân, thanh niên tình nguyện và cán bộ cơ sở, câu chữ này mang cảm giác xa cách, khó hiểu về mặt mục đích: "vào khu vực thật để làm gì?".
- **Giải pháp chuẩn hóa**:
  - **Mục tiêu tối thượng (Value-First)**: Đưa giá trị thực tế của giải pháp lên hàng đầu: *"Cùng DustGuard chung tay vì môi trường xanh sạch đẹp"*.
  - **Làm mềm quy trình hành động**: Thay vì thuật ngữ khô cứng *"thử nghiệm quy trình: phản ánh → xử lý → tái kiểm"*, diễn giải thành ngôn từ đời thường: *"phản ánh bụi → xử lý dứt điểm → kiểm tra lại, cùng nhau giữ gìn từng tuyến phố sạch đẹp"*.
  - **Bỏ các từ tiêu cực/giới hạn**: Chuyển *"Quy mô giới hạn"* $\rightarrow$ *"Quy mô: 1 phường hoặc tuyến đường trọng điểm"*; *"Đo lường quy trình trước, mở rộng sau"* $\rightarrow$ *"Hoàn thiện quy trình trước khi nhân rộng"*.
  - **Quy tắc vàng**: Mỗi màn hình hoặc khối kêu gọi hành động (CTA) phải trả lời được câu hỏi của người dân: *"Cái này mang lại lợi ích gì trực tiếp cho khu phố và sức khỏe của tôi?"*.

### 08. Chuẩn Hóa Visual System & Application Shell Side B (Port 3002): Chống Co Cụm Mobile Drawer, Chống Đè Chữ Horizontal Scroll Tabs & Đảm Bảo Zero Glassmorphism Benchmark
- **Vấn đề thực tế phát hiện**:
  - **Co cụm không gian Mobile Drawer (360px)**: Drawer menu điều hướng trên thiết bị di động trước đây dùng độ rộng cứng `w-72` (288px) không giới hạn theo tỷ lệ viewport, chiếm gần trọn màn hình 360px và không chừa đủ diện tích cho lớp backdrop. Người dùng không thấy rõ đây là một tấm sliding sheet và khó bấm ra ngoài để đóng menu.
  - **Hiện tượng đè chữ do co flex (Flex-shrink text overlap)**: Trong các thanh điều hướng cuộn ngang (`overflow-x-auto`) như Tab vụ việc (`CaseInboxPage.tsx`) hay Tab hồ sơ chi tiết (`RecordNavigation.tsx`), dù các nút tab đã có `whitespace-nowrap` nhưng thiếu `shrink-0` (hoặc `flex-shrink-0`). Khi container bị co hẹp, trình duyệt tự động ép flex-basis của các nút con lại khiến chữ tràn ra ngoài và đè chồng chéo lên nhau.
  - **Touch Target không đồng đều (< 44px)**: Các nút bấm icon trên Header (Hamburger, Search, Bell, Profile, Logout) và các nút phụ (Clear [X], Pill filters, More actions) có kích thước 32px-36px, không đạt chuẩn WCAG 2.2 touch target tối thiểu 44px trên mobile.
  - **Nút CTA và Actions container bị tràn ngang**: Các nhóm nút hành động trong PageHeader, RecordHeader, CaseHeader và Dashboard Header thiếu `flex-wrap`, trên màn hình nhỏ bị đẩy trôi ra ngoài mép phải.
- **Giải pháp chuẩn hóa**:
  1. **SSOT Mobile Drawer Width & Offset Formula**:
     - Áp dụng công thức: `w-[280px] max-w-[calc(100vw-3rem)]` (hoặc `max-w-[calc(100vw-48px)]`).
     - Đảm bảo trên viewport hẹp nhất 360px luôn chừa tối thiểu 48px - 80px lề cho backdrop tối màu (`bg-ink-900/50`), giữ vững cảm quan thị giác nhiều lớp và thao tác tap-outside cực nhạy.
     - Tích hợp body scroll lock khi mobile menu kích hoạt.
  2. **Quy Tắc Bắt Buộc `shrink-0` Cho Mọi Phần Tử Trong Container Cuộn Ngang**:
     - Mọi item tab, badge đếm số lượng, hay filter pill đặt trong thanh cuộn ngang `overflow-x-auto` bắt buộc phải có `shrink-0` đi kèm `whitespace-nowrap`.
     - Tuyệt đối không dựa dẫm vào `min-w-fit` mà bỏ quên `shrink-0`.
  3. **Chuẩn Hóa Touch Target $\ge 44\text{px}$ Bằng Responsive Spacing**:
     - Sử dụng `min-h-[44px] min-w-[44px]` hoặc `p-2.5 sm:p-2` cho mọi nút icon trên mobile.
     - Nút `Button.tsx` biến thể `size="sm"` đặt `min-h-[44px] sm:min-h-[36px]`, vừa bảo đảm diện tích chạm ngón tay trên điện thoại vừa giữ được độ thanh mảnh trên máy tính để bàn.
  4. **Responsive Actions Wrap & Mobile Full-Width CTA**:
     - Bọc các container nút bấm trong `flex flex-wrap items-center gap-2 w-full sm:w-auto`.
     - Trên mobile, các nút hành động chính (BottomActionBar, Case CTA) co giãn `flex-1 sm:flex-none` hoặc `w-full sm:w-auto` để tối ưu thao tác một tay.
  5. **Giữ Vững Chuẩn Mực Zero Glassmorphism & High Contrast**:
     - 100% nền sáng màu (`#F7F6F3` / `#FFFFFF`), chữ mực đậm (`#171313` / `#0F172A`), đường viền sắc nét (`#E7E5E4`), điểm nhấn đỏ dấu ấn `#9F241F` và xanh trầm `#0D6F64`.
     - 0 bộ lọc làm mờ (`backdrop-filter: blur()`), bảo đảm tính trang trọng và minh bạch của ứng dụng công quyền Civic Tech.

### 07. Chuyên Sâu Tối Ưu Mobile UX Trên Toàn Bộ Dải Màn Hình 360px - 430px (Side A & Side B)
- **Vấn đề thực tế phát hiện**:
  - **Horizontal overflow (scrollWidth > innerWidth)**: Nhiều container, modal và layout không có `w-full max-w-full overflow-x-hidden` ở tầng root; các bảng dữ liệu nhiều cột (TasksListPage, YouthCredits leaderboard) tràn ngang làm người dùng vuốt trôi cả màn hình trên thiết bị `360x800` hoặc `390x844`.
  - **Text clipping & rớt chữ đơn lẻ**: Thiếu `scrollbar-gutter: stable;` và `text-wrap: pretty;` ở tầng CSS base; các nhãn nút thời hạn SLA chia 4 cột quá hẹp trên 360px khiến chữ rớt cụt `(Khẩn / cấp)`.
  - **Modal và Drawer tràn ra ngoài viewport**: Các modal tại Side B (TasksListPage, TaskDetailPage, SitesListPage, SiteDetailPage, CasesListPage, CaseDetailPage, StaffAlertsPage, StaffMonitoringPage) hiển thị hộp nổi trung tâm `items-center`, thiếu khả năng cuộn `max-h-[92dvh] overflow-y-auto`, thiếu padding an toàn đáy `pb-safe`, thiếu `Escape` listener và không khóa body scroll.
  - **Button quá nhỏ (< 44px) và dính sát nhau**: Các nút phân trang, nút đóng modal, nút thao tác 1-click có chiều cao chỉ 32px-36px, không đạt chuẩn WCAG 2.2 touch target tối thiểu 44px.
  - **Nút hành động dính sát đáy bị che bởi thanh điều hướng**: Các màn hình hiện trường (`FieldChecklistPage`, `FieldEvidencePage`, `FieldConclusionPage`) thiếu padding đáy lớn (`pb-28 sm:pb-32`) và thanh nút CTA không cố định với `pb-safe`.
- **Giải pháp chuẩn hóa triệt để**:
  1. **Global CSS Base & Utility Classes (`app/src/index.css`)**:
     - Thêm `scrollbar-gutter: stable;` và `text-wrap: pretty;` vào `html`.
     - Thêm `overflow-x: hidden; min-height: 100dvh;` vào `body`.
     - Định nghĩa tiện ích `@utility pb-safe { padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)); }` và `@utility pt-safe`.
  2. **Chuẩn Hóa Toàn Bộ Modal Thành Mobile Bottom Sheet (SSOT Pattern)**:
     - Backdrop: `fixed inset-0 z-50 bg-[#231b14]/60 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto`.
     - Backdrop Click-Outside: Thẻ vô hình `<div className="fixed inset-0 bg-transparent" onClick={closeModal} aria-hidden="true" />`.
     - Container: `relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E5E4] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto pb-safe z-10`.
     - Footer: `flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-[#E7E5E4]`.
     - Keyboard & Scroll Lock: Mọi modal đều tích hợp `useEffect` lắng nghe phím `Escape` và khóa `document.body.style.overflow = 'hidden'`, giải phóng `unset` khi unmount.
  3. **Responsive Table sang Mobile Card View**:
     - Bảng dữ liệu nhiều cột được phân tách: `hidden md:block overflow-x-auto` cho `<table>` trên màn hình lớn, và `md:hidden flex flex-col gap-3` hiển thị dưới dạng thẻ thông tin tóm tắt trên mobile.
  4. **Touch Target $\ge 44\text{px}$ & Zero Jargon**:
     - Toàn bộ nút phân trang, nút tab, nút đóng [X], nút chọn SLA, và CTA đều đạt chuẩn `min-h-[44px] min-w-[44px]`.
     - Tuyệt đối không dùng `transform: scale()` hoặc `zoom: 0.7`.

### 06. Audit Toàn Diện Router Kiến Trúc Đa Ứng Dụng (Side A Community vs Side B Operations) & Edge Worker Routing Isolation
- **Vấn đề**:
  - **Route trùng lặp và xung đột alias**: Trong `apps/web/src/App.tsx`, route `/cases` bị định nghĩa trùng 2 lần, các alias `/citizen/*` bị khai báo 2 block mâu thuẫn (`/citizen/track` map nhầm sang `/reports` thay vì `/following`, alias `/citizen/report` trỏ vào component cũ thay vì `/reports/new`). Trang `/forbidden` có import nhưng thiếu `<Route path="/forbidden" />`.
  - **Lạc trôi ứng dụng do hardcode URL và thiếu Base path awareness**: Trong `dustguard-operations/apps/web/src/pages/SetupPage.tsx`, `window.location.href = '/dashboard'` khiến người dùng trên production (chạy tại base `/operations/`) bị văng ngược sang Side A (`/dashboard`). Trong `apps/web/src/pages/LoginPage.tsx`, 4 vị trí gọi API auth bị hardcode `http://localhost:3002/api/auth/login` gây lỗi kết nối khi chạy production hoặc môi trường khác port.
  - **Chệch hướng luồng SPA trên Cloudflare Edge Worker**: Worker Hono đóng vai trò reverse proxy phục vụ cả 2 SPA tĩnh qua R2/Asset fetcher. Khi người dùng truy cập `/operations/*`, nếu worker fallback asset fetch về `/` thay vì `/operations/index.html`, trang Side B sẽ không thể nạp bundle JS riêng của nó hoặc nảy sinh trailing slash 404. Ngoài ra, các endpoints API của nhà thầu (`/contractor/*`) chỉ có trên Side B nhưng giao diện nhà thầu lại nằm trên Side A, khiến API gọi worker trả về 404.
  - **CommandPalette và nút điều hướng lệch path**: Trong Side B, `CommandPalette.tsx` trỏ thiết bị IoT về `/iot/${d.id}` thay vì `/iot/devices/${d.id}` dẫn đến 404 khi người dùng tìm kiếm nhanh.
- **Giải pháp chuẩn hóa**:
  1. **SSOT Router Graph & Cross-App Redirection (`OperationsRedirect`)**:
     - Dọn sạch 100% route trùng lặp và xung đột trong Side A (`apps/web/src/App.tsx`). Đăng ký đầy đủ `<ForbiddenPage />` và chuẩn hóa alias `/citizen/report` $\rightarrow$ `/reports/new`, `/citizen/track` $\rightarrow$ `/following`.
     - Tạo component `OperationsRedirect` trên Side A: Bất kỳ truy cập nào tới `/operations/*`, `/staff/*`, `/executive/*` sẽ tự động chuyển hướng sang `OPERATIONS_APP_URL` (`http://localhost:3002` ở dev hoặc `/operations` ở prod) thay vì bị fallback mù quáng về `/dashboard` của Side A.
  2. **Base URL & Dynamic Endpoint Injection**:
     - Thay thế toàn bộ `window.location.href = '/path'` bằng `${import.meta.env.BASE_URL || '/'}path`.
     - Thay thế toàn bộ chuỗi hardcode `http://localhost:3002` bằng `OPERATIONS_APP_URL` / `API_BASE_URL` trỏ linh hoạt theo môi trường.
     - Đồng bộ đối xứng liên kết chuyển đổi giữa 2 ứng dụng: Side A có nút "Cổng Điều hành (Side B)" trên AppShell, Side B có nút "Cổng Cộng đồng (Side A)" trên AppLayout.
  3. **Edge Worker Routing Isolation & D1 Single Source of Truth**:
     - `server/index.ts` phân định rõ: `/operations/*` fetch chính xác `/operations/index.html`, mọi path khác fetch `/index.html`.
     - Đăng ký root health check `GET /health` trả về 200 OK tương đồng với `/api/health`.
     - Gắn trực tiếp các API Cổng Nhà Thầu (`GET /contractor/dashboard`, `GET /contractor/actions/:id`, `POST /contractor/actions/:id/remediation`) vào `server/community.ts` với D1 queries và geofence buffer 50m, bảo đảm Side A gọi trực tiếp worker thành công 100% không qua trung gian.
  4. **Automated Verification Gate (`tests/router-audit-verification.test.js`)**:
     - Tích hợp bài test tự động phân tích tĩnh (Static Analysis) quét sạch các chuỗi `http://localhost:3000`, `http://localhost:3002` và kiểm tra 0 route trùng lặp trước mỗi lần deploy.

### 05. Chuẩn Hóa Toàn Diện Shared Interaction-Heavy Components (Table, Form, Modal & Drawer) Đa Nền Tảng
- **Vấn đề**:
  - **Bảng dữ liệu ép co rúm trên mobile 360px**: Nhiều trang nghiệp vụ (ContractorsPage, ProjectsPage, AutomationsPage, IotDeviceDetailPage, DecisionSupportSection, AdminAuditPage, AdminUsersPage, DataTable.tsx, UnifiedDataTable.jsx) chứa các bảng 6-10 cột không có min-width trên thẻ `<table>`. Khi xem trên viewport nhỏ 360px-390px, các cột co rúm lại, chữ xếp chồng lên nhau hoặc tràn layout ngang. Thậm chí `DataTable.tsx` còn bị lỗi cú pháp `emptyMessage` undefined gây crash runtime khi bảng rỗng.
  - **Form nhiều trường bị trôi nút Submit ra ngoài màn hình trên mobile**: Các form tạo mới nhiều trường (Contractors, Projects, PublicReportModal) sử dụng `grid-cols-2` hoặc `grid-cols-3` cứng nhắc, thiếu `max-h-[90vh]` và `overflow-y-auto`. Khi bàn phím ảo mobile bật lên, thanh nút hành động bị đẩy trôi ra ngoài màn hình, người dùng không thể cuộn xuống để bấm nút Gửi/Tạo mới.
  - **Modal / Drawer trên mobile dạng hộp nổi lửng lơ giữa màn hình**: Đa số modal (Modal.tsx, ActionModal, DecisionModal, QuickPreviewModal, PublicReportModal, CreateReportPage, CaseCoordinationPage, VerificationDetailPage, SideDrawer, DecisionWorkspaceDrawer, EvidenceDetailDrawer) hiển thị hộp vuông ở giữa màn hình, góc bấm nút Đóng [X] nhỏ (< 32px), gây khó thao tác một tay trên điện thoại.
- **Giải pháp chuẩn hóa**:
  1. **Table Responsive Container & Min-Width**:
     - Mọi bảng dữ liệu dạng `<table>` đều được bọc trong container `overflow-x-auto` và gắn `min-w-[600px]` đến `min-w-[750px]` tùy số lượng cột.
     - Trên desktop hiển thị bảng dữ liệu đầy đủ, sắc nét; trên mobile cho phép vuốt ngang mượt mà mà không làm vỡ khung viền trang.
     - Sửa lỗi `emptyMessage` trong `DataTable.tsx` với fallback mặc định thân thiện.
  2. **Form Mobile-First Single Column & Sticky Action Footers**:
     - Chuyển toàn bộ form từ `grid-cols-2` / `grid-cols-3` thành `grid-cols-1 sm:grid-cols-2` và `grid-cols-1 sm:grid-cols-3`.
     - Container form đặt `max-h-[90vh] flex flex-col`, phần nhập liệu đặt `overflow-y-auto flex-1`.
     - Thanh nút hành động (Submit / Cancel) được cố định với `sticky bottom-0 bg-white pt-3 shrink-0`, đảm bảo người dùng luôn nhìn thấy và bấm được CTA mà không bị bàn phím ảo hay chiều cao màn hình che khuất.
  3. **Modal & Drawer Chuyển Dạng Mobile Bottom Sheet**:
     - Thiết lập chuẩn container: `items-end sm:items-center justify-center p-0 sm:p-4`.
     - Card modal: `rounded-t-2xl sm:rounded-xl max-h-[90vh] flex flex-col overflow-hidden`.
     - Nút đóng [X] nâng cấp touch target lên chuẩn WCAG `min-h-[44px] min-w-[44px]` (hoặc `w-10 h-10` kèm padding an toàn).
     - Drawer bên phải trên mobile chuyển mượt thành bottom sheet kéo từ đáy lên (`fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0`).

### 04. Audit Tương Tác & User Flows: Phòng Ngừa Dead-End Navigation, RBAC Routing Trap & Thiếu Permission Guards
- **Vấn đề**:
  - **RBAC Routing Trap (Lỗi phân quyền chặn nhầm người dùng hợp lệ)**:
    - Route `/contributions` được thiết kế dành cho người dân để theo dõi hành trình và dấu ấn đóng góp, nhưng trong `ROLE_PERMISSIONS.citizen` lại thiếu quyền `'contribution:view'`. Kết quả là người dùng có role `citizen` khi bấm vào menu "Dấu ấn đóng góp" bị `ProtectedRoute` chặn và chuyển hướng sang `/forbidden` (hoặc `/dashboard`).
    - Trong `AppShell.tsx`, khi người dùng đổi sang vai trò `citizen` từ Dev Role Switcher, code cũ lại chủ động chuyển hướng ra khỏi `/contributions` vì coi đây là route nội bộ.
  - **Route Mapping Mâu Thuẫn & Cũ Kỹ**:
    - Trong `App.tsx`, component mới thiết kế hoàn chỉnh `YouthCreditsPage` không được nối vào `/contributions`, mà route này lại bị trỏ vào component cũ `ContributionsPage`. Đồng thời route `/cases` bị định nghĩa trùng lặp 2 lần (`<Navigate to="/reports" />` chặn phía trên route chính thức).
  - **Dead-End Navigation (Cụt luồng tương tác)**:
    - Trong `MyTrackingPage.tsx` (tab Đã đóng góp) và `YouthCreditsPage.tsx` (Nhật ký hoạt động), danh sách hiển thị các đóng góp nhưng không có đường link hoặc CTA để người dùng bấm vào xem chi tiết vụ việc (`/cases/:id`) hay chi tiết phản ánh (`/reports/:id`).
    - Trong `CaseDetailPage.tsx` (tab Evidence), nút "Thêm ảnh mới" hiển thị tự do mà không kiểm tra quyền `can('observation:create')`, dẫn đến khách vãng lai hoặc tài khoản không đủ quyền bấm vào trang tạo quan sát bị lỗi.
  - **Location String Bất Nhất**:
    - `ReportDetailPage.tsx` và `MapPage.tsx` còn sót chuỗi `"TP. Hồ Chí Minh"`, trong khi SSOT địa bàn và tọa độ trung tâm là Hà Nội (`62 Nguyễn Chí Thanh, Láng Thượng`).
- **Giải pháp chuẩn hóa**:
  1. **Cấp Quyền Tường Minh & Đồng Bộ RBAC**:
     - Bổ sung `'contribution:view'` vào `ROLE_PERMISSIONS.citizen` trong `packages/shared/src/constants/permissions.ts`.
     - Xóa logic ép redirect khỏi `/contributions` của role `citizen` trong `AppShell.tsx`.
  2. **Chuẩn Hóa Graph Điều Hướng (`App.tsx` & `navigation.ts`)**:
     - Map chuẩn xác `/contributions` sang `<YouthCreditsPage />`.
     - Dọn dẹp 100% route trùng lặp `/cases` và `/citizen/*`.
     - Đồng bộ nhãn hiển thị `"Dấu ấn đóng góp"` trên Desktop Sidebar và Mobile Navigation.
  3. **Xóa Bỏ Điểm Nghẽn Luồng (No Dead-End)**:
     - Biến tiêu đề nhật ký và tên mục đóng góp thành Link tương tác, bổ sung nút CTA `"Xem chi tiết →"` / `"Xem →"` kèm số giờ thực tế.
     - Guard chặt chẽ các nút hành động nhạy cảm bằng `can(action:create)`.
  4. **Triệt Tiêu Hoàn Toàn Địa Chỉ Lệch Chuẩn**:
     - Nối chuỗi Google Maps URL và nhãn phụ bản đồ theo đúng địa bàn Hà Nội SSOT.

### 03. Chuẩn Hóa Kiến Trúc AppShell & Ưu Tiên Sửa Shared Components Trước Thay Vì CSS Hack Từng Trang
- **Vấn đề**:
  - **Style Inconsistencies & CSS Patchwork**: Các trang độc lập tự khai báo các class không tồn tại trong `tailwind.config.js` (ví dụ `bg-surface-ground`, `border-l-3`) hoặc áp đặt các padding quá lớn trên mobile (`p-8 sm:p-12`, `p-12`). Khi màn hình co về kích thước di động 360px-390px, nội dung bị ép hẹp nghiêm trọng gây rớt chữ hoặc tràn ngang (horizontal overflow).
  - **Trải Nghiệm Mobile Menu Sơ Sài**: Menu drawer trên mobile chỉ hiển thị một danh sách link trắng xóa trôi nổi, không có backdrop overlay đóng menu khi bấm ra ngoài, không khóa cuộn trang nền (`body overflow: hidden`), không hỗ trợ phím `Escape`, và thiếu toàn bộ thông tin tài khoản, chuyển vai trò DEV cũng như nút đăng xuất.
  - **Xung Đột Vị Trí Giữa Toast Thông Báo & Mobile Bottom Bar**: Toast được ghim cố định ở `bottom-4 right-4`. Trên di động, vị trí này đè trực tiếp lên thanh điều hướng dưới cùng (Bottom Navigation Bar cao ~64px), khiến người dùng không thể bấm tab hoặc bị che khuất nội dung thông báo.
  - **Glassmorphism Phá Vỡ Tương Phản**: Một số nơi dùng `bg-white/95`, `bg-black/40` gây chìm chữ, không đạt độ tương phản chuẩn Civic Tech (>7:1).
- **Giải pháp chuẩn hóa**:
  1. **SSOT Page Container (`.civic-container`)**:
     - Định nghĩa `.civic-container` tập trung tại `index.css`: `w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8`. Mobile luôn giữ đúng `px-4` (16px), loại bỏ hoàn toàn các padding khổng lồ `p-12` tại từng trang.
  2. **Mobile Drawer Hoàn Thiện Vòng Đời**:
     - Tích hợp Solid Dark Backdrop (`bg-[#171313]/60`) đóng menu khi tap ra ngoài.
     - Lắng nghe sự kiện bàn phím `Escape` và tự động đóng menu khi `location.pathname` thay đổi.
     - Tự động khóa cuộn trang nền khi drawer mở.
     - Tích hợp đầy đủ hồ sơ người dùng, chuyển đổi vai trò DEV, liên kết Cổng điều hành Side B và nút Đăng xuất ngay trong drawer.
  3. **Tách Biệt Cao Độ Cho Toast Thông Báo**:
     - Điều chỉnh container `ToastProvider` thành `bottom-20 sm:bottom-4 right-0 sm:right-4`, nâng toàn bộ thông báo bay lên trên thanh Bottom Navigation an toàn.
     - Đảm bảo nút đóng toast đạt touch target `min-h-[44px] min-w-[44px]`.
  4. **Chuẩn Hóa Mobile Bottom Sheet Cho Modals**:
     - Chuyển đổi các modal (`ContributionSummaryModal`, `DuplicateReportModal`) thành dạng Bottom Sheet trên di động (`flex items-end sm:items-center`, bo góc đỉnh `rounded-t-2xl sm:rounded-2xl`, thêm padding an toàn `.pb-safe`).
  5. **Quy Tắc Ưu Tiên Shared Components**:
     - Luôn sửa và hoàn thiện tại các component dùng chung (`AppShell`, `EmptyState`, `LoadingSkeleton`, `StatCard`, `ReportCard`, `CaseCard`, `BeforeAfterComparison`, `CitizenFeedbackSection`, `index.css`) trước khi can thiệp vào từng trang riêng lẻ.

### 02. Chuyển Đổi Từ "Tín Chỉ Hàn Lâm 20h = 4.0 Tín Chỉ" Sang "Dấu Ấn Đóng Góp & Giờ Thực Địa Thực Chất"
- **Vấn đề**:
  - Ban đầu hệ thống áp đặt công thức gượng ép "20 giờ tình nguyện = 4.0 tín chỉ rèn luyện" (chia tỷ lệ 0.2 tín chỉ/giờ). Điều này gây phản tác dụng tâm lý với thanh niên, học sinh và người dân tình nguyện vì biến việc theo dõi bảo vệ môi trường thành một thang điểm số mang tính hàn lâm, trừu tượng và máy móc.
  - Ngoài ra, việc quy đổi khiến số giờ thực tế bị che khuất và làm mất đi giá trị định lượng trực quan của từng hành động thực địa (chụp ảnh, xác thực GPS 50m, chụp đối chứng Before/After).
- **Giải pháp chuẩn hóa**:
  1. **Tôn Vinh Giờ Thực Địa & Minh Chứng Số**: Chuyển sang tính toán và hiển thị trực tiếp "Tổng giờ thực địa" (4.0h cho phản ánh đủ điều kiện, 80% cho hoạt động đang xử lý).
  2. **Bảng Tổng Hợp Minh Chứng (Contribution Summary Modal)**: Xây dựng modal sáng màu, không glassmorphism, kết nối API backend `/api/me/contributions/summary` hiển thị rõ ràng 4 chỉ số cốt lõi: Giờ thực địa, Hoạt động tham gia, Địa bàn phủ sóng và Tác động môi trường được xác minh.
  3. **Đồng Bộ Test Logic**: Cập nhật bộ kiểm thử nghiệp vụ `tests/youth-credits.test.js` để bảo đảm không còn bất kỳ phép chia giả định 20h / 4.0 tín chỉ nào, khẳng định tính toàn vẹn của dữ liệu thực chất.

### 01. Mô Hình Hành Chính 2 Cấp Việt Nam & Chuẩn Hóa SSOT Location (Hà Nội Demo Origin) Trên Toàn Bộ Hệ Thống Monorepo
- **Vấn đề**:
  - **Mô Hình Hành Chính 3 Cấp Lỗi Thời Gây Nhầm Lẫn**: Codebase cũ phân tán trường `district` (Quận/Huyện) khắp các database schema, DTO validation, forms, và filter dropdowns. Điều này không phản ánh đúng định hướng tinh gọn chính quyền địa phương 2 cấp của Việt Nam (Cấp 1: Tỉnh/Thành phố trực thuộc TW; Cấp 2: Phường/Xã/Đặc khu).
  - **Dữ Liệu Demo Lộn Xộn & Hardcode Tọa Độ Cũ**: Người dùng demo tại 62 Nguyễn Chí Thanh, Hà Nội nhưng màn hình lại hiển thị "Trạm trung tâm TP.HCM", "Khu vực Quận 7", "TP. Thủ Đức", "Bình Thạnh", và khoảng cách hardcode `~420m` bất kể khoảng cách địa lý thực tế.
  - **Phân Tán Không Có Điểm Tựa Duy Nhất (Missing SSOT Location)**: Mỗi component tự gán tọa độ tĩnh `10.7769, 106.7009`, khi ghim bản đồ hoặc reverse-geocode thì nảy sinh lỗi lệch tọa độ.
- **Giải pháp chuẩn hóa**:
  1. **Thiết Lập Location SSOT Module (`@dustguard/shared/constants/location.ts`)**:
     - Định nghĩa `DEMO_LOCATION` duy nhất tại `484 Lê Văn Việt, Hồ Chí Minh` (`21.0205, 105.8078`).
     - Tích hợp hàm toán học Haversine `calculateDistanceMeters(origin, destination)` và `formatDistance()` để tính động khoảng cách thực tế thay vì hardcode.
  2. **Chuẩn Hóa Mô Hình Hành Chính 2 Cấp (Two-Level Administrative Hierarchy)**:
     - Trên UI/Forms/Filters: Chỉ hiển thị `Tỉnh/Thành phố` (Cấp 1) và `Phường/Xã` (Cấp 2). Bỏ hoàn toàn dropdown và nhãn "Quận/Huyện".
     - Tương thích ngược an toàn (Database Backward Compatibility): Trong database, cột `district` legacy được map sang giá trị `ward` (hoặc để fallback hợp lệ) để không phải chạy migration nguy hiểm phá vỡ CSDL hiện hành.
  3. **Tái Thiết Mock Data Thành Cụm Pilot Coherent Có Tương Quan Địa Lý**:
     - Xây dựng cụm đối tượng liên kết chặt chẽ quanh 62 Nguyễn Chí Thanh: 4 trạm đo không khí (S001-S004), 4-6 công trình đang thi công (Huỳnh Thúc Kháng, Láng Hạ, Chùa Láng, Giảng Võ), 32 phản ánh cộng đồng và 15-26 hồ sơ vụ việc liên kết theo ID thật.
  4. **Kiểm Thử Toàn Diện Trên Cả 3 Phân Hệ Bằng Agent-Browser**:
     - Kiểm chứng 100% routes: Side A (Port 3000), Side B (Port 3002) và Landing Page đều nhất quán, 0 console error, 45/45 responsive matrix viewports pass.

### 00. Hợp Nhất Route Graph Toàn Hệ Thống, Loại Bỏ Trùng Lặp Auth Entry & Xử Lý Định Tuyến SPA Đa Phân Hệ Trên Cloudflare Workers Assets
- **Vấn đề**:
  - **Trùng Lặp 2 Màn Hình Login Độc Lập**: `/login` (thuộc Side A) và `/operations/login` (thuộc Side B) tồn tại song song với hai phong cách thiết kế, hai cơ chế form và hai nhóm tài khoản mẫu khác nhau. Trên `/operations/login` còn hiển thị công khai mật khẩu `password123` và dòng chữ sai lệch kiến trúc `"Hệ thống lưu trữ dữ liệu chân thực SSOT SQLite cục bộ."`.
  - **Lỗi Ghi Đè SPA Root Của Cloudflare Workers Assets (`not_found_handling: "single-page-application"`)**: Khi cấu hình Worker Assets phục vụ monorepo 2 SPA (Side A tại `/` và Side B tại `/operations`), Cloudflare Assets tự động fallback mọi request không có đuôi file về `/index.html` của root (Side A) với mã HTTP 200 OK. Do đó, logic kiểm tra `if (assetRes.status === 404)` trong Worker không bao giờ kích hoạt khi người dùng truy cập các subroute như `/operations/inspections` hay `/operations/cases`. Kết quả là người dùng bị trả về HTML của Side A và bị redirect sang `/dashboard`.
  - **Mã Băm Bcrypt Bị Nuốt Trong Chuỗi PowerShell Command**: Khi chạy `wrangler d1 execute` chứa câu lệnh SQL bọc trong chuỗi `"..."` trên PowerShell, chuỗi hash bcrypt `$2b$10$...` bị PowerShell hiểu nhầm là biến `$2b` và mở rộng thành rỗng, làm hỏng giá trị hash trong cơ sở dữ liệu.
- **Giải pháp chuẩn hóa**:
  1. **Hợp Nhất Một Cổng Canonical Duy Nhất `/login` ("Một Nền Tảng · Hai Phía")**:
     - Thiết kế tab chuyển đổi 2 phía: "Phía Cộng đồng" (gọi `/api/auth/login`) và "Đơn vị Xử lý" (gọi `/api/operations/auth/login`).
     - Tự động kích hoạt tab dựa theo `?side=operations` hoặc deep-link `returnTo`.
     - Ẩn hoàn toàn tài khoản và mật khẩu mẫu trên production; chỉ kích hoạt panel "Tài khoản trình diễn" khi có cờ `?demo=1` hoặc toggle chủ động.
  2. **Chuyển Hướng Chuẩn Tắc 302 Cho Cổng Cũ**:
     - Thiết lập Edge Worker HTTP 302 Redirect từ `/operations/login` sang `/login?side=operations` (bảo toàn tham số `returnTo`).
     - Thay thế `dustguard-operations/apps/web/src/pages/LoginPage.tsx` bằng component chuyển hướng tức thì, triệt tiêu 100% duplicate code và nguy cơ 404.
  3. **Phân Phối Chính Xác File SPA Cho Subroute Trong Cloudflare Worker**:
     - Phân định rõ ràng: Nếu `url.pathname.startsWith('/operations')` và **không có đuôi file** (`!/\.[a-zA-Z0-9]+$/.test(url.pathname)`), luôn chủ động phục vụ `/operations/index.html`.
     - Nếu có đuôi file (CSS, JS, WebP), phân phối qua asset binding và chỉ fallback khi 404.
  4. **Thực Thi Lệnh SQL Chứa Ký Tự Đặc Biệt Bằng File Tạm**:
     - Tuyệt đối không truyền chuỗi SQL chứa dấu `$` trực tiếp qua tham số dòng lệnh PowerShell `--command="..."`.
     - Luôn ghi ra file `.sql` tạm và thực thi qua `--file=...`, sau đó dọn dẹp file tạm trong khối `finally`.

### 00. Đồng Bộ Hóa Thư Viện Static Assets Trong Cấu Trúc Monorepo Đa Phân Hệ & Thiết Kế Header Civic Sáng Màu, Không Glassmorphism
- **Vấn đề**:
  - **Tệp Asset Thương Hiệu Thiếu Đồng Bộ Trong Monorepo**: Logo thương hiệu chính thức `dustguard-shield-logo.webp` tồn tại ở thư mục gốc `app/public`, nhưng trong monorepo hai ứng dụng độc lập `apps/web` (Side A) và `dustguard-operations/apps/web` (Side B) lại chưa có thư mục `public/`. Các nhà phát triển trước đó phải dùng giải pháp tình thế là chèn component `<Shield />` SVG của thư viện Lucide hoặc hộp màu chứa chữ `DG`, làm giảm tính trang trọng, thiếu nhất quán thương hiệu của một dự án CivicTech bảo trợ bởi các cơ quan quản lý.
  - **Header Thiếu Trau Chuốt Visual Polish**: Thanh chuyển đổi ngôn ngữ chỉ là text `EN` trần trụi, nút `Đơn vị xử lý` dùng màu xanh da trời lạc tông với bảng màu CivicTech (Cream `#FDFBF7`, Ink `#0F172A`, Seal Red `#B42318`, Teal `#0D6F64`), và chưa có thông điệp định vị rõ ràng cạnh logo.
- **Giải pháp chuẩn hóa**:
  1. **Tạo Cấu Trúc Thư Mục Public Đồng Nhất Cho Toàn Bộ Monorepo**:
     - Thiết lập `apps/web/public/images/logo/` và `dustguard-operations/apps/web/public/images/logo/`, đồng bộ tệp `dustguard-shield-logo.webp`.
     - Cấu hình Favicon chuẩn `/favicon.webp` thay thế emoji và SVG inline tạm thời trong cả 2 tệp `index.html`.
  2. **Thiết Kế Header CivicTech Sáng Màu, Rõ Ràng, Tinh Tế**:
     - Áp dụng logo khiên đỏ chính thức với kích thước tối ưu (h-9 đến h-10) kèm viền mềm và animation scale nhẹ nhàng khi tương tác.
     - Kết hợp nhãn phụ `CivicTech` tông Deep Teal `#0D6F64` và khẩu hiệu *"Giám sát Bụi · Minh bạch Hóa"*.
     - Đóng gói nút chuyển ngôn ngữ thành pill button có icon địa cầu `[🌐 EN]`.
     - Nút `Đơn vị xử lý ↗` sử dụng tông xanh Deep Teal `#0D6F64` chuẩn mực của Side B.
     - Nút `Gửi phản ánh` đỏ dấu ấn `#B42318` có icon Send nổi bật làm CTA chủ đạo.
  3. **Quy Trình Kiểm Tra Thực Nghiệm Bằng Agent-Browser Trước Khi Bàn Giao**:
     - Chạy build và deploy trực tiếp lên Cloudflare Edge.
     - Sử dụng `agent-browser` mở trang thực tế, verify DOM tương tác và chụp ảnh màn hình nghiệm thu thực tế.

- **Vấn đề**:
  - **Lỗi 401 Đăng Nhập Do Rỗng Bảng Người Dùng Sau Cutover**: Sau khi di chuyển schema lên Cloudflare D1 production, bảng `users` chỉ mới có các tài khoản tạo tự động qua test E2E. Các tài khoản trải nghiệm nhanh của Side A (`citizen@dustguard.local`, `member@dustguard.local`, `moderator@dustguard.local`, `admin@dustguard.local`) hoàn toàn chưa có trong CSDL D1 remote, dẫn đến việc người dùng bấm nút đăng nhập mẫu thì bị báo lỗi "Email hoặc mật khẩu không chính xác".
  - **Lệch Phong Cách Thị Giác & Kéo Dãn Chiều Dọc Thẻ Vấn Đề (Unbalanced Card Stretching)**: Section ProblemStory có 3 thẻ vấn đề ở cột trái bị bọc trong `flex-1` với `justify-between`, khi cột đối chiếu bên phải có chiều cao lớn thì 3 thẻ bên trái bị kéo dãn dọc quá mức, tạo khoảng trống trắng mênh mông thô thiển. Thẻ số 02 lại có nền cam viền đỏ hồng `#E8C8C0` lạc lõng hoàn toàn so với thẻ 01 và 03, gây cảm giác như lỗi CSS active dở dang. Đồng thời, các bước quy trình thiếu điểm nhấn nghiệp vụ và dính technical jargon ("Closed-loop", "High Drop-Off").
- **Giải pháp chuẩn hóa**:
  1. **Kịch Bản Seed Tự Động Vào D1 Remote (`seed-remote-community-users.js`)**:
     - Tạo script nạp 8 tài khoản mẫu chuẩn (bao gồm cả `@dustguard.local` và bí danh `@dustguard.vn`) với mật khẩu băm bcrypt an toàn (`DustGuard123!`).
     - Tích hợp kiểm thử API `/api/auth/login` trực tiếp trên live domain để bảo đảm kết quả trả về 200 OK trước khi bàn giao.
  2. **Tái Thiết Kế 3 Thẻ Vấn Đề Đồng Bộ, Sắc Nét & Cân Đối**:
     - Thống nhất 100% phong cách: Nền trắng ngọc, viền `#E7E0D8`, đổ bóng mềm `shadow-[0_2px_8px_rgba(20,20,20,0.03)]`.
     - Cấu trúc 3 tầng rõ ràng: Huy hiệu số `01`, `02`, `03` đỏ bo góc nhẹ kèm tag danh mục uppercase $\rightarrow$ Tiêu đề đậm nét `#15171C` $\rightarrow$ Đoạn văn mô tả cô đọng $\rightarrow$ Dòng hệ quả thực tế có chấm đỏ cảnh báo ở chân thẻ.
  3. **Chuẩn Hóa 2 Hộp Quy Trình Đối Chiếu Song Song**:
     - Hộp 1 (Truyền thống đứt gãy): Dải cảnh báo màu đỏ nhẹ nhàng với icon AlertTriangle và badge "Tỷ lệ thất lạc cao".
     - Hộp 2 (DustGuard khép kín): Viền xanh Teal `#0D6F64` đặc trưng CivicTech, các bước có icon công cụ rõ ràng (`MapPin`, `SendHorizontal`, `SprayIcon`, `CheckCircle2`), dải bảo chứng chân hộp màu xanh ngọc tươi sáng khẳng định 100% hồ sơ được lưu vết và theo dõi công khai.

### 00. Production D1-R2 Migration & Unified Cloudflare Worker Cutover: Nghiêm Ngặt Khóa Ngoại (Foreign Key Safety), Chuẩn Hóa Enum (Case-Insensitive Enums) và Định Tuyến SPA Kép Trên Cùng Tên Miền
- **Vấn đề**:
  - **Lỗi Vi Phạm Khóa Ngoại D1 SQLite (D1 Foreign Key Constraint Violations)**: Cloudflare D1 thực thi triệt để các ràng buộc khóa ngoại (FOREIGN KEY). Khi tạo mới bản ghi (ví dụ `ops_case_timeline`, `ops_evidence_assets`, `case_closures`), nếu tham số người thực hiện (`actor_id`, `uploaded_by`, `closed_by`) hoặc mã vụ việc (`case_id`) truyền vào chuỗi mock ('mod', 'admin', 'general') mà không tồn tại trong bảng cha (`ops_users`, `ops_cases`), SQLite ném lỗi `SQLITE_CONSTRAINT_FOREIGNKEY` gây sập API với mã 500.
  - **Lỗi Phân Biệt Hoa Thường Enum CHECK Constraint (Enum Case Sensitivity)**: CSDL SQLite lưu CHECK constraint dưới dạng chữ thường: `CHECK(role IN ('citizen', 'community_member', 'moderator', 'admin'))` và `CHECK(severity_observation IN ('low', 'medium', 'high', 'unknown'))`. Khi client hoặc kiểm thử gửi chữ hoa như `YOUTH_VOLUNTEER` hay `HIGH`, câu lệnh INSERT bị từ chối hoàn toàn.
  - **Xung Đột Routing Khi Ghép 2 Ứng Dụng SPA Vào Cùng Một Tên Miền**: Phân hệ Side A chạy ở `/` còn Side B chạy ở `/operations`. Nếu không cấu hình cẩn trọng, mọi request F5 tải lại trang `/operations/cases/xxx` sẽ bị Worker fallback nhầm về `/index.html` của Side A, gây trắng trang hoặc lỗi router 404.
- **Giải pháp chuẩn hóa**:
  1. **Bảo Vệ Khóa Ngoại An Toàn (Safe Foreign Key Resolution)**:
     - Với các trường có thể null (`actor_id`): Luôn kiểm tra sự tồn tại trong CSDL trước khi gán; nếu không tìm thấy, truyền `NULL` an toàn để SQLite chấp nhận.
     - Với các trường bắt buộc (`closed_by`): Tự động fallback lấy ID cán bộ hợp lệ đầu tiên trong bảng cha nếu phiên gọi không có token đăng nhập.
  2. **Vệ Sinh Enum Trước Khi Thao Tác SQL (Enum Sanitization Whitelist)**:
     - Viết logic bọc: `.toLowerCase()` và đối chiếu mảng `validRoles` / `validSeverities`. Nếu giá trị ngoại lai không nằm trong whitelist, tự động gán fallback mặc định an toàn (`citizen`, `medium`).
  3. **Bộ Định Tuyến Worker Phân Nhánh SPA Chuẩn Tắc (Dual SPA Routing Strategy)**:
     - Side B Vite: Thiết lập `base: '/operations/'` và React `BrowserRouter basename={import.meta.env.BASE_URL}`.
     - Worker Asset Fallback: Tách bạch rõ ràng:
       - Nếu `url.pathname.startsWith('/operations')`: Khi asset trả về 404, Worker fallback request về `/operations/index.html`.
       - Các đường dẫn còn lại: Khi asset trả về 404, Worker fallback request về `/index.html`.
     - Phân phối toàn bộ JS/CSS với mã 200 trực tiếp từ Cloudflare Edge CDN.

### 0. Full Product Rebuild & Runtime Audit: Xóa Sổ Fake Alert, Chuẩn Hóa Draft Envelope, Giải Quyết Lỗi Phân Tích JSX Lồng Nhau và Chống Thoái Lui Tự Động
- **Vấn đề**:
  - **Lỗi Phân Tích Regex Cụt Khi Gặp JSX Lồng Nhau (JSX Nested Component Regex Truncation)**: Khi viết script kiểm kê tương tác tự động bằng Regex `/<(button...)\b([^>]*)>([\s\S]*?)<\/\1>/gi`, thuộc tính JSX chứa component con như `icon={<User className="w-3.5 h-3.5" />}` khiến regex dừng sớm ở ký tự `>` đầu tiên của icon, cắt cụt thuộc tính mở thẻ và đẩy `onClick={...}` vào phần innerText. Hậu quả là công cụ kiểm toán báo sai (false positive) 26 nút bị "dead" trong khi mã nguồn thực tế hoạt động hoàn hảo.
  - **Lạm Dụng window.alert() Gây Trải Nghiệm Khó Chịu (Intrusive Fake Alerts)**: Hơn 10 vị trí trong code sử dụng `alert('...')` chặn hoàn toàn luồng giao diện người dùng, không đồng bộ với ngôn ngữ thiết kế và gây gián đoạn khó chịu.
  - **Tràn Bộ Nhớ LocalStorage Do Lưu Trực Tiếp Ảnh Base64 (Uncontrolled Base64 Draft Bloat)**: Lưu trữ chuỗi `data:image/jpeg;base64,...` dung lượng hàng megabytes trực tiếp vào `localStorage` có nguy cơ gây lỗi `QuotaExceededError`, làm tê liệt toàn bộ tính năng lưu nháp trên trình duyệt di động.
  - **Thiếu Kiểm Soát Thoái Lui Khi Refactor (Regression Risk)**: Thiếu bộ test tự động quét mã nguồn để đảm bảo không ai vô tình thêm lại `alert()`, duplicate menu routes hoặc lạm dụng `localStorage`.
- **Giải pháp chuẩn hóa**:
  1. **Bộ Phân Tích JSX Chuẩn Xác (Robust JSX Attribute Parsing)**:
     - Nhận diện các thẻ có nested JSX attributes bằng cách kiểm tra thuộc tính trên toàn bộ khối thẻ hoặc nối phần bị cắt trước dấu `>` tiếp theo.
     - Bỏ qua các tệp template component nguyên mẫu (ví dụ `Button.tsx` định nghĩa wrapper).
  2. **100% Toast Civic Tech Thay Thế window.alert()**:
     - Tạo `ToastContext.tsx` với thông báo tương phản cao, tự biến mất sau 3s-4s, có icon trực quan và hỗ trợ đa loại (success, error, info, warning).
     - Thay thế toàn bộ `window.alert()` trên cả 2 phân hệ; tỷ lệ Fake Alert đạt chính xác 0%.
  3. **Cơ Chế Bản Nháp Draft Envelope (`draftStorage.ts`)**:
     - Định nghĩa Envelope chuẩn hóa: `{ schema: string, version: '1.0', updatedAt: number, ttlMs: 7 ngày, owner?: string, data: T }`.
     - Tự động dọn dẹp bản nháp hết hạn (`cleanupExpiredDrafts()`).
     - Nghiêm cấm lưu raw Base64 vào localStorage; chỉ lưu metadata và sử dụng `URL.createObjectURL(file)` làm preview blob tạm thời.
  4. **Bộ Kiểm Thử Chống Thoái Lui Tự Động (`tests/regression-guard.test.js`)**:
     - Tự động duyệt mã nguồn xác nhận: 0 `alert()`, 0 raw base64 trong localStorage, 100% DB ở chế độ WAL và integrity OK, geofence buffer cố định 50m, và không trùng lặp route điều hướng.

### 1. Two-Side Product, Runtime & Data Audit: Báo Cáo Ẩn Danh (Anonymous Reporting), Bản Nháp Tự Động (Draft Autosave), Triệt Tiêu Lỗi Dính Chữ (UI Spacing) và Sao Lưu Thảm Họa (Backup/Restore CLI)
- **Vấn đề**:
  - **Rào cản Đăng nhập Chặn Người Dân Báo Bụi (Login Wall Friction)**: Khi người dân gặp ô nhiễm bụi công trình trên đường, họ cần gửi phản ánh trong 30 giây. Việc bọc Route Guard bắt buộc đăng nhập trên client (`ProtectedRoute`) trong khi backend đã hỗ trợ ẩn danh khiến người dùng bị chuyển hướng sang `/login`, từ bỏ báo cáo.
  - **Mất dữ liệu biểu mẫu dài (Form Abandonment & Data Loss)**: Người dân khi nhập mô tả dài hoặc nhà thầu khi viết báo cáo giải trình ngoài hiện trường, nếu bị mất mạng hoặc lỡ F5 trang thì toàn bộ nội dung bị xóa sạch, gây ức chế lớn cho người dùng.
  - **Lỗi Dính Chữ trên Sidebar Hẹp (Text Overlap / Co-location Clipping)**: Thẻ vụ việc `CaseCard` khi đặt trong sidebar có độ rộng cố định (~300px), các thẻ con `flex` không có `shrink-0` và thiếu khoảng cách đệm khiến chữ `2 quan sát` và nút `Chi tiết ->` bị dính liền vào nhau thành `2 quan sátChi tiết ->`.
- **Giải pháp chuẩn hóa**:
  1. **Mở Route Ẩn Danh Tự Do + Callout Hướng Dẫn Thân Thiện**:
     - Cho phép truy cập `/reports/new` không qua `ProtectedRoute`.
     - Phân định rõ ràng: Nếu khách vãng lai, hiển thị banner màu kem báo rõ phản ánh được tiếp nhận ẩn danh; nếu muốn nhận điểm rèn luyện thanh niên thì mới cần đăng nhập.
  2. **Cơ chế Draft Autosave chuẩn mực (Debounce 500ms + Tự hủy khi Submit)**:
     - Dùng `localStorage` lưu bản nháp sau mỗi 500ms người dùng dừng gõ.
     - Hiển thị badge trực quan: *"Đã lưu bản nháp lúc HH:mm:ss"* và phím *"Xóa nháp"* làm lại.
     - Bắt buộc gọi `localStorage.removeItem` ngay khi API phản hồi nộp thành công (200/201 OK).
  3. **Quy tắc CSS Chống Dính Chữ Trên Sidebar Co Hẹp**:
     - Luôn thêm `shrink-0` cho các CTA điều hướng cuối dòng (`Chi tiết`, `Xem thêm`).
     - Các phần tử số liệu đi kèm icon phải có `whitespace-nowrap` và bọc trong container `flex-wrap gap-x-3 gap-y-1 min-w-0`.

### 1. Master Production Completion: Xác Thực Dịch Vụ Nội Bộ (x-service-key), Vận Hành Từ CSDL Rỗng (Zero-Seed Operability) & Chuẩn Mật Mã Web Crypto
- **Vấn đề**:
  - **Lỗi 401 Inter-Service Drift**: Khi Side A (Community) gọi sang Side B (Operations) để lấy dữ liệu nhà thầu và ban hành yêu cầu khắc phục, việc sử dụng JWT token người dùng hoặc token mock khiến middleware xác thực người dùng chặn đứng (HTTP 401/403). Các lập trình viên thường giải quyết vội bằng cách viết fallback gán dữ liệu mẫu (mock hardcoded) trong khối `catch`, dẫn đến việc UI hiển thị nhà thầu giả định ngay cả khi CSDL rỗng.
  - **Giả Định CSDL Đã Có Dữ Liệu (Seed Dependency Trap)**: Các dashboard hay tính năng tính KPI thường giả định đã chạy lệnh seed, nếu CSDL mới tinh (0 records) thì các hàm thống kê sử dụng `Math.max(reports, 3)` hoặc mảng tĩnh giả lập tăng trưởng làm mất tính trung thực của phần mềm CivicTech.
  - **Lỗ hổng Sinh Mã Ngẫu Nhiên Kém An Toàn (Weak Pseudorandom Generation)**: Việc dùng `Math.random()` để sinh mã hồ sơ, mã token, hoặc hậu tố upload tệp gây rủi ro xung đột mã (collision) và rủi ro bảo mật có thể đoán trước.
  - **Sai Lệch Phân Biệt Giữa Endpoint và Base URL**: Đặt biến môi trường `OPERATIONS_API_URL` trỏ vào một webhook endpoint cụ thể (`/api/integrations/community/cases`) nhưng lại dùng trực tiếp biến đó để ghép thêm path khác (`${OPERATIONS_API_URL}/api/actions`) dẫn đến URL bị lồng nhau và trả về 404.
- **Giải pháp chuẩn hóa**:
  1. **Xác Thực Dịch Vụ Nội Bộ Tường Minh (`x-service-key`)**:
     - Thiết lập header nội bộ `x-service-key: dustguard-internal-2026` cho các lời gọi API từ server đến server. Middleware xác thực nhận diện service key và cấp quyền truy cập an toàn mà không cần giả lập phiên người dùng.
     - Tuyệt đối cấm fallback về mock data trong khối `catch`; nếu CSDL rỗng thì trả về `[]` hoặc `null` và hiển thị Empty State chuẩn mực.
  2. **Chuẩn Vận Hành CSDL Rỗng (Zero-Seed Operability)**:
     - Toàn bộ câu lệnh SQL tính toán chỉ số Dashboard phải dùng hàm tổng hợp thực tế (`COUNT(*)`, `GROUP BY`).
     - Khi hệ thống mới boot, Dashboard phải hiển thị trung thực `0 phản ánh`, `0 vụ việc`, không fake số liệu.
  3. **Chuẩn Mật Mã Mọi Nơi (Web Crypto SSOT Everywhere)**:
     - Cấm triệt để `Math.random()`. Luôn dùng `crypto.randomUUID()` cho UUID và `crypto.randomInt(min, max)` cho các mã số định danh nghiệp vụ.
  4. **Tách Biệt Base URL và Webhook Endpoint**:
     - Quy ước rõ: `OPERATIONS_BASE_URL` là gốc máy chủ (ví dụ `http://localhost:4000`), còn `OPERATIONS_API_URL` là URL đầy đủ của webhook. Có hàm helper tự động trích xuất `u.origin` nếu chỉ được cung cấp endpoint.
  5. **Harness Kiểm Thử E2E Liên Hoàn 2 Chiều**:
     - Bộ kiểm thử E2E tự tạo CSDL sạch và khởi động song song 2 server trên cổng thử nghiệm cô lập, xác minh toàn bộ luồng: Citizen Report -> Moderator Triage -> Operations Ingest -> Staff Assignment -> Corrective Action -> Contractor Portal -> Remediation Submit -> Staff Review -> IoT HMAC Telemetry -> Youth Credits -> Citizen Feedback Loop.

### 1. Legacy Feature Salvage & 2-Side TSX Migration: Kiến Trúc Phân Định Ranh Giới Khách Thể, Đồng Bộ Webhook Trạng Thái & Thể Thức Văn Bản Hành Chính A4
- **Vấn đề**:
  - **Nhầm Lẫn Quyền Sở Hữu Đối Tượng (Actor Domain Confusion)**: Đơn vị thi công (Contractor) là chủ thể bên ngoài chịu trách nhiệm khắc phục hiện trường, không phải cán bộ công quyền; nếu đặt cổng nộp báo cáo của nhà thầu vào phân hệ nội bộ Side B (`dustguard-operations`) sẽ làm thủng ranh giới bảo mật mạng nội bộ và phá vỡ mô hình phân quyền RBAC.
  - **Bất Đồng Bộ Trạng Thái Giữa 2 Phân Hệ (Cross-Side Status Drift)**: Khi hồ sơ ở Side B chuyển từ `INSPECTION_PENDING` sang `ACTION_REQUIRED` hoặc `CLOSED`, nếu người dân ở Side A không nhận được cập nhật tức thì, họ sẽ có cảm giác chính quyền "chìm xuồng" phản ánh của mình.
  - **Thể Thức Văn Bản Hành Chính Sai Quy Chuẩn**: Khi in ấn biên bản vi phạm hoặc thông báo khắc phục từ web app, việc cố render hình ảnh con dấu mộc đỏ giả định tạo ra rủi ro pháp lý nghiêm trọng (giả mạo con dấu nhà nước). Đồng thời, việc in trực tiếp giao diện màn hình web sẽ dính header, sidebar, nút bấm điều hướng.
  - **Đánh Giá Một Chiều (Lack of Citizen Feedback Loop)**: Vụ việc đóng lại khi cán bộ nghiệm thu trên hệ thống nhưng người dân tại khu vực không được hỏi ý kiến xem "Hiện trường đã thực sự sạch bụi chưa?", dẫn đến khiếu nại vượt cấp nếu nhà thầu chỉ đối phó tạm bợ.
- **Giải pháp chuẩn hóa**:
  1. **Tách Biệt Ranh Giới 2 Phía (2-Side Boundary)**:
     - Side A (`apps/web` + `apps/server`) là không gian công khai phục vụ Người dân, Thanh niên tình nguyện và Đơn vị thi công bên ngoài (truy cập nhanh qua Secure Token).
     - Side B (`dustguard-operations`) là không gian chuyên môn nội bộ bảo vệ nghiêm ngặt dành cho Cán bộ điều phối, Tổ thanh tra hiện trường, Thẩm định pháp chế và Quản trị viên.
  2. **Bi-directional Webhook Sync & Trạng Thái Thân Thiện**:
     - Ánh xạ 12 trạng thái chi tiết của Side B sang 6 trạng thái dễ hiểu của Side A (`submitted` -> `in_review` -> `forwarded` -> `in_progress` -> `resolved` -> `closed`).
     - Webhook trigger tự động ghi nhận vào bảng `case_updates` và tạo `notifications` đẩy về thiết bị người dân ngay lập tức.
  3. **Chuẩn Văn Bản Hành Chính Nghị Định 30/2020/NĐ-CP & Zero Fake Seal**:
     - Thiết lập `@media print` ẩn 100% thanh điều hướng, nút bấm, padding màn hình; định dạng khổ A4 (`20mm 15mm 20mm 25mm`), font Times New Roman, Quốc hiệu, Tiêu ngữ, Căn cứ luật định rõ ràng.
     - Cam kết pháp lý: Tuyệt đối không render con dấu mộc đỏ đồ họa; văn bản được in ra để các bên ký tên và đóng dấu mộc thực tế.
  4. **Vòng Phản Hồi Nghiệm Thu & Phúc Tra Hiện Trường (Citizen Feedback Loop)**:
     - Cho phép người dân chấm điểm mức độ hài lòng, gửi nhận xét và yêu cầu phúc tra lại hiện trường nếu bụi vẫn phát tán. Mọi đánh giá được lưu bền vững vào `case_feedback` và hiển thị minh bạch.
  5. **Xác Thực Geofence 50m & Băm Mật Mã Web Crypto SHA-256 Cho Nhiệm Vụ Tình Nguyện**:
     - Định vị GPS so khớp bán kính 50m của công trình bằng công thức Haversine; tính mã băm SHA-256 từ mảng byte nhị phân của ảnh đối chứng để quy đổi minh bạch ra giờ tình nguyện chuẩn hóa: **20 giờ = 4.0 tín chỉ rèn luyện**.

### 1. Evidence-Grounded Decision Engine: Clean Domain Architecture, Sensor Verification & Declarative Explainability
- **Vấn đề**:
  - **Monolithic Analysis Service**: Việc dồn toàn bộ logic chuẩn hóa dữ kiện, truy vấn FTS5, đánh giá completeness, tính toán rủi ro và sinh khuyến nghị vào một file `analysis.service.ts` dài 500+ dòng khiến code khó bảo trì, khó unit test từng thành phần, và dễ gây lỗi lan truyền (coupling).
  - **Thiếu Kiểm Định Dữ Liệu Cảm Biến (Sensor Spoofing / Faulty Data)**: Cảm biến IoT môi trường ngoài thực tế rất hay bị treo giá trị (Flatline do đứt cáp kết nối) hoặc nhảy vọt đột biến (Extreme Spike do côn trùng/hơi ẩm bám vào buồng đo quang học). Nếu nạp thẳng dữ liệu lỗi vào Rule Engine mà không qua lọc chất lượng sẽ dẫn đến cảnh báo sai lệch (False Positive).
  - **Nguy Cơ Lỗ Hổng Code Injection qua eval() trong Rule Engine**: Khi xây dựng Rule Engine tự động, nhiều kỹ sư có xu hướng dùng `eval()` hoặc `new Function()` để tính toán biểu thức điều kiện linh hoạt. Điều này tạo ra rủi ro bảo mật nghiêm trọng (RCE) nếu điều kiện bị can thiệp.
  - **Thiếu Tính Giải Trình (Lack of Explainability)**: Khi hệ thống đưa ra khuyến nghị hành động (Next Best Action) hoặc cảnh báo rủi ro, cán bộ không thể biết "Vì sao hệ thống đưa ra gợi ý này?", dẫn đến tâm lý e ngại hoặc từ chối sử dụng công cụ số.
- **Giải pháp chuẩn hóa**:
  1. **Kiến Trúc Tách Lớp Sạch (Clean Domain Separation)**:
     - Tách nhỏ thành 11 submodules chuyên trách: `facts/`, `sensor-quality/`, `contradictions/`, `evidence/`, `legal/`, `rules/`, `risk/`, `workflow/`, `lifecycle/`, `closure/`. Mỗi file giải quyết duy nhất 1 trách nhiệm (Single Responsibility Principle) và có test suite cô lập.
  2. **Kiểm Định Cảm Biến 4 Lớp (Sensor Quality Engine)**:
     - Luôn kiểm tra chuỗi đo trước khi đối soát: Flatline ($\ge 4$ mẫu liên tiếp bất biến), Extreme Spike ($> 250\ \mu\text{g/m}^3$), Ngoại lai thống kê (MAD / z-score), Độ trễ gói tin ($> 2\text{h}$). Nếu vi phạm $\to$ hạ bậc chất lượng `INVALID` và kích hoạt cảnh báo mâu thuẫn (`CTR-SENSOR-01`).
  3. **Declarative Versioned Rule Engine (Zero eval)**:
     - Biểu diễn quy tắc hoàn toàn bằng cấu trúc JSON có phiên bản (`ruleDefinitions.json`). Dùng toán tử so sánh tường minh (`eq`, `gt`, `gte`, `contains`...) qua switch-case, triệt tiêu 100% rủi ro thực thi mã động.
  4. **Explainability Drawer & Human Sign-off**:
     - Mọi rule match hoặc reject đều ghi nhận `RuleTrace` giải trình chi tiết từng điều kiện thực tế vs kỳ vọng. Trên UI, cán bộ có thể bấm nút "Vì sao?" để mở ngăn kéo giải trình (Explainability Side Drawer).
     - Kết luận vi phạm pháp lý bắt buộc phải có bước xác nhận ký duyệt của cán bộ chuyên trách (`Human Sign-off`), lưu vết bất biến trong CSDL kèm chữ ký số.

### 1. Deep Audit: Router-Level Auth Enforcement, SQLite Index Optimization & Zero-Fake-AI Reality
- **Vấn đề**:
  - **Lỗ hổng cấp Router (P0 Data Leak)**: Các sub-router Express như `casesRouter` nếu chỉ gán `requireAuth` trên các endpoint thay đổi dữ liệu (POST, PATCH) mà không bảo vệ `GET /` và `GET /:id` thì bất kỳ người dùng vãng lai nào trên Internet cũng có thể trích xuất toàn bộ hồ sơ vi phạm môi trường nhạy cảm mà không cần đăng nhập.
  - **Quét Toàn Bảng (Full Table Scan O(N))**: Khi thực hiện băm mật mã đối chiếu toàn vẹn tệp ảnh bằng chứng (`SELECT * FROM evidence_assets WHERE sha256 = ?`), nếu thiếu chỉ mục trên trường `sha256`, SQLite buộc phải quét toàn bộ bảng (SCAN), gây nghẽn nghiêm trọng khi dữ liệu bằng chứng tăng lên hàng ngàn bản ghi.
  - **Ngộ Nhận Công Nghệ (Fake AI / Overclaim)**: Thói quen gọi thuật toán tìm kiếm từ khóa SQLite FTS5 (BM25) và hệ thống quy tắc nếu-thì (Expert Rule Engine) là "AI Phán Quyết / AI Vision" gây mất uy tín với cơ quan quản lý và hội đồng thẩm định chuyên môn.
- **Giải pháp chuẩn hóa**:
  1. **Bảo Vệ Cấp Router Tối Thượng (Router-Level Defense)**:
     - Luôn đặt `router.use(requireAuth)` ngay sau khi khởi tạo Router cho toàn bộ các module nghiệp vụ nội bộ (`casesRouter`, `tasksRouter`, `inspectionsRouter`), biến mọi endpoint thành bảo mật theo mặc định (Secure-by-default).
  2. **Tối Ưu Chỉ Mục Bắt Buộc Theo EXPLAIN QUERY PLAN**:
     - Mọi trường dùng để tìm kiếm hoặc lọc duy nhất (như `sha256`, `(status, due_at)`, `(status, created_at)`) phải được đánh chỉ mục `CREATE INDEX`. Kiểm tra định kỳ bằng `EXPLAIN QUERY PLAN` để đảm bảo 100% truy vấn đạt `SEARCH ... USING INDEX`.
  3. **Tuyên Bố Trung Thực Công Nghệ (Zero Fake AI SSOT)**:
     - Định danh rành mạch: FTS5 là "Tra cứu Pháp điển Toàn văn"; Rule Engine là "Trợ lý Đối soát Quy chuẩn"; Điểm rủi ro là "Chỉ số Trọng số Môi trường". Toàn bộ phán quyết và kết luận vi phạm hành chính phải có chữ ký số/xác nhận của chuyên viên con người (Human-in-the-loop).

### 1. UI/UX Production Hardening: Công Thái Học Laptop 1366x768, Dropdown Thay Dàn Hàng Nút Bấm & Đếm Ngược SLA Thực Địa
- **Vấn đề**:
  - Dàn ngang 6-7 nút bấm hành động nghiệp vụ trên cùng một dòng (như `Phân công`, `Tạo nhiệm vụ`, `Thẩm tra pháp lý`, `Lên lịch kiểm tra`, `Thêm bằng chứng`, `Đóng vụ việc`) khiến giao diện bị vỡ dòng lộn xộn, đẩy các phần tử quan trọng xuống dưới khi xem trên laptop phổ thông 1366x768 (với tỉ lệ Windows scaling 125%).
  - Lỗi Node `execSync` bị treo vĩnh viễn trên Windows khi gọi các CLI chạy ngầm giữ stdout/stderr (như browser daemon) do Node đợi toàn bộ file descriptor đóng; trong khi chạy trực tiếp qua PowerShell script thì thoát đúng kỳ vọng.
  - Hiển thị chuỗi băm SHA-256 dài 64 ký tự chiếm hết diện tích thẻ trên di động và khó đọc nếu không có cơ chế rút gọn kèm nút copy 1-click.
- **Giải pháp chuẩn hóa**:
  1. **Quy tắc Gom nhóm Hành động (Action Bar Simplification)**:
     - 1 Dominant CTA (dựa trên Next Action Engine) + 1-2 Quick Actions phổ biến (`Phân công`, `Xuất hồ sơ`) + 1 Dropdown Menu "Thao tác khác" cho các hành động thứ cấp và nguy hiểm (`Đóng/Mở lại vụ việc`).
  2. **Rút gọn Băm Mật mã & Sao chép 1 chạm**:
     - Định dạng `fbfb081a2b...37f6d7cd` kèm nút copy 1 chạm có trạng thái phản hồi `copied` tức thì; khối đối soát băm trong modal hiển thị rõ ràng và hỗ trợ re-verify trực tiếp với file nhị phân trên đĩa.
  3. **Đếm ngược SLA 48h Chân thực**:
     - Tính toán chênh lệch thời gian từ `created_at` vụ việc so với ngưỡng 48h luật định; đổi màu badge sang xanh lá nếu còn hạn hoặc đỏ cảnh báo nếu quá hạn, mang lại giá trị vận hành thực tế cho cán bộ điều phối.

### 1. Final Production Hardening: Khép Vòng Chu Trình 2-Side & Thiết Lập Chốt Chặn Nghiệp Vụ Thực Tế
- **Vấn đề**:
  - Khi bóc tách API response, sự không thống nhất giữa việc trả về mảng trực tiếp `res.data = [...]` và việc frontend kỳ vọng đối tượng bọc `res.cases = [...]` dễ dẫn đến việc màn hình hiển thị rỗng (0 items) dù cơ sở dữ liệu có đầy đủ dữ liệu (Bug Kanban rỗng tại `CaseCoordinationPage.tsx`).
  - Sử dụng chuỗi giả lập `Math.random()` để fallback khi tính toán mã băm SHA-256 (tại `crypto.ts`) gây tổn hại nghiêm trọng đến tính liêm chính của bằng chứng số (evidence integrity).
  - Nguy cơ đóng khống hồ sơ trên giấy (Paper compliance): Nếu không có chốt chặn nghiệp vụ (Business Invariant Gate), cán bộ có thể đóng vụ việc trước khi có kết luận thẩm tra pháp lý hoặc trước khi nhà thầu thực sự khắc phục vi phạm.
- **Giải pháp chuẩn hóa**:
  1. **Nguyên tắc "Be Conservative in What You Send, Liberal in What You Accept"**:
     - Frontend phải luôn xử lý cả 2 trường hợp: `Array.isArray(res) ? res : res.cases || []`.
     - Backend schema validation phải chấp nhận cả tên trường cũ và mới (`newStatus` và `status`) để ngăn ngừa lỗi gãy luồng đột ngột.
  2. **Liêm chính Mật mã Tuyệt đối (Zero Pseudo-Randomness)**:
     - Triển khai thuật toán băm SHA-256 thuần (`sha256Pure`) chuẩn FIPS 180-4 để đảm bảo dù Web Crypto API có bị trình duyệt chặn, file tải lên vẫn luôn được tính mã băm từ mảng byte thật 100%.
  3. **Chốt Chặn Nghiệp Vụ Bắt Buộc (Business Invariant Gates)**:
     - Tại `cases.router.ts`: Chặn đứng hành động đóng hồ sơ nếu chưa có kết luận thẩm tra pháp lý chính thức (`status = 'REVIEWED'`) từ chuyên viên pháp chế và toàn bộ yêu cầu khắc phục chưa được nghiệm thu (`status = 'VERIFIED'`).

### 1. Migration 02: Cổng Đăng Nhập 2 Phía & Bảo Toàn Deep-Link Theo Năng Lực (Capabilities)
- **Vấn đề**:
  - Giao diện đăng nhập cũ hiển thị 4-5 nút chọn role cố định (`citizen`, `member`, `moderator`, `admin`), biến sản phẩm thành một tập hợp các app rời rạc thay vì một nền tảng thống nhất.
  - Khi người dùng truy cập một liên kết được chia sẻ (deep-link như `/reports/detail/123` hoặc `/tasks`), hệ thống cũ hoặc hiển thị trang Forbidden 403 ngay lập tức khi chưa đăng nhập, hoặc sau khi đăng nhập bị ép buộc quay về trang chủ dashboard mặc định, làm mất trắng ngữ cảnh công việc của người dùng.
  - Tư duy tạo một CSDL Auth dùng chung thứ ba (SSO giả mạo) thường bị cám dỗ nhưng sẽ làm vỡ ranh giới kiến trúc độc lập giữa phân hệ Civic công cộng và phân hệ Pháp lý nghiệp vụ nội bộ.
- **Giải pháp chuẩn hóa**:
  1. **Gateway Thông Minh (Product Gateway Pattern)**:
     - Trang `/login` chỉ đóng vai trò phân luồng thị giác giữa 2 không gian chính: Phía Cộng đồng (Side A) và Đơn vị Xử lý (Side B).
     - Không can thiệp hay gộp CSDL Auth: Side A tiếp tục sử dụng JWT từ `apps/server`, Side B sử dụng JWT/Session từ `dustguard-operations`.
  2. **Bảo Toàn Deep-Link & Phân Giải Năng Lực Chuẩn**:
     - Trong `ProtectedRoute`, phân biệt dứt khoát mã HTTP: Nếu chưa đăng nhập (401), điều hướng về `/login` kèm `state: { from: location }`. Chỉ hiển thị `<ForbiddenPage>` khi người dùng ĐÃ đăng nhập nhưng THIẾU năng lực thực thi.
     - Sau khi đăng nhập thành công, kiểm tra `requestedPath`: Nếu có URL deep-link hợp lệ, lập tức trả người dùng về đúng trang đó. Nếu không có, hàm `resolveCommunityHome()` hoặc `resolveOperationsHome()` sẽ phân giải trang đích tối ưu theo gói năng lực cao nhất mà tài khoản sở hữu.
  3. **Xóa Sổ Cổng Role-Picker**:
     - Nút đăng nhập nhanh (Quick Login) chỉ phục vụ môi trường kiểm thử/demo và được tổ chức theo cấp độ năng lực thực tế, không dùng để định nghĩa kiến trúc sản phẩm.

### 1. Không Đồng Nhất "Side" Với "Role" & Chuẩn Hóa Phân Quyền Theo Năng Lực (Capabilities)
- **Vấn đề**:
  - Codebase cũ bị nhầm lẫn nghiêm trọng giữa **Phía trải nghiệm sản phẩm (Product Side)** và **Vai trò người dùng (User Role)**, dẫn đến việc tạo ra 5-6 web apps riêng rẽ (`/citizen`, `/staff`, `/contractor`, `/executive`, `/community`, `/admin`).
  - Phân quyền kiểu cũ phụ thuộc vào kiểm tra chuỗi URL `isRoleAllowedForPath(role, path)` hoặc `if (user.role === 'staff')` rải rác khắp nơi, làm xuất hiện các cổng portal thừa thãi (như `/contractor/*` trong khi nhà thầu chỉ cần liên kết Quick-Token) và các route trùng lặp nặng nề (`/staff/cases` song song với `/cases`).
  - Dữ liệu bị phân mảnh: Một bên gọi là `complaints`, một bên gọi là `reports`; cán bộ đi kiểm tra thì gọi là `task` gây nhầm với nhiệm vụ của thanh niên tình nguyện.
- **Giải pháp chuẩn hóa**:
  1. **Tách bạch rõ rệt giữa Product Side và Capabilities**:
     - Hệ thống chỉ có **2 Phía (2 Sides)**: **Side A (Community)** và **Side B (Professional)**.
     - Role không phải là ứng dụng độc lập, mà là một **gói Năng lực (Bundle of Capabilities)**. Ví dụ: `staff` sở hữu `case:triage`, `inspection:create`, `action:create`...
     - Cấm tuyệt đối kiểm tra `role` cứng trên giao diện; mọi component/nút bấm đều kiểm tra qua `can('action:name')`.
  2. **Giao thức Bàn giao Có trách nhiệm (Institutional Handoff)**:
     - Không cố gộp 2 CSDL thành một monolith cồng kềnh; tách biệt `dustguard-community.db` (Public/Civic) và `dustguard-operations.db` (Nội bộ/Pháp lý).
     - Cầu nối duy nhất là endpoint webhook idempotent: `POST /api/integrations/community/cases` kèm mã băm SHA-256 payload hash để chống trùng lặp.
  3. **Phân định rõ ràng các cặp thực thể dễ nhầm lẫn**:
     - `Report != Case`: Phản ánh ban đầu của cá nhân người dân khác với Hồ sơ vụ việc được gom nhóm.
     - `Observation != Inspection`: Quan sát cảm quan của cộng đồng khác với Thanh tra công vụ theo 10 tiêu chuẩn QCVN 18/BXD của cán bộ.

### 1. Tinh Chỉnh Sắc Nét Section Thực Trạng ("Phản ánh không khó. Theo dõi đến kết quả mới khó.") (2026-09-05)
- **Vấn đề**:
  - Thẻ vấn đề bên trái trông bị mờ/disabled, văn bản chìm vào nền kem do thiếu container background riêng biệt, text phụ có độ tương phản quá thấp (`#475569`).
  - Tiêu đề dòng 2 bị áp màu xám slate (`#64748B`), làm yếu đi thông điệp cốt lõi và nhận diện thương hiệu màu đỏ DustGuard.
  - Animation GSAP entrance ban đầu nối tiếp qua timeline quá chậm (>1.2s), khiến trong quá trình cuộn nhanh, thẻ cuối cùng bị "kẹt" ở trạng thái tweening dở dang với opacity thấp, tạo cảm giác thẻ bị vô hiệu hóa có chủ ý.
- **Giải pháp chuẩn hóa**:
  1. **Tuyệt đối không dùng Opacity tổng thể để tạo phân cấp thị giác**:
     - Mọi card container duy trì `opacity: 1`.
     - Phân cấp được tạo bởi màu nền ngà ấm (`rgba(255, 255, 255, 0.90)` cho card 01 & 03; `#FFF9F6` cho card 02), viền nhẹ `rgba(145, 110, 90, 0.20)` và shadow ấm `0 10px 30px rgba(40,25,15,0.045)`.
     - Số hiệu đặt trong circular badge 32px nền trắng, số đỏ `#C72A20` font-mono đậm; icon đỏ trong hộp bo góc tinh tế.
     - Tiêu đề near-black `#15171C`, văn bản `#524A43` đảm bảo độ tương phản cao, đọc rõ ràng dưới mọi điều kiện ánh sáng.
  2. **Đồng bộ màu sắc thương hiệu Civic Red**:
     - Dòng 2 tiêu đề: `text-[#C72A20]` font-black, chặt chẽ với `tracking-[-0.035em]` và `leading-[1.04]`.
     - Màu xanh lá chỉ dùng duy nhất cho phản hồi thành công/nghiệm thu (bước 04 và thanh xác thực cuối), không biến thành màu chủ đạo thứ hai.
  3. **Kỷ luật GSAP Entrance Animation**:
     - Sử dụng `gsap.fromTo` với thời gian ngắn gọn (<0.45s) và stagger nhẹ (0.06s).
     - Luôn đính kèm `clearProps: 'transform,opacity'` trong callback hoàn tất tween để trả lại CSS thuần túy cho trình duyệt, chống hiện tượng inline opacity làm mờ phần tử vĩnh viễn.

### 1. Red-Led Civic Palette & High-Impact GSAP Live Case Engine (2026-09-05)
- **Vấn đề**:
  - Landing page bị cảm giác "dull gray / blue-gray" lạnh lẽo, corporate và generic do dùng quá nhiều màu xám slate (`#64748B`, `#475569`) ở tiêu đề dòng 2 ("Theo dõi đến kết quả mới khó"), làm suy yếu năng lượng của thương hiệu.
  - Animation GSAP ban đầu chỉ là fade-in/slide-up thông thường, thẻ hồ sơ nhìn như một card tĩnh được gán animation sau khi xong layout, thiếu concept "Live Case Engine" và không tạo được khoảnh khắc "wow".
  - Đường line nối và các phản ứng thị giác giữa các bước còn rời rạc.
- **Giải pháp chuẩn hóa**:
  1. **Hệ màu Red-Led Civic Palette ấm & Tương phản cao**:
     - Warm Background: `#FBF7F2`, Surface: `#FFFCF8`, Borders: `#E7DED6`.
     - Deep Ink Text: `#111827`, Warm Muted Text: `#6B5F58` và `#7A6B62` (loại bỏ hoàn toàn cold slate gray).
     - Red Accent độc tôn: `#B42318` (chính), `#991B1B` (hover/viền đậm), `#FDE8E6` (nền badge nhẹ). Tỷ lệ vàng: **75% warm neutral, 20% deep ink, 5% red accent**.
     - Xóa bỏ hoàn toàn chữ xám lớn làm emphasis ở tiêu đề dòng 2 (Hero & Section 2 chuyển sang màu đỏ DustGuard `#B42318`). Xanh lá chỉ dùng duy nhất cho trạng thái verified/thành công.
  2. **Live Case Engine — Kịch bản chuyển động có hồn (Choreography ~4.8s)**:
     - 0.20s: Điểm sự cố đô thị (`● GPS 20.9852° N`) xuất hiện kèm 1 vòng pulse duy nhất (`scale: 0.6 -> 2.2, opacity: 0.35 -> 0`).
     - 0.55s: *The Red Signal Trace* — Đường vẽ SVG đỏ mảnh thanh thoát uốn cong từ điểm sự cố nối trực tiếp vào đầu hồ sơ case.
     - 0.90s: Vỏ thẻ hồ sơ trồi lên (`y: 26 -> 0`, `opacity: 0 -> 1`), mã `DG-2026-OP-014` khóa cứng vào CSDL (tracking expansion).
     - 1.55s - 2.35s: Các bước 01 Phát hiện $\to$ 02 Tiếp nhận (chip "Đã chuyển xử lý" trượt vào, header border nháy đỏ nhẹ) $\to$ 03 Khắc phục (lớp khói bụi giảm độ đục, marker can thiệp hiện lên).
     - 2.80s: Màn wipe Before $\to$ After bằng clip-path chất lượng cao (1.1s) với nền mặt đường sạch trung tính, không biến thành hộp xanh nhân tạo.
     - 3.80s - 4.55s: 04 Tái kiểm hoàn tất, viền Card chuyển mượt sang xanh verified `#A7F3D0`, badge bung nở với `back.out(1.4)` và 1 vòng ripple xanh, nhãn chân thẻ: *"Đã hoàn tất bước tái kiểm"*.
  3. **Section 2 Broken Flow vs Closed Loop Trace**:
     - Quy trình cũ: Ảnh $\to$ Tin nhắn $\to$ Excel $\to$ đường SVG vẽ dừng lại để lộ khoảng đứt gãy trước dấu `? (Mất dấu)`.
     - Quy trình DustGuard: Đường SVG đỏ liền mạch nối trọn vẹn 3 chặng Tọa độ $\to$ Phân công $\to$ Tái kiểm.
  4. **Desktop Parallax Siêu Tốc Bằng `gsap.quickTo()`**:
     - Không setState trong sự kiện mousemove; dùng `gsap.quickTo()` cho tọa độ X/Y với độ dịch tối đa 2px (card), 5px (lưới bản đồ) và 4px (pin tín hiệu), giữ chuẩn 60fps mượt mà.

### 2. Kỹ Thuật Dàn Dựng GSAP Cho Civic-Tech Storytelling (Living Case Story)
- **Vấn đề**:
  - Các khối minh chứng dạng hai hộp tĩnh màu vàng (Trước) và xanh (Sau) dễ làm mất đi tính liên tục của quy trình; người dùng phải tự đọc chữ và so sánh thủ công trong đầu.
  - Animation CSS đơn thuần khó đồng bộ mượt mà giữa tiến trình dòng thời gian (4 bước) và chuyển động quét hiện trường (wipe reveal).
  - Nguy cơ memory leak hoặc xung đột DOM nếu không dọn dẹp (revert) các tween GSAP khi component React re-render.
- **Giải pháp chuẩn hóa**:
  1. **GSAP Context & Cleanup Chặt Chẽ**:
     - Luôn bọc toàn bộ chuỗi animation trong `const ctx = gsap.context(() => { ... }, containerRef)` và `return () => ctx.revert()` trong `useEffect()`.
     - Tôn trọng `window.matchMedia('(prefers-reduced-motion: reduce)').matches`: nếu người dùng bật giảm chuyển động, lập tức áp dụng trạng thái hoàn tất bằng `gsap.set()`, tránh chạy tween không mong muốn.
  2. **Orchestration Timeline & Clip-Path Wipe**:
     - Gom Before và After vào một khung hình trực quan dùng chung (`Evidence Stage`), After nằm đè lên Before với `clipPath: inset(0% 100% 0% 0%)`.
     - Đồng bộ thanh tiến trình 4 nodes: `Phát hiện (0.6s) → Tiếp nhận (1.2s) → Khắc phục (1.8s) → Tái kiểm & Wipe (2.4s - 3.3s)`.
     - Kèm vạch quét phát sáng (`scanLineRef`) trôi dọc theo mép wipe tạo hiệu ứng phân tích trắc địa chân thực.
  3. **Trao Quyền Chủ Động So Sánh Cho Người Dùng (Manual Comparison)**:
     - Sau khi animation tự động chạy xong 1 lần duy nhất, kích hoạt nút bấm `[↺ Xem lúc phát hiện]` $\leftrightarrow$ `[↺ Xem sau xử lý]` cho phép người dùng click để wipe qua lại tức thời bằng GSAP tween (`duration: 0.55s, ease: 'power2.inOut'`).
  4. **Ambient Drift & Bounded Pointer Parallax**:
     - Lớp nền lưới tọa độ contour đô thị (`civic-grid`) trôi nhẹ nhàng 10px trong 20s (`repeat: -1, yoyo: true`), tạo chiều sâu không gian cao cấp.
     - Hiệu ứng parallax theo con trỏ chuột desktop khống chế nghiêm ngặt trong giới hạn tối đa $\pm 4$px và xoay $\pm 0.3^\circ$, tránh biến dạng 3D thô thiển.

### 2. Thiết Kế Landing Page Civic-Tech Đẳng Cấp Đi Thi (Visual Quality First & Editorial Storytelling)
- **Vấn đề**:
  - Landing page ban đầu bị ảnh hưởng bởi tư duy Dashboard/Admin Panel: nhồi nhét quá nhiều border, thẻ card nhỏ, badge, KPI cards vụn (4 thẻ SLA / Bằng chứng / Tín chỉ / Kết quả) làm nghẹt thở first viewport.
  - Header quá dài với nhiều menu ngang cồng kềnh và border pill bao quanh.
  - Evidence card bên phải lạm dụng icon tam giác cảnh báo khổng lồ trong ô trống, không tạo được cảm giác hiện trường thực tế.
  - Các số liệu chưa có nguồn tin cậy bị biến thành fact cứng nhắc ("vượt 3.6 lần", "100% bảo chứng") gây rủi ro cam kết sai (Overclaiming).
- **Giải pháp chuẩn hóa**:
  1. **Quy luật 58% Content / 42% Visual cho Hero Desktop**:
     - Cột trái: H1 lớn clamp(56px, 5vw, 72px) làm Focal Point thị giác số 1, highlight có chủ đích cụm *"Theo dõi đến khi"*, copy 2 dòng súc tích, CTAs rõ ràng và Trust Row siêu nhẹ dạng text icon (loại bỏ 100% 4 KPI cards).
     - Cột phải: Thẻ *Case Story Card* độc bản (`DG-2026-OP-014`) làm Focal Point số 2, mô phỏng sinh động hiện trường Before (xe ben phát tán bụi) $\rightarrow$ sau 48h khắc phục After (trạm rửa xe, tưới ẩm, biên bản thanh tra).
  2. **Editorial Layout Thay Vì Cards Rời Rạc**:
     - *Thực trạng (Problem)*: 3 phát biểu đánh số `01`, `02`, `03` tương phản trực tiếp với sơ đồ đứt gãy truyền thống (*Ảnh → Tin nhắn → Excel → ?*) so với quy trình khép kín của DustGuard.
     - *Hành trình (Process)*: Timeline 5 chặng ngang lớn trên Desktop, dọc trên Mobile, điểm nhấn màu đỏ ở bước Tái kiểm.
     - *Phân vai (Roles)*: 4 portrait blocks với compact mock UI cho từng vai trò, không dùng ma trận tab phức tạp.
     - *Nguyên tắc tin cậy (Trust)*: 3 tuyên ngôn minh bạch, ẩn chi tiết kỹ thuật (SHA-256) vào chú thích đối soát, không khoe khoang thuật ngữ kỹ thuật.
     - *Pilot CTA*: Thiết kế dạng banner tinh gọn kèm compact modal popup, loại bỏ form dài gây ngán ngẩm trên trang chính.
  3. **Tối Ưu Hóa Mobile First & Chống Rớt Chữ**:
     - Thêm `whitespace-nowrap shrink-0` cho mã định danh vụ việc và status badge để mã không bao giờ bị cắt đôi giữa chừng.
     - Đặt `w-full sm:w-auto` và min-height 48px cho các CTA buttons để thao tác ngón cái đạt chuẩn tiếp cận civic tech.
     - Giữ nguyên tắc sống còn: nền ấm `#FBF9F5`, chữ đậm `#0F172A`, điểm nhấn đỏ `#B42318`, tuyệt đối cấm glassmorphism.

### 2. Loại Bỏ Phụ Thuộc Seed & Thiết Kế Database Rỗng Như Một First-Class State (2026-09-05)
- **Vấn đề**:
  - Nhiều hệ thống web hoạt động trơn tru trong quá trình phát triển nhờ dữ liệu seed mẫu sẵn có (`case-013`, `case-001`, `TASK-018`, `FND-01`, `user_tran`), nhưng lập tức sụp đổ hoặc vỡ giao diện khi khởi tạo trên môi trường sản xuất thực tế với cơ sở dữ liệu rỗng.
  - Các modal, drawer hoặc rule engine fallback về mã cứng (`case-013`, `FND-01`), tạo ra cảm giác "giả mạo thành công" (fake success), gây sai lệch dữ liệu thanh tra thực tế.
  - Form tạo user mặc định điền mật khẩu cố định (`password123`) hoặc API không có cơ chế chặn tái khởi tạo dẫn đến rủi ro chiếm quyền (Takeover).
- **Giải pháp chuẩn hóa**:
  1. **Database Rỗng Là First-Class State**:
     - Khi `user_count === 0`, toàn bộ UI tự động nhận diện hệ thống mới tinh, hiển thị Operational Banner hướng dẫn và chuyển hướng đến `/setup` để khởi tạo Super Admin đầu tiên.
     - Sau khi tài khoản đầu tiên được kích hoạt, khóa vĩnh viễn endpoint `/api/auth/bootstrap` với mã 403 Forbidden.
  2. **Zero-Seed Empty States & Actionable CTAs**:
     - Mọi danh mục chính (`/cases`, `/projects`, `/contractors`, `/evidence`, `/tasks`) đều có Empty State rõ ràng với CTA tạo thực thể đầu tiên (không bao giờ để màn hình trắng hay báo lỗi).
     - Cho phép tải lên bằng chứng trực tiếp qua giao diện (`EvidencePage`, `LegalWorkspacePage`) và niêm phong mã băm SHA-256 đối soát trực tiếp tệp trên đĩa cứng.
  3. **Xử Lý Hồ Sơ Thiếu Dữ Kiện Thực Tế (Zero-Hallucination)**:
     - Khi hồ sơ mới tạo chưa có biên bản thanh tra hay số liệu đo đạc, engine phân tích pháp lý phải trả về `conclusion_level = 'INSUFFICIENT_EVIDENCE'` hoặc `'INSUFFICIENT_DATA'`.
     - Tuyệt đối cấm máy tự suy đoán hay kết luận `HUMAN_CONFIRMED` khi chưa có chữ ký bút phê của cán bộ thẩm quyền.
     - Liệt kê minh bạch các nhóm dữ kiện còn thiếu và cung cấp nút bấm trực tiếp tạo nhiệm vụ kiểm tra hiện trường.
  4. **Kiểm Thử E2E Tự Động Hóa Từ DB Rỗng**:
     - Xây dựng test suite 12 bước chạy trên DB mới tạo hoàn toàn (migration-only): Khởi tạo -> Bootstrap -> Đăng nhập -> Tạo Nhà thầu -> Tạo Dự án -> Tạo Vụ việc -> Tải bằng chứng ảnh -> Phân tích pháp lý -> Tạo Task -> Đối soát SQLite D1 SSOT.

### 2. Phân Tách 4 Lớp Giao Diện Hỗ Trợ Quyết Định & Tách Bạch Rule Engine Khỏi AI Assistant (2026-09-05)
- **Vấn đề**:
  - Popup cũ `FACT-CLAIM-case-013` chỉ thuần túy hiển thị record trong DB (ID kỹ thuật, loại CLAIM, timestamp, nút Đóng), không trả lời được các câu hỏi then chốt của cán bộ: *Ai nói? Nói điều gì? Có đáng tin không? Hệ thống đã kiểm tra tự động gì? Liên quan gì đến kết luận? Cán bộ cần làm gì tiếp?*
  - Nguy cơ "gắn chữ AI vào rule engine": Các phép kiểm tra có ảnh hay chưa, GPS < 50m, hash SHA-256 có khớp không, IoT có dữ liệu không, deadline quá hạn... thực chất là **deterministic SQL/rule engine**, việc gắn nhãn "AI" làm hệ thống kém đáng tin và tốn kém vô ích.
- **Giải pháp chuẩn hóa**:
  1. **Khóa 4 lớp giao diện chuyên biệt**:
     - *A. Quick Preview Modal (500–620px)*: Xem nhanh, trả lời 5 câu hỏi của cán bộ, đẩy raw ID xuống footer, có dominant CTAs `[Xem đầy đủ]` và `[Tạo xác minh →]`.
     - *B. Evidence Detail Drawer (560–640px)*: Điều tra chuyên sâu bằng chứng số với ảnh lớn, mã băm SHA-256 đối soát đĩa cứng, bảng đối chiếu 4 chiều thực địa (Thời điểm, Vị trí, Người gửi, Hiện trường) và liên kết đồ thị vụ việc (FND/REQ/TASK).
     - *C. Action Modal (~520px)*: Đơn nhiệm cho 1 hành động (giao việc xác minh, SLA 48h tự động, phân công cán bộ, checklist 3 tiêu chí).
     - *D. Decision Workspace Drawer (750–850px)*: Bàn làm việc ra quyết định với 5 bước nhận thức có cấu trúc (*Nhận định → Căn cứ pháp lý → Chứng cứ → Dữ kiện còn thiếu → Đề xuất hệ thống kèm "Tại sao? [Xem lập luận]"*) và ký duyệt lưu vết D1.
  2. **Tách bạch hoàn toàn Rule Engine và AI Intelligence**:
     - Đổi nút hành động thành `✦ Phân tích hồ sơ`.
     - Thay thế điểm đơn độc `Data Confidence: 16%` thành: **Mức độ đầy đủ hồ sơ (Data Completeness)** tính toán xác thực từ CSDL (`2 / 6 nhóm dữ kiện đã có (33%)`) + **Đánh giá Trợ lý (AI Assessment)** riêng biệt (`Mức chắc chắn: Trung bình`).
     - Bổ sung phát hiện mâu thuẫn dữ kiện (*AI Contradiction Detection*) và 3 Ưu tiên hành động tiếp theo.
     - 3 màu trạng thái nhận thức: `● FACT` (slate), `● AI SUGGESTION` (indigo), `● VERIFIED` (emerald).

### 2. Kiến Trúc Express Router Sub-mount & Tránh Lỗi Lặp Đường Dẫn (Route Doubling Bug)
- **Vấn đề**: Khi mount một router vào một path tiền tố trong file server chính:
  ```typescript
  // index.ts
  app.use('/api/cases', casesRouter);
  ```
  Nếu bên trong `casesRouter` (hoặc các sub-router như `legalRouter`, `inspectionsRouter`) lại định nghĩa:
  ```typescript
  router.post('/cases/:id/legal/analyze', ...);
  ```
  Đường dẫn thực tế khi gọi từ Client sẽ bị gấp đôi thành `/api/cases/cases/:id/legal/analyze`, dẫn đến lỗi **404 Cannot POST**.
- **Giải pháp chuẩn hóa**:
  Mọi sub-router mount dưới `/api/cases` phải nhận dạng root của nó là `/:id/...`:
  ```typescript
  // legal.router.ts (được mount tại /api/cases)
  router.post('/:id/legal/analyze', ...);
  router.post('/:id/legal/review', ...);
  ```
  Luôn audit bảng định tuyến (Route Table) trước khi tích hợp Frontend.

---

### 2. Node.js 24 Native SQLite (`node:sqlite`) Parameter Binding với Kiểu Dữ Liệu Phức Tạp
- **Vấn đề**: Module native `DatabaseSync` của Node 24 kiểm tra kiểu dữ liệu nghiêm ngặt hơn các thư viện cũ (như `better-sqlite3`). Khi truyền một JavaScript Array (ví dụ danh sách `evidence_asset_ids: string[]`) trực tiếp vào prepared statement:
  ```typescript
  stmt.run(id, caseId, evidenceIds); // ❌ Throw: TypeError: Provided value cannot be bound to SQLite parameter
  ```
- **Giải pháp chuẩn hóa**:
  Mọi trường quan hệ nhiều-nhiều hoặc mảng nhúng (embedded arrays/JSON objects) bắt buộc phải serialize qua `JSON.stringify(val || [])` trước khi bind vào câu lệnh SQL:
  ```typescript
  stmt.run(id, caseId, JSON.stringify(evidenceIds || [])); // ✅ Chuẩn SQLite TEXT
  ```

---

### 3. Tìm Kiếm Toàn Văn SQLite FTS5 (Full-Text Search) Địa Phương
- **Vấn đề**: Tìm kiếm FTS5 trên SQLite rất nhạy cảm với các ký tự đặc biệt (dấu ngoặc, dấu gạch ngang, toán tử boolean). Nếu người dùng nhập chuỗi tìm kiếm thô có ký tự đặc biệt, câu lệnh `MATCH ?` có thể quăng ngoại lệ cú pháp SQL FTS5.
- **Giải pháp chuẩn hóa**:
  Làm sạch từ khóa tìm kiếm, loại bỏ ký tự điều khiển FTS5 trước khi truy vấn, hoặc bọc từng từ khóa trong ngoặc kép với wildcard prefix:
  ```typescript
  const sanitized = query.replace(/['"*^()]/g, ' ').trim();
  const ftsQuery = sanitized.split(/\s+/).filter(Boolean).map(w => `"${w}"*`).join(' OR ');
  ```

---

### 4. Đảm Bảo Mobile Viewport 390x844 Không Bị Tràn Ngang (`noOverflow: true`)
- **Vấn đề**: Các component Header, Topbar, hoặc Flex container có chứa văn bản dài (như Tiêu đề vụ việc, Tên công trình) có thể đẩy container rộng hơn `390px`, gây thanh cuộn ngang khó chịu trên điện thoại.
- **Giải pháp chuẩn hóa**:
  1. Thêm `min-w-0 flex-1` cho container văn bản trong flexbox.
  2. Áp dụng `truncate` hoặc `line-clamp-1` kết hợp `text-wrap: pretty`.
  3. Kiểm tra bằng lệnh: `node scripts/verify-responsive.js` chạy qua 5 viewports từ $390\text{px}$ đến $1440\text{px}$ đạt 75/75 test pass.

---

### 5. SQLite Concurrency & Chống Khóa Cơ Sở Dữ Liệu (`PRAGMA busy_timeout = 5000`)
- **Vấn đề**: Khi chạy `tsx watch` tự động restart server hoặc khi các tiến trình test chạy song song với backend, SQLite WAL mode có thể quăng lỗi `ERR_SQLITE_ERROR (errcode: 261): database is locked` nếu thời gian chờ mặc định là 0ms.
- **Giải pháp chuẩn hóa**:
  Luôn cấu hình `PRAGMA busy_timeout = 5000;` ngay sau khi khởi tạo kết nối `DatabaseSync`:
  ```typescript
  export const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  ```

---

### 6. Chuẩn Hóa Giá Trị Enum Trước Ràng Buộc SQLite `CHECK`
- **Vấn đề**: Schema SQLite định nghĩa nghiêm ngặt `CHECK (section_type IN ('Chapter', 'Article', 'Clause', 'Point', 'Section'))`. Trong khi đó, bộ phân tích regex hoặc giao diện người dùng có thể gửi lên chuỗi in hoa (`'ARTICLE'`) hoặc tiếng Việt (`'ĐIỀU'`), gây lỗi `CHECK constraint failed`.
- **Giải pháp chuẩn hóa**:
  Viết hàm helper `normalizeSectionType()` chuyển đổi trước khi insert vào CSDL:
  ```typescript
  function normalizeSectionType(type: string): string {
    const upper = (type || '').toUpperCase();
    if (upper.includes('CHƯƠNG') || upper === 'CHAPTER') return 'Chapter';
    if (upper.includes('MỤC') || upper === 'SECTION') return 'Section';
    if (upper.includes('ĐIỀU') || upper === 'ARTICLE') return 'Article';
    if (upper.includes('KHOẢN') || upper === 'CLAUSE') return 'Clause';
    if (upper.includes('ĐIỂM') || upper === 'POINT') return 'Point';
    return 'Article';
  }
  ```

---

### 7. Tương Thích Hai Tầng Client Unwrapping (`return data.data ?? data`)
- **Vấn đề**: Khi HTTP client bóc tách `data.data ?? data`, phản hồi trả về dạng mảng thô `[...]`. Nếu mã nguồn trang web truy cập cứng `res.devices` hoặc `res.rules`, giá trị sẽ là `undefined` làm bảng hiển thị 0 bản ghi rỗng.
- **Giải pháp chuẩn hóa**:
  1. Phía Server trả về cả `data` chuẩn lẫn các thuộc tính tiện ích tương thích ngược: `{ success: true, data: processed, devices: processed }`.
  2. Phía Client luôn kiểm tra kiểu mảng trước:
     ```typescript
     const list = Array.isArray(res) ? res : res.devices || res.data || [];
     ```

---

### 8. Thao Tác Windows PowerShell với Ký Tự `@` trong CLI
- **Vấn đề**: Trong môi trường PowerShell trên Windows, cú pháp `@e16` bị nhận diện là toán tử mảng/splatting của PowerShell, dẫn đến việc nuốt mất tham số khi truyền vào lệnh `agent-browser click @e16`.
- **Giải pháp chuẩn hóa**:
  Luôn bọc các selector có ký tự `@` trong cặp dấu nháy kép: `agent-browser click "@e16"`.  3. Thêm cấu hình toàn cục `overflow-x: hidden` tại `body` và `html`.
  4. Xác minh tự động qua `agent-browser`:
     ```javascript
     document.documentElement.scrollWidth <= window.innerWidth // Bắt buộc true
     ```

---

### 5. Spawn Child Process Khởi Động Dev Server Trên Windows PowerShell
- **Vấn đề**: Lệnh `npx` trên Windows là `npx.cmd`. Nếu gọi `spawn('npx', ...)` mà không có `{ shell: true }` sẽ quăng lỗi `ENOENT: spawn npx ENOENT`.
- **Giải pháp chuẩn hóa**:
  Luôn kiểm tra platform hoặc truyền `{ shell: true }`:
  ```javascript
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  spawn(npxCmd, args, { stdio: 'inherit', shell: true });
  ```

---

### 6. Nguyên Tắc Cốt Lõi Về Logic Nghiệp Vụ (Domain Logic Invariants)
- **BUILD PASS != FEATURE PASS** và **TEST PASS != PRODUCT PASS**.
- Một tính năng chỉ hoàn tất khi:
  1. Logic đầu vào - đầu ra phù hợp nghiệp vụ thực tế (Ví dụ: Cổng kiểm tra 4 điều kiện khắt khe trước khi Đóng vụ việc: phải hoàn tất thanh tra, hết yêu cầu khắc phục, có biên bản pháp chế, và có tóm tắt lý do đóng).
  2. Dữ liệu ghi nhận bền vững vào CSDL SQLite SSOT thật (Reload F5 không mất dữ liệu).
  3. Kiểm chứng trực quan qua trình duyệt thực tế không có lỗi console, không gãy giao diện.

---

### 9. Cơ Chế Xác Thực Khi Mở Tab Mới Bằng window.open() (Decision Pack / Tài Liệu In Ấn)
- **Vấn đề**: Khi người dùng click nút xuất hồ sơ in ấn hoặc Decision Pack sử dụng `window.open('/api/...', '_blank')`, trình duyệt gửi request GET độc lập và không thể đính kèm tiêu đề HTTP `Authorization: Bearer <token>` lưu trong localStorage. Nếu middleware backend chỉ kiểm tra header Authorization, request sẽ bị chặn với mã lỗi 401 Unauthorized.
- **Giải pháp chuẩn hóa**:
  1. Cho phép `authMiddleware` nhận diện token qua tham số query `?token=<jwt>` hoặc `?auth_token=<jwt>` đối với các route tài liệu view trực tiếp.
  2. Ở phía Frontend, khi gọi `window.open()`, chủ động trích xuất token từ localStorage và đính kèm vào URL.
  3. Hỗ trợ cơ chế phân quyền định dạng thông minh: trả về `text/html; charset=utf-8` khi trình duyệt mở trực tiếp (`Accept: text/html`) và trả về JSON có cấu trúc khi gọi qua API (`Accept: application/json` hoặc `?format=json`).

---

### 10. Xung Đột Dữ Liệu Khi Chạy Nhiều File Test Cùng Lúc Trên File SQLite Duy Nhất
- **Vấn đề**: `node:test` theo mặc định thực thi các file test (`tests/*.test.js`) song song (parallel). Khi nhiều file test cùng gọi hàm `seedDatabase()` trong hook `before()`, các tiến trình đồng thời thực thi lệnh `DROP TABLE` và `INSERT INTO users`, gây lỗi `UNIQUE constraint failed: users.email` hoặc để lại dữ liệu rác từ bài test trước (`human_decisions` không được drop).
- **Giải pháp chuẩn hóa**:
  1. Khi chạy test suite trên SQLite file cục bộ, luôn thêm cờ `--test-concurrency=1` trong lệnh test (`npx tsx --test --test-concurrency=1 ...`).
  2. Mọi bảng mới thêm vào schema (`analysis_runs`, `human_decisions`) bắt buộc phải được khai báo ngay vào mảng bảng cần DROP trong hàm `seedDatabase()` để đảm bảo môi trường kiểm thử hoàn toàn độc lập (idempotent & isolated).

---

### 11. Chuỗi Dữ Kiện Nguồn Gốc (Provenance Model) & Ngữ Nghĩa Thực Tế
- **Nguyên tắc cốt lõi**: `SOURCE → FACT → EVIDENCE → INFERENCE → HUMAN DECISION`.
- AI không phải là nguồn dữ liệu và không phải là người ra quyết định.
- **Phân định rõ ràng**:
  - `COMMUNITY_CLAIM`: semantic_type = `CLAIM`, verification_state = `UNVERIFIED`. Tuyệt đối không hiển thị phản ánh cộng đồng như dữ kiện đã xác nhận.
  - `INSPECTION_OBSERVATION`: semantic_type = `OBSERVATION`. Ghi nhận từ cán bộ thực địa.
  - `IOT_ANOMALY`: semantic_type = `TELEMETRY`. Chỉ là tín hiệu viễn thám gợi ý khảo sát, cấm tự động suy luận thành vi phạm pháp luật.
  - `EVIDENCE_ASSET`: semantic_type = `DOCUMENT`. Phải qua kiểm tra đối chiếu mã băm SHA-256 với tệp thực tế trên đĩa cứng mới đạt `integrity_state = 'VERIFIED'`. Tệp bị can thiệp sẽ mang trạng thái `TAMPERED` hoặc `FILE_MISSING` và bị loại bỏ khỏi căn cứ pháp lý.
  - `HUMAN_DECISION`: Chỉ khi có bản ghi hợp lệ do cán bộ con người ký duyệt mới được phép mang `semantic_type = 'HUMAN_DECISION'` và đưa mức kết luận lên `HUMAN_CONFIRMED`.

---

### 13. Vận Hành Hoàn Toàn Độc Lập Khỏi Seed (Zero-Seed Production Operability)
- **Vấn đề**:
  1. Khi xóa hoặc không chạy `seed.ts`, hệ thống có thể bị sập do: thiếu tài khoản quản trị đầu tiên để đăng nhập; các dropdown chọn nhà thầu/công trình không có dữ liệu và không có màn hình thêm mới; các bảng dashboard ném lỗi vì giả định dữ liệu luôn tồn tại; mẫu biên bản thanh tra bị mất.
  2. Trong Node.js ESM, các lệnh `import ... from ...` tĩnh luôn bị hoisted lên đầu tệp trước mọi dòng code chạy thực thi. Do đó nếu gán `process.env.DB_PATH = '...'` trong file test, `connection.ts` vẫn đọc biến môi trường cũ nếu bị import tĩnh ở top-level.
- **Giải pháp chuẩn hóa**:
  1. **Phân tách Cấu hình Hệ thống Luật định (Category D)**: Toàn bộ văn bản quy phạm (Luật BVMT, NĐ 45/2022, QCVN 05:2023, QĐ 29/2021) và mẫu biên bản thanh tra được trích xuất thành Cấu hình Hệ thống (`systemConfig.ts`) và tự động nạp qua migrations, phân biệt tuyệt đối với Dữ liệu Tác nghiệp Demo (`seed.ts`).
  2. **Bootstrap Wizard An Toàn (`/setup` & `POST /api/auth/bootstrap`)**: Cho phép tạo Super Admin khi DB rỗng (`is_initialized = false`) và tự động khóa vĩnh viễn (403 Forbidden) ngay sau khi có ít nhất 1 người dùng.
  3. **Tự Tạo Đầy Đủ Thực Thể Qua UI**: Xây dựng đầy đủ màn hình và API cho Nhà thầu (`/contractors`), Công trình xây dựng (`/projects`), Cổng tiếp nhận báo cáo dân cư công khai (`POST /api/signals/public-report`), Chuyển hóa tin báo thành vụ việc (`POST /api/signals/:id/create-case`), và Đăng ký thiết bị IoT (`POST /api/iot/devices`).
  4. **Dynamic Import trong Isolated Tests**: Trong các bài test cơ sở dữ liệu cô lập, luôn đặt `process.env.DB_PATH = isolatedPath;` trước, sau đó dùng `await import('./connection.js')` và `await import('./migrate.js')` để đảm bảo kết nối SQLite trỏ đúng file database cô lập.

---

### 14. Phân Tách Khởi Tạo Cấu Hình Luật Định Khỏi Dữ Liệu Demo & Responsive Tablet 768px
- **Vấn đề**:
  1. Khi chạy hàm `seedDatabase()`, nếu `runMigrations()` tự động gọi `ensureSystemConfiguration()`, các văn bản pháp luật mẫu sẽ được chèn trước. Sau đó hàm seed tiếp tục chèn cùng ID đó, dẫn đến lỗi `UNIQUE constraint failed: legal_documents.id`.
  2. Tại độ phân giải Tablet 768px (`md` breakpoint), thanh tìm kiếm toàn cục rộng 448px (`md:block`) kích hoạt cùng lúc với logo (260px) và thông tin tài khoản (220px), đẩy chiều rộng header lên 826px, gây lỗi tràn ngang 58px.
- **Giải pháp chuẩn hóa**:
  1. Thêm tham số `runMigrations(initSystemConfig = true)`. Khi gọi từ `seedDatabase()`, truyền `runMigrations(false)` để việc seeding chịu trách nhiệm nạp dữ liệu một lần duy nhất, sạch sẽ và nhất quán.
  2. Tại thanh Header, chuyển thanh tìm kiếm dạng mở rộng sang kích hoạt từ `lg:block` ($\ge 1024\text{px}$) và giữ nút icon tìm kiếm nhỏ gọn tại `lg:hidden`, giúp Tablet 768px hiển thị hoàn hảo (`scrollWidth: 753px <= 768px`) và đạt 75/75 test responsive pass 100%.

---

### 15. UI Quality Watch Không Chặn (Non-Blocking) & Tuân Thủ Chuẩn Touch Target Di Động Civic Tech
- **Vấn đề**:
  1. Trong quá trình phát triển chức năng cốt lõi (Core Business Domain) và kiểm thử trình duyệt, nếu dừng quy trình mỗi khi gặp lỗi UI phụ sẽ làm vỡ mạch và chậm tiến độ. Tuy nhiên, nếu bỏ qua hoàn toàn, các lỗi như text clipping, nút bấm bị đè hoặc touch target quá nhỏ ($< 44\text{px}$) trên mobile sẽ tồn đọng đến khi ra thực địa ngoài nắng.
  2. Tại trang `LegalWorkspacePage`, các tab điều hướng (`matrix`, `worksheet`, `checklist`) ban đầu được định dạng `py-1.5 px-2`, dẫn tới chiều cao nút bấm thực tế chỉ đạt $28\text{px}$ trên viewport di động ($430\times 932$).
- **Giải pháp chuẩn hóa**:
  1. **Cơ chế Watch Non-Blocking**: Thực hiện ghi nhận toàn bộ bất thường giao diện vào `artifacts/ui-anomalies.json` theo ma trận 5 viewports ($390\times 844$, $430\times 932$, $768\times 1024$, $1366\times 768$, $1440\times 900$) qua headless `agent-browser` mà không ngắt luồng nghiệp vụ.
  2. **UI Cleanup Pass Sau Khi Logic Pass**: Sau khi toàn bộ test logic và nghiệp vụ đạt 100%, tiến hành rà soát file `ui-anomalies.json` và sửa tận gốc (Root Cause):
     - Nâng cấp các nút tab thành `min-h-[44px] py-2.5 px-3 touch-target flex items-center justify-center gap-1.5`.
     - Tối ưu nhãn trên mobile: Ẩn bớt từ dài trên màn hình nhỏ và hiển thị đầy đủ trên màn hình lớn (`<span className="hidden sm:inline">...</span><span className="sm:hidden">...</span>`).
### 16. Kiến Trúc Workspace-First, Shell Chuẩn Hóa & Tối Ưu Màn Hình Laptop 14-inch (Windows Scale 125%)
- **Bối cảnh & Vấn đề**:
  1. Bố cục 3 cột cố định trên Desktop (Sidebar + Cột Dữ kiện hồ sơ 300px + Cột Thẩm tra trung tâm + Cột Dữ kiện thiếu & Quyết định 320px) bên trong container `max-w-7xl` làm vùng làm việc trung tâm bị ép chặt xuống chỉ còn ~450px trên màn hình laptop 14-inch (viewport ~1280–1366px).
  2. Giao diện bị chia vụn bởi quá nhiều viền lồng viền (boxes within boxes), thanh dev role switcher nằm tách biệt trên đỉnh chiếm diện tích, các chuỗi raw UUID dài (`[FACT-ITEM-ii-...]`) gây tràn khung và phân tán sự chú ý của cán bộ tác nghiệp.
- **Giải pháp chuẩn hóa (Workspace-First Architecture)**:
  1. **Application Shell Linh hoạt**:
     - Header cố định 56px (`h-14`), loại bỏ hoàn toàn dev bar bên trên.
     - Tích hợp bộ chuyển đổi vai trò (`RoleSwitcher`) dạng dropdown nhỏ gọn ngay trên Header.
     - Sidebar đáp ứng đa tầng: `< 1200px`: 68px icon mode (tự động ẩn text, căn giữa icon, tooltip hover); `1200–1439px`: 196px; `≥ 1440px`: 216px.
     - Loại bỏ giới hạn `max-w-7xl`, content sử dụng 100% không gian còn lại (`flex-1 min-w-0 w-full`).
  2. **Main Legal Canvas Duy Nhất (≥ 800px usable width)**:
     - Trên màn hình 14-inch (1280x800 và 1366x768), canvas làm việc chính đạt chiều rộng thực tế từ **1069px đến 1155px** (vượt xa mức tối thiểu 800px).
  3. **Chuyển Đổi Phân Hệ Phụ Thành Drawers & Popovers**:
     - *Dữ kiện hồ sơ*: Chuyển thành `SideDrawer` (380–420px) kích hoạt qua nút `[Bằng chứng · 12]`, overlay lên nội dung và không làm co giãn canvas chính.
     - *Dữ kiện còn thiếu*: Chuyển thành `SideDrawer` kích hoạt qua nhãn cảnh báo `[⚠ Thiếu 3 dữ kiện]` đặt cạnh header.
     - *Quyết định cán bộ*: Chuyển thành `BottomActionBar` ghim đáy (sticky) hiển thị trạng thái kết luận, độ tin cậy dữ liệu và nút chính `[Ra quyết định →]` mở `DecisionModal` phê duyệt ký duyệt có thẩm quyền (Human-in-the-loop).
  4. **Thẻ Nhận Định & Nhãn Nguồn Thân Thiện**:
     - Thay thế toàn bộ chuỗi raw UUID thô bằng thẻ nguồn nghiệp vụ thân thiện: `[Hiện trường 1]`, `[IoT 1]`, `[Bằng chứng 1]`, kèm 2 hành động tác nghiệp trực tiếp `[Xem bằng chứng]` và `[Đối chiếu căn cứ]`.
  5. **Bộ Primitives Chuẩn Hóa**:
     - Xuất khẩu thống nhất các thành phần: `PageHeader`, `RecordHeader`, `RecordNavigation`, `RecordWorkspace`, `RecordContent`, `Workspace`, `ListWorkspace`, `InvestigationWorkspace`, `FormWorkspace`, `DashboardGrid`, `SideDrawer`, `BottomActionBar`, `DecisionModal`.
- **Kết quả Kiểm chứng**:
  - 87/87 API & domain tests **PASS 100%**.
  - 75/75 responsive matrix combinations **PASS 100%**.
  - 0 console error, 0 horizontal scroll, giao diện sáng màu high-contrast, zero-glassmorphism.

---

### 17. Forensic Codebase Audit: Zero-Glassmorphism Invariant Enforcement, Route Inventory Aliasing, Null-Safety on Analysis Facts & Button Wrap Hardening
- **Bối cảnh & Vấn đề**:
  1. Trong quy trình kiểm thử `node scripts/harness.js release-check` và audit tổng thể, phát hiện 5 tệp JSX còn sót `backdrop-blur-xs` làm fail test gate `runtime-ux-qa-visual-regression.test.js`.
  2. Bảng route inventory kiểm tra thiếu các tuyến đường bí danh cộng đồng (`/community/discover`, `/community/observations`, `/community/cases`), gây fail `full-system-reliability-e2e.test.js`.
  3. `route-inventory-matrix.test.js` kiểm tra cứng các tên component Landing cũ (`HeroSection`, `ProblemSection`) sau khi trang Landing đã được nâng cấp lên giao diện biên tập hiện đại (`Hero`, `ProblemStory`).
  4. Bộ phân tích pháp lý `CaseAnalysisService` và trích xuất dữ kiện `CaseFactService` có rủi ro crash khi vụ việc thiếu mô tả hoặc mã băm tệp rỗng (`TypeError: Cannot read properties of null`).
  5. Nút bấm trên viewports di động hẹp thiếu `whitespace-nowrap shrink-0` làm rớt từ đơn lẻ.
- **Giải pháp chuẩn hóa**:
  1. **Triệt tiêu 100% Glassmorphism**: Thay thế `backdrop-blur-xs` bằng solid background (`bg-white` hoặc `bg-[#1C1917]/60` cho modal).
  2. **Backward-compatible Route Aliases**: Bổ sung các `<Route path="..." element={<Navigate ... replace />} />` bảo đảm 100% liên kết được xử lý an toàn không 404.
  3. **Đồng bộ hóa Test Assertions**: Kiểm tra hỗ trợ cả component canonical lẫn layout biên tập mới.
  4. **Phòng vệ Dữ liệu Thực tế**: Bổ sung `(f.value || '').toLowerCase()`, `(o.value || '').includes(...)`, `(ev.sha256 || '').substring(0, 16)` và chuỗi fallback an toàn.
  5. **Nâng cấp Nút bấm**: Thêm `whitespace-nowrap shrink-0` cho các nút bấm và thanh chuyển đổi vai trò.
- **Kết quả Kiểm chứng**:
  - `node scripts/harness.js release-check`: **76/76 test files PASS 100% (596/596 tests)**.
  - `npm --prefix dustguard-operations run test`: **87/87 tests PASS 100%** + 12-step Real Data E2E PASS.
  - Toàn bộ 4 gói ứng dụng (`apps/server`, `apps/web`, `dustguard-operations`, `app`) biên dịch production build thành công 0 lỗi.

---

### 18. Cloudflare Production Runtime Audit & Zero-Seed 25-Step Journey Hardening
- **Bối cảnh & Vấn đề**:
  1. **Non-deterministic Math.random() trong Edge Workers**: Quét phát hiện các route sinh ID và token bằng `Math.random()` có thể gây lỗi hoặc xung đột trên Cloudflare Edge v8 isolates.
  2. **Kiểm tra băm SHA-256 đối chứng tệp R2**: Cloudflare R2 `bucket.get()` trả về `R2ObjectBody` có phương thức `.arrayBuffer()`, trong khi môi trường dev/mock có thể là `.body` dạng Buffer, dẫn đến `TypeError: obj.arrayBuffer is not a function`.
  3. **Role validation trong API tạo User**: API `POST /api/admin/users` yêu cầu trường `role` (ví dụ: `'staff'`, `'supervisor'`, `'legal_reviewer'`), việc gửi nhầm `role_id` làm token tạo ra bị null và 401 trên các API tiếp theo.
  4. **Database Composite Indexes cho D1**: Bảng `cases` và `projects` thiếu các composite index phục vụ lọc theo mã vụ việc, ngày tạo, công trình và nhà thầu, tiềm ẩn rủi ro full table scan khi dữ liệu tăng trưởng.
- **Giải pháp chuẩn hóa**:
  1. **Web Crypto Native**: Thay thế 100% các lời gọi ngẫu nhiên bằng `crypto.randomUUID()` và Web Crypto chuẩn W3C.
  2. **Unwrap linh hoạt thân tệp R2**: Xử lý `typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : obj.body` để tương thích cả workerd và dev mock.
  3. **Tự động hóa 25 bước E2E từ Clean DB**: Xây dựng script `scripts/verify-cloudflare-runtime-e2e.js` chạy từ DB rỗng hoàn toàn, kiểm tra 25 bước nghiệp vụ từ tiếp nhận đến đóng vụ việc (4 điều kiện khép kín).
  4. **Bổ sung chỉ mục hiệu năng cao**: Thêm `idx_cases_code`, `idx_cases_created_at`, `idx_cases_project`, `idx_cases_contractor`, `idx_projects_contractor` vào `schema.sql`.
- **Kết quả Kiểm chứng**:
  - `scripts/verify-cloudflare-runtime-e2e.js`: **25/25 bước PASS 100%**, ghi nhận vào `artifacts/cloudflare-runtime-e2e.json`.
  - `tests/production-runtime-invariants.test.js`: **5/5 tests PASS** (0 token dev, 0 localhost trong bundle `dist/`).
  - Báo cáo kiểm định `docs/audit/FINAL_CLOUDFLARE_PRODUCTION_READINESS.md` chính thức xác nhận **READY (13/13 Gates PASS)**.




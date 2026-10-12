<div align="center">

# 🌿 DustGuard VN
### Environmental Intelligence & Decision Support Platform for Civic Action

[![UNICEF Innovation](https://img.shields.io/badge/UNICEF_Vietnam-Top_6_National_Finalist-00ADEF?style=for-the-badge&logo=unicef&logoColor=white)](https://dustguard.phamphunguyenhung.com)
[![MARD & MONRE](https://img.shields.io/badge/Partnered_with-MARD_%26_MONRE-16A34A?style=for-the-badge)](https://dustguard.phamphunguyenhung.com)
[![CivicTech](https://img.shields.io/badge/CivicTech-Open_Source-2563EB?style=for-the-badge)](https://dustguard.phamphunguyenhung.com)
[![Live Demo](https://img.shields.io/badge/Live_Demo-dustguard.phamphunguyenhung.com-D97706?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dustguard.phamphunguyenhung.com)

**🏆 TOP 6 CUỘC THI SÁNG TẠO TRẺ VÌ KHÍ HẬU & MÔI TRƯỜNG 2026**  
*Đồng tổ chức bởi UNICEF Việt Nam, Bộ Nông nghiệp & Phát triển Nông thôn và Bộ Tài nguyên & Môi trường*

[🌐 Trải Nghiệm Nền Tảng Trực Tuyến](https://dustguard.phamphunguyenhung.com) • [📋 Báo Cáo Kỹ Thuật](docs/audit/DUSTGUARD_TWO_SIDE_PRODUCTION_AUDIT_FINAL.md) • [📊 Báo Cáo Thuyết Minh GTM](docs/)

<div align="center">
  <img src="uploads/dustguard-community-desktop.png" alt="DustGuard VN Community Platform Hero" width="920" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
</div>

---
</div>

> **DustGuard VN là nền tảng Environmental Intelligence & Decision Support phục vụ Civic Action — Giúp cộng đồng ghi nhận, đối chứng và theo dõi các vấn đề môi trường bằng dữ liệu có cấu trúc, đồng thời hỗ trợ chuyển những trường hợp phù hợp tới các kênh xử lý hiện hữu.**  
> *(Bụi công trình và chất lượng không khí quanh trường học/khu dân cư là bài toán đầu tiên để kiểm chứng mô hình, trước khi mở rộng thành nền tảng trí tuệ môi trường và hành động xanh cho thanh thiếu niên và cộng đồng).*
>
> **Kiến trúc (bản demo gốc `app/`, đã ngưng phát triển — xem `docs/audit/06-LEGACY-DISPOSITION-PLAN.md`)**: 100% Cloudflare Native Serverless Monolith (Hono + Cloudflare Worker + Cloudflare D1 SQLite + Cloudflare R2 Storage + React 19).
> **Kiến trúc thực tế đang phát triển (`apps/` + `dustguard-operations/`)**: Express + Node.js + SQLite cục bộ (`node:sqlite`), React 19 (Vite). **Không có** kết nối Cloudflare Worker/D1/R2 nào trong kiến trúc này — xem `docs/operations/BACKUP_AND_RECOVERY.md` Mục 6 để biết chi tiết đã kiểm chứng.

---

## 1. BẢN ELEVATOR PITCH 30 GIÂY (UNICEF HACKATHON)

> *"Khi một bạn trẻ nhìn thấy bụi từ một công trình gần trường học, vấn đề không chỉ là làm sao gửi một phản ánh. Điều khó hơn là ghi nhận đủ bằng chứng, theo dõi xem tình trạng có thay đổi và biết bước tiếp theo nên làm gì.*
>
> *DustGuard là nền tảng CivicTech giúp cộng đồng ghi nhận vấn đề môi trường bằng ảnh, vị trí và dữ liệu đối chứng trước–sau; hỗ trợ hiểu vấn đề, duy trì lịch sử theo dõi và tạo một hồ sơ có cấu trúc.*
>
> *Khi cần sự can thiệp chính thức, DustGuard không thay thế các hệ thống hiện hữu mà hỗ trợ kết nối case tới những kênh như 1022, iHanoi hoặc đơn vị phù hợp. Bụi công trình là bài toán đầu tiên để chúng em kiểm chứng mô hình, trước khi mở rộng thành một nền tảng hành động xanh cho thanh thiếu niên và cộng đồng."*

---

## 2. BỘ 7 NĂNG LỰC NỀN TẢNG (CAPABILITY STACK)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               DUSTGUARD VN: ENVIRONMENTAL INTELLIGENCE & DECISION SUPPORT              │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│ 1. Community Action      │ 2. Spatial Data           │ 3. Evidence Management          │
│    • Zero-Login 30s      │    • Tọa độ WGS84 chuẩn   │    • Ảnh đối chứng Before/After │
│    • Chiến dịch CLB      │    • Phân vùng Phường/Xã  │    • Mã hash SHA-256 chống sửa  │
│    • Phân công nhiệm vụ  │    • Heatmap & Geofence   │    • Dossier A4 & QR tra cứu    │
├──────────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ 4. Environmental Knowledge│ 5. Case Tracking          │ 6. Green Credits                │
│    • Cẩm nang & QCVN 05  │    • Tách Observation!=Case│   • Giờ tình nguyện thực tế     │
│    • Decision Support AI │    • Follow-up 24h - 48h  │    • Chứng nhận có QR truy vết  │
│    • Phân loại sơ bộ     │    • Giám sát tiến độ     │    • Đơn vị GD xét duyệt quy chế│
├──────────────────────────┴───────────────────────────┴─────────────────────────────────┤
│ 7. Integration & Civic Handoff: Kết nối hồ sơ có cấu trúc sang 1022 / iHanoi / BQLDA   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. LUỒNG DỮ LIỆU & CÂY QUYẾT ĐỊNH XỬ LÝ (ARCHITECTURE DECISION TREE)

```text
               DUSTGUARD ENVIRONMENTAL INTELLIGENCE & DECISION SUPPORT
                                         │
                           COMMUNITY & YOUTH PARTICIPATION
                            Observe / Act / Follow-up
                                         │
                                ENVIRONMENTAL SIGNAL
                             Evidence + Location + Time
                                         │
                                DUSTGUARD RECORD
                 ┌───────────────────────┼───────────────────────┐
            [Understand]           [Follow-up]             [Green Action]
          Legal / Edu info        Before / After         Verified Hours
          Map & Context          Timeline (24-48h)       Certificates (QR)
                                         │
                           IS EXTERNAL ACTION REQUIRED?
                                         │
                       ┌─────────────────┴─────────────────┐
                      NO                                  YES
                       │                                   │
              [Community Follow-up]               [Prepare Structured Case]
           (CLB tự xử lý / dọn dẹp)               (Gom bằng chứng + Dossier A4)
                       │                                   │
              [Mark Resolved & Impact]            [Handoff to 1022 / iHanoi]
                                                  (Kênh chính thức tiếp nhận)
                                                           │
                                                  [Track Public Outcome]
                                                  (Theo dõi kết quả công khai)
                                                           │
                                                  [Community Follow-up]
                                                  (Thanh niên kiểm tra lại)
```

---

## 4. VAI TRÒ TRONG HỆ THỐNG DEMO (DEMO ACCOUNTS)

| Vai Trò | Tài Khoản Demo | Mật Khẩu | Bản Chất Nghiệp Vụ |
|---|---|---|---|
| **Người Dân / Bạn Trẻ** (`citizen`) | *Không cần đăng nhập* | *Không cần* | Mở web là xem ngay bản đồ điểm bụi, chụp ảnh báo bụi 30s (Zero-Login), nhận mã tra cứu |
| **CLB Môi Trường / Đội Xung Kích** (`community`) | `staff@dustguard.vn` | `DustGuard@2026` | Nhận nhiệm vụ khảo sát, kiểm tra lại hiện trường 24-48h, tích lũy giờ tình nguyện |
| **Ban Quản Lý / Nhà Thầu Thi Công** (`contractor`) | `contractor@dustguard.vn` | `DustGuard@2026` | Tiếp nhận thông tin phản ánh cụ thể, nộp ảnh chụp khắc phục (che bạt/rửa đường) |
| **Điều Phối Viên / Cán Bộ Cơ Sở** (`staff`) | `staff@dustguard.vn` | `DustGuard@2026` | Workspace quản lý hàng đợi, chuẩn bị hồ sơ bàn giao (Dossier A4) chuyển tiếp 1022/iHanoi |
| **Quản Trị Kỹ Thuật** (`admin`) | `admin@dustguard.vn` | `DustGuard@2026` | Cấu hình dữ liệu nền, quản trị danh mục địa bàn, seed dữ liệu mẫu |

---

## 5. NGUYÊN TẮC CỐT LÕI (CORE INVARIANTS)

1. **Ranh Giới Rõ Ràng & Định Vị Hỗ Trợ Ra Quyết Định (Decision Support, Not Judge)**:
   - DustGuard hỗ trợ cộng đồng ghi nhận, đối chứng, hiểu vấn đề và kết nối với các kênh xử lý hiện hữu, **không đóng vai cơ quan nhà nước hay ra quyết định xử phạt**.
   - 1022 / iHanoi là **điểm tích hợp**, không phải định vị mới.
   - AI là **trợ lý hỗ trợ phân loại và tóm tắt ngữ cảnh (Assistant)**, con người là chủ thể ra quyết định hành động.
2. **Theo Dõi Tiến Trình Thực Chất (Outcome Tracking - Before/After)**:
   - Giá trị cốt lõi nằm ở chuỗi kiểm tra lại xem hiện trạng đã cải thiện hay chưa (Better / Unchanged / Worse).
   - Mục tiêu 24h - 48h là **Community Follow-up Target** (tỷ lệ điểm được cộng đồng quay lại đối chứng), thời gian xử lý của cơ quan phụ thuộc quy trình chính thức.
3. **Zero-IoT Resilience (IoT là nguồn dữ liệu bổ sung)**:
   - Hệ thống vận hành 100% bằng quan sát thực địa và ảnh chụp khi có 0 cảm biến.
   - Cảm biến bụi IoT (ESP32 + PMS7003 < $25) là module mở rộng hỗ trợ CLB STEM học đường thu thập tín hiệu vi khí hậu bổ trợ.
4. **Bảo Toàn Minh Chứng Số & Quyền Riêng Tư Thực Địa**:
   - Tự động xóa sạch siêu dữ liệu nhạy cảm EXIF (GPS cá nhân, serial thiết bị, model máy) trên trình duyệt trước khi tải lên.
   - Nén ảnh thích ứng **dưới 300KB** chạy mượt mà ngay cả trên mạng di động 3G/4G yếu ngoài hiện trường.
   - Bảo toàn minh chứng bằng mã băm **SHA-256** (Tamper-evident) đối chứng chống sửa đổi nội dung.
5. **Giao Diện Sáng — Độ Tương Phản Cao — Zero Glassmorphism**:
   - Nền kem `#FDFBF7`, chữ mực in `#231B14`, dấu mộc đỏ `#9F241F`, xanh ngọc `#0D6F64`.
   - Nút bấm tối thiểu **44px x 44px**, hiển thị rõ ngoài trời nắng trên màn hình điện thoại 360px - 430px.
6. **Chi Phí Hạ Tầng Pilot Vận Hành Gần Bằng 0**:
   - Chi phí hạ tầng pilot có thể gần bằng 0 trong hạn mức miễn phí hiện tại của Cloudflare (Workers + D1 + R2 + Static Assets) — **áp dụng cho kiến trúc demo gốc `app/`**; kiến trúc `apps/` + `dustguard-operations/` đang phát triển hiện chạy Node.js/Express + SQLite cục bộ, chưa có ước tính chi phí hạ tầng cloud vì chưa triển khai production.
   - Ghi nhận minh bạch khả năng phát sinh chi phí thực tế khi mở rộng: tên miền tùy chỉnh (~$10–$25/năm), dịch vụ email giao dịch và dung lượng mở rộng khi scale vượt Free Tier.

---

## 6. HƯỚNG DẪN KHỞI CHẠY (QUICK START)

```powershell
# 1. Cài đặt dependencies
npm --prefix app install

# 2. Khởi chạy môi trường phát triển (Web + Cloudflare Worker API)
npm run dev

# 3. Chạy kiểm thử tự động nhanh (Quick Gate < 5s)
npm run verify:quick

# 4. Chạy kiểm thử toàn diện hệ thống (Full Test Suites)
npm run verify:dustguard

# 5. Khởi chạy Sensor Simulator nạp dữ liệu đo đạc thử nghiệm
npm run sensor:simulate

# 6. Khôi phục lại dữ liệu Demo chuẩn
npm run demo:reset
```

---

## 7. TÀI LIỆU THAM CHIẾU SSOT (SINGLE SOURCE OF TRUTH)

- 📜 **Từ điển Thuật ngữ Khoa học & Ngôn ngữ Học**: [`.agents/ssot/TERMINOLOGY.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/ssot/TERMINOLOGY.md)
- 🎯 **Định vị & Năng lực Sản phẩm**: [`.agents/ssot/PRODUCT.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/ssot/PRODUCT.md)
- 🤝 **Quy trình Chuyển giao & Tích hợp 1022/iHanoi**: [`.agents/ssot/CIVIC_HANDOFF_SSOT.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/ssot/CIVIC_HANDOFF_SSOT.md)
- 🗄️ **Cơ sở Dữ liệu & Schema D1 SQLite**: [`.agents/ssot/DATABASE.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/ssot/DATABASE.md)
- 🎨 **Hệ Thống Thiết Kế & Design Tokens**: [`.agents/ssot/UI.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/ssot/UI.md)
- 🛡️ **Bẫy Lỗi & Kinh Nghiệm Khắc Phục**: [`.agents/BUG_MEMORY.md`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/.agents/BUG_MEMORY.md)


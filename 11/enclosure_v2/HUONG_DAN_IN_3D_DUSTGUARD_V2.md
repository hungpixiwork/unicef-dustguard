# HƯỚNG DẪN IN 3D & KIỂM ĐỊNH VỎ HỘP DUSTGUARD OUTDOOR V2
## Đánh giá chuẩn cơ khí chế tạo mẫu (3D Print Readiness) cho Công trường ngoài trời

> **Dự án**: DustGuard VN — Samsung Innovation Campus 2026 (Nhóm 11)  
> **Linh kiện tương thích**: Cảm biến laser **ASAIR APM2000** (49 x 31.5 x 10.8 mm) + Vi điều khiển **ESP32 NodeMCU-32S** (25.4 x 48.3 mm)

---

## 🔍 I. KẾT QUẢ KIỂM ĐỊNH MÔ HÌNH (INSPECTION REPORT)

| Hạng mục kiểm tra | Thông số thiết kế V2 | Đánh giá chuẩn in 3D | Lưu ý chế tạo thực tế |
|---|---|---|---|
| **Kích thước bao thân vỏ** | 134.80 x 95.10 x 55.00 mm | ✅ **ĐẠT CHUẨN** | Vừa vặn trên 100% các máy in phổ thông (Ender 3, Bambu Lab, Prusa, Creality K1) |
| **Độ dày thành (Wall thickness)** | **2.7 mm** (thân), **3.0 mm** (nắp) | ✅ **RẤT TỐT** | Tương đương 6-7 đường chu vi (0.4mm nozzle). Đảm bảo kín nước, không bị rò qua lớp in (layer seepage) |
| **Không gian lắp APM2000** | 51.0 x 33.5 mm (độ sâu 41.3 mm) | ✅ **ĐẠT CHUẨN** | Dung sai +2.0 mm bù trừ co ngót nhựa. Dư ~30mm chiều sâu cho dây cắm và quạt hút laser |
| **Rãnh trượt ESP32** | 26.6 x 50.3 mm (ray cao 3.2 mm) | ✅ **ĐẠT CHUẨN** | Trượt vừa khít bo mạch Ai-Thinker, đầu cắm cổng USB quay về đáy |
| **Lỗ chèn ốc M3 (Heat-set inserts)** | 4 lỗ đường kính **4.2 mm** (trụ OD 9mm) | ✅ **CHUẨN VÀNG** | Kích thước chuẩn cho insert đồng ren M3 (M3 x 4 x 5). Hàn nhiệt mỏ hàn 230°C |
| **Lỗ ốc trên nắp** | Đường kính 3.4 mm + bậc chìm 6.6 mm | ✅ **ĐẠT CHUẨN** | Vừa khít ốc lục giác chìm M3 x 10-12 mm (DIN 912) |
| **Lỗ cáp nguồn đáy (Cable Gland)** | Đường kính **12.7 mm** (vành dày 20mm) | ✅ **CHUẨN PG7** | Chuẩn tuyệt đối cho ốc siết cáp chống nước PG7 (ren 12.5mm) hoặc M12 |
| **Tai bắt cột & treo tường** | Dày 4.2 mm, rãnh dây 5.2x19 mm | ✅ **ĐẠT CHUẨN** | Luồn được dây rút 4.8mm hoặc dây đai inox siết cột tròn; có lỗ khóa treo tường |
| **Rãnh gioăng làm kín (Gasket)** | Gờ thân 1.6 mm x Rãnh nắp 2.4 mm | ✅ **ĐẠT CHUẨN** | Nén gioăng TPU 1.0mm khi siết ốc, chống nước mưa tạt |

---

## ⚠️ II. CÁC ĐIỂM CẦN CẢI TIẾN TRƯỚC KHI IN (CRITICAL IMPROVEMENTS)

1. **Lỗi xếp chồng file 3MF gốc (`DustGuard_V2_printplate_LED.3mf`)**:
   - *Vấn đề*: File 3MF gốc đặt cả 3 chi tiết (Thân vỏ, Nắp, Gioăng) tại cùng tọa độ `(0, 0, 0)` đè lên nhau, và gioăng TPU không thể in chung bàn với nhựa cứng (PETG/ASA).
   - *Cải tiến đã xử lý*: Đã tách thành 2 bàn in riêng biệt:
     - 📁 [`DustGuard_V2_Plate1_Body_and_Lid_PETG.3mf`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/11/enclosure_v2/DustGuard_V2_Plate1_Body_and_Lid_PETG.3mf): Chứa Thân + Nắp xếp sẵn cách nhau 110mm trên bàn in nhựa cứng.
     - 📁 [`DustGuard_V2_Plate2_Gasket_TPU.3mf`](file:///d:/07-Competitions-Hackathons/unicef-dustguard/11/enclosure_v2/DustGuard_V2_Plate2_Gasket_TPU.3mf): Chứa Gioăng làm kín in bằng nhựa dẻo TPU.

2. **Cấu hình Support (Cây chống) cho Thân vỏ**:
   - *Vấn đề*: Thân vỏ in theo hướng **Mặt lưng nằm áp sát bàn in (Back-face down)**. Mái che trên (canopy) bắt đầu ở Z = 4.0 mm và hai tai che mưa sườn (side hoods) bắt đầu ở Z = 13.5 mm lơ lửng trong không khí.
   - *Cải tiến*: **BẮT BUỘC BẬT SUPPORT** trong phần mềm cắt lát (Slicer):
     - Chọn kiểu support: **Tree Supports (Cây chống Organic)**.
     - Phạm vi: **Chỉ chạm bàn in (Touching buildplate only)**.
     - Đặt **Support Blocker** (chặn support) bên trong khe hút khí hẹp 4mm hai bên để không bị kẹt nhựa khó cạy.

---

## 🖨️ III. THÔNG SỐ CÀI ĐẶT IN 3D CHUẨN (SLICER SETTINGS)

### 1. Thân vỏ & Nắp (Bàn 1)
- **Vật liệu bắt buộc**: Nhựa **PETG** (tối thiểu) hoặc **ASA** (khuyên dùng tốt nhất ngoài trời, chống tia cực tím UV và chịu nhiệt đến 95°C). ❌ *Tuyệt đối không dùng PLA vì sẽ bị mềm/móp dưới nắng hè công trường.*
- **Hướng in**:
  - Thân vỏ: Úp mặt lưng (phần có tai bắt ốc) nằm phẳng trên bàn in.
  - Nắp: Nằm phẳng trên bàn in, mặt có chữ hướng lên trên.
- **Đầu phun (Nozzle)**: 0.4 mm.
- **Độ cao lớp (Layer height)**: 0.20 mm.
- **Số lớp thành (Perimeters / Walls)**: **4 lớp** (đảm bảo chống thấm nước xuyên qua lớp in).
- **Lớp đáy / Lớp mặt (Top / Bottom layers)**: **5 lớp**.
- **Độ đặc bên trong (Infill)**: **30% Gyroid** (chịu lực đồng hướng, không bị rỗng nứt).
- **Nhiệt độ in gợi ý**:
  - PETG: Đầu in 235–245°C, Bàn nhiệt 70–80°C.
  - ASA: Đầu in 250–260°C, Bàn nhiệt 95–105°C (cần máy in có buồng kín).

### 2. Gioăng làm kín (Bàn 2)
- **Vật liệu**: Nhựa dẻo **TPU 95A** (hoặc TPU 90A).
- **Độ cao lớp**: 0.20 mm.
- **Độ đặc (Infill)**: **100% Solid**.
- **Tốc độ in**: Giảm chậm 20–30 mm/s để tránh kẹt nhựa dẻo.

---

## 🔩 IV. PHỤ KIỆN KIM KHÍ ĐI KÈM (BOM PHẦN CỨNG LẮP RÁP)

1. **Ốc siết nắp**: 4 x Ốc lục giác chìm Inox 304 **M3 x 10 mm** (hoặc M3 x 12 mm).
2. **Ren cấy nhiệt**: 4 x Ống ren đồng **M3 x 4 x 4.2 mm** (M3 heat-set brass insert).
3. **Ốc siết cáp ngoài trời**: 1 x Đầu siết cáp chống nước **PG7** (kèm ron cao su, lỗ khoét 12.5–12.7 mm).
4. **Keo chống nước đèn LED (với nắp có LED)**: 1 giọt keo silicone trung tính hoặc keo Epoxy trong suốt chấm vào 3 lỗ đèn 3mm.
5. **Dây siết cột**: 2 x Dây rút chịu nhiệt UV bản rộng 4.8–7.6 mm hoặc đai siết cổ dê Inox 304.

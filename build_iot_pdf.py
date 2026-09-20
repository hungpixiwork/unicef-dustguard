import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def build_pdf():
    pdf_filename = "20-09-iot-docs.pdf"
    
    # 1. Đăng ký Font Unicode tiếng Việt (Arial từ Windows)
    font_path = "C:/Windows/Fonts/arial.ttf"
    font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
    font_italic_path = "C:/Windows/Fonts/ariali.ttf"
    font_bi_path = "C:/Windows/Fonts/arialbi.ttf"
    
    pdfmetrics.registerFont(TTFont('Arial', font_path))
    pdfmetrics.registerFont(TTFont('Arial-Bold', font_bold_path))
    pdfmetrics.registerFont(TTFont('Arial-Italic', font_italic_path))
    pdfmetrics.registerFont(TTFont('Arial-BoldItalic', font_bi_path))
    
    # Thiết lập document
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Định nghĩa màu sắc Civic Tech (chuẩn sáng, tương phản cao, không glassmorphism)
    c_primary = colors.HexColor('#0d6f64')    # Teal đậm
    c_dark = colors.HexColor('#0F172A')       # Slate đậm chữ chính
    c_seal = colors.HexColor('#9f241f')       # Seal red điểm nhấn
    c_bg_card = colors.HexColor('#F8FAFC')    # Slate 50 nền thẻ
    c_border = colors.HexColor('#CBD5E1')     # Slate 300 viền
    c_subtext = colors.HexColor('#475569')    # Slate 600 phụ đề
    
    # Các kiểu Paragraph
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Arial-Bold',
        fontSize=18,
        leading=22,
        textColor=c_primary,
        alignment=0,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Arial',
        fontSize=10,
        leading=14,
        textColor=c_subtext,
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        fontName='Arial-Bold',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Header2',
        fontName='Arial-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Arial',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=4
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        fontName='Arial-Bold',
        fontSize=9,
        leading=13,
        textColor=c_dark
    )
    
    quote_style = ParagraphStyle(
        'QuoteStyle',
        fontName='Arial-Italic',
        fontSize=9,
        leading=13,
        textColor=c_primary,
        backColor=colors.HexColor('#F0FDF4'),
        borderColor=c_primary,
        borderWidth=1,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=8
    )
    
    qa_q_style = ParagraphStyle(
        'QAQuestion',
        fontName='Arial-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=c_seal,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )
    
    qa_a_style = ParagraphStyle(
        'QAAnswer',
        fontName='Arial',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=6
    )

    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Arial',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Arial-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark
    )
    
    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Arial-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white
    )

    story = []
    
    # Header tiêu đề
    story.append(Paragraph("DUSTGUARD VN — TÀI LIỆU KỸ THUẬT PHÂN HỆ IOT", title_style))
    story.append(Paragraph("Hệ thống quan trắc bụi mịn thời gian thực • Nền tảng: ESP32 + ASAIR APM2000 + Cloudflare D1", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceAfter=8))
    
    story.append(Paragraph("<b>Triết lý thiết kế cốt lõi:</b> <i>\"Node = Sensor + Connectivity\"</i> — Tối giản phần cứng hiện trường để giảm BOM (~500k VNĐ), tăng độ bền chống thời tiết khắc nghiệt, chuyển tải phân tích & cảnh báo lên Cloud.", quote_style))
    
    # PHẦN 1
    story.append(Paragraph("1. KIẾN TRÚC PHẦN CỨNG & LINH KIỆN CỐT LÕI", h1_style))
    story.append(Paragraph("• <b>Cảm biến bụi laser ASAIR APM2000 (Aosong):</b><br/>"
                           "- <i>Nguyên lý:</i> Tán xạ quang học laser (Laser Light Scattering) kết hợp quạt hút khí cưỡng bức chủ động (Active Air Sampling).<br/>"
                           "- <i>Đo đạc đồng thời 3 dải hạt:</i> PM1.0 (hạt siêu vi), PM2.5 (bụi hô hấp), PM10 (bụi tổng hợp) trong dải 0 - 1000 µg/m³.<br/>"
                           "- <i>Tần suất xuất dữ liệu:</i> 1 giây/lần. Giao tiếp UART nối tiếp (8N1: 8 data bits, no parity, 1 stop bit).", body_style))
    
    story.append(Paragraph("• <b>Vi điều khiển ESP32 NodeMCU-32S:</b> Dual-core 240MHz, tích hợp Wi-Fi 2.4GHz, nhận UART phần cứng (UART2), kiểm tra tổng kiểm checksum, quản lý bộ đệm ngoại tuyến (Offline Queue) và gửi telemetry lên Cloud API.", body_style))
    
    # Bảng đấu dây
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Bảng sơ đồ đấu nối chân (Pinout Wiring):</b>", body_bold))
    pin_data = [
        [Paragraph("Chân APM2000", table_header), Paragraph("Tín hiệu", table_header), Paragraph("Chân nối ESP32", table_header), Paragraph("Quy chuẩn kỹ thuật", table_header)],
        [Paragraph("Pin 1", table_cell_bold), Paragraph("VCC", table_cell), Paragraph("VIN (5V)", table_cell_bold), Paragraph("Cấp nguồn 5V cho laser và quạt (không nối vào 3.3V)", table_cell)],
        [Paragraph("Pin 2", table_cell_bold), Paragraph("GND", table_cell), Paragraph("GND", table_cell_bold), Paragraph("Nối mass chung toàn hệ thống", table_cell)],
        [Paragraph("Pin 3", table_cell_bold), Paragraph("TX", table_cell), Paragraph("GPIO 16 (RX2)", table_cell_bold), Paragraph("ESP32 nhận dữ liệu UART từ cảm biến", table_cell)],
        [Paragraph("Pin 4", table_cell_bold), Paragraph("RX", table_cell), Paragraph("GPIO 17 (TX2)", table_cell_bold), Paragraph("Gửi cấu hình / tập lệnh điều khiển sang cảm biến", table_cell)],
        [Paragraph("Pin 5", table_cell_bold), Paragraph("SET", table_cell), Paragraph("3V3 hoặc để hở", table_cell), Paragraph("Kéo mức cao (HIGH) kích hoạt chế độ đo liên tục", table_cell)],
        [Paragraph("Pin 6", table_cell_bold), Paragraph("RESET", table_cell), Paragraph("NC (Không nối)", table_cell), Paragraph("Chân reset phần cứng, để hở khi chạy bình thường", table_cell)]
    ]
    t_pin = Table(pin_data, colWidths=[70, 55, 90, 305])
    t_pin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_card]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_pin)
    
    # PHẦN 2
    story.append(Spacer(1, 6))
    story.append(Paragraph("2. XỬ LÝ DỮ LIỆU BIÊN & GIAO THỨC TRUYỀN (EDGE & PROTOCOL)", h1_style))
    story.append(Paragraph("• <b>Cấu trúc khung truyền 32 bytes (APM2000 Frame):</b><br/>"
                           "- <i>Header:</i> 2 bytes đầu <code>0x42 0x4D</code> (mã ASCII 'BM').<br/>"
                           "- <i>Dữ liệu thực địa:</i> Byte 11-12 (PM1.0), Byte 13-14 (PM2.5), Byte 15-16 (PM10) = <code>(High_Byte &lt;&lt; 8) | Low_Byte</code>.<br/>"
                           "- <i>Tổng kiểm Checksum:</i> Tổng 30 byte đầu tiên so khớp 2 byte cuối (Byte 31-32). Tỷ lệ lỗi kiểm tra &lt; 0.2%, hủy ngay gói lỗi nếu không khớp.", body_style))
    
    story.append(Paragraph("• <b>Cơ chế đệm ngoại tuyến (Offline Circular Queue):</b><br/>"
                           "Khi công trường mất sóng Wi-Fi tạm thời, ESP32 lưu tối đa 30 mẫu đo gần nhất vào SRAM. Ngay khi có mạng trở lại, hệ thống tự động đẩy dữ liệu theo thứ tự FIFO lên server, chống đứt gãy chuỗi thời gian.", body_style))

    # PHẦN 3
    story.append(Spacer(1, 6))
    story.append(Paragraph("3. VỎ HỘP CÔNG NGHIỆP V2 NGOÀI TRỜI (ENCLOSURE V2)", h1_style))
    story.append(Paragraph("Bộ vỏ in 3D chuyên dụng đạt 6 tiêu chuẩn cơ khí bảo vệ:<br/>"
                           "1. <b>Mái che mưa (Rain Canopy):</b> Nhô ra 11mm ngăn nước mưa tạt trực diện vào cửa hút.<br/>"
                           "2. <b>Cửa hút mê cung (Labyrinth Vents):</b> Khe hút chúc xuống dưới, đón khí tự nhiên nhưng cản 100% giọt nước xiên.<br/>"
                           "3. <b>Cửa thoát đối lưu đáy:</b> Đảm bảo quạt APM2000 lưu thông khí liên tục, không đọng áp suất.<br/>"
                           "4. <b>Gioăng cao su TPU 95A:</b> Rãnh khóa âm dương 2.4mm / 1.6mm kèm 4 ốc thép inox M3 và ren đồng heat-set.<br/>"
                           "5. <b>Khớp siết cáp PG7:</b> Đáy hộp có đầu siết cáp cao su kín nước tuyệt đối cho dây nguồn.<br/>"
                           "6. <b>Vật liệu in FDM:</b> Bắt buộc dùng <b>PETG hoặc ASA</b> (chịu nhiệt 90°C, kháng UV, cấm dùng PLA vì mềm dưới nắng).", body_style))

    # PHẦN 4
    story.append(Spacer(1, 6))
    story.append(Paragraph("4. CLOUD EDGE, D1 DATABASE SSOT & BẢNG GIÁ BOM (~505K VNĐ)", h1_style))
    story.append(Paragraph("• <b>Cloudflare Ingestion API:</b> <code>POST /api/iot/telemetry</code> thẩm định giới hạn vật lý (0 - 2500 µg/m³), tính toán trạng thái Online (lastSeenAt ≤ 30s) và lưu vào bảng <code>iot_readings</code>, <code>iot_devices</code>.<br/>"
                           "• <b>Chuẩn đối chiếu:</b> Tự động so sánh nồng độ bụi với <b>QCVN 05:2023/BTNMT</b> (PM2.5 24h &gt; 50 µg/m³, PM10 &gt; 100 µg/m³) để phát tín hiệu cảnh báo trên Web Dashboard.", body_style))

    story.append(Spacer(1, 4))
    bom_data = [
        [Paragraph("STT", table_header), Paragraph("Hạng mục linh kiện", table_header), Paragraph("Quy cách & Tính năng", table_header), Paragraph("Đơn giá", table_header)],
        [Paragraph("1", table_cell_bold), Paragraph("Cảm biến laser ASAIR APM2000", table_cell_bold), Paragraph("Đo tán xạ laser PM1.0, PM2.5, PM10, quạt chủ động", table_cell), Paragraph("270.000đ", table_cell)],
        [Paragraph("2", table_cell_bold), Paragraph("Vi điều khiển ESP32 NodeMCU-32S", table_cell_bold), Paragraph("Wi-Fi 2.4GHz, 2x UART, Dual Core 240MHz", table_cell), Paragraph("90.000đ", table_cell)],
        [Paragraph("3", table_cell_bold), Paragraph("Vỏ hộp ngoài trời V2 (In 3D)", table_cell_bold), Paragraph("Nhựa PETG/ASA ngoài trời + Gioăng TPU 95A (~135g)", table_cell), Paragraph("110.000đ", table_cell)],
        [Paragraph("4", table_cell_bold), Paragraph("Ốc Inox M3, ren đồng & khớp PG7", table_cell_bold), Paragraph("4 ốc M3 + 4 cọc đồng heat-set + 1 đầu siết cáp PG7", table_cell), Paragraph("15.000đ", table_cell)],
        [Paragraph("5", table_cell_bold), Paragraph("Nguồn 5V-2A & Cáp nối", table_cell_bold), Paragraph("Adapter cấp nguồn 5V ổn định và bẹ dây cắm", table_cell), Paragraph("20.000đ", table_cell)],
        [Paragraph("<b>TỔNG</b>", table_cell_bold), Paragraph("<b>Trọn bộ 1 trạm quan trắc IoT Node</b>", table_cell_bold), Paragraph("<b>Hoàn thiện, hoạt động độc lập ngoài hiện trường</b>", table_cell_bold), Paragraph("<b>~505.000đ</b>", table_cell_bold)]
    ]
    t_bom = Table(bom_data, colWidths=[28, 170, 240, 82])
    t_bom.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, c_bg_card]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_bom)

    # PHẦN 5
    story.append(Spacer(1, 8))
    story.append(Paragraph("5. BỘ CÂU HỎI PHẢN BIỆN KỸ THUẬT DỰ KIẾN CỦA GIẢNG VIÊN", h1_style))
    
    story.append(Paragraph("<b>Q1: Cảm biến APM2000 hoạt động theo nguyên lý gì? Có gì vượt trội so với cảm biến giá rẻ?</b>", qa_q_style))
    story.append(Paragraph("<b>Trả lời:</b> APM2000 dùng nguyên lý tán xạ ánh sáng laser (Laser Light Scattering) với quạt hút khí chủ động để đo nồng độ hạt bụi thực tế PM1.0, PM2.5, PM10 theo đơn vị chuẩn µg/m³. Các loại rẻ tiền (Sharp GP2Y, cảm biến quang trở analog) chỉ xuất điện áp tương đối, độ trôi nhiệt cực cao, không phân biệt được hạt bụi siêu vi và bị sai số nặng bởi ánh sáng ngoài trời.", qa_a_style))

    story.append(Paragraph("<b>Q2: Nếu Wi-Fi tại công trường bị ngắt kết nối thì dữ liệu có bị mất không?</b>", qa_q_style))
    story.append(Paragraph("<b>Trả lời:</b> Firmware ESP32 có cơ chế đệm vòng ngoại tuyến (Offline Circular Queue) trong bộ nhớ SRAM. Khi mất mạng, node tiếp tục đo và lưu trữ dữ liệu. Ngay khi có mạng trở lại, hệ thống tự động đẩy gói tin theo thứ tự FIFO lên server, đảm bảo tính liên tục của dữ liệu lịch sử.", qa_a_style))

    story.append(Paragraph("<b>Q3: Vỏ hộp lắp ngoài trời chống chọi thời tiết nắng mưa ra sao?</b>", qa_q_style))
    story.append(Paragraph("<b>Trả lời:</b> Vỏ V2 có mái che đua 11mm, cửa hút dạng mê cung chúc xuống cản giọt bắn mưa, nắp ép gioăng TPU 95A siết ốc M3 và đáy có khớp PG7 chống nước. Vỏ được in bằng PETG/ASA chịu nhiệt tới 90°C và kháng tia cực tím UV (không dùng PLA).", qa_a_style))

    story.append(Paragraph("<b>Q4: Dữ liệu đưa lên Cloud được bảo vệ và xử lý như thế nào?</b>", qa_q_style))
    story.append(Paragraph("<b>Trả lời:</b> Cloudflare Worker nhận telemetry qua HTTPS, kiểm tra hợp lệ khoảng giá trị vật lý (0 - 2500 µg/m³), ghi vào cơ sở dữ liệu SQLite D1 SSOT và tự động so sánh ngưỡng QCVN 05:2023/BTNMT để kích hoạt cảnh báo tức thời trên Dashboard.", qa_a_style))

    doc.build(story)
    print("Build PDF successful: " + pdf_filename)

if __name__ == '__main__':
    build_pdf()

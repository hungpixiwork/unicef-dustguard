import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { db, run, get, exec, transaction } from './connection.js';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root and uploads dir
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Generate realistic SVG mock evidence images if not existing
function ensureEvidenceFiles() {
  const files = [
    { name: 'evidence-dust-site1.svg', title: 'Hiện trường Bụi Mù Mịt - Thi Công Huỳnh Thúc Kháng', color: '#c2410c' },
    { name: 'evidence-wheel-wash.svg', title: 'Xe Tải Ra Vào Không Rửa Xe - Vệt Bùn Đất Kéo Dài', color: '#b45309' },
    { name: 'evidence-mesh-torn.svg', title: 'Lưới Chống Bụi Rách Rưới Mặt Tiền Công Trình', color: '#be123c' },
    { name: 'evidence-fixed-mesh.svg', title: 'Đã Bổ Sung Lưới Xanh Chống Bụi Dày 3 Lớp', color: '#047857' },
    { name: 'evidence-fixed-mist.svg', title: 'Hệ Thống Phun Sương Dập Bụi Đã Đi Vào Hoạt Động', color: '#0284c7' },
  ];

  const results: Record<string, { filePath: string; sha256: string; size: number }> = {};

  for (const f of files) {
    const fullPath = path.join(UPLOADS_DIR, f.name);
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#f8fafc"/>
      <rect x="20" y="20" width="600" height="440" rx="12" fill="${f.color}" fill-opacity="0.1" stroke="${f.color}" stroke-width="3"/>
      <circle cx="320" cy="180" r="60" fill="${f.color}" fill-opacity="0.2"/>
      <path d="M290 180 L310 200 L350 160" stroke="${f.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="320" y="280" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">DUSTGUARD OPERATIONS</text>
      <text x="320" y="315" font-family="sans-serif" font-size="16" fill="#334155" text-anchor="middle">${f.title}</text>
      <text x="320" y="350" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">Timestamp: 2026-09-06 | Geotag: Hanoi Capital City</text>
    </svg>`;

    fs.writeFileSync(fullPath, svgContent, 'utf-8');
    const hash = crypto.createHash('sha256').update(svgContent).digest('hex');
    results[f.name] = {
      filePath: `/uploads/${f.name}`,
      sha256: hash,
      size: Buffer.byteLength(svgContent),
    };
  }

  return results;
}

export function seedDatabase() {
  console.log('[Database Seed] Starting operations database seeding (Hanoi 2-level model)...');

  const tables = [
    'human_decisions',
    'analysis_runs',
    'automation_runs',
    'automation_rules',
    'iot_events',
    'iot_readings',
    'iot_devices',
    'tasks',
    'case_signals',
    'signals',
    'integration_logs',
    'audit_logs',
    'notifications',
    'case_closures',
    'remediation_submissions',
    'corrective_actions',
    'inspection_findings',
    'inspection_items',
    'inspections',
    'inspection_template_items',
    'inspection_templates',
    'legal_reviews',
    'legal_analyses',
    'legal_search_history',
    'legal_sections',
    'legal_documents',
    'evidence_assets',
    'staff_assignments',
    'case_timeline',
    'cases',
    'projects',
    'contractors',
    'system_configs',
    'sessions',
    'users',
  ];

  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of tables) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${t};`);
    } catch (e) { }
  }
  try {
    db.exec(`DROP TABLE IF EXISTS legal_sections_fts;`);
  } catch (e) { }
  db.exec('PRAGMA foreign_keys = ON;');

  runMigrations(false);

  const evidenceMap = ensureEvidenceFiles();
  const passwordHash = bcrypt.hashSync('password123', 8);

  transaction(() => {

    // 1. Seed Users (13 users Hà Nội)
    console.log('[Database Seed] Seeding 13 operational users...');
    const users = [
      { id: 'usr-staff-1', username: 'staff1', full_name: 'Nguyễn Văn Hùng', email: 'staff1@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 1 (Hà Nội)', phone: '0901234561' },
      { id: 'usr-staff-2', username: 'staff2', full_name: 'Trần Thị Mai', email: 'staff2@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 2 (Hà Nội)', phone: '0901234562' },
      { id: 'usr-staff-3', username: 'staff3', full_name: 'Lê Hoàng Nam', email: 'staff3@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 3 (Hà Nội)', phone: '0901234563' },
      { id: 'usr-staff-4', username: 'staff4', full_name: 'Phạm Quốc Bảo', email: 'staff4@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 1 (Hà Nội)', phone: '0901234564' },
      { id: 'usr-staff-5', username: 'staff5', full_name: 'Đỗ Thị Lan', email: 'staff5@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 2 (Hà Nội)', phone: '0901234565' },
      { id: 'usr-staff-6', username: 'staff6', full_name: 'Vũ Anh Tuấn', email: 'staff6@dustguard.gov.vn', role: 'staff', department: 'Đội Kiểm tra Hiện trường Số 3 (Hà Nội)', phone: '0901234566' },
      { id: 'usr-staff-7', username: 'staff7', full_name: 'Bùi Thanh Sơn', email: 'staff7@dustguard.gov.vn', role: 'staff', department: 'Đội Giám sát Công nghệ & Cảm biến', phone: '0901234567' },
      { id: 'usr-staff-8', username: 'staff8', full_name: 'Hoàng Thu Trang', email: 'staff8@dustguard.gov.vn', role: 'staff', department: 'Đội Tiếp nhận Phản ánh Nhân dân', phone: '0901234568' },
      { id: 'usr-sup-1', username: 'supervisor1', full_name: 'Võ Minh Trí', email: 'supervisor1@dustguard.gov.vn', role: 'supervisor', department: 'Phòng Điều phối & Giám sát Môi trường', phone: '0918889901' },
      { id: 'usr-sup-2', username: 'supervisor2', full_name: 'Hoàng Kim Yến', email: 'supervisor2@dustguard.gov.vn', role: 'supervisor', department: 'Phòng Điều phối & Giám sát Môi trường', phone: '0918889902' },
      { id: 'usr-legal-1', username: 'legal1', full_name: 'Luật sư Đặng Thu Thảo', email: 'legal1@dustguard.gov.vn', role: 'legal_reviewer', department: 'Ban Pháp chế Môi trường Đô thị', phone: '0932223301' },
      { id: 'usr-legal-2', username: 'legal2', full_name: 'ThS. Trần Quang Huy', email: 'legal2@dustguard.gov.vn', role: 'legal_reviewer', department: 'Ban Pháp chế Môi trường Đô thị', phone: '0932223302' },
      { id: 'usr-admin-1', username: 'admin', full_name: 'Quản trị viên Hệ thống', email: 'admin@dustguard.gov.vn', role: 'admin', department: 'Trung tâm Vận hành CNTT DustGuard', phone: '0999888777' },
    ];

    for (const u of users) {
      run(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, department, phone, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', '-30 days'))`,
        [u.id, u.username, passwordHash, u.full_name, u.email, u.role, u.department, u.phone]
      );
    }

    // 2. Seed Legal Documents & Sections
    console.log('[Database Seed] Seeding legal documents & FTS5 sections...');
    const legalDocs = [
      {
        id: 'doc-bvmt-2020',
        title: 'Luật Bảo vệ Môi trường 2020',
        document_number: '72/2020/QH14',
        authority: 'Quốc hội Nước CHXHCN Việt Nam',
        issued_date: '2020-11-17',
        effective_date: '2022-01-01',
        status: 'ACTIVE',
        source_url: 'https://vanban.chinhphu.vn/?pageid=27160&docid=202157',
        sections: [
          {
            id: 'sec-bvmt-64',
            section_type: 'Article',
            section_number: 'Điều 64',
            heading: 'Bảo vệ môi trường trong hoạt động xây dựng',
            content: '1. Quy hoạch xây dựng phải phù hợp với quy hoạch bảo vệ môi trường. Cơ quan, tổ chức, cá nhân khi thi công công trình xây dựng phải có biện pháp che chắn, không để phát tán bụi, tiếng ồn, độ rung, ánh sáng vượt quy chuẩn kỹ thuật môi trường; thu gom, xử lý nước thải, bùn thải và chất thải rắn xây dựng theo quy định. 2. Phương tiện vận chuyển vật liệu xây dựng rời phải được che đậy kín; rửa sạch bánh xe trước khi rời công trường đi vào đường giao thông công cộng.',
          },
          {
            id: 'sec-bvmt-102',
            section_type: 'Article',
            section_number: 'Điều 102',
            heading: 'Kiểm soát ô nhiễm không khí và giám sát bụi phát tán',
            content: '1. Cơ sở sản xuất, kinh doanh, dịch vụ, công trình xây dựng có phát sinh bụi, khí thải lưu lượng lớn phải lắp đặt hệ thống quan trắc khí thải tự động, liên tục và truyền số liệu trực tiếp về cơ quan quản lý môi trường cấp tỉnh. 2. Bắt buộc thực hiện các biện pháp giảm thiểu bụi tại nguồn và dập bụi trong suốt thời gian thi công.',
          },
          {
            id: 'sec-bvmt-160',
            section_type: 'Article',
            section_number: 'Điều 160',
            heading: 'Trách nhiệm tiếp nhận, xác minh và xử lý phản ánh của người dân về môi trường',
            content: '1. Cơ quan quản lý nhà nước về bảo vệ môi trường các cấp có trách nhiệm tổ chức hệ thống tiếp nhận, xác minh, xử lý kịp thời thông tin phản ánh, kiến nghị của tổ chức, cá nhân, cộng đồng dân cư về bảo vệ môi trường. 2. Kết quả kiểm tra, xử lý vi phạm phải được công khai minh bạch cho người dân.',
          },
        ],
      },
      {
        id: 'doc-nd-45-2022',
        title: 'Nghị định quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường',
        document_number: '45/2022/NĐ-CP',
        authority: 'Chính phủ',
        issued_date: '2022-07-07',
        effective_date: '2022-08-25',
        status: 'ACTIVE',
        source_url: 'https://vanban.chinhphu.vn/?pageid=27160&docid=206126',
        sections: [
          {
            id: 'sec-nd45-15-1a',
            section_type: 'Point',
            section_number: 'Điểm a Khoản 1 Điều 15',
            heading: 'Hành vi không che chắn công trình xây dựng để bụi phát tán',
            content: 'Phạt tiền từ 10.000.000 đồng đến 15.000.000 đồng đối với hành vi không che chắn hoặc che chắn không bảo đảm yêu cầu kỹ thuật để bụi, vật liệu xây dựng rơi vãi, phát tán ra môi trường xung quanh trong quá trình thi công xây dựng công trình.',
          },
          {
            id: 'sec-nd45-15-1b',
            section_type: 'Point',
            section_number: 'Điểm b Khoản 1 Điều 15',
            heading: 'Hành vi không rửa xe trước khi rời công trường xây dựng',
            content: 'Phạt tiền từ 15.000.000 đồng đến 25.000.000 đồng đối với hành vi không có trạm rửa xe hoặc không thực hiện rửa sạch bùn đất trên bánh xe và phương tiện vận chuyển trước khi rời công trường thi công đi vào đường giao thông công cộng, gây bụi bẩn đường phố.',
          },
          {
            id: 'sec-nd45-20',
            section_type: 'Article',
            section_number: 'Điều 20',
            heading: 'Vi phạm quy định về xả khí thải, phát tán bụi vượt quy chuẩn kỹ thuật môi trường',
            content: 'Phạt tiền từ 20.000.000 đồng đến 50.000.000 đồng đối với hành vi phát tán bụi có thông số ô nhiễm vượt quy chuẩn kỹ thuật môi trường xung quanh từ 1,1 đến dưới 1,5 lần. Buộc áp dụng biện pháp khắc phục tình trạng ô nhiễm môi trường trong thời hạn không quá 48 giờ.',
          },
        ],
      },
      {
        id: 'doc-qcvn-05-2023',
        title: 'Quy chuẩn kỹ thuật quốc gia về chất lượng không khí xung quanh',
        document_number: 'QCVN 05:2023/BTNMT',
        authority: 'Bộ Tài nguyên và Môi trường',
        issued_date: '2023-04-14',
        effective_date: '2023-06-01',
        status: 'ACTIVE',
        source_url: 'https://monre.gov.vn',
        sections: [
          {
            id: 'sec-qcvn-dust-limits',
            section_type: 'Section',
            section_number: 'Mục 2.2',
            heading: 'Giá trị giới hạn các thông số bụi trong không khí xung quanh',
            content: 'Giá trị giới hạn tối đa cho phép nồng độ bụi trong không khí xung quanh: Bụi tổng số (TSP) trung bình 24 giờ là 200 µg/m³, trung bình 1 giờ là 300 µg/m³; Bụi mịn PM10 trung bình 24 giờ là 100 µg/m³; Bụi siêu mịn PM2.5 trung bình 24 giờ là 50 µg/m³.',
          },
        ],
      },
      {
        id: 'doc-qd-hn-dust',
        title: 'Quy định về quản lý và kiểm soát bụi tại các công trình xây dựng trên địa bàn TP. Hà Nội',
        document_number: '02/2022/QĐ-UBND',
        authority: 'Ủy ban nhân dân TP. Hà Nội',
        issued_date: '2022-01-18',
        effective_date: '2022-02-01',
        status: 'ACTIVE',
        source_url: 'https://hanoi.gov.vn',
        sections: [
          {
            id: 'sec-qd29-8',
            section_type: 'Article',
            section_number: 'Điều 8',
            heading: 'Yêu cầu lắp đặt hệ thống phun sương và rào chắn dập bụi',
            content: 'Tất cả các dự án xây dựng công trình dân dụng, hạ tầng kỹ thuật có diện tích sàn xây dựng trên 1.000 m² hoặc giáp ranh khu dân cư phải trang bị hệ thống phun sương dập bụi tự động dọc theo hàng rào bao che và hoạt động liên tục trong các khung giờ thi công cao điểm.',
          },
        ],
      },
    ];

    for (const doc of legalDocs) {
      run(
        `INSERT INTO legal_documents (id, title, document_number, authority, issued_date, effective_date, status, source_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-60 days'))`,
        [doc.id, doc.title, doc.document_number, doc.authority, doc.issued_date, doc.effective_date, doc.status, doc.source_url]
      );

      for (const sec of doc.sections) {
        run(
          `INSERT INTO legal_sections (id, document_id, section_type, section_number, heading, content)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sec.id, doc.id, sec.section_type, sec.section_number, sec.heading, sec.content]
        );

        run(
          `INSERT INTO legal_sections_fts (id, document_id, document_title, document_number, heading, section_number, content)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sec.id, doc.id, doc.title, doc.document_number, sec.heading, sec.section_number, sec.content]
        );
      }
    }

    // 3. Seed Inspection Templates
    console.log('[Database Seed] Seeding inspection templates...');
    const templates = [
      {
        id: 'tmpl-build-site',
        name: 'Biên bản kiểm tra Kiểm soát Bụi Công trình Xây dựng Đô thị',
        description: 'Áp dụng cho mọi công trình xây dựng dân dụng, thương mại và hạ tầng giao thông đô thị Hà Nội',
        category: 'CONSTRUCTION',
        items: [
          { id: 't-item-1', label: 'Lắp đặt lưới chắn bụi kín toàn bộ mặt tiền và chu vi tiếp giáp dân cư', description: 'Lưới tối thiểu 2-3 lớp, không rách rưới, phủ từ tầng thi công xuống đất', required: 1, legal_section_id: 'sec-nd45-15-1a', sort_order: 1 },
          { id: 't-item-2', label: 'Trạm rửa xe và cầu rửa tự động hoạt động hiệu quả tại cổng ra vào', description: 'Phương tiện vận chuyển bùn đất được xịt rửa sạch trước khi lăn bánh ra đường', required: 1, legal_section_id: 'sec-nd45-15-1b', sort_order: 2 },
          { id: 't-item-3', label: 'Vận hành hệ thống phun sương dập bụi tự động dọc hàng rào', description: 'Đang hoạt động trong suốt quá trình cẩu tháp, xúc đổ đất cát', required: 1, legal_section_id: 'sec-qd29-8', sort_order: 3 },
          { id: 't-item-4', label: 'Che đậy bạt kín đối với bãi tập kết vật liệu rời (cát, xi măng, xà bần)', description: 'Không để vật liệu rời trần phát tán bụi theo gió', required: 1, legal_section_id: 'sec-bvmt-64', sort_order: 4 },
          { id: 't-item-5', label: 'Xe bồn và xe tải chở vật liệu có phủ bạt kín thùng xe', description: 'Không chở quá tải, vật liệu không rơi vãi', required: 1, legal_section_id: 'sec-bvmt-64', sort_order: 5 },
          { id: 't-item-6', label: 'Vệ sinh sạch sẽ mặt đường công cộng bán kính 100m quanh cổng dự án', description: 'Không đọng vệt bùn đất khô hình thành bụi mịn', required: 0, legal_section_id: null, sort_order: 6 },
        ],
      },
      {
        id: 'tmpl-transport',
        name: 'Biên bản kiểm tra Phương tiện Vận chuyển Đất đá & Vật liệu Xây dựng',
        description: 'Kiểm tra đột xuất đoàn xe tải phục vụ san lấp và dự án giao thông',
        category: 'TRANSPORT',
        items: [
          { id: 't-item-7', label: 'Bạt phủ kín thùng xe 100% không bay bụi trên đường vận chuyển', description: 'Bạt trùm qua mép thùng thành xe', required: 1, legal_section_id: 'sec-bvmt-64', sort_order: 1 },
          { id: 't-item-8', label: 'Lốp xe sạch bùn đất khi di chuyển trên tuyến đường đô thị', description: 'Đã rửa sạch tại bãi trước khi xuất bến', required: 1, legal_section_id: 'sec-nd45-15-1b', sort_order: 2 },
          { id: 't-item-9', label: 'Không chở vật liệu quá thành thùng quy định', description: 'Tuân thủ tải trọng', required: 1, legal_section_id: null, sort_order: 3 },
        ],
      },
    ];

    for (const tmpl of templates) {
      run(
        `INSERT INTO inspection_templates (id, name, description, category, active, created_at)
         VALUES (?, ?, ?, ?, 1, datetime('now', '-40 days'))`,
        [tmpl.id, tmpl.name, tmpl.description, tmpl.category]
      );

      for (const itm of tmpl.items) {
        run(
          `INSERT INTO inspection_template_items (id, template_id, label, description, required, legal_section_id, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itm.id, tmpl.id, itm.label, itm.description, itm.required, itm.legal_section_id, itm.sort_order]
        );
      }
    }

    // 4. Seed Contractors & Projects (Hà Nội)
    console.log('[Database Seed] Seeding contractors & projects...');
    const contractors = [
      { id: 'ctr-01', name: 'Công ty CP Xây dựng Hạ tầng Thăng Long', tax_code: '0101234567', contact_person: 'Nguyễn Văn Mạnh', phone: '0912345678', email: 'thanglong@infra.vn', address: 'Số 18 Huỳnh Thúc Kháng, Hà Nội' },
      { id: 'ctr-02', name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)', tax_code: '0102345678', contact_person: 'Phạm Đức Thành', phone: '0912345679', email: 'contact@hancorp.vn', address: 'Số 88 Láng Hạ, Hà Nội' },
      { id: 'ctr-03', name: 'Xí nghiệp Môi trường Đô thị Đống Đa', tax_code: '0103456789', contact_person: 'Lê Văn Hiếu', phone: '0912345680', email: 'dongda.urenco@hanoi.vn', address: 'Số 84 Chùa Láng, Hà Nội' },
      { id: 'ctr-04', name: 'Liên danh Môi trường Việt Thăng Long', tax_code: '0104567890', contact_person: 'Đỗ Tuấn Kiệt', phone: '0912345681', email: 'liendanh@vietthanglong.vn', address: 'Đường Láng, Hà Nội' },
      { id: 'ctr-05', name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng', tax_code: '0105678901', contact_person: 'Vũ Quốc Cường', phone: '0912345682', email: 'songhong@invescon.vn', address: 'Khu D2 Giảng Võ, Hà Nội' },
    ];

    for (const c of contractors) {
      run(
        `INSERT INTO contractors (id, name, contact_person, phone, email, address, tax_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Nhà thầu uy tín', datetime('now', '-60 days'), datetime('now'))`,
        [c.id, c.name, c.contact_person, c.phone, c.email, c.address, c.tax_code]
      );
    }

    const projects = [
      { id: 'proj-01', code: 'PRJ-HN-001', name: 'Dự án mở rộng tuyến đường Huỳnh Thúc Kháng kéo dài', address: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh', district: 'Láng Thượng', province: 'Hà Nội', latitude: 21.0185, longitude: 105.8095, contractor_id: 'ctr-01', contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long' },
      { id: 'proj-02', code: 'PRJ-HN-002', name: 'Tổ hợp thương mại dịch vụ cao ốc 88 Láng Hạ', address: 'Số 88 Láng Hạ', district: 'Láng Hạ', province: 'Hà Nội', latitude: 21.0148, longitude: 105.8135, contractor_id: 'ctr-02', contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)' },
      { id: 'proj-03', code: 'PRJ-HN-003', name: 'Chỉnh trang vỉa hè và hạ ngầm cáp đường Chùa Láng', address: 'Đoạn ngõ 84 đến ngõ 185 Chùa Láng', district: 'Láng Thượng', province: 'Hà Nội', latitude: 21.0242, longitude: 105.8041, contractor_id: 'ctr-03', contractor_name: 'Xí nghiệp Môi trường Đô thị Đống Đa' },
      { id: 'proj-04', code: 'PRJ-HN-004', name: 'Cải tạo hệ thống cống gom nước thải sông Tô Lịch', address: 'Dọc đường Láng (Đoạn Cầu Cót - Cầu Yên Hòa)', district: 'Yên Hòa', province: 'Hà Nội', latitude: 21.0175, longitude: 105.7985, contractor_id: 'ctr-04', contractor_name: 'Liên danh Môi trường Việt Thăng Long' },
      { id: 'proj-05', code: 'PRJ-HN-005', name: 'Dự án chung cư tái định cư Giảng Võ', address: 'Khu D2 Giảng Võ', district: 'Giảng Võ', province: 'Hà Nội', latitude: 21.0268, longitude: 105.8218, contractor_id: 'ctr-05', contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng' },
      { id: 'proj-06', code: 'PRJ-HN-006', name: 'Công trình cải tạo nút giao Cầu Giấy - Kim Mã', address: 'Nút giao Cầu Giấy - Kim Mã', district: 'Ngọc Khánh', province: 'Hà Nội', latitude: 21.0312, longitude: 105.8025, contractor_id: 'ctr-01', contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long' },
    ];

    for (const p of projects) {
      run(
        `INSERT INTO projects (id, code, name, address, district, province, latitude, longitude, contractor_id, contractor_name, project_owner, status, start_date, end_date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ban Quản lý Dự án Đầu tư Xây dựng Công trình Giao thông Hà Nội', 'ACTIVE', '2026-01-15', '2027-12-30', 'Công trình trọng điểm đô thị', datetime('now', '-45 days'), datetime('now'))`,
        [p.id, p.code, p.name, p.address, p.district, p.province, p.latitude, p.longitude, p.contractor_id, p.contractor_name]
      );
    }

    // 5. Seed 26 Realistic Cases across all 12 Statuses (Hà Nội SSOT)
    console.log('[Database Seed] Seeding 26 realistic cases across all 12 statuses (Hanoi)...');
    const rawCases = [
      // NEW (3 cases)
      {
        id: 'case-001',
        case_code: 'DG-2026-OP-001',
        title: 'Bụi phát tán từ công trình tháo dỡ nhà xưởng đường Chùa Láng',
        description: 'Người dân phản ánh máy xúc đập phá bê tông không tưới nước dập bụi, gió thổi bụi bay thẳng vào các trường học và khu dân cư kế cận.',
        location_text: 'Ngõ 185 Chùa Láng, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0258,
        longitude: 105.8028,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8821',
        source_report_count: 5,
        status: 'NEW',
        assigned_staff_id: null,
        contractor_name: 'Xí nghiệp Môi trường Đô thị Đống Đa',
        priority: 'HIGH',
        daysAgo: 1,
      },
      {
        id: 'case-002',
        case_code: 'DG-2026-OP-002',
        title: 'Đoàn xe ben chở đất cát làm rơi vãi dọc trục đường Huỳnh Thúc Kháng',
        description: 'Các xe ben tải trọng lớn từ công trình mở rộng đường không phủ kín bạt, cát rơi tạo thành lớp dày trên mặt đường gây nguy hiểm cho người đi xe máy.',
        location_text: 'Trục đường Huỳnh Thúc Kháng kéo dài, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0185,
        longitude: 105.8095,
        source: 'IOT',
        source_reference: 'IOT-SENSOR-LH-02',
        source_report_count: 8,
        status: 'NEW',
        assigned_staff_id: null,
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'URGENT',
        daysAgo: 1,
      },
      {
        id: 'case-003',
        case_code: 'DG-2026-OP-003',
        title: 'Tập kết cát đá không che bạt gây bụi đường Nguyễn Chí Thanh',
        description: 'Bãi vật liệu lộ thiên diện tích 300m2 cạnh khu dân cư không che phủ bạt, những ngày nắng gắt gió mạnh bụi thô bay vào nhà dân.',
        location_text: 'Đối diện số 484 Lê Văn Việt, Hồ Chí Minh',
        district: 'Láng Thượng',
        latitude: 21.0210,
        longitude: 105.8075,
        source: 'MANUAL',
        source_reference: 'HOTLINE-2026-0902',
        source_report_count: 2,
        status: 'NEW',
        assigned_staff_id: null,
        contractor_name: 'Xí nghiệp Môi trường Đô thị Đống Đa',
        priority: 'NORMAL',
        daysAgo: 2,
      },

      // TRIAGED (2 cases)
      {
        id: 'case-004',
        case_code: 'DG-2026-OP-004',
        title: 'Bụi phát tán từ công trường cải tạo vỉa hè đường Láng Hạ',
        description: 'Tổ công tác ghi nhận hoạt động cắt lát đá khô không dùng nước dập bụi, nồng độ bụi mịn PM2.5 tại hiện trường tăng vọt.',
        location_text: 'Số 56 Láng Hạ, Phường Láng Hạ, Hà Nội',
        district: 'Láng Hạ',
        latitude: 21.0155,
        longitude: 105.8125,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8833',
        source_report_count: 4,
        status: 'TRIAGED',
        assigned_staff_id: null,
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'NORMAL',
        daysAgo: 2,
      },
      {
        id: 'case-005',
        case_code: 'DG-2026-OP-005',
        title: 'Công trình xây dựng nhà xưởng khu tập thể Thành Công xả bụi',
        description: 'Hình ảnh tiếp nhận từ cộng đồng cư dân phản ánh khói bụi từ xưởng nghiền gạch tái chế lan sang khu dân cư kế bên.',
        location_text: 'Khu B Thành Công, Phường Thành Công, Hà Nội',
        district: 'Thành Công',
        latitude: 21.0235,
        longitude: 105.8148,
        source: 'IMPORT',
        source_reference: 'IMP-EXT-7701',
        source_report_count: 6,
        status: 'TRIAGED',
        assigned_staff_id: null,
        contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng',
        priority: 'NORMAL',
        daysAgo: 3,
      },

      // ASSIGNED (3 cases)
      {
        id: 'case-006',
        case_code: 'DG-2026-OP-006',
        title: 'Công trình dự án cao ốc 88 Láng Hạ không che lưới mặt bắc',
        description: 'Tầng 15 đến tầng 20 tháo dỡ cốp pha không có màng chắn, vữa rơi và bụi xi măng phát tán trên diện rộng.',
        location_text: 'Số 88 Láng Hạ, Phường Láng Hạ, Hà Nội',
        district: 'Láng Hạ',
        latitude: 21.0148,
        longitude: 105.8135,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8850',
        source_report_count: 12,
        status: 'ASSIGNED',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'HIGH',
        daysAgo: 3,
      },
      {
        id: 'case-007',
        case_code: 'DG-2026-OP-007',
        title: 'Bụi phát sinh trong san lấp mặt bằng cống gom Tô Lịch',
        description: 'Máy xúc đất làm việc ban ngày trong điều kiện khô hanh nhưng không có xe bồn tưới nước làm mát.',
        location_text: 'Đường Láng đoạn Cầu Cót - Cầu Yên Hòa, Phường Yên Hòa, Hà Nội',
        district: 'Yên Hòa',
        latitude: 21.0175,
        longitude: 105.7985,
        source: 'MANUAL',
        source_reference: 'HOTLINE-2026-0901',
        source_report_count: 3,
        status: 'ASSIGNED',
        assigned_staff_id: 'usr-staff-2',
        contractor_name: 'Liên danh Môi trường Việt Thăng Long',
        priority: 'NORMAL',
        daysAgo: 4,
      },
      {
        id: 'case-008',
        case_code: 'DG-2026-OP-008',
        title: 'Đào rãnh ngầm tuyến cáp viễn thông đường Kim Mã',
        description: 'Đoạn đường đào móng lấp tạm bằng đất bùn, xe cộ đi qua tạo trơn trượt và bụi mù mịt khi trời hanh khô.',
        location_text: 'Số 420 Kim Mã, Phường Ngọc Khánh, Hà Nội',
        district: 'Ngọc Khánh',
        latitude: 21.0305,
        longitude: 105.8055,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8871',
        source_report_count: 7,
        status: 'ASSIGNED',
        assigned_staff_id: 'usr-staff-3',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'HIGH',
        daysAgo: 4,
      },

      // LEGAL_REVIEW (2 cases)
      {
        id: 'case-009',
        case_code: 'DG-2026-OP-009',
        title: 'Dự án Căn hộ hỗn hợp Giảng Võ không vận hành trạm rửa xe tự động',
        description: 'Đoàn xe bồn bê tông ra vào làm nham nhở tuyến đường Giảng Võ. Hồ sơ đang được chuyển sang bộ phận pháp chế đối chiếu mức xử phạt theo Nghị định 45/2022/NĐ-CP.',
        location_text: 'Khu D2 Giảng Võ, Phường Giảng Võ, Hà Nội',
        district: 'Giảng Võ',
        latitude: 21.0272,
        longitude: 105.8210,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8890',
        source_report_count: 9,
        status: 'LEGAL_REVIEW',
        assigned_staff_id: 'usr-staff-4',
        contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng',
        priority: 'URGENT',
        daysAgo: 5,
      },
      {
        id: 'case-010',
        case_code: 'DG-2026-OP-010',
        title: 'Trạm trộn bê tông di động làm vương vãi vữa khô ngã tư Thái Hà',
        description: 'Vữa xi măng rò rỉ khô lại trên mặt cầu bị bánh xe nghiền nát thành bụi trắng độc hại.',
        location_text: 'Nút giao Thái Hà - Huỳnh Thúc Kháng, Phường Trung Liệt, Hà Nội',
        district: 'Trung Liệt',
        latitude: 21.0125,
        longitude: 105.8188,
        source: 'STAFF',
        source_reference: 'STAFF-REP-010',
        source_report_count: 5,
        status: 'LEGAL_REVIEW',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'HIGH',
        daysAgo: 5,
      },

      // INSPECTION_PLANNED (3 cases)
      {
        id: 'case-011',
        case_code: 'DG-2026-OP-011',
        title: 'Kế hoạch kiểm tra hiện trường Dự án Vincom Nguyễn Chí Thanh',
        description: 'Đã lên lịch kiểm tra liên ngành vào ngày mai, tập trung vào hệ thống phun sương dập bụi.',
        location_text: '54A Nguyễn Chí Thanh, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0225,
        longitude: 105.8065,
        source: 'MANUAL',
        source_reference: 'PLAN-2026-0903',
        source_report_count: 3,
        status: 'INSPECTION_PLANNED',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'NORMAL',
        daysAgo: 6,
      },
      {
        id: 'case-012',
        case_code: 'DG-2026-OP-012',
        title: 'Kiểm tra công trường mở rộng nút giao Huỳnh Thúc Kháng - Nguyễn Chí Thanh',
        description: 'Lập lịch kiểm tra toàn bộ biện pháp chắn bụi và thu gom bùn đất công trình giao thông trọng điểm.',
        location_text: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0185,
        longitude: 105.8095,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8905',
        source_report_count: 22,
        status: 'INSPECTION_PLANNED',
        assigned_staff_id: 'usr-staff-2',
        contractor_name: 'Ban Quản lý Dự án Giao thông Hà Nội',
        priority: 'URGENT',
        daysAgo: 6,
      },
      {
        id: 'case-013',
        case_code: 'DG-2026-OP-013',
        title: 'Kiểm tra tháo dỡ khu tập thể cũ đường Giảng Võ',
        description: 'Đã phân công cán bộ lập lịch kiểm tra đột xuất đối với đơn vị phá dỡ kết cấu gạch đá.',
        location_text: 'Khu tập thể Giảng Võ, Phường Giảng Võ, Hà Nội',
        district: 'Giảng Võ',
        latitude: 21.0265,
        longitude: 105.8220,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8912',
        source_report_count: 4,
        status: 'INSPECTION_PLANNED',
        assigned_staff_id: 'usr-staff-3',
        contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng',
        priority: 'NORMAL',
        daysAgo: 7,
      },

      // INSPECTION_IN_PROGRESS (2 cases)
      // GOLDEN CASE SSOT (Khớp nối Landing Page & Side A)
      {
        id: 'case-014',
        case_code: 'DG-2026-OP-014',
        title: 'Đang kiểm tra hiện trường Dự án mở rộng đường Huỳnh Thúc Kháng kéo dài',
        description: 'Tổ thanh tra đang có mặt tại công trình thực hiện checklist 6 tiêu chuẩn kiểm soát bụi bằng thiết bị đo PM2.5 chuyên dụng.',
        location_text: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0185,
        longitude: 105.8095,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8920',
        source_report_count: 14,
        status: 'INSPECTION_IN_PROGRESS',
        assigned_staff_id: 'usr-staff-2',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'HIGH',
        daysAgo: 7,
      },
      {
        id: 'case-015',
        case_code: 'DG-2026-OP-015',
        title: 'Đang kiểm tra thi công cọc khoan nhồi cầu Yên Hòa',
        description: 'Cán bộ hiện trường đang đo đạc nồng độ bụi TSP và đối chiếu biên bản kiểm định trạm rửa xe.',
        location_text: 'Đầu cầu Yên Hòa, Đường Láng, Phường Yên Hòa, Hà Nội',
        district: 'Yên Hòa',
        latitude: 21.0180,
        longitude: 105.7975,
        source: 'MANUAL',
        source_reference: 'MAN-2026-0904',
        source_report_count: 2,
        status: 'INSPECTION_IN_PROGRESS',
        assigned_staff_id: 'usr-staff-5',
        contractor_name: 'Liên danh Môi trường Việt Thăng Long',
        priority: 'NORMAL',
        daysAgo: 8,
      },

      // ACTION_REQUIRED (3 cases)
      {
        id: 'case-016',
        case_code: 'DG-2026-OP-016',
        title: 'Yêu cầu khắc phục: Dự án Tổ hợp 88 Láng Hạ',
        description: 'Biên bản kiểm tra phát hiện 3 hạng mục vi phạm: không che chắn lưới tầng 18, cầu rửa xe hỏng và thiếu hệ thống phun sương dập bụi.',
        location_text: 'Số 88 Láng Hạ, Phường Láng Hạ, Hà Nội',
        district: 'Láng Hạ',
        latitude: 21.0148,
        longitude: 105.8135,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8935',
        source_report_count: 18,
        status: 'ACTION_REQUIRED',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'URGENT',
        daysAgo: 9,
      },
      {
        id: 'case-017',
        case_code: 'DG-2026-OP-017',
        title: 'Yêu cầu khắc phục: Bãi tập kết cát đá vật liệu ven sông Tô Lịch',
        description: 'Yêu cầu đơn vị quản lý bãi trong vòng 48h phải phủ bạt kín toàn bộ cát xây dựng đang phơi ngoài trời.',
        location_text: 'Chân cầu Cót, Đường Láng, Phường Yên Hòa, Hà Nội',
        district: 'Yên Hòa',
        latitude: 21.0190,
        longitude: 105.7995,
        source: 'MANUAL',
        source_reference: 'HOTLINE-2026-0899',
        source_report_count: 5,
        status: 'ACTION_REQUIRED',
        assigned_staff_id: 'usr-staff-3',
        contractor_name: 'Liên danh Môi trường Việt Thăng Long',
        priority: 'NORMAL',
        daysAgo: 10,
      },
      {
        id: 'case-018',
        case_code: 'DG-2026-OP-018',
        title: 'Yêu cầu khắc phục: Dự án chỉnh trang đường Chùa Láng',
        description: 'Yêu cầu đơn vị thi công bố trí xe bồn tưới nước liên tục 3 lần/ngày trong khung giờ 07h-09h và 16h-18h.',
        location_text: 'Đoạn ngõ 84 đến ngõ 185 Chùa Láng, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0245,
        longitude: 105.8038,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8944',
        source_report_count: 26,
        status: 'ACTION_REQUIRED',
        assigned_staff_id: 'usr-staff-4',
        contractor_name: 'Xí nghiệp Môi trường Đô thị Đống Đa',
        priority: 'HIGH',
        daysAgo: 10,
      },

      // REMEDIATION (2 cases)
      {
        id: 'case-019',
        case_code: 'DG-2026-OP-019',
        title: 'Nhà thầu đã nộp báo cáo khắc phục: Dự án chung cư Giảng Võ',
        description: 'Nhà thầu đã gửi ảnh và biên bản nghiệm thu lắp đặt trạm rửa xe áp lực cao và bổ sung lưới chống bụi 3 lớp.',
        location_text: 'Khu D2 Giảng Võ, Phường Giảng Võ, Hà Nội',
        district: 'Giảng Võ',
        latitude: 21.0275,
        longitude: 105.8208,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8955',
        source_report_count: 16,
        status: 'REMEDIATION',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng',
        priority: 'NORMAL',
        daysAgo: 12,
      },
      {
        id: 'case-020',
        case_code: 'DG-2026-OP-020',
        title: 'Nhà thầu đã nộp báo cáo khắc phục: Tòa nhà văn phòng phố Cát Linh',
        description: 'Đã hoàn tất che bạt kín hố xả phế thải và thay thế dàn phun sương dập bụi tự động.',
        location_text: 'Số 36 Cát Linh, Phường Cát Linh, Hà Nội',
        district: 'Cát Linh',
        latitude: 21.0280,
        longitude: 105.8250,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8961',
        source_report_count: 8,
        status: 'REMEDIATION',
        assigned_staff_id: 'usr-staff-2',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'HIGH',
        daysAgo: 13,
      },

      // REINSPECTION (2 cases)
      {
        id: 'case-021',
        case_code: 'DG-2026-OP-021',
        title: 'Chờ tái kiểm tra hiện trường: Dự án Khu đô thị Trung Hòa - Nhân Chính',
        description: 'Cán bộ chuẩn bị tái kiểm tra đột xuất tại công trình để đối chứng thực tế các hạng mục nhà thầu cam kết đã sửa chữa.',
        location_text: 'Đường Hoàng Đạo Thúy, Phường Trung Hòa, Hà Nội',
        district: 'Trung Hòa',
        latitude: 21.0110,
        longitude: 105.8015,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8970',
        source_report_count: 11,
        status: 'REINSPECTION',
        assigned_staff_id: 'usr-staff-5',
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'NORMAL',
        daysAgo: 15,
      },
      {
        id: 'case-022',
        case_code: 'DG-2026-OP-022',
        title: 'Chờ tái kiểm tra hiện trường: Công trường Cầu vượt nút giao Cầu Giấy',
        description: 'Tái kiểm tra công tác thu gom bụi khoan cắt cọc tại nút giao Cầu Giấy - Kim Mã.',
        location_text: 'Nút giao Cầu Giấy - Kim Mã, Phường Ngọc Khánh, Hà Nội',
        district: 'Ngọc Khánh',
        latitude: 21.0315,
        longitude: 105.8030,
        source: 'MANUAL',
        source_reference: 'MAN-2026-0881',
        source_report_count: 6,
        status: 'REINSPECTION',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'NORMAL',
        daysAgo: 16,
      },

      // READY_TO_CLOSE (2 cases)
      {
        id: 'case-023',
        case_code: 'DG-2026-OP-023',
        title: 'Hồ sơ đủ điều kiện kết thúc: Trụ sở Ngân hàng đường Láng Hạ',
        description: 'Đã hoàn tất tái kiểm tra đạt 100% tiêu chí, 0 vi phạm mở, ý kiến thẩm định pháp lý đã hoàn tất.',
        location_text: 'Số 72 Láng Hạ, Phường Láng Hạ, Hà Nội',
        district: 'Láng Hạ',
        latitude: 21.0150,
        longitude: 105.8130,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8980',
        source_report_count: 7,
        status: 'READY_TO_CLOSE',
        assigned_staff_id: 'usr-staff-2',
        contractor_name: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
        priority: 'NORMAL',
        daysAgo: 20,
      },
      {
        id: 'case-024',
        case_code: 'DG-2026-OP-024',
        title: 'Hồ sơ đủ điều kiện kết thúc: Cải tạo chỉnh trang hồ Đống Đa',
        description: 'Đơn vị nạo vét đã hoàn trả mặt bằng sạch, tưới nước đầm nén đất không còn phát tán bụi. Hồ sơ sẵn sàng đóng.',
        location_text: 'Đường Hoàng Cầu, Phường Ô Chợ Dừa, Hà Nội',
        district: 'Ô Chợ Dừa',
        latitude: 21.0185,
        longitude: 105.8230,
        source: 'IOT',
        source_reference: 'IOT-SENSOR-LH-02',
        source_report_count: 14,
        status: 'READY_TO_CLOSE',
        assigned_staff_id: 'usr-staff-3',
        contractor_name: 'Xí nghiệp Môi trường Đô thị Đống Đa',
        priority: 'NORMAL',
        daysAgo: 21,
      },

      // CLOSED (2 cases)
      {
        id: 'case-025',
        case_code: 'DG-2026-OP-025',
        title: 'Đã hoàn tất xử lý và đóng hồ sơ: Tòa nhà Văn phòng Nguyễn Chí Thanh',
        description: 'Nhà thầu đã chấp hành quyết định xử phạt, lắp đặt cầu rửa xe tự động và nghiệm thu đạt chuẩn.',
        location_text: 'Số 54 Nguyễn Chí Thanh, Phường Láng Thượng, Hà Nội',
        district: 'Láng Thượng',
        latitude: 21.0220,
        longitude: 105.8068,
        source: 'COMMUNITY',
        source_reference: 'COM-REP-8701',
        source_report_count: 19,
        status: 'CLOSED',
        assigned_staff_id: 'usr-staff-1',
        contractor_name: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
        priority: 'NORMAL',
        daysAgo: 28,
      },
      {
        id: 'case-026',
        case_code: 'DG-2026-OP-026',
        title: 'Đã hoàn tất xử lý và đóng hồ sơ: Dự án Cải tạo vỉa hè Thành Công',
        description: 'Đã hoàn thành giai đoạn tháo dỡ đá cũ, lát xong đá tự nhiên có tưới nước giữ ẩm đạt quy chuẩn môi trường.',
        location_text: 'Phố Thành Công, Phường Thành Công, Hà Nội',
        district: 'Thành Công',
        latitude: 21.0225,
        longitude: 105.8150,
        source: 'MANUAL',
        source_reference: 'HOTLINE-2026-0850',
        source_report_count: 5,
        status: 'CLOSED',
        assigned_staff_id: 'usr-staff-4',
        contractor_name: 'Công ty CP Đầu tư & Xây dựng Sông Hồng',
        priority: 'LOW',
        daysAgo: 30,
      },
    ];

    for (const c of rawCases) {
      run(
        `INSERT INTO cases (id, case_code, title, description, location_text, district, latitude, longitude, source, source_reference, source_report_count, status, assigned_staff_id, contractor_name, priority, created_at, updated_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${c.daysAgo} days'), datetime('now', '-${Math.max(1, c.daysAgo - 2)} days'), ${c.status === 'CLOSED' ? "datetime('now', '-1 days')" : 'NULL'})`,
        [c.id, c.case_code, c.title, c.description, c.location_text, c.district, c.latitude, c.longitude, c.source, c.source_reference, c.source_report_count, c.status, c.assigned_staff_id, c.contractor_name, c.priority]
      );

      // Add timeline for case creation
      run(
        `INSERT INTO case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, metadata_json, created_at)
         VALUES (?, ?, 'CASE_IMPORTED', 'usr-admin-1', 'Hệ thống Tiếp nhận', 'system', 'INTAKE', ?, ?, datetime('now', '-${c.daysAgo} days'))`,
        [
          `tml-${c.id}-1`,
          c.id,
          `Tiếp nhận thông tin vụ việc từ nguồn ${c.source} với ${c.source_report_count} lượt phản ánh.`,
          JSON.stringify({ source: c.source, ref: c.source_reference }),
        ]
      );

      // Add assignment if assigned
      if (c.assigned_staff_id) {
        run(
          `INSERT INTO staff_assignments (id, case_id, staff_user_id, assigned_by, assignment_type, status, note, assigned_at, due_at)
           VALUES (?, ?, ?, 'usr-sup-1', 'PRIMARY', 'ACTIVE', 'Được chỉ định phụ trách kiểm tra hiện trường và giám sát khắc phục', datetime('now', '-${c.daysAgo - 1} days'), datetime('now', '+3 days'))`,
          [`asgn-${c.id}`, c.id, c.assigned_staff_id]
        );

        run(
          `INSERT INTO case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, metadata_json, created_at)
           VALUES (?, ?, 'STAFF_ASSIGNED', 'usr-sup-1', 'Võ Minh Trí', 'supervisor', 'ASSIGNED', 'Lãnh đạo điều phối phân công cán bộ xử lý chính.', ?, datetime('now', '-${c.daysAgo - 1} days'))`,
          [`tml-${c.id}-2`, c.id, JSON.stringify({ assigned_to: c.assigned_staff_id })]
        );
      }
    }

    // 6. Seed Evidence Assets for various cases
    console.log('[Database Seed] Seeding evidence assets...');
    const evidenceList = [
      { id: 'evd-01', case_id: 'case-001', type: 'CASE', file: 'evidence-dust-site1.svg', uploader: 'usr-staff-1' },
      { id: 'evd-02', case_id: 'case-006', type: 'CASE', file: 'evidence-mesh-torn.svg', uploader: 'usr-staff-1' },
      { id: 'evd-03', case_id: 'case-009', type: 'CASE', file: 'evidence-wheel-wash.svg', uploader: 'usr-staff-1' },
      { id: 'evd-04', case_id: 'case-016', type: 'INSPECTION', file: 'evidence-mesh-torn.svg', uploader: 'usr-staff-1' },
      { id: 'evd-05', case_id: 'case-016', type: 'INSPECTION', file: 'evidence-wheel-wash.svg', uploader: 'usr-staff-1' },
      { id: 'evd-06', case_id: 'case-019', type: 'REMEDIATION', file: 'evidence-fixed-mesh.svg', uploader: 'usr-staff-1' },
      { id: 'evd-07', case_id: 'case-019', type: 'REMEDIATION', file: 'evidence-fixed-mist.svg', uploader: 'usr-staff-1' },
      { id: 'evd-08', case_id: 'case-023', type: 'INSPECTION', file: 'evidence-fixed-mesh.svg', uploader: 'usr-staff-2' },
      { id: 'evd-09', case_id: 'case-025', type: 'CASE', file: 'evidence-dust-site1.svg', uploader: 'usr-staff-1' },
      { id: 'evd-10', case_id: 'case-025', type: 'REMEDIATION', file: 'evidence-fixed-mist.svg', uploader: 'usr-staff-1' },
    ];

    for (const ev of evidenceList) {
      const info = evidenceMap[ev.file];
      if (info) {
        run(
          `INSERT INTO evidence_assets (id, case_id, source_type, source_id, file_path, file_name, mime_type, file_size, sha256, uploaded_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'image/svg+xml', ?, ?, ?, datetime('now', '-5 days'))`,
          [ev.id, ev.case_id, ev.type, null, info.filePath, ev.file, info.size, info.sha256, ev.uploader]
        );
      }
    }

    // 7. Seed Legal Reviews
    console.log('[Database Seed] Seeding legal reviews & analyses...');
    const legalReviews = [
      {
        id: 'lrev-009',
        case_id: 'case-009',
        reviewer_id: 'usr-legal-1',
        status: 'IN_REVIEW',
        summary: 'Có dấu hiệu vi phạm Điểm b Khoản 1 Điều 15 NĐ 45/2022 do không rửa xe trước khi rời công trường. Cần kiểm tra thực tế xem có trạm rửa xe hay không.',
        basis: 'Điểm b Khoản 1 Điều 15 Nghị định 45/2022/NĐ-CP (Khung phạt 15-25 triệu đồng)',
      },
      {
        id: 'lrev-016',
        case_id: 'case-016',
        reviewer_id: 'usr-legal-1',
        status: 'REVIEWED',
        summary: 'Đã xác lập vi phạm rõ ràng: Không che chắn bụi công trình (Điều 15 NĐ 45/2022) và không vận hành hệ thống phun sương dập bụi theo Điều 8 Quyết định 02/2022/QĐ-UBND Hà Nội. Căn cứ ban hành yêu cầu khắc phục khẩn cấp.',
        basis: 'Điều 15 NĐ 45/2022/NĐ-CP; Điều 8 QĐ 02/2022/QĐ-UBND TP. Hà Nội',
      },
      {
        id: 'lrev-023',
        case_id: 'case-023',
        reviewer_id: 'usr-legal-2',
        status: 'REVIEWED',
        summary: 'Đơn vị đã khắc phục đầy đủ các yêu cầu theo biên bản, đã thực hiện nghĩa vụ tài chính và lắp đặt hệ thống phun sương. Đủ căn cứ pháp lý để đóng hồ sơ vụ việc.',
        basis: 'Khoản 1 Điều 64 Luật BVMT 2020; NĐ 45/2022/NĐ-CP',
      },
      {
        id: 'lrev-025',
        case_id: 'case-025',
        reviewer_id: 'usr-legal-1',
        status: 'REVIEWED',
        summary: 'Đã hoàn tất thẩm định pháp lý và nghiệm thu khắc phục. Đủ điều kiện đóng hồ sơ theo quy định.',
        basis: 'Điều 64 Luật BVMT 2020',
      },
    ];

    for (const lr of legalReviews) {
      run(
        `INSERT INTO legal_reviews (id, case_id, reviewer_id, status, summary, legal_basis_note, created_at, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-4 days'), datetime('now', '-2 days'))`,
        [lr.id, lr.case_id, lr.reviewer_id, lr.status, lr.summary, lr.basis]
      );
    }

    // 8. Seed Inspections, Items & Findings
    console.log('[Database Seed] Seeding inspections, items and findings...');
    run(
      `INSERT INTO inspections (id, case_id, inspector_id, template_id, inspection_type, scheduled_date, performed_at, status, location_text, note, created_at, updated_at)
       VALUES ('insp-016', 'case-016', 'usr-staff-1', 'tmpl-build-site', 'INITIAL', '2026-09-02', '2026-09-02 14:30:00', 'COMPLETED', 'Số 88 Láng Hạ, Phường Láng Hạ', 'Kiểm tra hiện trường phát hiện không che chắn mặt tiền và thiếu trạm rửa xe', datetime('now', '-8 days'), datetime('now', '-8 days'))`
    );

    const inspItems016 = [
      { id: 'ii-016-1', label: 'Lắp đặt lưới chắn bụi kín toàn bộ mặt tiền và chu vi tiếp giáp dân cư', status: 'FAIL', note: 'Lưới rách rưới từ tầng 15 đến tầng 18, bụi phát tán mạnh', legal: 'sec-nd45-15-1a', ev: 'evd-04' },
      { id: 'ii-016-2', label: 'Trạm rửa xe và cầu rửa tự động hoạt động hiệu quả tại cổng ra vào', status: 'FAIL', note: 'Trạm rửa xe bị hỏng van cấp nước, xe ben lăn bánh trực tiếp ra đường Láng Hạ', legal: 'sec-nd45-15-1b', ev: 'evd-05' },
      { id: 'ii-016-3', label: 'Vận hành hệ thống phun sương dập bụi tự động dọc hàng rào', status: 'FAIL', note: 'Chưa trang bị hệ thống phun sương dập bụi', legal: 'sec-qd29-8', ev: null },
      { id: 'ii-016-4', label: 'Che đậy bạt kín đối với bãi tập kết vật liệu rời (cát, xi măng, xà bần)', status: 'PASS', note: 'Đã che bạt tạm khu vực tập kết xi măng', legal: 'sec-bvmt-64', ev: null },
      { id: 'ii-016-5', label: 'Xe bồn và xe tải chở vật liệu có phủ bạt kín thùng xe', status: 'PASS', note: 'Các xe rời bãi đều được tài xế kéo bạt phủ kín', legal: 'sec-bvmt-64', ev: null },
      { id: 'ii-016-6', label: 'Vệ sinh sạch sẽ mặt đường công cộng bán kính 100m quanh cổng dự án', status: 'FAIL', note: 'Vệt bùn đất bám dày trên lòng đường Láng Hạ', legal: null, ev: null },
    ];

    for (let i = 0; i < inspItems016.length; i++) {
      const it = inspItems016[i];
      run(
        `INSERT INTO inspection_items (id, inspection_id, label, legal_section_id, status, note, evidence_asset_id, sort_order)
         VALUES (?, 'insp-016', ?, ?, ?, ?, ?, ?)`,
        [it.id, it.label, it.legal, it.status, it.note, it.ev, i + 1]
      );
    }

    const findings016 = [
      { id: 'fnd-016-1', category: 'Bụi phát tán', finding: 'Không có màng lưới che chắn kín từ tầng 15 đến tầng 18 để bụi phát tán trực tiếp ra khu dân cư Láng Hạ', severity: 'HIGH', legal: 'sec-nd45-15-1a', ev: 'evd-04', note: 'Yêu cầu ngưng thi công tháo dỡ cho đến khi giăng lưới bổ sung' },
      { id: 'fnd-016-2', category: 'Phương tiện vận chuyển', finding: 'Không rửa sạch bùn đất trên bánh xe trước khi rời công trường, kéo vệt bùn bẩn ra đường', severity: 'HIGH', legal: 'sec-nd45-15-1b', ev: 'evd-05', note: 'Yêu cầu sửa chữa khẩn cấp trạm xịt rửa' },
      { id: 'fnd-016-3', category: 'Hệ thống dập bụi', finding: 'Thiếu hệ thống phun sương dập bụi tự động theo quy định bắt buộc của thành phố', severity: 'MEDIUM', legal: 'sec-qd29-8', ev: null, note: 'Yêu cầu lắp đặt hoàn thiện trước ngày 10/09' },
    ];

    for (const f of findings016) {
      run(
        `INSERT INTO inspection_findings (id, inspection_id, case_id, category, finding, severity, legal_section_id, evidence_asset_id, staff_note, created_at)
         VALUES (?, 'insp-016', 'case-016', ?, ?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
        [f.id, f.category, f.finding, f.severity, f.legal, f.ev, f.note]
      );
    }

    // 9. Seed Corrective Actions & Remediations
    console.log('[Database Seed] Seeding corrective actions and remediation...');
    run(
      `INSERT INTO corrective_actions (id, case_id, inspection_id, finding_id, title, description, responsible_party, due_at, status, created_by, created_at)
       VALUES ('act-016-1', 'case-016', 'insp-016', 'fnd-016-1', 'Lắp đặt lưới chống bụi 3 lớp mặt tiền', 'Thay thế toàn bộ lưới rách, giăng kín từ tầng 15 xuống mặt đất', 'Tổng Công ty Xây dựng Hà Nội (Hancorp)', datetime('now', '+2 days'), 'OPEN', 'usr-staff-1', datetime('now', '-7 days'))`
    );

    run(
      `INSERT INTO corrective_actions (id, case_id, inspection_id, finding_id, title, description, responsible_party, due_at, status, created_by, created_at)
       VALUES ('act-016-2', 'case-016', 'insp-016', 'fnd-016-2', 'Sửa chữa và đưa vào vận hành trạm rửa xe tự động', 'Thay van cấp nước, đảm bảo áp lực rửa sạch gầm và bánh xe', 'Tổng Công ty Xây dựng Hà Nội (Hancorp)', datetime('now', '+1 days'), 'OPEN', 'usr-staff-1', datetime('now', '-7 days'))`
    );

    run(
      `INSERT INTO corrective_actions (id, case_id, inspection_id, finding_id, title, description, responsible_party, due_at, status, created_by, created_at)
       VALUES ('act-019-1', 'case-019', null, null, 'Lắp đặt hệ thống phun sương dập bụi tự động', 'Trang bị dọc hàng rào bao che tiếp giáp đường Giảng Võ', 'Công ty CP Đầu tư & Xây dựng Sông Hồng', datetime('now', '-2 days'), 'SUBMITTED', 'usr-staff-1', datetime('now', '-10 days'))`
    );

    run(
      `INSERT INTO remediation_submissions (id, corrective_action_id, case_id, submitted_by, description, evidence_asset_ids, review_status, review_note, submitted_at)
       VALUES ('rem-019-1', 'act-019-1', 'case-019', 'usr-staff-1', 'Đã lắp đặt hoàn thiện 12 đầu phun sương áp lực cao và bổ sung 3 lớp lưới xanh quanh công trình.', '["evd-06", "evd-07"]', 'PENDING', null, datetime('now', '-1 days'))`
    );

    // 10. Seed Case Closure for case-025
    run(
      `INSERT INTO case_closures (id, case_id, closed_by, closure_reason, closure_summary, closed_at)
       VALUES ('cls-025', 'case-025', 'usr-sup-1', 'Đã khắc phục hoàn toàn vi phạm và chấp hành xong quyết định xử phạt', 'Nhà thầu đã lắp đặt trạm rửa xe tự động, phủ bạt kín khu vực vật liệu và nộp phạt vi phạm hành chính 15.000.000 đồng.', datetime('now', '-1 days'))`
    );

    // 11. Seed Signals & Case Signals (Hà Nội)
    console.log('[Database Seed] Seeding signals and case signals (Hanoi)...');
    const signals = [
      {
        id: 'sig-001',
        source_type: 'COMMUNITY',
        external_source_id: 'com-rep-8812',
        signal_type: 'DUST_PLUME',
        title: 'Bụi mù mịt từ công trình mở rộng đường Huỳnh Thúc Kháng kéo dài',
        description: 'Đoàn xe tải chở đất đá chạy liên tục từ công trình ra đường không được phủ bạt kín, gây bụi dày đặc khu dân cư.',
        location_text: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh, Phường Láng Thượng',
        latitude: 21.0185,
        longitude: 105.8095,
        integrity_status: 'VALID',
      },
      {
        id: 'sig-002',
        source_type: 'IOT',
        external_source_id: 'iot-alert-4401',
        signal_type: 'PM25_SPIKE',
        title: 'Cảnh báo nồng độ bụi PM2.5 vượt ngưỡng 118 µg/m³ trạm SENSOR-NCT-01',
        description: 'Trạm quan trắc Nguyễn Chí Thanh phát hiện chỉ số PM2.5 tăng đột biến vượt 2.3 lần QCVN 05:2023 trong khung giờ 08:00 - 10:00.',
        location_text: 'Đoạn gần Học viện Hành chính, Phường Láng Thượng, Hà Nội',
        latitude: 21.0222,
        longitude: 105.8059,
        integrity_status: 'VALID',
      },
      {
        id: 'sig-003',
        source_type: 'STAFF',
        external_source_id: null,
        signal_type: 'SITE_OBSERVATION',
        title: 'Phát hiện trạm rửa xe không hoạt động tại dự án 88 Láng Hạ',
        description: 'Cán bộ tuần tra ghi nhận xe bồn bê tông rời công trường làm vung vãi bùn đất dọc đường Láng Hạ.',
        location_text: 'Số 88 Láng Hạ, Phường Láng Hạ, Hà Nội',
        latitude: 21.0148,
        longitude: 105.8135,
        integrity_status: 'VALID',
      },
      {
        id: 'sig-004',
        source_type: 'IMPORT',
        external_source_id: 'portal-1022-993',
        signal_type: 'CITIZEN_PETITION',
        title: 'Đơn kiến nghị tập thể về ô nhiễm bụi xây dựng cầu Yên Hòa',
        description: 'Người dân khu dân cư phản ánh nhà thầu thi công ban đêm không phun sương giảm bụi làm ảnh hưởng sức khỏe trẻ nhỏ.',
        location_text: 'Đường Láng đoạn Cầu Cót - Cầu Yên Hòa, Phường Yên Hòa',
        latitude: 21.0175,
        longitude: 105.7985,
        integrity_status: 'VALID',
      },
    ];

    for (const s of signals) {
      run(
        `INSERT INTO signals (id, source_type, external_source_id, signal_type, title, description, location_text, latitude, longitude, observed_at, received_at, integrity_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-2 days'), ?, datetime('now', '-2 days'))`,
        [s.id, s.source_type, s.external_source_id, s.signal_type, s.title, s.description, s.location_text, s.latitude, s.longitude, s.integrity_status]
      );
    }

    run(`INSERT OR IGNORE INTO case_signals (id, case_id, signal_id, linked_at, linked_by, notes)
         VALUES ('cs-1', 'case-001', 'sig-001', datetime('now', '-2 days'), 'usr-sup-1', 'Liên kết ban đầu khi tiếp nhận phản ánh')`);
    run(`INSERT OR IGNORE INTO case_signals (id, case_id, signal_id, linked_at, linked_by, notes)
         VALUES ('cs-2', 'case-006', 'sig-002', datetime('now', '-1 days'), 'usr-sup-1', 'Trạm quan trắc phụ cận ghi nhận chỉ số cao')`);

    // 12. Seed Tasks (DB-derived Work Items)
    console.log('[Database Seed] Seeding operational tasks (Hanoi)...');
    const tasks = [
      {
        id: 'task-001',
        case_id: 'case-006',
        title: 'Rà soát hồ sơ vụ việc cao ốc 88 Láng Hạ',
        description: 'Kiểm tra biên bản hiện trường trước đây và nhật ký công trình của nhà thầu Hancorp.',
        source: 'CASE',
        source_entity_type: 'CASE',
        source_entity_id: 'case-006',
        assigned_to: 'usr-staff-1',
        status: 'OPEN',
        priority: 'HIGH',
        due_at: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'task-002',
        case_id: 'case-013',
        title: 'Lập kế hoạch thanh tra đột xuất công trình Giảng Võ',
        description: 'Chuẩn bị danh mục tiêu chí kiểm tra theo Mẫu biểu Kiểm soát Bụi Xây dựng Đô thị Hà Nội.',
        source: 'INSPECTION',
        source_entity_type: 'INSPECTION',
        source_entity_id: 'insp-013',
        assigned_to: 'usr-staff-1',
        status: 'OPEN',
        priority: 'URGENT',
        due_at: new Date().toISOString(),
      },
      {
        id: 'task-003',
        case_id: 'case-019',
        title: 'Xác minh khắc phục trạm rửa xe dự án Giảng Võ',
        description: 'Kiểm tra hình ảnh và video nghiệm thu hệ thống phun rửa gầm xe tự động do nhà thầu nộp.',
        source: 'INSPECTION',
        source_entity_type: 'CORRECTIVE_ACTION',
        source_entity_id: 'act-019-1',
        assigned_to: 'usr-staff-1',
        status: 'OPEN',
        priority: 'NORMAL',
        due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      },
      {
        id: 'task-004',
        case_id: 'case-009',
        title: 'Thẩm định hồ sơ pháp lý đối chiếu Nghị định 45/2022',
        description: 'Rà soát hành vi vi phạm không che chắn công trình dự án căn hộ Giảng Võ.',
        source: 'LEGAL',
        source_entity_type: 'LEGAL_REVIEW',
        source_entity_id: 'rev-009',
        assigned_to: 'usr-legal-1',
        status: 'OPEN',
        priority: 'HIGH',
        due_at: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'task-005',
        case_id: null,
        title: 'Kiểm tra tín hiệu trạm đo SENSOR-CL-03 Hồ Chùa Láng',
        description: 'Hệ thống phát hiện cảm biến đo bụi Chùa Láng bị treo số 5 gói tin liên tiếp. Cần kiểm tra phần cứng hoặc ống lấy mẫu.',
        source: 'IOT',
        source_entity_type: 'IOT_DEVICE',
        source_entity_id: 'dev-03',
        assigned_to: 'usr-staff-7',
        status: 'OPEN',
        priority: 'HIGH',
        due_at: new Date().toISOString(),
      },
    ];

    for (const tk of tasks) {
      run(
        `INSERT INTO tasks (id, case_id, title, description, source, source_entity_type, source_entity_id, assigned_to, status, priority, due_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 days'))`,
        [tk.id, tk.case_id, tk.title, tk.description, tk.source, tk.source_entity_type, tk.source_entity_id, tk.assigned_to, tk.status, tk.priority, tk.due_at]
      );
    }

    // 13. Seed IoT Devices, Readings & Events (Hà Nội quanh 62 Nguyễn Chí Thanh)
    console.log('[Database Seed] Seeding IoT devices, readings & events (Hanoi)...');
    const iotDevices = [
      {
        id: 'dev-01',
        device_code: 'SENSOR-NCT-01',
        name: 'Trạm Quan Trắc Nguyễn Chí Thanh',
        location_text: 'Đoạn Học viện Hành chính, Phường Láng Thượng, Hà Nội',
        latitude: 21.0222,
        longitude: 105.8059,
        status: 'ONLINE',
        last_seen_at: "datetime('now', '-2 minutes')",
        secret_reference: 'secret-key-nct1',
        is_simulated: 0,
      },
      {
        id: 'dev-02',
        device_code: 'SENSOR-LH-02',
        name: 'Trạm Quan Trắc Nút Giao Láng Hạ',
        location_text: 'Nút giao Láng Hạ - Huỳnh Thúc Kháng, Phường Láng Hạ, Hà Nội',
        latitude: 21.0162,
        longitude: 105.8118,
        status: 'ONLINE',
        last_seen_at: "datetime('now', '-5 minutes')",
        secret_reference: 'secret-key-lh2',
        is_simulated: 0,
      },
      {
        id: 'dev-03',
        device_code: 'SENSOR-CL-03',
        name: 'Trạm Đo Hồ Chùa Láng',
        location_text: 'Đoạn gần Hồ Láng, Phường Láng Thượng, Hà Nội',
        latitude: 21.0255,
        longitude: 105.8021,
        status: 'FAULTY',
        last_seen_at: "datetime('now', '-25 minutes')",
        secret_reference: 'secret-key-cl3',
        is_simulated: 0,
      },
      {
        id: 'dev-sim-01',
        device_code: 'SENSOR-DEV-SIM',
        name: 'Trạm Thử Nghiệm Simulator (Hà Nội)',
        location_text: '484 Lê Văn Việt, Hồ Chí Minh',
        latitude: 21.0205,
        longitude: 105.8078,
        status: 'ONLINE',
        last_seen_at: "datetime('now', '-1 minutes')",
        secret_reference: 'secret-key-sim',
        is_simulated: 1,
      },
    ];

    for (const d of iotDevices) {
      run(
        `INSERT INTO iot_devices (id, device_code, name, location_text, latitude, longitude, status, last_seen_at, secret_reference, is_simulated, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-30 days'), datetime('now'))`,
        [d.id, d.device_code, d.name, d.location_text, d.latitude, d.longitude, d.status, d.last_seen_at, d.secret_reference, d.is_simulated]
      );
    }

    for (let i = 20; i >= 0; i--) {
      const pm25Val = Math.round((35.0 + Math.sin(i / 2) * 15.0) * 10) / 10;
      const pm10Val = Math.round((65.0 + Math.cos(i / 2) * 20.0) * 10) / 10;
      run(
        `INSERT INTO iot_readings (id, device_id, recorded_at, received_at, pm25, pm10, temperature, humidity, raw_payload_json, integrity_status, created_at)
         VALUES (?, 'dev-01', datetime('now', '-${i * 15} minutes'), datetime('now', '-${i * 15} minutes'), ?, ?, 31.5, 68.0, '{"source_environment": "PROD"}', 'VALID', datetime('now', '-${i * 15} minutes'))`,
        [`read-01-${i}`, pm25Val, pm10Val]
      );
    }

    for (let i = 5; i >= 1; i--) {
      run(
        `INSERT INTO iot_readings (id, device_id, recorded_at, received_at, pm25, pm10, temperature, humidity, raw_payload_json, integrity_status, created_at)
         VALUES (?, 'dev-03', datetime('now', '-${i * 5} minutes'), datetime('now', '-${i * 5} minutes'), 42.0, 85.0, 30.0, 70.0, '{"source_environment": "PROD"}', 'FLATLINE', datetime('now', '-${i * 5} minutes'))`,
        [`read-03-${i}`]
      );
    }

    run(
      `INSERT INTO iot_events (id, device_id, event_type, severity, description, created_at)
       VALUES ('ev-01', 'dev-03', 'FLATLINE', 'HIGH', 'Phát hiện cảm biến treo chỉ số 5 bản tin liên tiếp cùng giá trị PM10 (85.0) và PM2.5 (42.0)', datetime('now', '-15 minutes'))`
    );

    // 14. Seed Automation Rules & Runs
    console.log('[Database Seed] Seeding automation rules & runs...');
    const defaultRules = [
      {
        id: 'rule-case-assigned',
        name: 'Tự động giao việc rà soát khi phân công vụ việc',
        event_type: 'CASE_ASSIGNED',
        conditions_json: JSON.stringify({ has_assignee: true }),
        actions_json: JSON.stringify([{ type: 'CREATE_TASK', title: 'Rà soát hồ sơ vụ việc', due_days: 1 }, { type: 'CREATE_NOTIFICATION', title: 'Bạn có vụ việc mới cần xử lý' }]),
        enabled: 1,
      },
      {
        id: 'rule-legal-needs-info',
        name: 'Tự động yêu cầu bổ sung thông tin khi pháp chế gắn cờ',
        event_type: 'LEGAL_REVIEW_NEEDS_INFO',
        conditions_json: JSON.stringify({ review_status: 'NEEDS_INFO' }),
        actions_json: JSON.stringify([{ type: 'CREATE_TASK', title: 'Thu thập thông tin bổ sung cho pháp chế', priority: 'HIGH' }]),
        enabled: 1,
      },
      {
        id: 'rule-action-overdue',
        name: 'Cảnh báo giám sát khi biện pháp khắc phục quá hạn',
        event_type: 'CORRECTIVE_ACTION_OVERDUE',
        conditions_json: JSON.stringify({ overdue: true }),
        actions_json: JSON.stringify([{ type: 'NOTIFY_SUPERVISOR', message: 'Biện pháp khắc phục đã quá thời hạn cam kết' }]),
        enabled: 1,
      },
      {
        id: 'rule-iot-offline',
        name: 'Thông báo kỹ thuật khi trạm đo mất kết nối',
        event_type: 'IOT_DEVICE_OFFLINE',
        conditions_json: JSON.stringify({ offline_minutes_gt: 15 }),
        actions_json: JSON.stringify([{ type: 'CREATE_TASK', title: 'Kiểm tra trạm đo mất kết nối', priority: 'HIGH' }]),
        enabled: 1,
      },
    ];

    for (const r of defaultRules) {
      run(
        `INSERT INTO automation_rules (id, name, event_type, conditions_json, actions_json, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-30 days'), datetime('now'))`,
        [r.id, r.name, r.event_type, r.conditions_json, r.actions_json, r.enabled]
      );
    }

    run(
      `INSERT INTO automation_runs (id, rule_id, trigger_entity_type, trigger_entity_id, status, input_json, result_json, started_at, completed_at)
       VALUES ('run-01', 'rule-case-assigned', 'CASE', 'case-006', 'SUCCESS', '{"source":"CASE"}', '{"actions":["CREATE_TASK: task-001", "CREATE_NOTIFICATION"]}', datetime('now', '-2 days'), datetime('now', '-2 days'))`
    );

    // 15. Seed Human Decisions & System Configs
    console.log('[Database Seed] Seeding decisions & configs...');
    run(
      `INSERT INTO human_decisions (id, case_id, decision_type, actor_id, actor_name, actor_role, reason, source_snapshot_json, created_at)
       VALUES ('dec-01', 'case-016', 'SEND_TO_FIELD_INSPECTION', 'usr-sup-1', 'Võ Minh Trí', 'supervisor', 'Có 18 phản ánh cộng đồng liên tục và hình ảnh lưới rách, cần lập tổ kiểm tra hiện trường ngay.', '{"source":"COMMUNITY"}', datetime('now', '-9 days'))`
    );

    run(
      `INSERT INTO system_configs (key, value_json, description, updated_at)
       VALUES ('RETENTION_DAYS', '90', 'Số ngày lưu trữ log và ảnh hiện trường', datetime('now')),
              ('DEFAULT_INSPECTION_HOURS', '48', 'Thời hạn hoàn thành kiểm tra đột xuất sau tiếp nhận', datetime('now')),
              ('AUTO_ASSIGN_FALLBACK', '"usr-staff-1"', 'Cán bộ mặc định phân công khi chưa chỉ định', datetime('now'))`
    );

    console.log('✅ [Database Seed] Successfully seeded operations database with coherent Hanoi dataset!');
  });
}

// Direct CLI execution support
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}

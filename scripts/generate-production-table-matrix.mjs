import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const commDb = new DatabaseSync('data/dustguard-community.db', { readOnly: true });
const opsDb = new DatabaseSync('dustguard-operations/data/dustguard-operations.db', { readOnly: true });

function getCount(db, table) {
  try {
    return db.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get().cnt;
  } catch {
    return 0;
  }
}

// 63 Tables mapping to Cloudflare D1 dustguard-production
const tableDefinitions = [
  // Core (0001)
  { table: 'system_configs', db: opsDb, tier: 'MUST KEEP', desc: 'Cấu hình hệ thống tĩnh và quy chuẩn QCVN' },
  { table: 'contractors', db: opsDb, tier: 'MUST KEEP', desc: 'Danh bạ nhà thầu / đơn vị thi công xây dựng' },
  { table: 'projects', db: opsDb, tier: 'MUST KEEP', desc: 'Danh mục công trình đô thị đang theo dõi' },

  // Community Side A (0002)
  { table: 'users', db: commDb, tier: 'MUST KEEP', desc: 'Tài khoản người dân, TNV, điều phối viên cộng đồng' },
  { table: 'cases', db: commDb, tier: 'MUST KEEP', desc: 'Hồ sơ sự vụ bụi mịn Side A' },
  { table: 'reports', db: commDb, tier: 'MUST KEEP', desc: 'Báo cáo phản ánh ô nhiễm từ người dân' },
  { table: 'report_media', db: commDb, tier: 'MUST KEEP', desc: 'Hình ảnh / bằng chứng số kèm mã băm SHA-256 của báo cáo' },
  { table: 'case_reports', db: commDb, tier: 'MUST KEEP', desc: 'Liên kết phản ánh - hồ sơ sự vụ' },
  { table: 'observations', db: commDb, tier: 'MUST KEEP', desc: 'Nhật ký quan trắc hiện trường cộng đồng' },
  { table: 'observation_media', db: commDb, tier: 'MUST KEEP', desc: 'Minh chứng hình ảnh quan trắc' },
  { table: 'confirmations', db: commDb, tier: 'MUST KEEP', desc: 'Đồng thuận cộng đồng (Upvote/Xác nhận)' },
  { table: 'saved_cases', db: commDb, tier: 'MUST KEEP', desc: 'Danh sách hồ sơ người dùng lưu trữ theo dõi' },
  { table: 'case_updates', db: commDb, tier: 'CAN ARCHIVE', desc: 'Cập nhật tiến độ xử lý hồ sơ' },
  { table: 'verification_tasks', db: commDb, tier: 'MUST KEEP', desc: 'Nhiệm vụ vi mô giao cho TNV kiểm chứng' },
  { table: 'task_submissions', db: commDb, tier: 'MUST KEEP', desc: 'Bài nộp kết quả thực địa của TNV' },
  { table: 'communities', db: commDb, tier: 'MUST KEEP', desc: 'Các CLB, hội đồng đội trường học và khu dân cư' },
  { table: 'community_members', db: commDb, tier: 'MUST KEEP', desc: 'Thành viên tham gia CLB môi trường' },
  { table: 'posts', db: commDb, tier: 'MUST KEEP', desc: 'Bài viết thảo luận cộng đồng' },
  { table: 'comments', db: commDb, tier: 'MUST KEEP', desc: 'Bình luận trao đổi trong cộng đồng' },
  { table: 'content_reports', db: commDb, tier: 'CAN DELETE', desc: 'Báo cáo vi phạm nội dung / spam đã giải quyết' },
  { table: 'notifications', db: commDb, tier: 'CAN DELETE', desc: 'Thông báo đẩy cho người dùng (> 30 ngày đọc xong có thể xóa)' },
  { table: 'user_contributions', db: commDb, tier: 'MUST KEEP', desc: 'Điểm số tín chỉ, huy hiệu tình nguyện' },
  { table: 'impact_stats', db: commDb, tier: 'CAN ARCHIVE', desc: 'Thống kê tác động định kỳ' },
  { table: 'audit_logs (Side A)', db: commDb, realTable: 'audit_logs', tier: 'CAN ARCHIVE', desc: 'Nhật ký kiểm toán truy cập Side A (> 90 ngày có thể lưu trữ/xóa)' },
  { table: 'case_feedback', db: commDb, tier: 'CAN ARCHIVE', desc: 'Đánh giá mức độ hài lòng của người dân sau xử lý' },

  // Operations Side B (0003)
  { table: 'ops_users', db: opsDb, realTable: 'users', tier: 'MUST KEEP', desc: 'Cán bộ thanh tra, giám sát, pháp chế' },
  { table: 'ops_sessions', db: opsDb, realTable: 'sessions', tier: 'CAN DELETE', desc: 'Phiên đăng nhập cán bộ (hết hạn cần dọn dẹp)' },
  { table: 'ops_cases', db: opsDb, realTable: 'cases', tier: 'MUST KEEP', desc: 'Hồ sơ sự vụ chuyên trách Side B' },
  { table: 'ops_case_timeline', db: opsDb, realTable: 'case_timeline', tier: 'CAN ARCHIVE', desc: 'Dòng thời gian xử lý chuyên trách (> 1 năm archive)' },
  { table: 'ops_staff_assignments', db: opsDb, realTable: 'staff_assignments', tier: 'MUST KEEP', desc: 'Phân công cán bộ thụ lý hiện trường' },
  { table: 'ops_evidence_assets', db: opsDb, realTable: 'evidence_assets', tier: 'MUST KEEP', desc: 'Kho lưu trữ bằng chứng pháp lý gốc' },
  { table: 'legal_documents', db: opsDb, tier: 'MUST KEEP', desc: 'Văn bản pháp luật quy chuẩn (QCVN 05:2023, Nghị định 45)' },
  { table: 'legal_sections', db: opsDb, tier: 'MUST KEEP', desc: 'Điều khoản pháp lý đã bóc tách phục vụ trích dẫn' },
  { table: 'legal_sections_fts', db: opsDb, tier: 'MUST KEEP', desc: 'Chỉ mục tìm kiếm toàn văn FTS5 văn bản pháp luật' },
  { table: 'legal_search_history', db: opsDb, tier: 'CAN DELETE', desc: 'Lịch sử tra cứu pháp lý tạm thời' },
  { table: 'legal_analyses', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Phân tích khung pháp lý cho từng case' },
  { table: 'legal_reviews', db: opsDb, tier: 'MUST KEEP', desc: 'Ý kiến thẩm định pháp chế của chuyên viên' },
  { table: 'inspection_templates', db: opsDb, tier: 'MUST KEEP', desc: 'Biểu mẫu thanh tra thực địa chuẩn QCVN 18' },
  { table: 'inspection_template_items', db: opsDb, tier: 'MUST KEEP', desc: 'Các tiêu chí đánh giá trong biểu mẫu' },
  { table: 'inspections', db: opsDb, tier: 'MUST KEEP', desc: 'Biên bản kiểm tra thực địa tại công trình' },
  { table: 'inspection_items', db: opsDb, tier: 'MUST KEEP', desc: 'Kết quả chấm điểm từng tiêu chí kiểm tra' },
  { table: 'inspection_findings', db: opsDb, tier: 'MUST KEEP', desc: 'Hành vi vi phạm phát hiện tại hiện trường' },
  { table: 'corrective_actions', db: opsDb, tier: 'MUST KEEP', desc: 'Yêu cầu khắc phục hậu quả gửi nhà thầu' },
  { table: 'remediation_submissions', db: opsDb, tier: 'MUST KEEP', desc: 'Báo cáo khắc phục kèm ảnh đối chứng của nhà thầu' },
  { table: 'case_closures', db: opsDb, tier: 'MUST KEEP', desc: 'Quyết định đóng hồ sơ nghiệm thu khắc phục' },
  { table: 'signals', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Tín hiệu bất thường từ cảm biến & AI' },
  { table: 'case_signals', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Tín hiệu gắn với sự vụ' },
  { table: 'ops_tasks', db: opsDb, realTable: 'tasks', tier: 'MUST KEEP', desc: 'Công việc nội bộ của tổ thanh tra' },
  { table: 'iot_devices', db: opsDb, tier: 'MUST KEEP', desc: 'Danh bạ thiết bị cảm biến bụi IoT' },
  { table: 'iot_readings', db: opsDb, tier: 'CAN DELETE', desc: 'Dữ liệu đo đạc telemetry thô (cần tổng hợp theo giờ rồi xóa thô > 30 ngày)' },
  { table: 'iot_events', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Sự kiện cảnh báo vượt ngưỡng PM2.5/PM10' },
  { table: 'automation_rules', db: opsDb, tier: 'MUST KEEP', desc: 'Quy tắc tự động hóa phát hiện sự vụ' },
  { table: 'automation_rule_runs', db: opsDb, realTable: 'automation_runs', tier: 'CAN DELETE', desc: 'Nhật ký thực thi cron / rule tự động' },
  { table: 'human_decisions', db: opsDb, tier: 'MUST KEEP', desc: 'Quyết định phê duyệt của lãnh đạo / cán bộ' },
  { table: 'evidence_integrity_logs', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Nhật ký xác thực mã băm SHA-256 bằng chứng' },
  { table: 'audit_logs (Side B)', db: opsDb, realTable: 'audit_logs', tier: 'CAN ARCHIVE', desc: 'Nhật ký tác vụ chuyên trách Side B' },

  // Cross Side (0004)
  { table: 'integration_logs', db: opsDb, tier: 'CAN DELETE', desc: 'Logs đồng bộ giữa Side A và Side B' },
  { table: 'cross_side_handoffs', db: opsDb, tier: 'MUST KEEP', desc: 'Hồ sơ bàn giao chính thức giữa cộng đồng và chính quyền' },
  { table: 'decision_support_runs', db: opsDb, tier: 'CAN ARCHIVE', desc: 'Kết quả gợi ý mức xử phạt và căn cứ pháp lý' }
];

const matrix = tableDefinitions.map(t => {
  const tableToQuery = t.realTable || t.table;
  const count = getCount(t.db, tableToQuery);
  return {
    table: t.table,
    tier: t.tier,
    rows: count,
    desc: t.desc
  };
});

fs.writeFileSync('scripts/production-table-matrix.json', JSON.stringify(matrix, null, 2), 'utf-8');
console.log(`Matrix generated for ${matrix.length} tables.`);

// Totals by Tier
const tierSummary = matrix.reduce((acc, cur) => {
  acc[cur.tier] = acc[cur.tier] || { count: 0, rows: 0 };
  acc[cur.tier].count += 1;
  acc[cur.tier].rows += cur.rows;
  return acc;
}, {});

console.log('Tier Summary:', tierSummary);

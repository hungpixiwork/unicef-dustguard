import bcrypt from 'bcryptjs';
import { sqliteClient } from './sqlite-client.js';
import { runMigrations } from './migrate.js';
import { DEMO_LOCATION, HANOI_CENTER } from '@dustguard/shared';

export function runSeed(): void {
  console.log('🌱 Đang nạp seed data chuẩn Hà Nội (Mô hình 2 cấp) cho DustGuard Community...');

  // Đảm bảo bảng đã tồn tại
  runMigrations();

  const passwordHash = bcrypt.hashSync('DustGuard123!', 10);
  const now = new Date().toISOString();
  const subDays = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  const subHours = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();

  // 1. Seed Users (16 users tập trung địa bàn Hà Nội)
  const usersData = [
    {
      id: 'usr_citizen',
      email: 'citizen@dustguard.local',
      fullName: 'Nguyễn Văn Dân',
      phone: '0901234567',
      role: 'citizen',
      district: 'Láng Thượng', // Compat 2-level: mapping to level 2
      ward: 'Láng Thượng',
      bio: 'Cư dân sinh sống tại 484 Lê Văn Việt, Hồ Chí Minh.',
      displayIdentity: 'name'
    },
    {
      id: 'usr_member',
      email: 'member@dustguard.local',
      fullName: 'Trần Thị Tình Nguyện',
      phone: '0902345678',
      role: 'community_member',
      district: 'Láng Hạ',
      ward: 'Láng Hạ',
      bio: 'Thành viên CLB Môi Trường Thanh Niên Hà Nội, thường xuyên hỗ trợ xác minh thực địa.',
      displayIdentity: 'name'
    },
    {
      id: 'usr_moderator',
      email: 'moderator@dustguard.local',
      fullName: 'Lê Hoàng Điều Phối',
      phone: '0903456789',
      role: 'moderator',
      district: 'Thành Công',
      ward: 'Thành Công',
      bio: 'Điều phối viên mạng lưới tình nguyện viên và nhóm cộng đồng địa bàn Hà Nội.',
      displayIdentity: 'name'
    },
    {
      id: 'usr_admin',
      email: 'admin@dustguard.local',
      fullName: 'Phạm Quản Trị Hệ Thống',
      phone: '0904567890',
      role: 'admin',
      district: 'Giảng Võ',
      ward: 'Giảng Võ',
      bio: 'Quản trị viên nền tảng DustGuard Community Hà Nội.',
      displayIdentity: 'name'
    },
    // 12 người dùng cộng đồng khác tại các phường Hà Nội
    { id: 'usr_05', email: 'an.tran@example.com', fullName: 'Trần Bình An', phone: '0911000001', role: 'citizen', district: 'Láng Thượng', ward: 'Láng Thượng' },
    { id: 'usr_06', email: 'bao.le@example.com', fullName: 'Lê Gia Bảo', phone: '0911000002', role: 'community_member', district: 'Láng Hạ', ward: 'Láng Hạ' },
    { id: 'usr_07', email: 'chi.nguyen@example.com', fullName: 'Nguyễn Kim Chi', phone: '0911000003', role: 'citizen', district: 'Ngọc Khánh', ward: 'Ngọc Khánh' },
    { id: 'usr_08', email: 'dung.pham@example.com', fullName: 'Phạm Tiến Dũng', phone: '0911000004', role: 'community_member', district: 'Yên Hòa', ward: 'Yên Hòa' },
    { id: 'usr_09', email: 'em.vo@example.com', fullName: 'Võ Thúy Em', phone: '0911000005', role: 'citizen', district: 'Kim Mã', ward: 'Kim Mã' },
    { id: 'usr_10', email: 'giang.do@example.com', fullName: 'Đỗ Trường Giang', phone: '0911000006', role: 'citizen', district: 'Trung Liệt', ward: 'Trung Liệt' },
    { id: 'usr_11', email: 'hoa.hoang@example.com', fullName: 'Hoàng Quỳnh Hoa', phone: '0911000007', role: 'community_member', district: 'Trung Hòa', ward: 'Trung Hòa' },
    { id: 'usr_12', email: 'khang.dang@example.com', fullName: 'Đặng Minh Khang', phone: '0911000008', role: 'citizen', district: 'Cát Linh', ward: 'Cát Linh' },
    { id: 'usr_13', email: 'linh.bui@example.com', fullName: 'Bùi Mỹ Linh', phone: '0911000009', role: 'citizen', district: 'Láng Thượng', ward: 'Láng Thượng' },
    { id: 'usr_14', email: 'nam.ngo@example.com', fullName: 'Ngô Hoài Nam', phone: '0911000010', role: 'citizen', district: 'Thành Công', ward: 'Thành Công' },
    { id: 'usr_15', email: 'phuc.ly@example.com', fullName: 'Lý Gia Phúc', phone: '0911000011', role: 'community_member', district: 'Dịch Vọng', ward: 'Dịch Vọng' },
    { id: 'usr_16', email: 'quynh.vu@example.com', fullName: 'Vũ Như Quỳnh', phone: '0911000012', role: 'citizen', district: 'Giảng Võ', ward: 'Giảng Võ' }
  ];

  for (const u of usersData) {
    sqliteClient.run(`
      INSERT OR REPLACE INTO users (id, email, phone, password_hash, full_name, role, district, ward, bio, display_identity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      u.id,
      u.email,
      u.phone,
      passwordHash,
      u.fullName,
      u.role,
      u.district,
      u.ward || '',
      u.bio || 'Cư dân tích cực theo dõi môi trường Hà Nội.',
      u.displayIdentity || 'name',
      subDays(30),
      now
    ]);
  }

  // 2. Seed 4 Communities (Hà Nội)
  const communitiesData = [
    {
      id: 'comm_langha',
      name: 'Cộng đồng Không khí sạch Láng Hạ',
      slug: 'lang-ha-clean-air',
      description: 'Mạng lưới người dân và thanh niên theo dõi bụi phát tán từ các công trình xây dựng và giao thông trục Láng Hạ - Huỳnh Thúc Kháng.',
      district: 'Láng Hạ',
      ward: 'Láng Hạ',
      createdBy: 'usr_moderator',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'
    },
    {
      id: 'comm_chualang',
      name: 'Green Youth Chùa Láng',
      slug: 'chua-lang-green-youth',
      description: 'Nhóm thanh niên xung kích giám sát bụi đường và xe chở vật liệu quanh khu vực Chùa Láng và Hồ Láng.',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      createdBy: 'usr_moderator',
      coverUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=60'
    },
    {
      id: 'comm_nguyenchithanh',
      name: 'Cộng đồng Cư dân Nguyễn Chí Thanh',
      slug: 'nguyen-chi-thanh-environment',
      description: 'Nhóm cư dân chia sẻ và đối chiếu tín hiệu bụi từ các điểm thi công hạ tầng dọc tuyến Nguyễn Chí Thanh.',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      createdBy: 'usr_moderator',
      coverUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=60'
    },
    {
      id: 'comm_sinhvien',
      name: 'CLB Sinh viên Thủ đô vì Không khí sạch',
      slug: 'sinh-vien-thu-do-vi-khong-khi-sach',
      description: 'CLB sinh viên các trường ĐH khu vực Chùa Láng & Nguyễn Chí Thanh phối hợp quan sát và lập hồ sơ hiện trường.',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      createdBy: 'usr_member',
      coverUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=60'
    }
  ];

  for (const c of communitiesData) {
    sqliteClient.run(`
      INSERT OR REPLACE INTO communities (id, name, slug, description, cover_url, district, ward, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [c.id, c.name, c.slug, c.description, c.coverUrl, c.district, c.ward, c.createdBy, subDays(25), now]);

    // Thêm các thành viên vào nhóm
    for (const u of usersData.slice(0, 8)) {
      sqliteClient.run(`
        INSERT OR IGNORE INTO community_members (id, community_id, user_id, role, joined_at)
        VALUES (?, ?, ?, ?, ?)
      `, [`cm_${c.id}_${u.id}`, c.id, u.id, u.id === c.createdBy ? 'coordinator' : 'member', subDays(20)]);
    }
  }

  // 3. Seed Cases (15 cases liên kết logic chặt chẽ tại Hà Nội quanh 62 Nguyễn Chí Thanh)
  // Golden Case SSOT: DG-C-2026-0842 tại nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh
  const casesData = [
    {
      id: 'case_0842',
      caseCode: 'DG-C-2026-0842',
      title: 'Bụi phát sinh quanh công trình mở rộng đường Huỳnh Thúc Kháng kéo dài',
      summary: 'Hoạt động san lấp và xe ben chở đất cát không rửa bánh khi ra khỏi cổng công trình làm phát tán bụi mù mịt sang làn đường Nguyễn Chí Thanh.',
      category: 'dust',
      latitude: 21.0185,
      longitude: 105.8095,
      address: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh, Phường Láng Thượng',
      ward: 'Láng Thượng',
      district: 'Láng Thượng',
      status: 'in_progress',
      priority: 'urgent',
      signalCount: 6,
      uniqueReporterCount: 5,
      firstReportedAt: subDays(4),
      lastActivityAt: subHours(3),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0002',
      caseCode: 'DG-C-2026-0112',
      title: 'Vật liệu tập kết ven đường Chùa Láng gây bụi dày',
      summary: 'Các đống cát đá phục vụ sửa chữa vỉa hè để lộ thiên không bạt che chắn, gió cuốn bụi vào nhà dân và các hàng quán gần ĐH Ngoại Thương.',
      category: 'construction_material',
      latitude: 21.0242,
      longitude: 105.8041,
      address: 'Đoạn ngõ 84 đến ngõ 185 Chùa Láng, Phường Láng Thượng',
      ward: 'Láng Thượng',
      district: 'Láng Thượng',
      status: 'community_verifying',
      priority: 'attention',
      signalCount: 4,
      uniqueReporterCount: 3,
      firstReportedAt: subDays(6),
      lastActivityAt: subHours(12),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0003',
      caseCode: 'DG-C-2026-0158',
      title: 'Xe chở phế thải xây dựng rơi vãi trên trục đường Láng Hạ',
      summary: 'Đoàn xe ben chở đất đá từ dự án cao ốc không phủ kín bạt, làm đất rơi thành vệt dài gây bụi trắng xóa khi các phương tiện lưu thông.',
      category: 'road_dust',
      latitude: 21.0152,
      longitude: 105.8130,
      address: 'Trục Láng Hạ hướng về ngã tư Huỳnh Thúc Kháng - Thái Hà, Phường Láng Hạ',
      ward: 'Láng Hạ',
      district: 'Láng Hạ',
      status: 'forwarded',
      priority: 'urgent',
      signalCount: 8,
      uniqueReporterCount: 6,
      firstReportedAt: subDays(10),
      lastActivityAt: subDays(1),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0004',
      caseCode: 'DG-C-2026-0205',
      title: 'Bãi phế thải xây dựng tự phát tại đường gom Vành Đai 2 ven sông Tô Lịch',
      summary: 'Tập kết gạch vụn và xà bần tràn ra đường gom ven sông, gió cuốn bụi xi măng ảnh hưởng người đi bộ và người tham gia giao thông.',
      category: 'illegal_dumping',
      latitude: 21.0175,
      longitude: 105.7985,
      address: 'Đường Láng đoạn Cầu Cót - Cầu Yên Hòa, Phường Yên Hòa',
      ward: 'Yên Hòa',
      district: 'Yên Hòa',
      status: 'resolved',
      priority: 'normal',
      signalCount: 5,
      uniqueReporterCount: 4,
      firstReportedAt: subDays(18),
      lastActivityAt: subDays(2),
      resolvedAt: subDays(2),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0005',
      caseCode: 'DG-C-2026-0220',
      title: 'Công trình tổ hợp cao ốc phát tán bụi sơn và xi măng',
      summary: 'Không kéo căng lưới bao che ở các tầng cao từ tầng 18 trở lên, bụi phát tán trực tiếp xuống khu dân cư lân cận.',
      category: 'dust',
      latitude: 21.0148,
      longitude: 105.8135,
      address: 'Số 88 Láng Hạ, Phường Láng Hạ',
      ward: 'Láng Hạ',
      district: 'Láng Hạ',
      status: 'confirmed_signal',
      priority: 'attention',
      signalCount: 5,
      uniqueReporterCount: 4,
      firstReportedAt: subDays(5),
      lastActivityAt: subHours(8),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0006',
      caseCode: 'DG-C-2026-0245',
      title: 'Bụi cát bao phủ lòng đường đoạn thi công hạ ngầm cáp Nguyễn Chí Thanh',
      summary: 'Đào rãnh hạ ngầm cáp viễn thông nhưng để đất cát vương vãi trên mặt đường không thu dọn trong ngày, xe cộ đi qua tạo bụi mù.',
      category: 'dust',
      latitude: 21.0210,
      longitude: 105.8075,
      address: 'Đối diện số 62 Nguyễn Chí Thanh, Phường Láng Thượng',
      ward: 'Láng Thượng',
      district: 'Láng Thượng',
      status: 'new',
      priority: 'normal',
      signalCount: 2,
      uniqueReporterCount: 2,
      firstReportedAt: subHours(18),
      lastActivityAt: subHours(5),
      createdBy: 'usr_member'
    },
    {
      id: 'case_0007',
      caseCode: 'DG-C-2026-0290',
      title: 'Thi công chỉnh trang hồ Đống Đa làm rơi bùn đất tạo bụi hanh khô',
      summary: 'Xe vận chuyển nạo vét bùn đất chạy qua đường Hoàng Cầu không được phủ bạt kín, bùn rơi xuống lòng đường khô lại thành bụi mịn.',
      category: 'road_dust',
      latitude: 21.0180,
      longitude: 105.8235,
      address: 'Tuyến đường Hoàng Cầu ven hồ Đống Đa, Phường Ô Chợ Dừa',
      ward: 'Ô Chợ Dừa',
      district: 'Ô Chợ Dừa',
      status: 'in_progress',
      priority: 'normal',
      signalCount: 3,
      uniqueReporterCount: 3,
      firstReportedAt: subDays(7),
      lastActivityAt: subDays(1),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0008',
      caseCode: 'DG-C-2026-0310',
      title: 'Bụi phát sinh từ công trình cải tạo trường học đường Thành Công',
      summary: 'Hoạt động đập phá vách tường cũ không phun sương tạo lớp bụi mờ lan sang khu chợ Thành Công.',
      category: 'construction_material',
      latitude: 21.0228,
      longitude: 105.8152,
      address: 'Khu tập thể Thành Công, Phường Thành Công',
      ward: 'Thành Công',
      district: 'Thành Công',
      status: 'community_verifying',
      priority: 'attention',
      signalCount: 3,
      uniqueReporterCount: 3,
      firstReportedAt: subDays(3),
      lastActivityAt: subHours(6),
      createdBy: 'usr_member'
    },
    {
      id: 'case_0009',
      caseCode: 'DG-C-2026-0340',
      title: 'Cắt gạch vỉa hè không thu gom bụi khô tại ngã tư Giảng Võ',
      summary: 'Đội lát đá vỉa hè dùng máy cắt đĩa khô không phun nước, bụi đá bay mù mịt vào các phương tiện dừng đèn đỏ.',
      category: 'dust',
      latitude: 21.0285,
      longitude: 105.8205,
      address: 'Nút giao Giảng Võ - Cát Linh, Phường Cát Linh',
      ward: 'Cát Linh',
      district: 'Cát Linh',
      status: 'resolved',
      priority: 'normal',
      signalCount: 4,
      uniqueReporterCount: 4,
      firstReportedAt: subDays(15),
      lastActivityAt: subDays(4),
      resolvedAt: subDays(4),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0010',
      caseCode: 'DG-C-2026-0388',
      title: 'Xe bồn chở bê tông làm rò rỉ vữa trên cầu vượt Nguyễn Chí Thanh',
      summary: 'Vữa xi măng rò rỉ khô lại trên mặt cầu bị bánh xe nghiền nát thành bụi trắng độc hại.',
      category: 'road_dust',
      latitude: 21.0220,
      longitude: 105.8088,
      address: 'Cầu vượt nút giao Nguyễn Chí Thanh - Huỳnh Thúc Kháng, Phường Láng Thượng',
      ward: 'Láng Thượng',
      district: 'Láng Thượng',
      status: 'confirmed_signal',
      priority: 'attention',
      signalCount: 4,
      uniqueReporterCount: 3,
      firstReportedAt: subDays(8),
      lastActivityAt: subDays(2),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0011',
      caseCode: 'DG-C-2026-0412',
      title: 'Xe chở vật liệu làm rơi vãi đá dăm tại đường Nguyễn Khang',
      summary: 'Đá dăm và cát rơi từ thùng xe ben gây bụi mù mịt khi các phương tiện di chuyển với tốc độ cao.',
      category: 'road_dust',
      latitude: 21.0195,
      longitude: 105.8010,
      address: 'Đoạn đường Nguyễn Khang ven sông Tô Lịch, Phường Yên Hòa',
      ward: 'Yên Hòa',
      district: 'Yên Hòa',
      status: 'in_progress',
      priority: 'urgent',
      signalCount: 7,
      uniqueReporterCount: 5,
      firstReportedAt: subDays(9),
      lastActivityAt: subHours(10),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0012',
      caseCode: 'DG-C-2026-0430',
      title: 'Công trình phá dỡ nhà cũ không căng bạt chắn tại ngõ Chùa Láng',
      summary: 'Máy phá bê tông hoạt động giữa trưa không phun nước làm bụi phủ trắng xóa cây cối và nhà dân xung quanh.',
      category: 'dust',
      latitude: 21.0258,
      longitude: 105.8028,
      address: 'Ngõ 185 Chùa Láng, Phường Láng Thượng',
      ward: 'Láng Thượng',
      district: 'Láng Thượng',
      status: 'forwarded',
      priority: 'urgent',
      signalCount: 6,
      uniqueReporterCount: 5,
      firstReportedAt: subDays(6),
      lastActivityAt: subDays(1),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0013',
      caseCode: 'DG-C-2026-0450',
      title: 'Bãi rửa xe ra vào công trình xả bùn ra vỉa hè đường Kim Mã',
      summary: 'Nước rửa bánh xe tràn ra vỉa hè để lại lớp bùn dày, khi nắng lên biến thành bụi mịn.',
      category: 'road_dust',
      latitude: 21.0312,
      longitude: 105.8035,
      address: 'Gần nút giao Kim Mã - Cầu Giấy, Phường Ngọc Khánh',
      ward: 'Ngọc Khánh',
      district: 'Ngọc Khánh',
      status: 'new',
      priority: 'normal',
      signalCount: 1,
      uniqueReporterCount: 1,
      firstReportedAt: subHours(12),
      lastActivityAt: subHours(12),
      createdBy: 'usr_citizen'
    },
    {
      id: 'case_0014',
      caseCode: 'DG-C-2026-0480',
      title: 'Cải tạo vườn hoa công cộng phát tán bụi cát',
      summary: 'San ủi mặt bằng đất màu không che chắn làm gió thổi bụi cát sang trường học đối diện.',
      category: 'dust',
      latitude: 21.0270,
      longitude: 105.8180,
      address: 'Vườn hoa hồ Giảng Võ, Phường Giảng Võ',
      ward: 'Giảng Võ',
      district: 'Giảng Võ',
      status: 'closed',
      priority: 'normal',
      signalCount: 3,
      uniqueReporterCount: 3,
      firstReportedAt: subDays(22),
      lastActivityAt: subDays(12),
      resolvedAt: subDays(14),
      createdBy: 'usr_moderator'
    },
    {
      id: 'case_0015',
      caseCode: 'DG-C-2026-0500',
      title: 'Tập kết bao xi măng rách tại công trình nhà dân ngõ Huỳnh Thúc Kháng',
      summary: 'Các vỏ bao xi măng phế liệu vứt ngoài ngõ bị gió thổi làm bột xi măng phát tán vào không khí.',
      category: 'construction_material',
      latitude: 21.0170,
      longitude: 105.8110,
      address: 'Ngõ 14 Huỳnh Thúc Kháng, Phường Láng Hạ',
      ward: 'Láng Hạ',
      district: 'Láng Hạ',
      status: 'archived',
      priority: 'normal',
      signalCount: 2,
      uniqueReporterCount: 2,
      firstReportedAt: subDays(40),
      lastActivityAt: subDays(30),
      resolvedAt: subDays(30),
      createdBy: 'usr_moderator'
    }
  ];

  for (const c of casesData) {
    sqliteClient.run(`
      INSERT OR REPLACE INTO cases (
        id, case_code, title, summary, category, latitude, longitude, address, ward, district, status, priority,
        signal_count, unique_reporter_count, first_reported_at, last_activity_at, resolved_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      c.id, c.caseCode, c.title, c.summary, c.category, c.latitude, c.longitude, c.address, c.ward || '', c.district,
      c.status, c.priority, c.signalCount, c.uniqueReporterCount, c.firstReportedAt, c.lastActivityAt, c.resolvedAt || null,
      c.createdBy, c.firstReportedAt, c.lastActivityAt
    ]);
  }

  // 4. Seed Reports (32 reports deterministic liên kết chặt chẽ với các cases và khu vực Hà Nội)
  const sampleReports: any[] = [
    // Reports liên quan case 0842 (Sample case mục 17)
    {
      id: 'rep_0842_1',
      reportCode: 'DG-C-2026-0001',
      reporterId: 'usr_citizen',
      title: 'Bụi công trình Huỳnh Thúc Kháng mù mịt vào giờ cao điểm',
      description: 'Chiều nào đi làm về qua đoạn này cũng bị bụi bay cay xè mắt, công trình xe tải ra vào liên tục không có vòi xịt nước.',
      category: 'dust',
      latitude: 21.0186,
      longitude: 105.8094,
      address: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      observedAt: subDays(4),
      status: 'verified',
      severityObservation: 'high',
      caseId: 'case_0842'
    },
    {
      id: 'rep_0842_2',
      reportCode: 'DG-C-2026-0002',
      reporterId: 'usr_05',
      title: 'Xe chở đất từ dự án Huỳnh Thúc Kháng làm rơi vãi đất cát',
      description: 'Nhiều xe tải cơi nới thùng không che chắn cẩn thận làm cát đổ thành vệt dài tại làn đường Nguyễn Chí Thanh.',
      category: 'road_dust',
      latitude: 21.0189,
      longitude: 105.8098,
      address: 'Trước cổng dự án đường Huỳnh Thúc Kháng kéo dài',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      observedAt: subDays(4),
      status: 'verified',
      severityObservation: 'medium',
      caseId: 'case_0842'
    },
    {
      id: 'rep_0842_3',
      reportCode: 'DG-C-2026-0003',
      reporterId: 'usr_13',
      title: 'Bụi phát tán làm giảm tầm nhìn của người tham gia giao thông',
      description: 'Lượng bụi phát tán mạnh vào buổi trưa khi gió to, các phương tiện đi qua phải giảm tốc độ.',
      category: 'dust',
      latitude: 21.0182,
      longitude: 105.8092,
      address: 'Đoạn đường Nguyễn Chí Thanh hướng về cầu vượt',
      district: 'Láng Thượng',
      ward: 'Láng Thượng',
      observedAt: subDays(3),
      status: 'verified',
      severityObservation: 'high',
      caseId: 'case_0842'
    }
  ];

  // Thêm 29 reports deterministic trải đều các phường Hà Nội
  for (let i = 4; i <= 32; i++) {
    const caseIndex = (i % casesData.length);
    const targetCase = casesData[caseIndex];
    const isLinked = i % 4 !== 0; // Một số report chưa link để moderator verify
    const repStatus = isLinked ? 'verified' : (i % 2 === 0 ? 'submitted' : 'reviewing');

    // Deterministic offset thay vì Math.random()
    const latOffset = (((i % 7) - 3) * 0.0003);
    const lngOffset = (((i % 5) - 2) * 0.0003);

    sampleReports.push({
      id: `rep_${1000 + i}`,
      reportCode: `DG-C-2026-${String(i).padStart(4, '0')}`,
      reporterId: usersData[i % usersData.length].id,
      title: `Phản ánh bụi phát sinh tại Phường ${targetCase.ward} (#${i})`,
      description: `Ghi nhận tình trạng khói bụi từ hoạt động thi công và vận chuyển vật liệu tại địa bàn ${targetCase.address}. Kính mong cộng đồng hỗ trợ theo dõi.`,
      category: targetCase.category,
      latitude: Number((targetCase.latitude + latOffset).toFixed(6)),
      longitude: Number((targetCase.longitude + lngOffset).toFixed(6)),
      address: targetCase.address,
      district: targetCase.district,
      ward: targetCase.ward || 'Láng Thượng',
      observedAt: subDays(Math.floor(i / 2)),
      status: repStatus,
      severityObservation: (i % 3 === 0 ? 'high' : (i % 2 === 0 ? 'medium' : 'low')),
      caseId: isLinked ? targetCase.id : null
    });
  }

  for (const r of sampleReports) {
    sqliteClient.run(`
      INSERT OR REPLACE INTO reports (
        id, report_code, reporter_id, title, description, category, latitude, longitude, address, ward, district,
        observed_at, status, severity_observation, case_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      r.id, r.reportCode, r.reporterId, r.title, r.description, r.category, r.latitude, r.longitude, r.address,
      r.ward, r.district, r.observedAt, r.status, r.severityObservation, r.caseId, r.observedAt, r.observedAt
    ]);

    // Bổ sung ảnh minh chứng demo cho report
    const dummyHash = `a1b2c3d4e5f6${r.id}9876543210abcdef`;
    sqliteClient.run(`
      INSERT OR REPLACE INTO report_media (
        id, report_id, uploaded_by, file_name, file_path, mime_type, file_size, sha256_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `med_${r.id}`,
      r.id,
      r.reporterId,
      'hien_truong_bui.jpg',
      'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=60',
      'image/jpeg',
      1024 * 350,
      dummyHash,
      r.observedAt
    ]);

    // Nếu đã link vào case, thêm vào bảng nối case_reports
    if (r.caseId) {
      sqliteClient.run(`
        INSERT OR IGNORE INTO case_reports (id, case_id, report_id, linked_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [`cr_${r.caseId}_${r.id}`, r.caseId, r.id, 'usr_moderator', r.observedAt]);
    }
  }

  // 5. Seed Timeline Updates cho Case 0842 (Sample case chuẩn)
  const timelineData = [
    {
      caseId: 'case_0842',
      updateType: 'community_update',
      title: 'Phản ánh đầu tiên được ghi nhận',
      content: 'Cộng đồng tiếp nhận phản ánh đầu tiên của người dân về tình trạng bụi tại nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh.',
      createdAt: subDays(4)
    },
    {
      caseId: 'case_0842',
      updateType: 'community_update',
      title: 'Nhiều tín hiệu tương tự được bổ sung',
      content: 'Hai phản ánh tương tự kèm hình ảnh hiện trường được gửi đến từ cư dân lân cận Phường Láng Thượng.',
      createdAt: subDays(3)
    },
    {
      caseId: 'case_0842',
      updateType: 'community_update',
      title: 'Cộng đồng bổ sung hình ảnh thực địa',
      content: 'Thành viên tình nguyện ghi nhận xe tải không rửa lốp khi rời công trình ra đường Nguyễn Chí Thanh.',
      createdAt: subDays(2)
    },
    {
      caseId: 'case_0842',
      updateType: 'moderator_note',
      title: 'Điều phối viên xác thực vụ việc',
      content: 'Điều phối viên tổng hợp các báo cáo và xác nhận tín hiệu rõ ràng, tạo hồ sơ theo dõi tập trung.',
      createdAt: subDays(1)
    },
    {
      caseId: 'case_0842',
      updateType: 'status_change',
      title: 'Chuyển sang trạng thái đang theo dõi xử lý',
      content: 'Đã liên hệ ban quản lý công trình nhắc nhở tăng cường tưới nước giảm bụi và che bạt xe vận chuyển.',
      createdAt: subHours(3)
    }
  ];

  for (let i = 0; i < timelineData.length; i++) {
    const t = timelineData[i];
    sqliteClient.run(`
      INSERT OR REPLACE INTO case_updates (id, case_id, update_type, title, content, created_by, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [`upd_${t.caseId}_${i}`, t.caseId, t.updateType, t.title, t.content, 'usr_moderator', 1, t.createdAt]);
  }

  // 6. Seed Confirmations ("Tôi cũng ghi nhận" - 80+ records)
  for (let i = 0; i < casesData.length; i++) {
    const c = casesData[i];
    const count = i === 0 ? 14 : Math.min(usersData.length, (i % 6) + 4);
    for (let u = 0; u < count; u++) {
      const user = usersData[u];
      sqliteClient.run(`
        INSERT OR IGNORE INTO confirmations (id, case_id, user_id, created_at)
        VALUES (?, ?, ?, ?)
      `, [`conf_${c.id}_${user.id}`, c.id, user.id, subHours(u * 5 + 1)]);
    }
  }

  // 7. Seed Observations (40+ records deterministic)
  const obsTypes = ['still_present', 'reduced', 'resolved', 'additional_evidence', 'cannot_confirm'] as const;
  const obsComments = [
    'Tôi vừa đi ngang lúc 16h, bụi vẫn còn khá nhiều ở làn xe máy đường Nguyễn Chí Thanh.',
    'Sáng nay thấy có xe bồn tưới nước mặt đường, bụi đã giảm bớt một phần.',
    'Công trình đã che bạt xanh phía ngoài, tình hình có cải thiện hơn tuần trước.',
    'Bổ sung ảnh chụp từ tòa nhà đối diện, thấy bụi phát tán khi xe ben quay đầu.',
    'Lúc 11h ghé qua không thấy xe tải hoạt động nữa, tạm thời sạch sẽ.'
  ];

  for (let i = 0; i < 42; i++) {
    const targetCase = casesData[i % casesData.length];
    const user = usersData[i % usersData.length];
    const obsType = obsTypes[i % obsTypes.length];
    const comment = obsComments[i % obsComments.length];
    const obsId = `obs_${100 + i}`;

    sqliteClient.run(`
      INSERT OR REPLACE INTO observations (id, case_id, user_id, observation_type, comment, observed_at, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [obsId, targetCase.id, user.id, obsType, comment, subHours(i * 3 + 2), targetCase.latitude, targetCase.longitude, subHours(i * 3 + 2)]);

    if (i % 2 === 0) {
      sqliteClient.run(`
        INSERT OR REPLACE INTO observation_media (id, observation_id, file_path, mime_type, file_size, sha256_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        `obs_med_${obsId}`,
        obsId,
        'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=60',
        'image/jpeg',
        1024 * 200,
        `obs_hash_${obsId}`,
        subHours(i * 3 + 2)
      ]);
    }
  }

  // 8. Seed Verification Tasks (Hà Nội)
  const tasksData = [
    {
      id: 'task_01',
      caseId: 'case_0842',
      title: 'Kiểm tra tình trạng rửa lốp xe ben tại cổng công trình Huỳnh Thúc Kháng',
      description: 'Xác nhận xem công trình đã bố trí cầu rửa xe và nhân viên xịt bánh xe trước khi ra đường Nguyễn Chí Thanh hay chưa.',
      taskType: 'field_check',
      latitude: 21.0185,
      longitude: 105.8095,
      address: 'Nút giao Huỳnh Thúc Kháng & Nguyễn Chí Thanh',
      status: 'open',
      assignedTo: null
    },
    {
      id: 'task_02',
      caseId: 'case_0002',
      title: 'Chụp ảnh cập nhật che phủ bạt đống cát đá tại Chùa Láng',
      description: 'Chụp hình ảnh minh chứng mới nhất để đối chiếu sau khi đơn vị thi công cam kết phủ bạt.',
      taskType: 'photo_update',
      latitude: 21.0242,
      longitude: 105.8041,
      address: 'Ngõ 84 Chùa Láng, Phường Láng Thượng',
      status: 'claimed',
      assignedTo: 'usr_member'
    },
    {
      id: 'task_03',
      caseId: 'case_0003',
      title: 'Kiểm tra vệt đất rơi vãi trên làn đường Láng Hạ',
      description: 'Đối chiếu xem đơn vị dọn vệ sinh đã quét sạch lớp bùn đất khô hay chưa.',
      taskType: 'status_check',
      latitude: 21.0152,
      longitude: 105.8130,
      address: 'Trục Láng Hạ hướng về ngã tư Thái Hà',
      status: 'completed',
      assignedTo: 'usr_06'
    },
    {
      id: 'task_04',
      caseId: 'case_0005',
      title: 'Chụp góc rộng lưới bao che chung cư cao tầng 88 Láng Hạ',
      description: 'Ghi lại hình ảnh các tầng cao xem lưới chống bụi đã được kéo kín toàn bộ hay chưa.',
      taskType: 'photo_update',
      latitude: 21.0148,
      longitude: 105.8135,
      address: 'Số 88 Láng Hạ, Phường Láng Hạ',
      status: 'open',
      assignedTo: null
    },
    {
      id: 'task_05',
      caseId: 'case_0008',
      title: 'Kiểm tra công trình cải tạo trường học Thành Công',
      description: 'Quan sát biện pháp phun sương dập bụi và che chắn vỉa hè xung quanh khu dân cư.',
      taskType: 'field_check',
      latitude: 21.0228,
      longitude: 105.8152,
      address: 'Khu tập thể Thành Công, Phường Thành Công',
      status: 'open',
      assignedTo: null
    }
  ];

  for (const t of tasksData) {
    sqliteClient.run(`
      INSERT OR REPLACE INTO verification_tasks (
        id, case_id, title, description, task_type, latitude, longitude, address, assigned_to, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      t.id, t.caseId, t.title, t.description, t.taskType, t.latitude, t.longitude, t.address,
      t.assignedTo, t.status, 'usr_moderator', subDays(2), now
    ]);

    if (t.status === 'completed') {
      sqliteClient.run(`
        INSERT OR REPLACE INTO task_submissions (id, task_id, user_id, result, note, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        `sub_${t.id}`,
        t.id,
        t.assignedTo || 'usr_member',
        'confirmed',
        'Đã kiểm tra hiện trường, đơn vị đã cho quét sạch lớp đất khô và không còn phát sinh bụi mù.',
        subHours(4)
      ]);
    }
  }

  // 9. Seed Community Posts & Comments
  for (const c of communitiesData) {
    const postId = `post_${c.id}_1`;
    sqliteClient.run(`
      INSERT OR REPLACE INTO posts (id, community_id, author_id, post_type, title, content, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      postId,
      c.id,
      c.createdBy,
      'announcement',
      `Kế hoạch phối hợp theo dõi các điểm nóng bụi quý này tại Phường ${c.ward}`,
      'Chào các thành viên, chúng ta sẽ tập trung hỗ trợ ghi nhận và xác minh các tín hiệu bụi từ các trục đường chính. Hãy cùng nhau bổ sung quan sát khi có dịp đi qua nhé!',
      'published',
      subDays(5),
      subDays(5)
    ]);

    sqliteClient.run(`
      INSERT OR REPLACE INTO comments (id, post_id, user_id, content, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [`cmt_${postId}_1`, postId, 'usr_citizen', 'Rất hoan nghênh sáng kiến này, mình ở 62 Nguyễn Chí Thanh sẽ chú ý chụp ảnh các điểm quanh khu vực.', 'visible', subDays(4), subDays(4)]);
  }

  // 10. Seed Notifications
  for (let i = 0; i < 20; i++) {
    const user = usersData[i % 4];
    sqliteClient.run(`
      INSERT OR REPLACE INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `notif_${i}`,
      user.id,
      i % 2 === 0 ? 'case_update' : 'observation',
      i % 2 === 0 ? 'Vụ việc bạn theo dõi vừa có cập nhật mới' : 'Có quan sát mới tại khu vực của bạn',
      i % 2 === 0 ? 'Công trình Huỳnh Thúc Kháng đã bổ sung biện pháp dọn dẹp mặt đường.' : 'Thành viên cộng đồng vừa đăng ảnh xác thực hiện trường tại Láng Thượng.',
      'case',
      'case_0842',
      i > 10 ? 1 : 0,
      subHours(i * 4 + 1)
    ]);
  }

  // 11. Seed Saved Cases
  sqliteClient.run(`
    INSERT OR IGNORE INTO saved_cases (id, case_id, user_id, created_at)
    VALUES ('save_1', 'case_0842', 'usr_citizen', '${subDays(3)}'),
           ('save_2', 'case_0002', 'usr_citizen', '${subDays(2)}'),
           ('save_3', 'case_0003', 'usr_citizen', '${subDays(1)}')
  `);

  // 12. Seed User Contributions
  sqliteClient.run(`
    INSERT OR IGNORE INTO user_contributions (id, user_id, type, entity_id, status, created_at)
    VALUES ('uc_1', 'usr_citizen', 'report', 'rep_0842_1', 'accepted', '${subDays(4)}'),
           ('uc_2', 'usr_citizen', 'confirmation', 'conf_case_0842_usr_citizen', 'accepted', '${subDays(3)}'),
           ('uc_3', 'usr_citizen', 'observation', 'obs_100', 'accepted', '${subDays(2)}')
  `);

  // 13. Seed Audit Logs
  sqliteClient.run(`
    INSERT OR IGNORE INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json, ip_address, created_at)
    VALUES 
      ('aud_1', 'usr_citizen', 'LOGIN', 'user', 'usr_citizen', '{"role":"citizen"}', '127.0.0.1', '${subDays(4)}'),
      ('aud_2', 'usr_citizen', 'CREATE_REPORT', 'report', 'rep_0842_1', '{"title":"Bụi công trình Huỳnh Thúc Kháng"}', '127.0.0.1', '${subDays(4)}'),
      ('aud_3', 'usr_moderator', 'VERIFY_REPORT', 'report', 'rep_0842_1', '{"action":"create_case"}', '127.0.0.1', '${subDays(3)}'),
      ('aud_4', 'usr_moderator', 'CREATE_CASE', 'case', 'case_0842', '{"code":"DG-C-2026-0842"}', '127.0.0.1', '${subDays(3)}'),
      ('aud_5', 'usr_moderator', 'CHANGE_CASE_STATUS', 'case', 'case_0842', '{"old":"new","new":"in_progress"}', '127.0.0.1', '${subHours(3)}')
  `);

  console.log('✅ Đã nạp thành công toàn bộ Seed Data Hà Nội (Mô hình 2 cấp) cho DustGuard Community!');
}

// Cho phép chạy trực tiếp từ CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}

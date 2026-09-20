import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { query, get, run, calculateDistanceMeters } from './d1.js';
import { putObject, getMimeType } from './r2.js';
import { getLiveState } from './iot-live-state.js';

const JWT_SECRET = 'dustguard-production-jwt-secret-2026';

export function createCommunityRouter() {
  const app = new Hono<{ Bindings: { DB: any; STORAGE: any; EVIDENCE_BUCKET: any; INTEGRATION_SERVICE_KEY?: string } }>();

  // Helper trích xuất user từ header Authorization
  async function getUser(c: any): Promise<any | null> {
    const authHeader = c.req.header('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7).trim();
    try {
      const payload: any = await verify(token, JWT_SECRET, 'HS256');
      if (!payload?.id) return null;
      let user = await get(c.env.DB, 'SELECT * FROM users WHERE id = ? AND status != "deleted"', [payload.id]);
      if (!user) {
        // Hỗ trợ phiên cán bộ ops_users khi chuyển hướng qua lại, không xóa phiên
        const opsUser = await get(c.env.DB, 'SELECT * FROM ops_users WHERE id = ? AND active = 1', [payload.id]);
        if (opsUser) {
          return {
            id: opsUser.id,
            email: opsUser.email,
            username: opsUser.username,
            name: opsUser.full_name,
            full_name: opsUser.full_name,
            fullName: opsUser.full_name,
            role: opsUser.role,
            isOpsUser: true
          };
        }
        return null;
      }
      return sanitizeUser(user);
    } catch {
      return null;
    }
  }

  function sanitizeUser(user: any): any {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    const fullName = safe.full_name || safe.fullName || (safe.email ? safe.email.split('@')[0] : 'Người dùng');
    return {
      ...safe,
      name: fullName,
      fullName,
      full_name: fullName,
      avatarUrl: safe.avatar_url || safe.avatarUrl || null,
      createdAt: safe.created_at || safe.createdAt || null
    };
  }

  // ============================================================================
  // 1. AUTH ROUTES (/api/auth)
  // ============================================================================
  app.post('/auth/register', async (c) => {
    try {
      const body = await c.req.json();
      const email = body.email?.toLowerCase().trim();
      const password = body.password;
      const fullName = body.fullName || body.full_name;

      if (!email || !password || !fullName) {
        return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vui lòng cung cấp đầy đủ email, mật khẩu và họ tên.' } }, 400);
      }

      const existing = await get(c.env.DB, 'SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return c.json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email này đã được đăng ký trong hệ thống.' } }, 409);
      }

      const id = `usr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();

      // Bảo vệ chống Mass Assignment & Privilege Escalation: Đăng ký tự do công khai luôn là 'citizen'
      const userRole = 'citizen';

      await run(c.env.DB, `
        INSERT INTO users (id, email, phone, password_hash, full_name, role, status, district, ward, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `, [id, email, body.phone || null, passwordHash, fullName, userRole, body.district || null, body.ward || null, now, now]);

      const user = await get(c.env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
      const token = await sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, JWT_SECRET, 'HS256');

      return c.json({
        success: true,
        token,
        user: sanitizeUser(user),
        data: {
          user: sanitizeUser(user),
          token
        }
      }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, 500);
    }
  });

  app.post('/auth/login', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const rawIdentifier = (body.email || body.username || body.identifier || '').toString();
      const identifier = rawIdentifier.trim().toLowerCase();
      const password = body.password;

      if (!identifier || !password) {
        return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập email hoặc tên đăng nhập và mật khẩu.' } }, 400);
      }

      const user = await get(c.env.DB, 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status != "deleted"', [identifier]);
      if (!user) {
        // Kiểm tra xem tài khoản có thuộc Đơn vị Xử lý không
        const opsUser = await get(c.env.DB, 'SELECT id FROM ops_users WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)) AND active = 1', [identifier, identifier]);
        if (opsUser) {
          return c.json({
            success: false,
            error: {
              code: 'WRONG_PORTAL_SIDE',
              message: 'Tài khoản này thuộc Đơn vị Xử lý. Vui lòng chuyển sang tab Đơn vị Xử lý.'
            }
          }, 403);
        }
        return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu chưa đúng.' } }, 401);
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu chưa đúng.' } }, 401);
      }

      const token = await sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, JWT_SECRET, 'HS256');

      return c.json({
        success: true,
        token,
        user: sanitizeUser(user),
        data: {
          user: sanitizeUser(user),
          token
        }
      });
    } catch (err: any) {
      return c.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Không thể kết nối hệ thống lúc này. Vui lòng thử lại sau.' } }, 500);
    }
  });

  app.get('/auth/me', async (c) => {
    const user = await getUser(c);
    if (!user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' } }, 401);
    }
    return c.json({ success: true, data: { user } });
  });

  app.post('/auth/logout', (c) => {
    return c.json({ success: true, message: 'Đăng xuất thành công.' });
  });

  app.post('/auth/dev-switch-role', async (c) => {
    const body = await c.req.json();
    const role = body.role || 'citizen';
    let user = await get(c.env.DB, 'SELECT * FROM users WHERE role = ? LIMIT 1', [role]);
    if (!user) {
      const id = `usr_demo_${role}_${Date.now()}`;
      const now = new Date().toISOString();
      const pwd = await bcrypt.hash('dustguard2026', 10);
      await run(c.env.DB, `
        INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `, [id, `${role}@dustguard.vn`, pwd, `Tài khoản ${role}`, role, now, now]);
      user = await get(c.env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    }
    const token = await sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, JWT_SECRET, 'HS256');
    return c.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        token
      }
    });
  });

  // ============================================================================
  // 2. REPORTS ROUTES (/api/reports)
  // ============================================================================
  app.get('/reports/check-duplicate', async (c) => {
    const latStr = c.req.query('latitude') || c.req.query('lat');
    const lonStr = c.req.query('longitude') || c.req.query('lon');
    const lat = parseFloat(latStr || '');
    const lon = parseFloat(lonStr || '');

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Tọa độ không hợp lệ.' } }, 400);
    }

    const cases = await query(c.env.DB, 'SELECT id, case_code, title, latitude, longitude, address, status FROM cases WHERE status != "closed" AND status != "archived"');
    const nearby = cases.filter(item => {
      const dist = calculateDistanceMeters(lat, lon, item.latitude, item.longitude);
      return dist <= 150;
    });

    return c.json({
      success: true,
      data: {
        possibleDuplicates: nearby,
        hasDuplicate: nearby.length > 0,
        hasPossibleDuplicate: nearby.length > 0,
        nearbyCase: nearby.length > 0 ? nearby[0] : null
      }
    });
  });

  app.get('/reports', async (c) => {
    const user = await getUser(c);
    const status = c.req.query('status');
    const category = c.req.query('category');
    const district = c.req.query('district');
    const search = c.req.query('search');

    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';
    const allReports = await query(c.env.DB, sql, params);

    // Quyền xem: Người tạo/moderator/admin xem được hết; người khác chỉ xem public và community
    const filtered = allReports.filter(r => {
      if (r.visibility === 'public') return true;
      if (!user) return false;
      if (user.role === 'moderator' || user.role === 'admin') return true;
      if (r.reporter_id === user.id) return true;
      if (r.visibility === 'community' && (user.role === 'community_member' || user.role === 'moderator')) return true;
      return false;
    });

    return c.json({ success: true, data: filtered });
  });

  app.post('/reports', async (c) => {
    try {
      const user = await getUser(c);
      const body = await c.req.json();
      const id = `rep_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      const reportCode = `DG-R-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      let reporterId = user?.id;
      if (!reporterId) {
        let anon = await get(c.env.DB, 'SELECT id FROM users WHERE email = "anonymous@dustguard.vn"');
        if (!anon) {
          const anonId = `usr_anon_${Date.now()}`;
          const dummyPwd = await bcrypt.hash('anon_dustguard', 10);
          await run(c.env.DB, 'INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at) VALUES (?, "anonymous@dustguard.vn", ?, "Công dân ẩn danh", "citizen", "active", ?, ?)', [anonId, dummyPwd, now, now]);
          reporterId = anonId;
        } else {
          reporterId = anon.id;
        }
      }

      const district = body.district || 'Quận 7';

      const validCategories = ['dust', 'construction_material', 'road_dust', 'illegal_dumping', 'other'];
      let category = (body.category || body.violationType || 'dust').toLowerCase();
      if (!validCategories.includes(category)) category = 'dust';

      const validSeverities = ['low', 'medium', 'high', 'unknown'];
      let severity = (body.severityObservation || body.severity || 'medium').toLowerCase();
      if (!validSeverities.includes(severity)) severity = 'medium';

      const validVisibilities = ['public', 'community', 'private'];
      let visibility = (body.visibility || 'public').toLowerCase();
      if (!validVisibilities.includes(visibility)) visibility = 'public';

      const validSources = ['citizen', 'community', 'moderator'];
      let source = (body.source || 'citizen').toLowerCase();
      if (!validSources.includes(source)) source = 'citizen';

      await run(c.env.DB, `
        INSERT INTO reports (
          id, report_code, reporter_id, title, description, category, latitude, longitude,
          address, ward, district, city, observed_at, visibility, status, severity_observation,
          source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)
      `, [
        id, reportCode, reporterId, body.title, body.description, category,
        body.latitude || 10.78, body.longitude || 106.70, body.address || 'Khu vực quan sát', body.ward || null, district,
        body.city || 'TP. Hồ Chí Minh', body.observedAt || now, visibility,
        severity, source, now, now
      ]);

      // Tự động lưu mảng ảnh minh chứng nếu có
      if (Array.isArray(body.images)) {
        for (const imgUrl of body.images) {
          if (typeof imgUrl === 'string') {
            const mediaId = `rm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
            await run(c.env.DB, `
              INSERT INTO report_media (
                id, report_id, uploaded_by, file_name, file_path, mime_type, file_size,
                media_type, sha256_hash, created_at
              ) VALUES (?, ?, ?, ?, ?, 'image/jpeg', 1024, 'image', 'sha256_verified', ?)
            `, [mediaId, id, reporterId, 'evidence.jpg', imgUrl, now]);
          }
        }
      }

      // 4. TỰ ĐỘNG LẬP HỒ SƠ THEO DÕI (STRUCTURED CASE) VÀ LIÊN THÔNG SANG SIDE B
      const caseId = `cas_${id.substring(4)}`;
      const caseCode = `DG-C-${reportCode.substring(5)}`;
      const casePriority = severity === 'high' ? 'urgent' : 'normal';

      await run(c.env.DB, `
        INSERT OR IGNORE INTO cases (
          id, case_code, title, summary, category, latitude, longitude,
          address, ward, district, city, status, priority, signal_count,
          unique_reporter_count, first_reported_at, last_activity_at,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, 1, 1, ?, ?, ?, ?, ?)
      `, [
        caseId, caseCode, body.title, body.description, category,
        body.latitude || 10.78, body.longitude || 106.70, body.address || 'Khu vực quan sát',
        body.ward || null, district, body.city || 'TP. Hồ Chí Minh',
        casePriority, now, now, reporterId, now, now
      ]);

      // Cập nhật case_id vào report
      await run(c.env.DB, 'UPDATE reports SET case_id = ? WHERE id = ?', [caseId, id]);

      // Liên kết bảng case_reports
      await run(c.env.DB, `
        INSERT OR IGNORE INTO case_reports (id, case_id, report_id, linked_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [`cr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseId, id, reporterId, now]);

      // Đồng bộ sang ops_cases cho Đơn vị Điều hành (Side B)
      const opsPriority = severity === 'high' ? 'HIGH' : 'NORMAL';
      await run(c.env.DB, `
        INSERT OR IGNORE INTO ops_cases (
          id, case_code, title, description, location_text, district, latitude, longitude,
          source, source_reference, source_report_count, status, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMMUNITY', ?, 1, 'NEW', ?, ?, ?)
      `, [
        caseId, caseCode, body.title, body.description, body.address || 'Khu vực quan sát',
        district, body.latitude || 10.78, body.longitude || 106.70, id, opsPriority, now, now
      ]);

      // Ghi nhật ký tiến trình thụ lý đầu tiên
      await run(c.env.DB, `
        INSERT INTO ops_case_timeline (id, case_id, event_type, actor_name, actor_role, stage, description, created_at)
        VALUES (?, ?, 'CASE_CREATED', 'Cộng đồng', 'CITIZEN', 'INTAKE', 'Tiếp nhận tín hiệu phản ánh từ người dân. Đã tạo hồ sơ theo dõi chuyên trách.', ?)
      `, [`otl_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseId, now]);

      // Sổ theo dõi bàn giao 2 chiều
      await run(c.env.DB, `
        INSERT OR IGNORE INTO cross_side_handoffs (id, community_case_id, operations_case_id, case_code, status, forwarded_by, forwarded_at, synced_at)
        VALUES (?, ?, ?, ?, 'FORWARDED', ?, ?, ?)
      `, [`csh_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseId, caseId, caseCode, reporterId, now, now]);

      // Ghi nhận contribution
      if (user) {
        await run(c.env.DB, 'INSERT INTO user_contributions (id, user_id, type, entity_id, status, created_at) VALUES (?, ?, "report", ?, "submitted", ?)', [
          `cnt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, user.id, id, now
        ]);
      }

      const report = await get(c.env.DB, 'SELECT * FROM reports WHERE id = ?', [id]);
      const linkedCase = await get(c.env.DB, 'SELECT * FROM cases WHERE id = ?', [caseId]);
      return c.json({ success: true, report, data: { ...report, linkedCase } }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, 500);
    }
  });

  app.get('/reports/:id', async (c) => {
    const id = c.req.param('id');
    const user = await getUser(c);
    const report = await get(c.env.DB, 'SELECT * FROM reports WHERE id = ? OR report_code = ?', [id, id]);
    if (!report) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy phản ánh.' } }, 404);
    }

    if (report.visibility === 'private') {
      const isOwner = user && user.id === report.reporter_id;
      const isPrivileged = user && (user.role === 'moderator' || user.role === 'admin');
      if (!isOwner && !isPrivileged) {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem phản ánh riêng tư này.' } }, 403);
      }
    }

    const media = await query(c.env.DB, 'SELECT * FROM report_media WHERE report_id = ?', [report.id]);
    return c.json({
      success: true,
      data: {
        ...report,
        media
      }
    });
  });

  // Tải ảnh lên cho Report vào R2
  app.post('/reports/:id/media', async (c) => {
    const reportId = c.req.param('id');
    const report = await get(c.env.DB, 'SELECT * FROM reports WHERE id = ? OR report_code = ?', [reportId, reportId]);
    if (!report) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy phản ánh.' } }, 404);
    }

    const user = await getUser(c);
    const formData = await c.req.formData();
    const file = formData.get('file') as any;

    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Không tìm thấy tệp đính kèm.' } }, 400);
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name || 'evidence.jpg';
    const mimeType = file.type || getMimeType(fileName);
    const mediaId = `rm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const r2Key = `evidence/reports/${report.id}/${Date.now()}_${fileName}`;

    const bucket = c.env.STORAGE || c.env.EVIDENCE_BUCKET;
    const { sha256 } = await putObject(bucket, r2Key, buffer, mimeType, {
      reportId: report.id,
      uploadedBy: user?.id || 'anon'
    });

    const now = new Date().toISOString();
    await run(c.env.DB, `
      INSERT INTO report_media (
        id, report_id, uploaded_by, file_name, file_path, mime_type, file_size,
        media_type, sha256_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'image', ?, ?)
    `, [mediaId, report.id, user?.id || report.reporter_id, fileName, `/uploads/${r2Key}`, mimeType, buffer.byteLength, sha256, now]);

    const media = await get(c.env.DB, 'SELECT * FROM report_media WHERE id = ?', [mediaId]);
    return c.json({ success: true, data: media }, 201);
  });

  // Tải ảnh trực tiếp lên R2 trước khi tạo phản ánh (Direct upload)
  const handleDirectUpload = async (c: any) => {
    const user = await getUser(c);
    const formData = await c.req.formData();
    const file = formData.get('file') as any;

    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Không tìm thấy tệp đính kèm.' } }, 400);
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name || 'photo.jpg';
    const mimeType = file.type || getMimeType(fileName);
    const id = `upl_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const r2Key = `evidence/community/${Date.now()}_${fileName}`;

    const bucket = c.env.STORAGE || c.env.EVIDENCE_BUCKET;
    const { sha256 } = await putObject(bucket, r2Key, buffer, mimeType, {
      uploadedBy: user?.id || 'anon'
    });

    return c.json({
      success: true,
      data: {
        id,
        url: `/uploads/${r2Key}`,
        path: `/uploads/${r2Key}`,
        key: r2Key,
        fileName,
        mimeType,
        size: buffer.byteLength,
        sha256
      }
    }, 201);
  };

  app.post('/upload', handleDirectUpload);
  app.post('/evidence/upload', handleDirectUpload);

  // ============================================================================
  // 3. CASES ROUTES (/api/cases)
  // ============================================================================
  app.get('/cases', async (c) => {
    const status = c.req.query('status');
    const district = c.req.query('district');
    const category = c.req.query('category');
    let sql = 'SELECT * FROM cases WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY last_activity_at DESC LIMIT 100';
    const cases = await query(c.env.DB, sql, params);
    return c.json({ success: true, data: cases });
  });

  app.get('/cases/:id', async (c) => {
    const id = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT * FROM cases WHERE id = ? OR case_code = ?', [id, id]);
    if (!caseItem) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);
    }

    const linkedReports = await query(c.env.DB, `
      SELECT r.*, rm.file_path, rm.sha256_hash
      FROM reports r
      JOIN case_reports cr ON r.id = cr.report_id
      LEFT JOIN report_media rm ON r.id = rm.report_id
      WHERE cr.case_id = ?
    `, [caseItem.id]);

    const observations = await query(c.env.DB, `
      SELECT o.*, u.full_name as author_name, om.file_path, om.sha256_hash
      FROM observations o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN observation_media om ON o.id = om.observation_id
      WHERE o.case_id = ?
      ORDER BY o.observed_at DESC
    `, [caseItem.id]);

    const timeline = await query(c.env.DB, `
      SELECT cu.*, u.full_name as creator_name
      FROM case_updates cu
      LEFT JOIN users u ON cu.created_by = u.id
      WHERE cu.case_id = ?
      ORDER BY cu.created_at ASC
    `, [caseItem.id]);

    const confirmations = await query(c.env.DB, 'SELECT user_id FROM confirmations WHERE case_id = ?', [caseItem.id]);
    const feedback = await get(c.env.DB, 'SELECT * FROM case_feedback WHERE case_id = ?', [caseItem.id]);

    return c.json({
      success: true,
      data: {
        ...caseItem,
        reports: linkedReports,
        observations,
        timeline,
        confirmations_count: confirmations.length,
        feedback: feedback || null
      }
    });
  });

  app.post('/cases/:id/confirm', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const existing = await get(c.env.DB, 'SELECT id FROM confirmations WHERE case_id = ? AND user_id = ?', [caseItem.id, user.id]);
    if (existing) {
      return c.json({ success: true, message: 'Đã xác nhận trước đó.' });
    }

    const now = new Date().toISOString();
    await run(c.env.DB, 'INSERT INTO confirmations (id, case_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
      `cfm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseItem.id, user.id, now
    ]);
    await run(c.env.DB, 'UPDATE cases SET signal_count = signal_count + 1, last_activity_at = ? WHERE id = ?', [now, caseItem.id]);

    return c.json({ success: true, message: 'Đã ghi nhận đồng thuận.' });
  });

  app.delete('/cases/:id/confirm', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    await run(c.env.DB, 'DELETE FROM confirmations WHERE case_id = ? AND user_id = ?', [caseItem.id, user.id]);
    await run(c.env.DB, 'UPDATE cases SET signal_count = MAX(1, signal_count - 1) WHERE id = ?', [caseItem.id]);
    return c.json({ success: true, message: 'Đã hủy đồng thuận.' });
  });

  app.post('/cases/:id/save', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    await run(c.env.DB, 'INSERT OR IGNORE INTO saved_cases (id, case_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
      `sav_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseItem.id, user.id, new Date().toISOString()
    ]);
    return c.json({ success: true, message: 'Đã lưu vụ việc để theo dõi.' });
  });

  app.delete('/cases/:id/save', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    await run(c.env.DB, 'DELETE FROM saved_cases WHERE case_id = ? AND user_id = ?', [caseItem.id, user.id]);
    return c.json({ success: true, message: 'Đã bỏ theo dõi vụ việc.' });
  });

  app.get('/cases/:id/observations', async (c) => {
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const obs = await query(c.env.DB, `
      SELECT o.*, u.full_name as author_name, om.file_path, om.sha256_hash
      FROM observations o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN observation_media om ON o.id = om.observation_id
      WHERE o.case_id = ?
      ORDER BY o.observed_at DESC
    `, [caseItem.id]);

    return c.json({ success: true, data: obs });
  });

  app.post('/cases/:id/observations', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const body = await c.req.json();
    const obsId = `obs_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date().toISOString();

    await run(c.env.DB, `
      INSERT INTO observations (id, case_id, user_id, observation_type, comment, observed_at, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [obsId, caseItem.id, user.id, body.observationType || 'still_present', body.comment, body.observedAt || now, body.latitude || null, body.longitude || null, now]);

    // Ghi timeline
    await run(c.env.DB, `
      INSERT INTO case_updates (id, case_id, update_type, title, content, created_by, is_public, created_at)
      VALUES (?, ?, 'community_update', 'Ghi nhận thực địa mới', ?, ?, 1, ?)
    `, [`upd_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseItem.id, `${user.full_name} đã gửi quan sát thực địa.`, user.id, now]);

    // Tích điểm đóng góp
    await run(c.env.DB, 'INSERT INTO user_contributions (id, user_id, type, entity_id, status, created_at) VALUES (?, ?, "observation", ?, "submitted", ?)', [
      `cnt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, user.id, obsId, now
    ]);

    const created = await get(c.env.DB, 'SELECT * FROM observations WHERE id = ?', [obsId]);
    return c.json({ success: true, data: created }, 201);
  });

  // Tải ảnh cho observation vào R2
  app.post('/cases/:id/observations/:obsId/media', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const obsId = c.req.param('obsId');
    const obs = await get(c.env.DB, 'SELECT id FROM observations WHERE id = ?', [obsId]);
    if (!obs) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy quan sát thực địa.' } }, 404);

    const formData = await c.req.formData();
    const file = formData.get('file') as any;
    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Không tìm thấy file ảnh.' } }, 400);
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name || 'observation.jpg';
    const mimeType = file.type || getMimeType(fileName);
    const mediaId = `om_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const r2Key = `evidence/observations/${obs.id}/${Date.now()}_${fileName}`;

    const bucket = c.env.STORAGE || c.env.EVIDENCE_BUCKET;
    const { sha256 } = await putObject(bucket, r2Key, buffer, mimeType, {
      observationId: obs.id,
      uploadedBy: user.id
    });

    const now = new Date().toISOString();
    await run(c.env.DB, `
      INSERT INTO observation_media (id, observation_id, file_path, mime_type, file_size, sha256_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [mediaId, obs.id, `/uploads/${r2Key}`, mimeType, buffer.byteLength, sha256, now]);

    const media = await get(c.env.DB, 'SELECT * FROM observation_media WHERE id = ?', [mediaId]);
    return c.json({ success: true, data: media }, 201);
  });

  app.post('/cases/:id/feedback', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id, case_code FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const body = await c.req.json();
    const now = new Date().toISOString();
    const rating = Math.min(5, Math.max(1, body.rating || 5));
    const isSatisfied = body.isSatisfied ?? (rating >= 3 ? 1 : 0);
    const requestReinspection = body.requestReinspection ? 1 : 0;

    await run(c.env.DB, `
      INSERT INTO case_feedback (id, case_id, user_id, rating, comment, is_satisfied, request_reinspection, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id, user_id) DO UPDATE SET
        rating = excluded.rating,
        comment = excluded.comment,
        is_satisfied = excluded.is_satisfied,
        request_reinspection = excluded.request_reinspection,
        created_at = excluded.created_at
    `, [`cfb_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseItem.id, user.id, rating, body.comment || null, isSatisfied, requestReinspection, now]);

    // Đồng bộ sang Side B nếu có liên kết
    try {
      const opsCase = await get(c.env.DB, 'SELECT id FROM ops_cases WHERE case_code = ? OR source_reference = ?', [caseItem.case_code, caseItem.id]);
      if (opsCase) {
        await run(c.env.DB, `
          INSERT INTO ops_case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, metadata_json, created_at)
          VALUES (?, ?, 'CITIZEN_FEEDBACK', ?, ?, 'CITIZEN', 'FEEDBACK', ?, ?, ?)
        `, [
          `otl_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
          opsCase.id, user.id, user.full_name,
          `Công dân đánh giá ${rating}/5 sao: "${body.comment || 'Không có ghi chú'}".`,
          JSON.stringify({ rating, isSatisfied, requestReinspection }),
          now
        ]);
      }
    } catch {}

    const feedback = await get(c.env.DB, 'SELECT * FROM case_feedback WHERE case_id = ? AND user_id = ?', [caseItem.id, user.id]);
    return c.json({ success: true, data: feedback });
  });

  app.get('/cases/:id/feedback', async (c) => {
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT id FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const feedbacks = await query(c.env.DB, `
      SELECT cf.*, u.full_name as citizen_name
      FROM case_feedback cf
      JOIN users u ON cf.user_id = u.id
      WHERE cf.case_id = ?
      ORDER BY cf.created_at DESC
    `, [caseItem.id]);

    return c.json({ success: true, data: feedbacks });
  });

  // ============================================================================
  // 4. ME ROUTES (/api/me)
  // ============================================================================
  app.get('/me/reports', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const reports = await query(c.env.DB, 'SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC', [user.id]);
    return c.json({ success: true, data: reports });
  });

  app.get('/me/saved', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const saved = await query(c.env.DB, `
      SELECT c.*
      FROM cases c
      JOIN saved_cases sc ON c.id = sc.case_id
      WHERE sc.user_id = ?
      ORDER BY sc.created_at DESC
    `, [user.id]);
    return c.json({ success: true, data: saved });
  });

  app.get('/me/contributions', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);

    const contribs = await query(c.env.DB, 'SELECT * FROM user_contributions WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
    const reportCount = contribs.filter(c => c.type === 'report').length;
    const obsCount = contribs.filter(c => c.type === 'observation').length;
    const taskCount = contribs.filter(c => c.type === 'verification').length;
    const confCount = contribs.filter(c => c.type === 'confirmation').length;
    const contributionHours = Number((reportCount * 1.5 + obsCount * 1.0 + taskCount * 2.0 + confCount * 0.5).toFixed(1));

    return c.json({
      success: true,
      data: {
        stats: {
          totalActivities: contribs.length,
          totalContributions: contribs.length,
          contributionHours,
          volunteerHours: contributionHours,
          verifiedActivities: contribs.filter(c => c.status === 'accepted').length,
          inProgressActivities: contribs.filter(c => c.status !== 'accepted').length,
          resolvedCasesCount: contribs.filter(c => c.status === 'accepted').length,
          locationsCount: 1,
          locations: ['TP. Hồ Chí Minh'],
          reports: reportCount,
          observations: obsCount,
          confirmations: confCount,
          taskVerifications: taskCount
        },
        milestoneMessage: `Bạn đã tham gia ${contribs.length} hoạt động đóng góp vì môi trường!`,
        timeline: contribs,
        contributions: contribs
      }
    });
  });

  app.patch('/me/profile', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);

    const body = await c.req.json();
    const now = new Date().toISOString();

    await run(c.env.DB, `
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          district = COALESCE(?, district),
          ward = COALESCE(?, ward),
          bio = COALESCE(?, bio),
          display_identity = COALESCE(?, display_identity),
          updated_at = ?
      WHERE id = ?
    `, [body.fullName || null, body.phone || null, body.district || null, body.ward || null, body.bio || null, body.displayIdentity || null, now, user.id]);

    const updated = await get(c.env.DB, 'SELECT * FROM users WHERE id = ?', [user.id]);
    return c.json({ success: true, data: sanitizeUser(updated) });
  });

  // ============================================================================
  // 5. COMMUNITIES & TASKS & NOTIFICATIONS
  // ============================================================================
  app.get('/communities', async (c) => {
    const comms = await query(c.env.DB, 'SELECT * FROM communities WHERE status = "active" ORDER BY created_at DESC');
    return c.json({ success: true, data: comms });
  });

  app.get('/communities/:slug', async (c) => {
    const slug = c.req.param('slug');
    const comm = await get(c.env.DB, 'SELECT * FROM communities WHERE slug = ? OR id = ?', [slug, slug]);
    if (!comm) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy CLB.' } }, 404);
    const members = await query(c.env.DB, 'SELECT u.id, u.full_name, cm.role, cm.joined_at FROM community_members cm JOIN users u ON cm.user_id = u.id WHERE cm.community_id = ?', [comm.id]);
    return c.json({ success: true, data: { ...comm, members } });
  });

  app.post('/communities/:id/join', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const commId = c.req.param('id');
    const now = new Date().toISOString();
    await run(c.env.DB, 'INSERT OR IGNORE INTO community_members (id, community_id, user_id, role, joined_at) VALUES (?, ?, ?, "member", ?)', [
      `cm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, commId, user.id, now
    ]);
    return c.json({ success: true, message: 'Đã tham gia CLB.' });
  });

  app.post('/communities/:id/leave', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const commId = c.req.param('id');
    await run(c.env.DB, 'DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [commId, user.id]);
    return c.json({ success: true, message: 'Đã rời CLB.' });
  });

  app.get('/communities/:id/posts', async (c) => {
    const commId = c.req.param('id');
    const posts = await query(c.env.DB, `
      SELECT p.*, u.full_name as author_name
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.community_id = ? AND p.status = 'published'
      ORDER BY p.created_at DESC
    `, [commId]);
    return c.json({ success: true, data: posts });
  });

  app.post('/communities/:id/posts', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const commId = c.req.param('id');
    const body = await c.req.json();
    const postId = `pst_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date().toISOString();

    await run(c.env.DB, `
      INSERT INTO posts (id, community_id, author_id, post_type, title, content, case_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
    `, [postId, commId, user.id, body.postType || 'update', body.title, body.content, body.caseId || null, now, now]);

    const post = await get(c.env.DB, 'SELECT * FROM posts WHERE id = ?', [postId]);
    return c.json({ success: true, data: post }, 201);
  });

  app.get('/tasks', async (c) => {
    const tasks = await query(c.env.DB, `
      SELECT vt.*, c.case_code, c.title as case_title, u.full_name as assigned_name
      FROM verification_tasks vt
      LEFT JOIN cases c ON vt.case_id = c.id
      LEFT JOIN users u ON vt.assigned_to = u.id
      WHERE vt.status != 'cancelled'
      ORDER BY vt.created_at DESC
    `);
    return c.json({ success: true, data: tasks });
  });

  app.post('/tasks/:id/claim', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const taskId = c.req.param('id');
    const now = new Date().toISOString();
    await run(c.env.DB, 'UPDATE verification_tasks SET status = "claimed", assigned_to = ?, updated_at = ? WHERE id = ? AND status = "open"', [user.id, now, taskId]);
    const task = await get(c.env.DB, 'SELECT * FROM verification_tasks WHERE id = ?', [taskId]);
    return c.json({ success: true, data: task });
  });

  app.post('/tasks/:id/submit', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const taskId = c.req.param('id');
    const body = await c.req.json();
    const subId = `ts_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date().toISOString();

    await run(c.env.DB, 'INSERT INTO task_submissions (id, task_id, user_id, result, note, submitted_at) VALUES (?, ?, ?, ?, ?, ?)', [
      subId, taskId, user.id, body.result || 'confirmed', body.note || '', now
    ]);
    await run(c.env.DB, 'UPDATE verification_tasks SET status = "completed", completed_at = ?, updated_at = ? WHERE id = ?', [now, now, taskId]);

    // Tích điểm
    await run(c.env.DB, 'INSERT INTO user_contributions (id, user_id, type, entity_id, status, created_at) VALUES (?, ?, "verification", ?, "submitted", ?)', [
      `cnt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, user.id, taskId, now
    ]);

    return c.json({ success: true, message: 'Đã nộp kết quả xác minh.' });
  });

  app.get('/notifications', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const notifs = await query(c.env.DB, 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [user.id]);
    const unread = notifs.filter(n => !n.is_read).length;
    return c.json({ success: true, data: { notifications: notifs, unreadCount: unread } });
  });

  app.patch('/notifications/:id/read', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    const id = c.req.param('id');
    await run(c.env.DB, 'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?', [new Date().toISOString(), id, user.id]);
    return c.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
  });

  app.post('/notifications/read-all', async (c) => {
    const user = await getUser(c);
    if (!user) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } }, 401);
    await run(c.env.DB, 'UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ?', [new Date().toISOString(), user.id]);
    return c.json({ success: true, message: 'Đã đánh dấu đọc tất cả.' });
  });

  // ============================================================================
  // 6. MODERATOR & ADMIN ROUTES
  // ============================================================================
  app.get('/moderator/reports', async (c) => {
    const user = await getUser(c);
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Chỉ điều phối viên mới có quyền truy cập.' } }, 403);
    }
    const reports = await query(c.env.DB, 'SELECT * FROM reports WHERE status = "submitted" ORDER BY created_at ASC');
    return c.json({ success: true, data: reports });
  });

  app.post('/moderator/cases', async (c) => {
    const user = await getUser(c);
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Chỉ điều phối viên mới có quyền tạo vụ việc.' } }, 403);
    }
    const body = await c.req.json();
    const caseId = `case_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const caseCode = `DG-C-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await run(c.env.DB, `
      INSERT INTO cases (
        id, case_code, title, summary, category, latitude, longitude, address,
        district, city, status, priority, signal_count, first_reported_at,
        last_activity_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TP. Hồ Chí Minh', 'new', ?, 1, ?, ?, ?, ?, ?)
    `, [
      caseId, caseCode, body.title, body.summary || body.title, body.category || 'dust',
      body.latitude, body.longitude, body.address, body.district, body.priority || 'normal',
      now, now, user.id, now, now
    ]);

    if (body.reportIds && Array.isArray(body.reportIds)) {
      for (const repId of body.reportIds) {
        await run(c.env.DB, 'INSERT OR IGNORE INTO case_reports (id, case_id, report_id, linked_by, created_at) VALUES (?, ?, ?, ?, ?)', [
          `cr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseId, repId, user.id, now
        ]);
        await run(c.env.DB, 'UPDATE reports SET status = "verified", case_id = ? WHERE id = ?', [caseId, repId]);
      }
    }

    const created = await get(c.env.DB, 'SELECT * FROM cases WHERE id = ?', [caseId]);
    return c.json({ success: true, data: created }, 201);
  });

  // Chuyển trạng thái vụ việc & Tự động bàn giao sang Operations nếu forwarded (Idempotent)
  app.patch('/moderator/cases/:id/status', async (c) => {
    const user = await getUser(c);
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Quyền điều phối viên là bắt buộc.' } }, 403);
    }
    const caseId = c.req.param('id');
    const caseItem = await get(c.env.DB, 'SELECT * FROM cases WHERE id = ? OR case_code = ?', [caseId, caseId]);
    if (!caseItem) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy vụ việc.' } }, 404);

    const body = await c.req.json();
    const newStatus = body.status;

    // Idempotent short-circuit
    if (caseItem.status === newStatus) {
      return c.json({ success: true, data: caseItem, idempotent: true });
    }

    const now = new Date().toISOString();
    await run(c.env.DB, 'UPDATE cases SET status = ?, updated_at = ?, last_activity_at = ? WHERE id = ?', [newStatus, now, now, caseItem.id]);

    await run(c.env.DB, `
      INSERT INTO case_updates (id, case_id, update_type, title, content, old_status, new_status, created_by, is_public, created_at)
      VALUES (?, ?, 'status_change', 'Thay đổi trạng thái hồ sơ', ?, ?, ?, ?, 1, ?)
    `, [
      `upd_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
      caseItem.id,
      body.note || `Trạng thái chuyển từ ${caseItem.status} sang ${newStatus}`,
      caseItem.status, newStatus, user.id, now
    ]);

    // Nếu chuyển sang 'forwarded', tự động bàn giao sang bảng ops_cases (Handoff)
    if (newStatus === 'forwarded') {
      try {
        const existingOps = await get(c.env.DB, 'SELECT id FROM ops_cases WHERE source_reference = ? OR case_code = ?', [caseItem.id, caseItem.case_code]);
        if (!existingOps) {
          const opsCaseId = `case-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
          await run(c.env.DB, `
            INSERT INTO ops_cases (
              id, case_code, title, description, location_text, district, latitude, longitude,
              source, source_reference, source_report_count, status, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMMUNITY', ?, ?, 'TRIAGED', ?, ?, ?)
          `, [
            opsCaseId, caseItem.case_code, caseItem.title, caseItem.summary, caseItem.address,
            caseItem.district, caseItem.latitude, caseItem.longitude, caseItem.id,
            caseItem.signal_count || 1, (caseItem.priority || 'NORMAL').toUpperCase(), now, now
          ]);

          await run(c.env.DB, `
            INSERT INTO ops_case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, created_at)
            VALUES (?, ?, 'CASE_INGESTED', ?, ?, 'MODERATOR', 'TRIAGE', 'Tiếp nhận hồ sơ từ Cộng đồng chuyển giao.', ?)
          `, [`otl_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, opsCaseId, user.id, user.full_name, now]);

          await run(c.env.DB, `
            INSERT OR REPLACE INTO cross_side_handoffs (id, community_case_id, operations_case_id, case_code, status, forwarded_by, forwarded_at, last_event_type)
            VALUES (?, ?, ?, ?, 'FORWARDED', ?, ?, 'CASE_INGESTED')
          `, [`csh_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`, caseItem.id, opsCaseId, caseItem.case_code, user.full_name, now]);
        }
      } catch (err) {
        console.error('[Handoff to Operations Error]', err);
      }
    }

    const updated = await get(c.env.DB, 'SELECT * FROM cases WHERE id = ?', [caseItem.id]);
    return c.json({ success: true, data: updated });
  });

  app.put('/moderator/cases/:id/status', async (c) => {
    // Alias cho PATCH
    return (app as any).fetch(new Request(c.req.url, { method: 'PATCH', headers: c.req.raw.headers, body: c.req.raw.body }), c.env, c.executionCtx);
  });

  app.get('/moderator/content', (c) => {
    return c.json({ success: true, data: [] });
  });

  app.get('/admin/users', async (c) => {
    const user = await getUser(c);
    if (!user || user.role !== 'admin') {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Chỉ quản trị viên mới có quyền.' } }, 403);
    }
    const users = await query(c.env.DB, 'SELECT id, email, phone, full_name, role, status, district, ward, created_at, last_login_at FROM users ORDER BY created_at DESC');
    return c.json({ success: true, data: users });
  });

  const getDashboardData = async (c: any) => {
    const user = await getUser(c);
    const reportsCount = (await get(c.env.DB, 'SELECT count(*) as c FROM reports'))?.c || 0;
    const newReports = (await get(c.env.DB, 'SELECT count(*) as c FROM reports WHERE status = "submitted"'))?.c || 0;
    const verifyingCases = (await get(c.env.DB, 'SELECT count(*) as c FROM cases WHERE status = "community_verifying"'))?.c || 0;
    const inProgressCases = (await get(c.env.DB, 'SELECT count(*) as c FROM cases WHERE status IN ("formal_assigned", "in_progress")'))?.c || 0;
    const resolvedCases = (await get(c.env.DB, 'SELECT count(*) as c FROM cases WHERE status = "resolved"'))?.c || 0;
    const casesCount = (await get(c.env.DB, 'SELECT count(*) as c FROM cases'))?.c || 0;
    const usersCount = (await get(c.env.DB, 'SELECT count(*) as c FROM users'))?.c || 0;
    const updatedToday = (await get(c.env.DB, 'SELECT count(*) as c FROM cases WHERE date(updated_at) = date("now")'))?.c || 0;

    const nearbyCases = await query(c.env.DB, 'SELECT * FROM cases ORDER BY updated_at DESC LIMIT 6');
    const priorityCases = await query(c.env.DB, 'SELECT * FROM cases WHERE severity IN ("high", "critical") OR status = "in_progress" ORDER BY updated_at DESC LIMIT 4');

    let myReports: any[] = [];
    if (user?.id) {
      myReports = await query(c.env.DB, `
        SELECT r.*,
               (SELECT file_path FROM report_media WHERE report_id = r.id LIMIT 1) as thumbnailPath
        FROM reports r
        WHERE r.reporter_id = ?
        ORDER BY r.created_at DESC
        LIMIT 4
      `, [user.id]);
    } else {
      myReports = await query(c.env.DB, `
        SELECT r.*,
               (SELECT file_path FROM report_media WHERE report_id = r.id LIMIT 1) as thumbnailPath
        FROM reports r
        WHERE r.visibility = "public" OR r.visibility IS NULL
        ORDER BY r.created_at DESC
        LIMIT 4
      `);
    }

    const recentReports = await query(c.env.DB, 'SELECT id, title, address, district, created_at FROM reports ORDER BY created_at DESC LIMIT 5');
    const recentActivity = recentReports.map((r: any) => ({
      id: `act_${r.id}`,
      title: r.title || 'Phản ánh mới được ghi nhận',
      description: `Tại ${r.address || r.district || 'hiện trường'}`,
      time: r.created_at
    }));

    // Truy vấn thông tin trạm cảm biến thực tế (Lấy từ In-Memory LiveState, TUYỆT ĐỐI KHÔNG SELECT D1 iot_readings)
    let iotNode: any = null;
    try {
      const live = getLiveState('DG-IOT-001') || getLiveState('dev-apm2000-001');
      if (live) {
        // Đọc cấu hình vị trí từ iot_devices (1 row có index, KHÔNG chạm vào bảng iot_readings)
        const dev = await get(c.env.DB, "SELECT * FROM iot_devices WHERE device_code = 'DG-IOT-001' OR id = 'dev-apm2000-001' LIMIT 1");
        const lastSeenMs = live.lastSeen || (dev?.last_reading_at ? new Date(dev.last_reading_at).getTime() : 0);
        const diffSec = lastSeenMs > 0 ? Math.floor((Date.now() - lastSeenMs) / 1000) : 999999;
        const isOnline = live.online ?? (diffSec <= 30);

        iotNode = {
          deviceCode: live.deviceId || dev?.device_code || 'DG-IOT-001',
          name: dev?.name || `DustGuard Node (${live.deviceId})`,
          locationText: dev?.location_text || 'Đường Lê Văn Việt, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP.HCM',
          latitude: dev?.latitude ?? 10.8450,
          longitude: dev?.longitude ?? 106.7790,
          sensorModel: dev?.sensor_model || 'ASAIR APM2000',
          wifiSsid: dev?.wifi_ssid || 'Harry Maguire',
          wifiRssi: live.rssi ?? dev?.wifi_rssi ?? -50,
          isOnline,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          secondsAgo: diffSec < 999999 ? diffSec : null,
          lastSeenAt: new Date(lastSeenMs).toISOString(),
          telemetry: {
            pm25: live.pm25,
            pm10: live.pm10,
            pm1: live.pm1,
            temperature: live.temperature,
            humidity: live.humidity,
            wifiRssi: live.rssi,
            timestamp: new Date(lastSeenMs).toISOString()
          }
        };
      }
    } catch (e) {
      console.warn('[Dashboard IoT Node Fetch Warning]:', e);
    }

    return c.json({
      success: true,
      data: {
        stats: {
          totalReports: reportsCount,
          newReports,
          verifyingCases,
          inProgressCases,
          resolvedCases,
          communityMembers: usersCount,
          activeCases: casesCount - resolvedCases,
          updatedToday
        },
        nearbyCases,
        priorityCases,
        myReports,
        recentActivity,
        hotspots: [],
        iotNode
      }
    });
  };

  app.get('/dashboard', getDashboardData);
  app.get('/dashboard/community', getDashboardData);

  // ============================================================================
  // 7. CROSS-SIDE RESOLUTION SYNC (/api/integrations/operations/sync)
  // ============================================================================
  app.post('/integrations/operations/sync', async (c) => {
    const key = c.req.header('x-service-key');
    const expectedKey = c.env.INTEGRATION_SERVICE_KEY || 'dustguard-internal-2026';
    if (!key || key !== expectedKey) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED_SERVICE', message: 'Khóa dịch vụ nội bộ không hợp lệ.' } }, 401);
    }

    const body = await c.req.json();
    const caseCode = body.case_code;
    const eventType = body.event_type;
    const status = body.status;

    const caseItem = await get(c.env.DB, 'SELECT * FROM cases WHERE case_code = ?', [caseCode]);
    if (!caseItem) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ tương ứng.' } }, 404);
    }

    // Bảo vệ out-of-order: Nếu vụ việc đã resolved, không để webhook đến muộn revert về trạng thái trước
    if (caseItem.status === 'resolved' && status !== 'resolved' && eventType !== 'CASE_REOPENED') {
      return c.json({
        success: true,
        data: {
          case_code: caseCode,
          updated_status: caseItem.status,
          timeline_synced: false,
          ignored: 'OUT_OF_ORDER_WEBHOOK'
        }
      });
    }

    const now = new Date().toISOString();
    let communityStatus = caseItem.status;
    if (eventType === 'CASE_CLOSED') {
      communityStatus = 'resolved';
    } else if (eventType === 'CASE_REOPENED') {
      communityStatus = 'in_progress';
    } else if (status) {
      communityStatus = status;
    }

    await run(c.env.DB, `
      UPDATE cases
      SET status = ?, updated_at = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_at END
      WHERE id = ?
    `, [communityStatus, now, communityStatus, now, caseItem.id]);

    await run(c.env.DB, `
      INSERT INTO case_updates (id, case_id, update_type, title, content, old_status, new_status, is_public, created_at)
      VALUES (?, ?, 'resolution', 'Cập nhật từ Cơ quan Quản lý', ?, ?, ?, 1, ?)
    `, [
      `upd_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
      caseItem.id, body.message || 'Cơ quan chức năng đã cập nhật tiến độ xử lý.',
      caseItem.status, communityStatus, now
    ]);

    return c.json({
      success: true,
      data: {
        case_code: caseCode,
        updated_status: communityStatus,
        timeline_synced: true
      }
    });
  });

  // ============================================================================
  // 14. CONTRACTOR PORTAL ENDPOINTS (/api/contractor)
  // ============================================================================
  app.get('/contractor/dashboard', async (c) => {
    try {
      const search = c.req.query('search') || '';
      const contractors = await query(c.env.DB, 'SELECT * FROM contractors ORDER BY created_at DESC');
      const actions = await query(c.env.DB, 'SELECT * FROM corrective_actions ORDER BY created_at DESC');

      let currentContractor = contractors.length > 0 ? contractors[0] : null;

      if (search) {
        const lower = search.toLowerCase();
        const found = contractors.find((ctr: any) =>
          ctr.name?.toLowerCase().includes(lower) ||
          (ctr.tax_id && ctr.tax_id.includes(search)) ||
          (ctr.phone && ctr.phone.includes(search))
        );
        if (found) currentContractor = found;
      }

      const relevantActions = actions.filter((act: any) => {
        if (!currentContractor?.name) return true;
        return (
          act.responsible_party?.toLowerCase().includes(currentContractor.name.toLowerCase()) ||
          currentContractor.name.toLowerCase().includes(act.responsible_party?.toLowerCase() || '')
        );
      });

      const matchedActions = relevantActions.length > 0 ? relevantActions : actions;

      return c.json({
        success: true,
        data: {
          contractor: currentContractor,
          actions: matchedActions,
          total_actions: matchedActions.length,
          open_actions: matchedActions.filter((a: any) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length,
          submitted_actions: matchedActions.filter((a: any) => a.status === 'SUBMITTED' || a.status === 'REMEDIATION_SUBMITTED').length,
          verified_actions: matchedActions.filter((a: any) => a.status === 'VERIFIED').length,
        }
      });
    } catch (err: any) {
      return c.json({
        success: false,
        error: { code: 'CONTRACTOR_FETCH_ERROR', message: err.message || 'Lỗi lấy dữ liệu nhà thầu.' }
      }, 500);
    }
  });

  app.get('/contractor/actions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const action = await get(c.env.DB, 'SELECT * FROM corrective_actions WHERE id = ?', [id]);
      if (!action) {
        return c.json({
          success: false,
          error: { code: 'ACTION_NOT_FOUND', message: 'Không tìm thấy yêu cầu khắc phục này.' }
        }, 404);
      }

      const caseInfo = action.case_id
        ? await get(c.env.DB, 'SELECT id, case_code, title, location_text, latitude, longitude, status FROM cases WHERE id = ?', [action.case_id])
        : null;

      return c.json({
        success: true,
        data: {
          action,
          case: caseInfo
        }
      });
    } catch (err: any) {
      return c.json({
        success: false,
        error: { code: 'ACTION_DETAIL_ERROR', message: err.message }
      }, 500);
    }
  });

  app.post('/contractor/actions/:id/remediation', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const {
        description,
        contractor_name,
        evidence_asset_ids,
        latitude,
        longitude,
        site_latitude,
        site_longitude,
      } = body;

      if (!description || !description.trim()) {
        return c.json({
          success: false,
          error: { code: 'MISSING_DESCRIPTION', message: 'Mô tả biện pháp khắc phục là bắt buộc.' }
        }, 400);
      }

      let geofencePassed = true;
      let distanceMeters = 0;
      if (latitude && longitude && site_latitude && site_longitude) {
        distanceMeters = calculateDistanceMeters(latitude, longitude, site_latitude, site_longitude);
        geofencePassed = distanceMeters <= 50;
      }

      const action = await get(c.env.DB, 'SELECT * FROM corrective_actions WHERE id = ?', [id]);
      if (!action) {
        return c.json({
          success: false,
          error: { code: 'ACTION_NOT_FOUND', message: 'Không tìm thấy yêu cầu khắc phục này.' }
        }, 404);
      }

      const now = new Date().toISOString();
      const subId = `rem_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

      await run(c.env.DB, `
        INSERT INTO remediation_submissions (id, action_id, case_id, description, review_status, submitted_at)
        VALUES (?, ?, ?, ?, 'PENDING', ?)
      `, [subId, id, action.case_id || null, description.trim(), now]);

      await run(c.env.DB, 'UPDATE corrective_actions SET status = "REMEDIATION_SUBMITTED", updated_at = ? WHERE id = ?', [now, id]);
      const created = await get(c.env.DB, 'SELECT * FROM remediation_submissions WHERE id = ?', [subId]);

      return c.json({
        success: true,
        data: {
          submission: created,
          geofence: {
            passed: geofencePassed,
            distance_meters: distanceMeters,
            buffer_allowed: 50,
          },
          message: 'Đã gửi báo cáo khắc phục thành công tới Cơ quan Giám sát môi trường.'
        }
      });
    } catch (err: any) {
      return c.json({
        success: false,
        error: { code: 'REMEDIATION_SUBMIT_ERROR', message: err.message }
      }, 500);
    }
  });

  return app;
}

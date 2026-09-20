import { sqliteClient } from './sqlite-client.js';

export function runMigrations(): void {
  console.log('🔄 Đang chạy database migrations cho DustGuard Community...');

  sqliteClient.exec(`
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'citizen' CHECK(role IN ('citizen', 'community_member', 'moderator', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
      district TEXT,
      ward TEXT,
      bio TEXT,
      display_identity TEXT DEFAULT 'anonymous' CHECK(display_identity IN ('name', 'anonymous')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
    CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

    -- 2. Cases
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT NOT NULL,
      ward TEXT,
      district TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Hà Nội',
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'community_verifying', 'confirmed_signal', 'forwarded', 'in_progress', 'resolved', 'closed', 'archived')),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'attention', 'urgent')),
      signal_count INTEGER NOT NULL DEFAULT 1,
      unique_reporter_count INTEGER NOT NULL DEFAULT 1,
      first_reported_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      resolved_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
    CREATE INDEX IF NOT EXISTS cases_created_at_idx ON cases(created_at);
    CREATE INDEX IF NOT EXISTS cases_geo_idx ON cases(latitude, longitude);
    CREATE INDEX IF NOT EXISTS cases_district_idx ON cases(district);

    -- 3. Reports
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('dust', 'construction_material', 'road_dust', 'illegal_dumping', 'other')),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT NOT NULL,
      ward TEXT,
      district TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Hà Nội',
      observed_at TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'community', 'private')),
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('draft', 'submitted', 'reviewing', 'verified', 'rejected', 'merged')),
      severity_observation TEXT NOT NULL DEFAULT 'unknown' CHECK(severity_observation IN ('low', 'medium', 'high', 'unknown')),
      source TEXT NOT NULL DEFAULT 'citizen' CHECK(source IN ('citizen', 'community', 'moderator')),
      case_id TEXT REFERENCES cases(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
    CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);
    CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports(reporter_id);
    CREATE INDEX IF NOT EXISTS reports_case_idx ON reports(case_id);

    -- 4. Report Media
    CREATE TABLE IF NOT EXISTS report_media (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image' CHECK(media_type IN ('image', 'video')),
      caption TEXT,
      sha256_hash TEXT NOT NULL,
      captured_at TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS report_media_report_idx ON report_media(report_id);

    -- 5. Case Reports
    CREATE TABLE IF NOT EXISTS case_reports (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      linked_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS case_report_unique ON case_reports(case_id, report_id);

    -- 6. Observations
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      observation_type TEXT NOT NULL CHECK(observation_type IN ('still_present', 'reduced', 'resolved', 'cannot_confirm', 'additional_evidence')),
      comment TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS observations_case_idx ON observations(case_id);
    CREATE INDEX IF NOT EXISTS observations_user_idx ON observations(user_id);

    -- 7. Observation Media
    CREATE TABLE IF NOT EXISTS observation_media (
      id TEXT PRIMARY KEY,
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS obs_media_idx ON observation_media(observation_id);

    -- 8. Confirmations ("Tôi cũng ghi nhận")
    CREATE TABLE IF NOT EXISTS confirmations (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS confirmations_unique ON confirmations(case_id, user_id);

    -- 9. Saved Cases
    CREATE TABLE IF NOT EXISTS saved_cases (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS saved_cases_unique ON saved_cases(case_id, user_id);

    -- 10. Case Updates (Timeline)
    CREATE TABLE IF NOT EXISTS case_updates (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      update_type TEXT NOT NULL CHECK(update_type IN ('status_change', 'community_update', 'moderator_note', 'system', 'forwarded', 'resolution')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      created_by TEXT REFERENCES users(id),
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS case_updates_case_idx ON case_updates(case_id);

    -- 11. Verification Tasks
    CREATE TABLE IF NOT EXISTS verification_tasks (
      id TEXT PRIMARY KEY,
      case_id TEXT REFERENCES cases(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      task_type TEXT NOT NULL CHECK(task_type IN ('field_check', 'photo_update', 'status_check', 'information_check')),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT NOT NULL,
      assigned_to TEXT REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'completed', 'cancelled')),
      due_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS tasks_status_idx ON verification_tasks(status);
    CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON verification_tasks(assigned_to);

    -- 12. Task Submissions
    CREATE TABLE IF NOT EXISTS task_submissions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      result TEXT NOT NULL CHECK(result IN ('confirmed', 'not_found', 'changed', 'unable')),
      note TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS task_submissions_task_idx ON task_submissions(task_id);

    -- 13. Communities
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      cover_url TEXT,
      district TEXT NOT NULL,
      ward TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_idx ON communities(slug);
    CREATE INDEX IF NOT EXISTS communities_district_idx ON communities(district);

    -- 14. Community Members
    CREATE TABLE IF NOT EXISTS community_members (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'coordinator')),
      joined_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS comm_member_unique ON community_members(community_id, user_id);
    CREATE INDEX IF NOT EXISTS comm_member_user_idx ON community_members(user_id);

    -- 15. Posts
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      post_type TEXT NOT NULL DEFAULT 'update' CHECK(post_type IN ('update', 'announcement', 'activity')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      case_id TEXT REFERENCES cases(id),
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'hidden')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS posts_community_idx ON posts(community_id);

    -- 16. Comments
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible', 'hidden', 'reported')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id);

    -- 17. Content Reports
    CREATE TABLE IF NOT EXISTS content_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('post', 'comment', 'report', 'observation')),
      entity_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('spam', 'abuse', 'misinformation', 'privacy', 'duplicate', 'other')),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS content_reports_status_idx ON content_reports(status);

    -- 18. Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('case_update', 'observation', 'task', 'community', 'system')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      read_at TEXT
    );
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);

    -- 19. User Contributions
    CREATE TABLE IF NOT EXISTS user_contributions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('report', 'confirmation', 'observation', 'verification', 'community_activity')),
      entity_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'accepted', 'rejected')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS contributions_user_idx ON user_contributions(user_id);
    CREATE INDEX IF NOT EXISTS contributions_type_idx ON user_contributions(type);

    -- 20. Impact Stats
    CREATE TABLE IF NOT EXISTS impact_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      new_reports INTEGER NOT NULL DEFAULT 0,
      verified_reports INTEGER NOT NULL DEFAULT 0,
      active_cases INTEGER NOT NULL DEFAULT 0,
      resolved_cases INTEGER NOT NULL DEFAULT 0,
      community_observations INTEGER NOT NULL DEFAULT 0,
      active_users INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 21. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS audit_created_at_idx ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_logs(actor_id);

    -- 22. Case Feedback (Đánh giá nghiệm thu của công dân) - trước đây được tạo runtime/ad-hoc
    -- trực tiếp trong cases.routes.ts, nay chuyển về đây làm nguồn định nghĩa schema duy nhất.
    -- Ràng buộc UNIQUE(case_id, user_id) đảm bảo mỗi người dùng chỉ có đúng 1 đánh giá cho 1 vụ
    -- việc (route ghi bằng UPSERT - INSERT ... ON CONFLICT ... DO UPDATE).
    CREATE TABLE IF NOT EXISTS case_feedback (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL,
      comment TEXT,
      is_satisfied INTEGER NOT NULL,
      request_reinspection INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS case_feedback_case_idx ON case_feedback(case_id);
    CREATE UNIQUE INDEX IF NOT EXISTS case_feedback_unique ON case_feedback(case_id, user_id);

    -- Chỉ mục bổ sung cho các cột khóa ngoại (FK) chưa có index, phát hiện qua rà soát đầy đủ
    -- (mỗi FK nên có ít nhất 1 index để tránh full table scan khi JOIN/lookup theo cột đó).
    CREATE INDEX IF NOT EXISTS cases_created_by_idx ON cases(created_by);
    CREATE INDEX IF NOT EXISTS report_media_uploaded_by_idx ON report_media(uploaded_by);
    CREATE INDEX IF NOT EXISTS case_reports_report_idx ON case_reports(report_id);
    CREATE INDEX IF NOT EXISTS case_reports_linked_by_idx ON case_reports(linked_by);
    CREATE INDEX IF NOT EXISTS confirmations_user_idx ON confirmations(user_id);
    CREATE INDEX IF NOT EXISTS saved_cases_user_idx ON saved_cases(user_id);
    CREATE INDEX IF NOT EXISTS case_updates_created_by_idx ON case_updates(created_by);
    CREATE INDEX IF NOT EXISTS tasks_case_idx ON verification_tasks(case_id);
    CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON verification_tasks(created_by);
    CREATE INDEX IF NOT EXISTS task_submissions_user_idx ON task_submissions(user_id);
    CREATE INDEX IF NOT EXISTS communities_created_by_idx ON communities(created_by);
    CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id);
    CREATE INDEX IF NOT EXISTS posts_case_idx ON posts(case_id);
    CREATE INDEX IF NOT EXISTS comments_user_idx ON comments(user_id);
    CREATE INDEX IF NOT EXISTS content_reports_reporter_idx ON content_reports(reporter_id);
    CREATE INDEX IF NOT EXISTS content_reports_reviewed_by_idx ON content_reports(reviewed_by);
    CREATE INDEX IF NOT EXISTS case_feedback_user_idx ON case_feedback(user_id);

    -- 23. IoT Devices
    CREATE TABLE IF NOT EXISTS iot_devices (
      id TEXT PRIMARY KEY,
      device_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location_text TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'WARNING')),
      last_reading_at TEXT,
      project_id TEXT,
      sensor_model TEXT DEFAULT 'ASAIR APM2000',
      wifi_ssid TEXT DEFAULT 'Harry Maguire',
      wifi_rssi INTEGER DEFAULT -54,
      firmware_version TEXT DEFAULT '1.2.0-esp32',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS iot_devices_code_idx ON iot_devices(device_code);

    -- 24. IoT Readings
    CREATE TABLE IF NOT EXISTS iot_readings (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      pm25 REAL NOT NULL,
      pm10 REAL NOT NULL,
      pm1 REAL,
      temperature REAL,
      humidity REAL,
      wifi_rssi INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS iot_readings_device_time_idx ON iot_readings(device_id, created_at DESC);

    -- Seed thực thể DG-IOT-001
    INSERT OR IGNORE INTO iot_devices (
      id, device_code, name, location_text, latitude, longitude, status,
      sensor_model, wifi_ssid, wifi_rssi, firmware_version, created_at, updated_at
    ) VALUES (
      'dev-apm2000-001', 'DG-IOT-001', 'DustGuard Demo Node',
      '484 Lê Văn Việt, Hồ Chí Minh', 21.0205, 105.8078, 'OFFLINE',
      'ASAIR APM2000', 'Harry Maguire', -54, '1.2.0-esp32', datetime('now'), datetime('now')
    );
  `);

  console.log('✅ Khởi tạo thành công toàn bộ bảng và chỉ mục SQLite (bao gồm IoT SSOT)!');
}

// Cho phép chạy trực tiếp từ CLI
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
}

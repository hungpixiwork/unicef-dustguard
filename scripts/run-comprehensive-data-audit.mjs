import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const report = {
  timestamp: new Date().toISOString(),
  production_d1_status: {
    database_id: "ad40205a-ec4b-40f3-8ab2-c2e7b9e78699",
    database_name: "dustguard-production",
    size_bytes: 1859584,
    size_mb: "1.86 MB",
    num_tables: 63,
    rows_read_24h: 7167921,
    rows_written_24h: 1753,
    free_tier_daily_read_limit: 5000000,
    remote_access_status: "FREE_TIER_DAILY_ROW_READ_LIMIT_EXCEEDED (Code 7500). Reads blocked until UTC midnight.",
    live_worker_url: "https://dustguard.phamphunguyenhung.com"
  },
  audit_results: {}
};

function safeQuery(db, sql, params = []) {
  try {
    return { ok: true, data: db.prepare(sql).all(...params) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function safeGet(db, sql, params = []) {
  try {
    return { ok: true, data: db.prepare(sql).get(...params) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ==============================================================================
// 1. SIDE A: COMMUNITY DB AUDIT (data/dustguard-community.db)
// ==============================================================================
const commPath = 'data/dustguard-community.db';
if (fs.existsSync(commPath)) {
  const db = new DatabaseSync(commPath, { readOnly: true });

  const duplicates = [];

  // Query duplicates
  const queries = [
    {
      label: "reports (reporter_id + title + observed_at)",
      sql: `SELECT reporter_id, title, observed_at, COUNT(*) as cnt FROM reports GROUP BY reporter_id, title, observed_at HAVING COUNT(*) > 1`
    },
    {
      label: "reports (latitude + longitude + category + minute)",
      sql: `SELECT latitude, longitude, category, substr(observed_at, 1, 16) as time_min, COUNT(*) as cnt FROM reports GROUP BY latitude, longitude, category, substr(observed_at, 1, 16) HAVING COUNT(*) > 1`
    },
    {
      label: "observations (case_id + user_id + observed_at)",
      sql: `SELECT case_id, user_id, observed_at, COUNT(*) as cnt FROM observations GROUP BY case_id, user_id, observed_at HAVING COUNT(*) > 1`
    },
    {
      label: "confirmations (case_id + user_id)",
      sql: `SELECT case_id, user_id, COUNT(*) as cnt FROM confirmations GROUP BY case_id, user_id HAVING COUNT(*) > 1`
    },
    {
      label: "saved_cases (case_id + user_id)",
      sql: `SELECT case_id, user_id, COUNT(*) as cnt FROM saved_cases GROUP BY case_id, user_id HAVING COUNT(*) > 1`
    },
    {
      label: "case_reports (case_id + report_id)",
      sql: `SELECT case_id, report_id, COUNT(*) as cnt FROM case_reports GROUP BY case_id, report_id HAVING COUNT(*) > 1`
    },
    {
      label: "users (email)",
      sql: `SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1`
    },
    {
      label: "iot_readings (device_id + recorded_at)",
      sql: `SELECT device_id, recorded_at, COUNT(*) as cnt FROM iot_readings GROUP BY device_id, recorded_at HAVING COUNT(*) > 1`
    }
  ];

  for (const q of queries) {
    const res = safeQuery(db, q.sql);
    duplicates.push({
      check: q.label,
      query: q.sql.trim(),
      duplicate_groups: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Orphan records
  const orphans = [];
  const orphanQueries = [
    {
      child: "report_media",
      parent: "reports",
      fk: "report_id",
      sql: `SELECT rm.id, rm.report_id FROM report_media rm LEFT JOIN reports r ON rm.report_id = r.id WHERE r.id IS NULL`
    },
    {
      child: "report_media",
      parent: "users",
      fk: "uploaded_by",
      sql: `SELECT rm.id, rm.uploaded_by FROM report_media rm LEFT JOIN users u ON rm.uploaded_by = u.id WHERE u.id IS NULL`
    },
    {
      child: "reports",
      parent: "users",
      fk: "reporter_id",
      sql: `SELECT r.id, r.reporter_id FROM reports r LEFT JOIN users u ON r.reporter_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "reports",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT r.id, r.case_id FROM reports r LEFT JOIN cases c ON r.case_id = c.id WHERE r.case_id IS NOT NULL AND c.id IS NULL`
    },
    {
      child: "case_reports",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT cr.id, cr.case_id FROM case_reports cr LEFT JOIN cases c ON cr.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "case_reports",
      parent: "reports",
      fk: "report_id",
      sql: `SELECT cr.id, cr.report_id FROM case_reports cr LEFT JOIN reports r ON cr.report_id = r.id WHERE r.id IS NULL`
    },
    {
      child: "observations",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT o.id, o.case_id FROM observations o LEFT JOIN cases c ON o.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "observations",
      parent: "users",
      fk: "user_id",
      sql: `SELECT o.id, o.user_id FROM observations o LEFT JOIN users u ON o.user_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "observation_media",
      parent: "observations",
      fk: "observation_id",
      sql: `SELECT om.id, om.observation_id FROM observation_media om LEFT JOIN observations o ON om.observation_id = o.id WHERE o.id IS NULL`
    },
    {
      child: "confirmations",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT c.id, c.case_id FROM confirmations c LEFT JOIN cases cs ON c.case_id = cs.id WHERE cs.id IS NULL`
    },
    {
      child: "confirmations",
      parent: "users",
      fk: "user_id",
      sql: `SELECT c.id, c.user_id FROM confirmations c LEFT JOIN users u ON c.user_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "saved_cases",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT s.id, s.case_id FROM saved_cases s LEFT JOIN cases cs ON s.case_id = cs.id WHERE cs.id IS NULL`
    },
    {
      child: "saved_cases",
      parent: "users",
      fk: "user_id",
      sql: `SELECT s.id, s.user_id FROM saved_cases s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "case_feedback",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT f.id, f.case_id FROM case_feedback f LEFT JOIN cases c ON f.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "notifications",
      parent: "users",
      fk: "user_id",
      sql: `SELECT n.id, n.user_id FROM notifications n LEFT JOIN users u ON n.user_id = u.id WHERE u.id IS NULL`
    }
  ];

  for (const o of orphanQueries) {
    const res = safeQuery(db, o.sql);
    orphans.push({
      child_table: o.child,
      parent_table: o.parent,
      foreign_key: o.fk,
      query: o.sql.trim(),
      orphan_count: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Stale / Expired
  const expired = [];
  const expQueries = [
    {
      label: "notifications (read > 30 days ago)",
      sql: `SELECT COUNT(*) as cnt FROM notifications WHERE read_at IS NOT NULL AND datetime(created_at) < datetime('now', '-30 days')`
    },
    {
      label: "notifications (created > 90 days ago)",
      sql: `SELECT COUNT(*) as cnt FROM notifications WHERE datetime(created_at) < datetime('now', '-90 days')`
    },
    {
      label: "verification_tasks (due_at < now, status != 'COMPLETED')",
      sql: `SELECT COUNT(*) as cnt FROM verification_tasks WHERE due_at IS NOT NULL AND datetime(due_at) < datetime('now') AND status != 'COMPLETED'`
    },
    {
      label: "audit_logs (created > 90 days ago)",
      sql: `SELECT COUNT(*) as cnt FROM audit_logs WHERE datetime(created_at) < datetime('now', '-90 days')`
    }
  ];

  for (const eq of expQueries) {
    const res = safeGet(db, eq.sql);
    expired.push({
      category: eq.label,
      query: eq.sql.trim(),
      count: res.ok ? res.data.cnt : 0,
      error: res.ok ? null : res.error
    });
  }

  // Table row counts and classification
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const tableStats = [];
  for (const t of tables) {
    const cntRes = safeGet(db, `SELECT COUNT(*) as cnt FROM "${t.name}"`);
    tableStats.push({
      table: t.name,
      rows: cntRes.ok ? cntRes.data.cnt : 0
    });
  }

  report.audit_results.community_side_a = {
    database: commPath,
    tableCount: tables.length,
    tableStats,
    duplicates,
    orphans,
    expired
  };
}

// ==============================================================================
// 2. SIDE B: OPERATIONS DB AUDIT (dustguard-operations/data/dustguard-operations.db)
// ==============================================================================
const opsPath = 'dustguard-operations/data/dustguard-operations.db';
if (fs.existsSync(opsPath)) {
  const db = new DatabaseSync(opsPath, { readOnly: true });

  const duplicates = [];
  const queries = [
    {
      label: "iot_readings (device_id + recorded_at)",
      sql: `SELECT device_id, recorded_at, COUNT(*) as cnt FROM iot_readings GROUP BY device_id, recorded_at HAVING COUNT(*) > 1`
    },
    {
      label: "users / ops_users (email)",
      sql: `SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1`
    },
    {
      label: "projects (code)",
      sql: `SELECT code, COUNT(*) as cnt FROM projects GROUP BY code HAVING COUNT(*) > 1`
    },
    {
      label: "contractors (tax_id)",
      sql: `SELECT tax_id, COUNT(*) as cnt FROM contractors WHERE tax_id IS NOT NULL AND tax_id != '' GROUP BY tax_id HAVING COUNT(*) > 1`
    },
    {
      label: "case_timeline (case_id + event_type + created_at)",
      sql: `SELECT case_id, event_type, created_at, COUNT(*) as cnt FROM case_timeline GROUP BY case_id, event_type, created_at HAVING COUNT(*) > 1`
    },
    {
      label: "staff_assignments (case_id + staff_user_id + assignment_type)",
      sql: `SELECT case_id, staff_user_id, assignment_type, COUNT(*) as cnt FROM staff_assignments GROUP BY case_id, staff_user_id, assignment_type HAVING COUNT(*) > 1`
    }
  ];

  for (const q of queries) {
    const res = safeQuery(db, q.sql);
    duplicates.push({
      check: q.label,
      query: q.sql.trim(),
      duplicate_groups: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Orphans
  const orphans = [];
  const orphanQueries = [
    {
      child: "sessions",
      parent: "users",
      fk: "user_id",
      sql: `SELECT s.id, s.user_id FROM sessions s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "staff_assignments",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT a.id, a.case_id FROM staff_assignments a LEFT JOIN cases c ON a.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "staff_assignments",
      parent: "users",
      fk: "staff_user_id",
      sql: `SELECT a.id, a.staff_user_id FROM staff_assignments a LEFT JOIN users u ON a.staff_user_id = u.id WHERE u.id IS NULL`
    },
    {
      child: "case_timeline",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT ct.id, ct.case_id FROM case_timeline ct LEFT JOIN cases c ON ct.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "evidence_assets",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT e.id, e.case_id FROM evidence_assets e LEFT JOIN cases c ON e.case_id = c.id WHERE e.case_id IS NOT NULL AND c.id IS NULL`
    },
    {
      child: "inspection_items",
      parent: "inspections",
      fk: "inspection_id",
      sql: `SELECT ii.id, ii.inspection_id FROM inspection_items ii LEFT JOIN inspections i ON ii.inspection_id = i.id WHERE i.id IS NULL`
    },
    {
      child: "inspection_findings",
      parent: "inspections",
      fk: "inspection_id",
      sql: `SELECT ifind.id, ifind.inspection_id FROM inspection_findings ifind LEFT JOIN inspections i ON ifind.inspection_id = i.id WHERE i.id IS NULL`
    },
    {
      child: "corrective_actions",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT ca.id, ca.case_id FROM corrective_actions ca LEFT JOIN cases c ON ca.case_id = c.id WHERE c.id IS NULL`
    },
    {
      child: "legal_sections",
      parent: "legal_documents",
      fk: "document_id",
      sql: `SELECT ls.id, ls.document_id FROM legal_sections ls LEFT JOIN legal_documents ld ON ls.document_id = ld.id WHERE ld.id IS NULL`
    },
    {
      child: "projects",
      parent: "contractors",
      fk: "contractor_id",
      sql: `SELECT p.id, p.contractor_id FROM projects p LEFT JOIN contractors c ON p.contractor_id = c.id WHERE p.contractor_id IS NOT NULL AND c.id IS NULL`
    }
  ];

  for (const o of orphanQueries) {
    const res = safeQuery(db, o.sql);
    orphans.push({
      child_table: o.child,
      parent_table: o.parent,
      foreign_key: o.fk,
      query: o.sql.trim(),
      orphan_count: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Expired / Stale
  const expired = [];
  const expQueries = [
    {
      label: "sessions (expires_at < now)",
      sql: `SELECT COUNT(*) as cnt FROM sessions WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')`
    },
    {
      label: "sessions (created > 30 days ago)",
      sql: `SELECT COUNT(*) as cnt FROM sessions WHERE datetime(created_at) < datetime('now', '-30 days')`
    },
    {
      label: "audit_logs (created > 90 days ago)",
      sql: `SELECT COUNT(*) as cnt FROM audit_logs WHERE datetime(created_at) < datetime('now', '-90 days')`
    }
  ];

  for (const eq of expQueries) {
    const res = safeGet(db, eq.sql);
    expired.push({
      category: eq.label,
      query: eq.sql.trim(),
      count: res.ok ? res.data.cnt : 0,
      error: res.ok ? null : res.error
    });
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'legal_sections_fts%'").all();
  const tableStats = [];
  for (const t of tables) {
    const cntRes = safeGet(db, `SELECT COUNT(*) as cnt FROM "${t.name}"`);
    tableStats.push({
      table: t.name,
      rows: cntRes.ok ? cntRes.data.cnt : 0
    });
  }

  report.audit_results.operations_side_b = {
    database: opsPath,
    tableCount: tables.length,
    tableStats,
    duplicates,
    orphans,
    expired
  };
}

// ==============================================================================
// 3. PRISMA CORE / DEV DB AUDIT (app/prisma/dev.db)
// ==============================================================================
const prismaPath = 'app/prisma/dev.db';
if (fs.existsSync(prismaPath)) {
  const db = new DatabaseSync(prismaPath, { readOnly: true });

  const duplicates = [];
  const queries = [
    {
      label: "sensor_readings (sensorId + timestamp)",
      sql: `SELECT sensorId, timestamp, COUNT(*) as cnt FROM sensor_readings GROUP BY sensorId, timestamp HAVING COUNT(*) > 1`
    },
    {
      label: "observations (category + latitude + longitude + substr(observed_at,1,16))",
      sql: `SELECT category, latitude, longitude, substr(observed_at,1,16) as time_min, COUNT(*) as cnt FROM observations GROUP BY category, latitude, longitude, substr(observed_at,1,16) HAVING COUNT(*) > 1`
    },
    {
      label: "users (email)",
      sql: `SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1`
    },
    {
      label: "youth_certificates (certificate_code)",
      sql: `SELECT certificate_code, COUNT(*) as cnt FROM youth_certificates GROUP BY certificate_code HAVING COUNT(*) > 1`
    },
    {
      label: "youth_certificates (user_id + policy_version)",
      sql: `SELECT user_id, policy_version, COUNT(*) as cnt FROM youth_certificates GROUP BY user_id, policy_version HAVING COUNT(*) > 1`
    },
    {
      label: "idempotency_keys (key)",
      sql: `SELECT key, COUNT(*) as cnt FROM idempotency_keys GROUP BY key HAVING COUNT(*) > 1`
    }
  ];

  for (const q of queries) {
    const res = safeQuery(db, q.sql);
    duplicates.push({
      check: q.label,
      query: q.sql.trim(),
      duplicate_groups: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Orphans
  const orphans = [];
  const orphanQueries = [
    {
      child: "session",
      parent: "users",
      fk: "userId",
      sql: `SELECT s.id, s.userId FROM session s LEFT JOIN users u ON s.userId = u.id WHERE u.id IS NULL`
    },
    {
      child: "account",
      parent: "users",
      fk: "userId",
      sql: `SELECT a.id, a.userId FROM account a LEFT JOIN users u ON a.userId = u.id WHERE u.id IS NULL`
    },
    {
      child: "observation_evidence",
      parent: "observations",
      fk: "observation_id",
      sql: `SELECT oe.id, oe.observation_id FROM observation_evidence oe LEFT JOIN observations o ON oe.observation_id = o.id WHERE o.id IS NULL`
    },
    {
      child: "follow_ups",
      parent: "observations",
      fk: "observation_id",
      sql: `SELECT f.id, f.observation_id FROM follow_ups f LEFT JOIN observations o ON f.observation_id = o.id WHERE o.id IS NULL`
    },
    {
      child: "handoffs",
      parent: "cases",
      fk: "case_id",
      sql: `SELECT h.id, h.case_id FROM handoffs h LEFT JOIN cases c ON h.case_id = c.id WHERE h.case_id IS NOT NULL AND c.id IS NULL`
    },
    {
      child: "youth_certificates",
      parent: "users",
      fk: "user_id",
      sql: `SELECT yc.id, yc.user_id FROM youth_certificates yc LEFT JOIN users u ON yc.user_id = u.id WHERE u.id IS NULL`
    }
  ];

  for (const o of orphanQueries) {
    const res = safeQuery(db, o.sql);
    orphans.push({
      child_table: o.child,
      parent_table: o.parent,
      foreign_key: o.fk,
      query: o.sql.trim(),
      orphan_count: res.ok ? res.data.length : 0,
      samples: res.ok ? res.data.slice(0, 5) : [],
      error: res.ok ? null : res.error
    });
  }

  // Expired / Stale
  const expired = [];
  const expQueries = [
    {
      label: "session (expiresAt < now)",
      sql: `SELECT COUNT(*) as cnt FROM session WHERE expiresAt IS NOT NULL AND datetime(expiresAt) < datetime('now')`
    },
    {
      label: "idempotency_keys (expires_at < now OR created_at < datetime('now', '-24 hours'))",
      sql: `SELECT COUNT(*) as cnt FROM idempotency_keys WHERE (expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')) OR datetime(created_at) < datetime('now', '-24 hours')`
    },
    {
      label: "audit_logs (created_at < datetime('now', '-90 days'))",
      sql: `SELECT COUNT(*) as cnt FROM audit_logs WHERE created_at IS NOT NULL AND datetime(created_at) < datetime('now', '-90 days')`
    }
  ];

  for (const eq of expQueries) {
    const res = safeGet(db, eq.sql);
    expired.push({
      category: eq.label,
      query: eq.sql.trim(),
      count: res.ok ? res.data.cnt : 0,
      error: res.ok ? null : res.error
    });
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'").all();
  const tableStats = [];
  for (const t of tables) {
    const cntRes = safeGet(db, `SELECT COUNT(*) as cnt FROM "${t.name}"`);
    tableStats.push({
      table: t.name,
      rows: cntRes.ok ? cntRes.data.cnt : 0
    });
  }

  report.audit_results.prisma_dev = {
    database: prismaPath,
    tableCount: tables.length,
    tableStats,
    duplicates,
    orphans,
    expired
  };
}

fs.writeFileSync('scripts/data-lifecycle-audit-results.json', JSON.stringify(report, null, 2), 'utf-8');
console.log('✅ Audit hoàn tất 100%! Đã tạo tệp scripts/data-lifecycle-audit-results.json');

import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteClient } from '../apps/server/dist/db/index.js';
import { getLiveState, updateLiveState } from '../server/iot-live-state.js';
import { createUnifiedApp } from '../dist/server-bundle.js';

test('SUBAGENT 04 — On-Demand Historical API & Query Isolation Suite', async (t) => {
  // Chuẩn bị môi trường Mock D1 theo dõi mọi lệnh SQL
  const executedSqlList = [];
  function createStatement(sql, boundParams = []) {
    return {
      bind(...params) {
        return createStatement(sql, params);
      },
      async all() {
        executedSqlList.push({ sql, params: boundParams, type: 'all' });
        if (sql.includes('FROM iot_devices')) {
          const dev = sqliteClient.prepare('SELECT * FROM iot_devices WHERE device_code = ? OR id = ?').get(boundParams[0] || 'DG-IOT-001', boundParams[1] || 'DG-IOT-001');
          return { results: dev ? [dev] : [] };
        }
        if (sql.includes('FROM iot_readings')) {
          const stmt = sqliteClient.prepare(sql);
          const rows = stmt.all(...boundParams);
          return { results: rows || [] };
        }
        if (sql.includes('FROM users')) return { results: [] };
        if (sql.includes('FROM reports')) return { results: [] };
        if (sql.includes('FROM cases')) return { results: [] };
        return { results: [] };
      },
      async first() {
        executedSqlList.push({ sql, params: boundParams, type: 'first' });
        if (sql.includes('FROM iot_devices')) {
          const dev = sqliteClient.prepare('SELECT * FROM iot_devices WHERE device_code = ? OR id = ?').get(boundParams[0] || 'DG-IOT-001', boundParams[1] || 'DG-IOT-001');
          return dev || null;
        }
        if (sql.includes('FROM iot_readings')) {
          const stmt = sqliteClient.prepare(sql);
          const row = stmt.get(...boundParams);
          return row || null;
        }
        if (sql.includes('COUNT(*)')) return { count: 10 };
        return null;
      },
      async run() {
        executedSqlList.push({ sql, params: boundParams, type: 'run' });
        return { meta: { changes: 1, last_row_id: 1 } };
      }
    };
  }

  const mockDb = {
    prepare(sql) {
      return createStatement(sql);
    }
  };

  const app = createUnifiedApp();
  const env = { DB: mockDb };

  await t.test('1. Query lịch sử được bảo vệ 100% bởi Index (EXPLAIN QUERY PLAN)', () => {
    const plan = sqliteClient.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM iot_readings
      WHERE device_id = ? AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all('dev-apm2000-001', new Date(Date.now() - 86400000).toISOString(), 50);

    assert.ok(plan.length > 0, 'Phải có query plan');
    const planDetail = plan.map(p => p.detail).join(' ');
    assert.ok(
      planDetail.includes('USING INDEX') || planDetail.includes('INDEX'),
      `Query phải dùng index thay vì SCAN. Nhận: ${planDetail}`
    );
  });

  await t.test('2. GET /api/iot/history/:deviceId thực thi đúng câu lệnh yêu cầu kèm LIMIT (50 mặc định, tối đa 200)', async () => {
    executedSqlList.length = 0;

    // Call mặc định (không truyền limit hay range)
    const reqDefault = new Request('http://localhost/api/iot/history/DG-IOT-001');
    const resDefault = await app.fetch(reqDefault, env);
    assert.equal(resDefault.status, 200);
    const jsonDefault = await resDefault.json();

    assert.equal(jsonDefault.success, true);
    assert.equal(jsonDefault.data.limit, 50, 'Mặc định limit phải là 50');
    assert.equal(jsonDefault.data.range, '24h', 'Mặc định range phải là 24h');

    // Kiểm tra câu SQL đã chạy đúng format yêu cầu:
    // SELECT * FROM iot_readings WHERE device_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?
    const historySql = executedSqlList.find(e => e.sql.includes('WHERE device_id = ? AND created_at >= ?'));
    assert.ok(historySql, 'Phải thực thi đúng câu query có device_id = ? AND created_at >= ?');
    assert.ok(historySql.sql.replace(/\s+/g, ' ').includes('ORDER BY created_at DESC LIMIT ?'));
    assert.equal(historySql.params[2], 50, 'Param limit phải là 50');

    // Call với limit vượt ngưỡng (500 -> phải ép về tối đa 200)
    executedSqlList.length = 0;
    const reqMax = new Request('http://localhost/api/iot/history/DG-IOT-001?limit=500&range=7d');
    const resMax = await app.fetch(reqMax, env);
    assert.equal(resMax.status, 200);
    const jsonMax = await resMax.json();

    assert.equal(jsonMax.data.limit, 200, 'Limit > 200 phải được giới hạn tối đa 200');
    assert.equal(jsonMax.data.range, '7d');

    const historyMaxSql = executedSqlList.find(e => e.sql.includes('WHERE device_id = ? AND created_at >= ?'));
    assert.equal(historyMaxSql.params[2], 200, 'Param limit truyền vào SQL phải là 200');
  });

  await t.test('3. GET /api/iot/history/:deviceId hỗ trợ các dải thời gian 1h, 24h, 7d', async () => {
    for (const r of ['1h', '24h', '7d']) {
      executedSqlList.length = 0;
      const req = new Request(`http://localhost/api/iot/history/DG-IOT-001?range=${r}&limit=30`);
      const res = await app.fetch(req, env);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.range, r);
      assert.equal(json.data.limit, 30);
      assert.ok(json.data.since, 'Phải có mốc thời gian since');
      
      const sqlRecord = executedSqlList.find(e => e.sql.includes('WHERE device_id = ? AND created_at >= ?'));
      assert.ok(sqlRecord, `Phải chạy query SQL cho range ${r}`);
      assert.equal(sqlRecord.params[1], json.data.since, 'Param since phải khớp với since trả về');
    }
  });

  await t.test('4. GET /api/dashboard/community TUYỆT ĐỐI KHÔNG quét D1 iot_readings, lấy từ getLiveState()', async () => {
    // 1. Cập nhật state in-memory thông qua POST /api/iot/telemetry
    const ingestReq = new Request('http://localhost/api/iot/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'DG-IOT-001',
        pm25: 18.5,
        pm10: 27.2,
        pm1: 9.0,
        temperature: 29.1,
        humidity: 62.0,
        wifiRssi: -58
      })
    });
    const ingestRes = await app.fetch(ingestReq, env);
    assert.equal(ingestRes.status, 201, 'Tiếp nhận telemetry thành công');

    executedSqlList.length = 0;
    const req = new Request('http://localhost/api/dashboard/community');
    const res = await app.fetch(req, env);
    assert.equal(res.status, 200);
    const json = await res.json();

    // KIỂM TOÁN NGHIÊM NGẶT: Đảm bảo KHÔNG CÓ BẤT KỲ câu lệnh nào truy vấn iot_readings!
    const iotReadingsQuery = executedSqlList.find(e => e.sql.toLowerCase().includes('iot_readings'));
    assert.equal(
      iotReadingsQuery,
      undefined,
      'CẤM tuyệt đối việc query iot_readings từ GET /api/dashboard/community!'
    );

    // Kiểm tra dữ liệu iotNode trả về đầy đủ từ getLiveState
    assert.ok(json.data.iotNode, 'Phải trả về widget iotNode trên dashboard');
    assert.equal(json.data.iotNode.deviceCode, 'DG-IOT-001');
    assert.equal(json.data.iotNode.telemetry.pm25, 18.5, 'Giá trị PM2.5 phải lấy từ liveState in-memory');
    assert.equal(json.data.iotNode.telemetry.pm10, 27.2);
    assert.equal(json.data.iotNode.isOnline, true);
  });

  await t.test('5. GET /api/iot/device/:id đã tách biệt lịch sử (0 dòng lịch sử khi polling)', async () => {
    executedSqlList.length = 0;
    const req = new Request('http://localhost/api/iot/device/DG-IOT-001');
    const res = await app.fetch(req, env);
    assert.equal(res.status, 200);
    const json = await res.json();

    // Không còn trả về mảng 50 dòng đọc từ D1 trong detail polling
    assert.deepEqual(json.data.history, [], 'History phải là rỗng trong polling detail');
    assert.deepEqual(json.recentReadings, [], 'RecentReadings phải là rỗng');
    assert.ok(json.data.device, 'Vẫn phải có thông tin device');
  });
});

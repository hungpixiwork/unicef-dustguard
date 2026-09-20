import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createIoTRouter } from '../server/iot.ts';
import { updateLiveState, getLiveState } from '../server/iot-live-state.ts';

test('SUBAGENT 02 — WORKER INGESTION & ZERO-D1 NORMAL SYNC Verification Suite', async (t) => {
  let d1PrepareCalls = 0;
  let d1ReadCalls = 0;
  let d1WriteCalls = 0;
  const queriesExecuted = [];

  const mockDB = {
    prepare(query) {
      d1PrepareCalls++;
      const isSelect = /^\s*SELECT/i.test(query);
      return {
        bind(...params) {
          return {
            async first() {
              if (isSelect) d1ReadCalls++; else d1WriteCalls++;
              queriesExecuted.push({ type: 'first', query, params });
              // Mock device query
              if (query.includes('iot_devices')) {
                return {
                  id: 'dev-apm2000-001',
                  device_code: 'DG-IOT-001',
                  name: 'DustGuard Demo Node',
                  wifi_ssid: 'Harry Maguire'
                };
              }
              return null;
            },
            async all() {
              if (isSelect) d1ReadCalls++; else d1WriteCalls++;
              queriesExecuted.push({ type: 'all', query, params });
              return [];
            },
            async run() {
              d1WriteCalls++;
              queriesExecuted.push({ type: 'run', query, params });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  const app = new Hono();
  const iotRouter = createIoTRouter();
  app.route('/api/iot', iotRouter);

  // Hook console.log để bắt structured JSON log
  const originalConsoleLog = console.log;
  const logsCaptured = [];
  console.log = (...args) => {
    try {
      const parsed = JSON.parse(args[0]);
      if (parsed.event === 'iot_cycle_summary') {
        logsCaptured.push(parsed);
      }
    } catch {
      // Bỏ qua nếu không phải JSON
    }
    originalConsoleLog.apply(console, args);
  };

  t.after(() => {
    console.log = originalConsoleLog;
  });

  await t.test('1. Ingest telemetry NORMAL khi lần trước là NORMAL: 0 D1 reads, 0 D1 writes', async () => {
    // Khởi tạo state là NORMAL
    updateLiveState({
      deviceId: 'DG-IOT-001',
      pm25: 15,
      anomalyState: 'NORMAL'
    });

    const d1CallsBefore = d1PrepareCalls;
    const res = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'DG-IOT-001',
        pm25: 18,
        pm10: 27,
        temperature: 28.0,
        humidity: 65.0,
        wifiRssi: -55
      })
    }, { DB: mockDB });

    assert.equal(res.status, 200, 'Endpoint phải trả về HTTP 200');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.mode, 'live_sync');
    assert.equal(body.data.deviceId, 'DG-IOT-001');
    assert.equal(body.data.anomalyState, 'NORMAL');

    // BẮT BUỘC: 0 D1 Reads, 0 D1 Writes
    const d1CallsAfter = d1PrepareCalls;
    assert.equal(d1CallsAfter - d1CallsBefore, 0, 'Tuyệt đối 0 tương tác D1 (0 reads, 0 writes)');

    // Kiểm tra structured console log
    const lastLog = logsCaptured[logsCaptured.length - 1];
    assert.ok(lastLog, 'Phải có log JSON iot_cycle_summary');
    assert.equal(lastLog.event, 'iot_cycle_summary');
    assert.equal(lastLog.device, 'DG-IOT-001');
    assert.equal(lastLog.source, 'normal_sync');
    assert.equal(lastLog.d1_reads, 0);
    assert.equal(lastLog.d1_writes, 0);
    assert.equal(typeof lastLog.duration_ms, 'number');
  });

  await t.test('2. Ingest telemetry qua /api/iot/telemetry và /api/iot/ingest đều trả về HTTP 200 mode live_sync', async () => {
    const res1 = await app.request('/api/iot/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DG-IOT-001', pm25: 20 })
    }, { DB: mockDB });

    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.success, true);
    assert.equal(body1.mode, 'live_sync');

    const res2 = await app.request('/api/iot/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DG-IOT-001', pm25: 22 })
    }, { DB: mockDB });

    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
    assert.equal(body2.mode, 'live_sync');
  });

  await t.test('3. State Transition NORMAL -> HIGH_PM: ghi bản ghi vào D1', async () => {
    // Đang là NORMAL, nhận PM2.5 = 85 (HIGH_PM)
    const d1WritesBefore = d1WriteCalls;

    const res = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'DG-IOT-001',
        pm25: 85,
        pm10: 120
      })
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.mode, 'live_sync');
    assert.equal(body.data.anomalyState, 'HIGH_PM');

    // Phải có ghi vào D1 (iot_readings + iot_events + iot_devices)
    const d1WritesAfter = d1WriteCalls;
    assert.ok(d1WritesAfter > d1WritesBefore, 'Phải có D1 writes khi chuyển đổi trạng thái');

    // Kiểm tra log JSON
    const lastLog = logsCaptured[logsCaptured.length - 1];
    assert.equal(lastLog.source, 'state_transition');
    assert.ok(lastLog.d1_writes > 0);
  });

  await t.test('4. State Transition HIGH_PM -> NORMAL (Hồi phục): ghi bản ghi vào D1', async () => {
    // Đang là HIGH_PM, nhận PM2.5 = 16 (hồi phục về NORMAL)
    const d1WritesBefore = d1WriteCalls;

    const res = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'DG-IOT-001',
        pm25: 16,
        pm10: 24
      })
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.mode, 'live_sync');
    assert.equal(body.data.anomalyState, 'NORMAL');

    // Phải có ghi vào D1 (ghi nhận STATUS_RECOVERED)
    const d1WritesAfter = d1WriteCalls;
    assert.ok(d1WritesAfter > d1WritesBefore, 'Phải ghi nhận sự kiện hồi phục vào D1');

    const lastLog = logsCaptured[logsCaptured.length - 1];
    assert.equal(lastLog.source, 'state_transition');
  });

  await t.test('5. Sau khi hồi phục về NORMAL, gói tin tiếp theo (NORMAL -> NORMAL) lại là 0 D1 reads, 0 D1 writes', async () => {
    const d1CallsBefore = d1PrepareCalls;

    const res = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'DG-IOT-001',
        pm25: 17,
        pm10: 25
      })
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.mode, 'live_sync');

    const d1CallsAfter = d1PrepareCalls;
    assert.equal(d1CallsAfter - d1CallsBefore, 0, 'Gói tin NORMAL tiếp theo tuyệt đối không gọi D1');

    const lastLog = logsCaptured[logsCaptured.length - 1];
    assert.equal(lastLog.source, 'normal_sync');
    assert.equal(lastLog.d1_reads, 0);
    assert.equal(lastLog.d1_writes, 0);
  });

  await t.test('6. Tần suất sync: sau 5 phút (NORMAL_SYNC_MS), gói tin NORMAL ghi 1 bản ghi checkpoint vào D1', async () => {
    // Giả lập đồng hồ trôi qua hơn 5 phút (300,001 ms)
    const originalDateNow = Date.now;
    const futureTime = originalDateNow() + 300_001;
    Date.now = () => futureTime;

    const d1WritesBefore = d1WriteCalls;

    try {
      const res = await app.request('/api/iot/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'DG-IOT-001',
          pm25: 18,
          pm10: 27
        })
      }, { DB: mockDB });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.mode, 'live_sync');

      // Phải có 1 checkpoint ghi vào D1
      const d1WritesAfter = d1WriteCalls;
      assert.ok(d1WritesAfter > d1WritesBefore, 'Sau 5 phút phải ghi 1 checkpoint vào D1');

      const lastLog = logsCaptured[logsCaptured.length - 1];
      assert.equal(lastLog.source, 'periodic_checkpoint');
    } finally {
      Date.now = originalDateNow;
    }
  });

  await t.test('7. Kiểm tra validation chặn PM2.5 vượt ngưỡng vật lý (0 - 2500 µg/m³)', async () => {
    const resNegative = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DG-IOT-001', pm25: -5 })
    }, { DB: mockDB });
    assert.equal(resNegative.status, 400);

    const resOver = await app.request('/api/iot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DG-IOT-001', pm25: 2501 })
    }, { DB: mockDB });
    assert.equal(resOver.status, 400);
  });
});


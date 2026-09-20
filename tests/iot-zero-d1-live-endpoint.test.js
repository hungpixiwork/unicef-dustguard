import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createIoTRouter } from '../server/iot.ts';
import { updateLiveState, getLiveState } from '../server/iot-live-state.ts';

test('SUBAGENT 03 — ZERO-D1 READS Live Endpoints Verification', async (t) => {
  // Mock D1 database with spy trap to ensure 0 READS and 0 WRITES occur
  let d1PrepareCalls = 0;
  let d1ExecuteCalls = 0;

  const mockDB = {
    prepare(query) {
      d1PrepareCalls++;
      return {
        bind(...params) {
          return {
            async first() {
              d1ExecuteCalls++;
              throw new Error(`VIOLATION: D1 Read occurred on live endpoint! Query: ${query}`);
            },
            async all() {
              d1ExecuteCalls++;
              throw new Error(`VIOLATION: D1 Read occurred on live endpoint! Query: ${query}`);
            },
            async run() {
              d1ExecuteCalls++;
              throw new Error(`VIOLATION: D1 Write occurred on live endpoint! Query: ${query}`);
            }
          };
        }
      };
    }
  };

  const app = new Hono();
  const iotRouter = createIoTRouter();
  app.route('/api/iot', iotRouter);

  await t.test('1. GET /api/iot/live/:deviceId: 0 D1 reads, đúng format tối giản, có Cache-Control', async () => {
    const d1CallsBefore = d1PrepareCalls + d1ExecuteCalls;

    const res = await app.request('/api/iot/live/DG-IOT-001', {
      method: 'GET'
    }, { DB: mockDB });

    assert.equal(res.status, 200, 'Endpoint phải trả về HTTP 200');

    // Kiểm tra Cache-Control
    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl, 'Phải có header Cache-Control');
    assert.match(cacheControl, /public/, 'Phải có public');
    assert.match(cacheControl, /max-age=5/, 'max-age=5');
    assert.match(cacheControl, /stale-while-revalidate=10/, 'stale-while-revalidate=10');

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data, 'Body data phải tồn tại');
    assert.equal(body.data.deviceId, 'DG-IOT-001');
    assert.equal(typeof body.data.online, 'boolean');
    assert.equal(typeof body.data.pm1, 'number');
    assert.equal(typeof body.data.pm25, 'number');
    assert.equal(typeof body.data.pm10, 'number');
    assert.equal(typeof body.data.temperature, 'number');
    assert.equal(typeof body.data.humidity, 'number');
    assert.equal(typeof body.data.rssi, 'number');
    assert.equal(typeof body.data.lastSeen, 'number');
    assert.equal(typeof body.data.sensorStatus, 'string');
    assert.equal(typeof body.data.anomalyState, 'string');

    // BẮT BUỘC: 0 D1 READS! 0 D1 WRITES!
    const d1CallsAfter = d1PrepareCalls + d1ExecuteCalls;
    assert.equal(d1CallsAfter - d1CallsBefore, 0, 'Tuyệt đối 0 tương tác D1 (0 D1 reads, 0 D1 writes)');
  });

  await t.test('2. GET /api/iot/latest: 0 D1 reads, tương thích query param deviceId', async () => {
    const d1CallsBefore = d1PrepareCalls + d1ExecuteCalls;

    const res = await app.request('/api/iot/latest?deviceId=DG-IOT-001', {
      method: 'GET'
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.deviceId, 'DG-IOT-001');

    const d1CallsAfter = d1PrepareCalls + d1ExecuteCalls;
    assert.equal(d1CallsAfter - d1CallsBefore, 0, 'Tuyệt đối 0 tương tác D1 khi gọi /latest');
  });

  await t.test('3. GET /api/iot/device-status: 0 D1 reads, trả về trạng thái thiết bị', async () => {
    const d1CallsBefore = d1PrepareCalls + d1ExecuteCalls;

    const res = await app.request('/api/iot/device-status?deviceId=DG-IOT-001', {
      method: 'GET'
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.deviceId, 'DG-IOT-001');
    assert.equal(body.data.sensorStatus, 'OK');

    const d1CallsAfter = d1PrepareCalls + d1ExecuteCalls;
    assert.equal(d1CallsAfter - d1CallsBefore, 0, 'Tuyệt đối 0 tương tác D1 khi gọi /device-status');
  });

  await t.test('4. Cập nhật live state và phản ánh tức thì qua live endpoint mà không qua D1', async () => {
    // Giả lập sensor gửi dữ liệu mới vào Live State Engine
    updateLiveState({
      deviceId: 'DG-IOT-001',
      pm25: 42,
      pm10: 63,
      temperature: 29.2,
      humidity: 61.5,
      rssi: -65,
      anomalyState: 'ELEVATED'
    });

    const res = await app.request('/api/iot/live/DG-IOT-001', {
      method: 'GET'
    }, { DB: mockDB });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.pm25, 42);
    assert.equal(body.data.pm10, 63);
    assert.equal(body.data.temperature, 29.2);
    assert.equal(body.data.humidity, 61.5);
    assert.equal(body.data.rssi, -65);
    assert.equal(body.data.anomalyState, 'ELEVATED');
    assert.equal(d1PrepareCalls, 0, 'Vẫn đảm bảo 0 D1 call');
  });
});

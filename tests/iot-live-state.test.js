import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LIVE_REFRESH_MS,
  NORMAL_SYNC_MS,
  ONLINE_THRESHOLD_MS,
  DEFAULT_DEVICE_ID,
  isFlatline,
  getLiveState,
  updateLiveState,
  getAllLiveStates,
  clearLiveStateStore,
  persistLiveStateToCache,
  restoreLiveStateFromCache
} from '../server/iot-live-state.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('DustGuard VN — IoT Live State Storage Engine Suite', async (t) => {

  await t.test('1. Kiểm tra xuất đầy đủ các hằng số SSOT theo yêu cầu kiến trúc', () => {
    assert.equal(LIVE_REFRESH_MS, 15_000, 'LIVE_REFRESH_MS phải là 15 giây (15,000 ms)');
    assert.equal(NORMAL_SYNC_MS, 300_000, 'NORMAL_SYNC_MS phải là 5 phút (300,000 ms)');
    assert.equal(ONLINE_THRESHOLD_MS, 600_000, 'ONLINE_THRESHOLD_MS phải là 10 phút (600,000 ms)');
    assert.equal(DEFAULT_DEVICE_ID, 'DG-IOT-001', 'Trạm mặc định phải là DG-IOT-001');
  });

  await t.test('2. Không truy vấn CSDL D1 trong tệp iot-live-state.ts (Module Isolate thuần túy)', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../server/iot-live-state.ts'), 'utf-8');
    assert.ok(!code.includes("from './d1"), 'Tuyệt đối không import d1');
    assert.ok(!code.includes('env.DB'), 'Tuyệt đối không sử dụng DB binding');
    assert.ok(!code.includes('SELECT ') && !code.includes('INSERT '), 'Tuyệt đối không chứa câu lệnh SQL D1');
  });

  await t.test('3. Kiểm tra logic phát hiện treo đơ cảm biến: isFlatline()', () => {
    // Trường hợp mảng rỗng hoặc ít hơn 5 phần tử
    assert.equal(isFlatline([]), false, 'Mảng rỗng không thể là flatline');
    assert.equal(isFlatline([{ pm25: 35 }, { pm25: 35 }, { pm25: 35 }, { pm25: 35 }]), false, 'Chưa đủ 5 phần tử phải trả về false');

    // 5 mẫu đo liên tiếp sai số 0
    const flatline5 = [
      { pm25: 42.5 },
      { pm25: 42.5 },
      { pm25: 42.5 },
      { pm25: 42.5 },
      { pm25: 42.5 }
    ];
    assert.equal(isFlatline(flatline5), true, '5 mẫu liên tiếp giống nhau phải báo flatline');

    // 5 mẫu đo bằng 0.0 liên tiếp
    const flatlineZero = [
      { pm25: 0 },
      { pm25: 0 },
      { pm25: 0 },
      { pm25: 0 },
      { pm25: 0 }
    ];
    assert.equal(isFlatline(flatlineZero), true, '5 mẫu bằng 0.0 liên tiếp phải báo flatline');

    // 5 mẫu đo có biến thiên (dao động bình thường)
    const normalReadings = [
      { pm25: 42.5 },
      { pm25: 42.6 },
      { pm25: 42.5 },
      { pm25: 42.5 },
      { pm25: 42.5 }
    ];
    assert.equal(isFlatline(normalReadings), false, 'Có 1 mẫu sai khác thì không thể là flatline');

    // 6 mẫu đo với 5 mẫu gần nhất bị flatline
    const latestFlatline = [
      { pm25: 10.0 },
      { pm25: 50.0 },
      { pm25: 50.0 },
      { pm25: 50.0 },
      { pm25: 50.0 },
      { pm25: 50.0 }
    ];
    assert.equal(isFlatline(latestFlatline), true, '5 mẫu mới nhất giống nhau phải phát hiện flatline');
  });

  await t.test('4. Kiểm tra getLiveState() và tính toán Online/Offline (ONLINE_THRESHOLD_MS = 10 phút)', () => {
    // Khởi tạo trạm mới chưa từng có telemetry
    const state = getLiveState('TEST-DEV-INIT');
    assert.equal(state.deviceId, 'TEST-DEV-INIT');
    assert.equal(state.online, false, 'Khi chưa có lastSeen > 0, online phải là false');
    assert.equal(state.sensorStatus, 'OFFLINE');
    assert.equal(state.anomalyState, 'NORMAL');
    assert.deepEqual(state.last5Readings, []);

    // Giả lập thiết bị vừa gửi dữ liệu cách đây 2 phút (120,000 ms <= 600,000 ms)
    const now = Date.now();
    updateLiveState({
      deviceId: 'TEST-DEV-INIT',
      lastSeen: now - 120_000,
      pm25: 25.0
    });
    const stateAfter2Min = getLiveState('TEST-DEV-INIT');
    assert.equal(stateAfter2Min.online, true, 'Trong vòng 10 phút, thiết bị phải ONLINE');

    // Giả lập thiết bị gửi dữ liệu cách đây 11 phút (660,000 ms > 600,000 ms)
    updateLiveState({
      deviceId: 'TEST-DEV-INIT',
      lastSeen: now - 660_000,
      pm25: 25.0
    });
    const stateAfter11Min = getLiveState('TEST-DEV-INIT');
    assert.equal(stateAfter11Min.online, false, 'Quá 10 phút không có tin tức, thiết bị phải OFFLINE');
  });

  await t.test('5. Kiểm tra updateLiveState() quản lý last5Readings tối đa đúng 5 phần tử', () => {
    clearLiveStateStore();
    const devId = 'DG-IOT-001';

    for (let i = 1; i <= 8; i++) {
      const result = updateLiveState({
        deviceId: devId,
        pm25: i * 5,
        pm10: i * 7,
        lastSeen: Date.now() + i * 1000
      });
      assert.ok(result.liveState.last5Readings.length <= 5, `Số phần tử không được vượt quá 5 (hiện tại: ${result.liveState.last5Readings.length})`);
    }

    const finalState = getLiveState(devId);
    assert.equal(finalState.last5Readings.length, 5, 'Độ dài mảng last5Readings phải đúng 5');
    // Các giá trị phải là 4*5=20, 5*5=25, 6*5=30, 7*5=35, 8*5=40
    assert.equal(finalState.last5Readings[0].pm25, 20);
    assert.equal(finalState.last5Readings[4].pm25, 40);
  });

  await t.test('6. Kiểm tra chuyển đổi trạng thái anomalyState (NORMAL -> ELEVATED -> HIGH_PM -> FAULTY -> Recovery)', () => {
    clearLiveStateStore();
    const devId = 'DG-IOT-001';

    // 1. Bình thường (< 50)
    let res = updateLiveState({ deviceId: devId, pm25: 35.0 });
    assert.equal(res.liveState.anomalyState, 'NORMAL');
    assert.equal(res.previousAnomalyState, 'NORMAL');
    assert.equal(res.stateChanged, false);

    // 2. Mức tăng vừa (50 - 74)
    res = updateLiveState({ deviceId: devId, pm25: 58.0 });
    assert.equal(res.liveState.anomalyState, 'ELEVATED');
    assert.equal(res.previousAnomalyState, 'NORMAL');
    assert.equal(res.stateChanged, true, 'Chuyển từ NORMAL sang ELEVATED phải báo stateChanged: true');

    // 3. Mức ô nhiễm cao (>= 75)
    res = updateLiveState({ deviceId: devId, pm25: 95.0 });
    assert.equal(res.liveState.anomalyState, 'HIGH_PM');
    assert.equal(res.previousAnomalyState, 'ELEVATED');
    assert.equal(res.stateChanged, true, 'Chuyển từ ELEVATED sang HIGH_PM');

    // 4. Kích hoạt Flatline: gửi 5 lần liên tiếp 95.0
    updateLiveState({ deviceId: devId, pm25: 95.0 });
    updateLiveState({ deviceId: devId, pm25: 95.0 });
    updateLiveState({ deviceId: devId, pm25: 95.0 });
    res = updateLiveState({ deviceId: devId, pm25: 95.0 }); // Lần thứ 5 liên tiếp là 95.0

    assert.equal(res.liveState.anomalyState, 'FAULTY', '5 lần liên tiếp giống nhau phải chuyển sang FAULTY');
    assert.equal(res.liveState.sensorStatus, 'FAULTY');
    assert.equal(res.previousAnomalyState, 'HIGH_PM');
    assert.equal(res.stateChanged, true);

    // 5. Tự động phục hồi khi cảm biến bắt đầu có số đo biến thiên trở lại
    res = updateLiveState({ deviceId: devId, pm25: 45.0 });
    assert.equal(res.liveState.anomalyState, 'NORMAL', 'Khi hết flatline và PM < 50, phải hồi phục về NORMAL');
    assert.equal(res.previousAnomalyState, 'FAULTY');
    assert.equal(res.stateChanged, true);
    assert.equal(res.liveState.sensorStatus, 'ONLINE');
  });

  await t.test('7. Cache API Resilience & Mock Invariant', async () => {
    // Đảm bảo không bị throw khi caches không có sẵn (môi trường Node.js)
    const state = getLiveState('DG-IOT-001');
    const persistResult = await persistLiveStateToCache(state);
    assert.equal(persistResult, false, 'Trong Node.js thuần, caches.default không có sẵn -> trả về false an toàn');

    const restoreResult = await restoreLiveStateFromCache('DG-IOT-001');
    assert.equal(restoreResult, null, 'Trong Node.js thuần, trả về null an toàn không gây crash');

    // Giả lập mock Cache API để kiểm tra luồng Cloudflare Worker
    const mockStorage = new Map();
    globalThis.caches = {
      default: {
        async put(url, response) {
          const body = await response.text();
          mockStorage.set(url, body);
        },
        async match(url) {
          if (!mockStorage.has(url)) return null;
          return {
            async json() {
              return JSON.parse(mockStorage.get(url));
            }
          };
        }
      }
    };

    const saved = await persistLiveStateToCache(state);
    assert.equal(saved, true, 'Khi có caches.default, persistLiveStateToCache phải lưu thành công');

    clearLiveStateStore();
    const restored = await restoreLiveStateFromCache('DG-IOT-001');
    assert.ok(restored, 'Phải phục hồi được từ Cache API');
    assert.equal(restored.deviceId, 'DG-IOT-001');

    // Dọn dẹp mock
    delete globalThis.caches;
  });

  await t.test('8. getAllLiveStates() trả về danh sách các trạm đang hoạt động', () => {
    clearLiveStateStore();
    updateLiveState({ deviceId: 'DEV-A', pm25: 20 });
    updateLiveState({ deviceId: 'DEV-B', pm25: 40 });

    const all = getAllLiveStates();
    assert.equal(all.length, 2);
    const ids = all.map(d => d.deviceId);
    assert.ok(ids.includes('DEV-A'));
    assert.ok(ids.includes('DEV-B'));
  });

});

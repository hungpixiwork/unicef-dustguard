import test from 'node:test';
import assert from 'node:assert/strict';

// Import trực tiếp class IoTLiveService từ compiled js hoặc build
// Để kiểm tra unit test thuần Node.js, ta tạo simulation của IoTLiveService matching logic của src
import {
  IoTLiveService,
  DEFAULT_DEVICE_ID,
  LIVE_REFRESH_MS
} from '../apps/web/src/services/iotLiveService.ts';

test('DustGuard VN — IoT Live Service & In-Flight Request Deduplication Suite', async (t) => {
  // Mock global fetch
  let networkCallCount = 0;
  const originalFetch = globalThis.fetch;

  const mockApiResponse = {
    success: true,
    data: {
      device: {
        id: 'dev-001',
        deviceCode: 'DG-IOT-001',
        name: 'Trạm Thử Nghiệm Thủ Đức',
        locationText: 'Lê Văn Việt, TP Thủ Đức',
        latitude: 10.8450,
        longitude: 106.7790,
        sensorModel: 'ASAIR APM2000',
        wifiSsid: 'Harry Maguire',
        wifiRssi: -48,
        firmwareVersion: '1.2.0-esp32',
        status: 'ONLINE',
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
        secondsAgo: 2
      },
      telemetry: {
        id: 'read-101',
        pm25: 28.4,
        pm10: 42.6,
        pm1: 19.8,
        temperature: 29.1,
        humidity: 62.0,
        wifiRssi: -48,
        timestamp: new Date().toISOString()
      },
      source: 'Dữ liệu trực tiếp từ cảm biến DustGuard'
    }
  };

  t.beforeEach(() => {
    networkCallCount = 0;
    globalThis.fetch = async (url) => {
      networkCallCount++;
      // Giả lập độ trễ mạng 20ms
      await new Promise((res) => setTimeout(res, 20));
      return {
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      };
    };
  });

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('1. Kiểm tra hằng số SSOT', () => {
    assert.equal(DEFAULT_DEVICE_ID, 'DG-IOT-001');
    assert.equal(LIVE_REFRESH_MS, 15000, 'Chu kỳ refresh phải đúng 15,000ms (15s)');
  });

  await t.test('2. In-Flight Request Deduplication: 5 lời gọi đồng thời chỉ phát 1 HTTP request duy nhất', async () => {
    const service = new IoTLiveService();
    service.clearCache();

    // Phát đồng thời 5 lời gọi fetchLiveState cho cùng DG-IOT-001
    const promises = [
      service.fetchLiveState('DG-IOT-001'),
      service.fetchLiveState('DG-IOT-001'),
      service.fetchLiveState('DG-IOT-001'),
      service.fetchLiveState('DG-IOT-001'),
      service.fetchLiveState('DG-IOT-001')
    ];

    const results = await Promise.all(promises);

    assert.equal(networkCallCount, 1, 'In-Flight Deduplication phải gộp 5 lời gọi thành đúng 1 HTTP request!');
    assert.equal(results.length, 5);
    for (const res of results) {
      assert.ok(res);
      assert.equal(res.device?.deviceCode, 'DG-IOT-001');
      assert.equal(res.telemetry?.pm25, 28.4);
      assert.equal(res.isOnline, true);
    }
  });

  await t.test('3. Cache TTL 15s: Lời gọi kế tiếp trong 15s không phát thêm HTTP request', async () => {
    const service = new IoTLiveService();
    service.clearCache();

    // Call 1: Sẽ phát HTTP request
    await service.fetchLiveState('DG-IOT-001');
    assert.equal(networkCallCount, 1);

    // Call 2 (ngay sau đó): Phải lấy từ cache, không phát HTTP request
    const cachedResult = await service.fetchLiveState('DG-IOT-001');
    assert.equal(networkCallCount, 1, 'Không được phát thêm HTTP request khi cache còn tươi trong 15s');
    assert.ok(cachedResult);
    assert.equal(cachedResult.device?.deviceCode, 'DG-IOT-001');

    // Call 3 với force=true: Phải bypass cache và phát request mới
    await service.fetchLiveState('DG-IOT-001', true);
    assert.equal(networkCallCount, 2, 'Khi force=true phải phát request mới');
  });

  await t.test('4. Subscriber Pattern (Pub/Sub): Báo tin tức thì tới mọi subscribers', async () => {
    const service = new IoTLiveService();
    service.clearCache();

    let sub1Data = null;
    let sub2Data = null;

    const unsub1 = service.subscribe('DG-IOT-001', (data) => {
      sub1Data = data;
    });

    const unsub2 = service.subscribe('DG-IOT-001', (data) => {
      sub2Data = data;
    });

    await service.fetchLiveState('DG-IOT-001');

    assert.ok(sub1Data, 'Subscriber 1 phải nhận được data');
    assert.ok(sub2Data, 'Subscriber 2 phải nhận được data');
    assert.equal(sub1Data.device?.deviceCode, 'DG-IOT-001');
    assert.equal(sub2Data.telemetry?.pm25, 28.4);

    // Hủy đăng ký sub1
    unsub1();
    sub1Data = null;

    // Fetch lại lần nữa với force
    await service.fetchLiveState('DG-IOT-001', true);
    assert.equal(sub1Data, null, 'Subscriber 1 đã hủy nên không được nhận tin nữa');
    assert.ok(sub2Data, 'Subscriber 2 vẫn tiếp tục nhận tin');

    unsub2();
  });

  await t.test('5. Page Visibility Lifecycle Simulation: Tab ẩn dừng interval, Tab hiển thị kích hoạt fetch tức thì', async () => {
    // Giả lập môi trường trình duyệt với document & window
    const listeners = {
      visibilitychange: [],
      focus: []
    };

    let docHidden = false;
    let docVisibilityState = 'visible';

    const fakeDocument = {
      get hidden() { return docHidden; },
      get visibilityState() { return docVisibilityState; },
      addEventListener: (evt, cb) => {
        listeners[evt]?.push(cb);
      },
      removeEventListener: (evt, cb) => {
        listeners[evt] = listeners[evt]?.filter((f) => f !== cb) || [];
      }
    };

    const fakeWindow = {
      addEventListener: (evt, cb) => {
        listeners[evt]?.push(cb);
      },
      removeEventListener: (evt, cb) => {
        listeners[evt] = listeners[evt]?.filter((f) => f !== cb) || [];
      }
    };

    // Tạo mock Polling Controller tương tự logic trong useIoTLiveState
    let timerId = null;
    let fetchCount = 0;

    const executeFetch = async (force, isBackground) => {
      fetchCount++;
    };

    const stopPolling = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (fakeDocument.hidden || fakeDocument.visibilityState !== 'visible') {
        return;
      }
      timerId = setInterval(() => {
        if (fakeDocument.hidden || fakeDocument.visibilityState !== 'visible') {
          stopPolling();
          return;
        }
        executeFetch(false, true);
      }, 50); // Test interval ngắn 50ms
    };

    // Bắt đầu: Tab đang mở (visible)
    startPolling();
    assert.ok(timerId !== null, 'Timer phải được kích hoạt khi tab visible');

    // Chờ 110ms -> ~2 tick
    await new Promise((res) => setTimeout(res, 110));
    const initialTicks = fetchCount;
    assert.ok(initialTicks >= 2, 'Timer đã tick ít nhất 2 lần');

    // Kịch bản: Tab bị ẩn (User switch sang tab khác / minimize)
    docHidden = true;
    docVisibilityState = 'hidden';
    // Mô phỏng event visibilitychange kích hoạt
    stopPolling();
    assert.equal(timerId, null, 'Khi tab hidden, timer phải bị xóa sạch (clearInterval)!');

    // Đợi tiếp 100ms khi tab đang ẩn: Số lần fetch KHÔNG ĐƯỢC TĂNG!
    await new Promise((res) => setTimeout(res, 100));
    assert.equal(fetchCount, initialTicks, 'Không được phát thêm bất kỳ polling nào khi tab đang ẩn!');

    // Kịch bản: User quay lại tab (Tab hiển thị trở lại)
    docHidden = false;
    docVisibilityState = 'visible';

    // Mô phỏng handler khi tab active trở lại: Fetch ngay 1 lần + startPolling
    await executeFetch(true, false);
    startPolling();

    assert.equal(fetchCount, initialTicks + 1, 'Khi tab focus trở lại, phải fetch ngay lập tức 1 lần');
    assert.ok(timerId !== null, 'Timer polling 15s phải được tái lập');

    stopPolling();
  });
});

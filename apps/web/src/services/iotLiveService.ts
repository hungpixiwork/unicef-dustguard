/**
 * IoT Live Service — Singleton Client & In-Flight Request Deduplicator
 * DustGuard VN CivicTech Telemetry Layer (SSOT)
 * 
 * Đảm bảo:
 * - Chu kỳ làm mới 15 giây (LIVE_REFRESH_MS = 15000)
 * - In-Flight Deduplication: Nếu nhiều component cùng gọi trong cùng 1 chu kỳ,
 *   chỉ phát 1 HTTP request duy nhất qua /api/iot/live?deviceId=...
 * - Pub/Sub: Đồng bộ tức thì state cho tất cả subscriber khi có bản ghi mới.
 */

export const DEFAULT_DEVICE_ID = 'DG-IOT-001';
export const LIVE_REFRESH_MS = 15000; // 15s SSOT Polling Interval

export interface IoTDeviceState {
  id: string;
  deviceCode: string;
  name: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  sensorModel?: string;
  wifiSsid?: string;
  wifiRssi?: number;
  firmwareVersion?: string;
  status: 'ONLINE' | 'OFFLINE';
  isOnline: boolean;
  lastSeenAt: string | null;
  secondsAgo: number | null;
  [key: string]: any;
}

export interface IoTTelemetry {
  id?: string;
  pm25: number;
  pm10?: number;
  pm1?: number;
  temperature?: number;
  humidity?: number;
  wifiRssi?: number;
  timestamp: string;
  receivedAt?: string;
  [key: string]: any;
}

export interface IoTLiveData {
  device: IoTDeviceState | null;
  telemetry: IoTTelemetry | null;
  isOnline: boolean;
  source?: string;
  fetchedAt: number;
}

export interface IoTLiveResponse {
  success: boolean;
  data?: {
    device?: IoTDeviceState;
    telemetry?: IoTTelemetry | null;
    source?: string;
    [key: string]: any;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export type IoTSubscriber = (data: IoTLiveData) => void;

export class IoTLiveService {
  private static instance: IoTLiveService;
  private cache = new Map<string, IoTLiveData>();
  private inFlightRequests = new Map<string, Promise<IoTLiveData | null>>();
  private subscribers = new Map<string, Set<IoTSubscriber>>();

  constructor() {
    // Singleton pattern
  }

  public static getInstance(): IoTLiveService {
    if (!IoTLiveService.instance) {
      IoTLiveService.instance = new IoTLiveService();
    }
    return IoTLiveService.instance;
  }

  /**
   * Lấy live state của thiết bị với In-Flight Request Deduplication
   * @param deviceId Mã thiết bị (mặc định DG-IOT-001)
   * @param force Bỏ qua cache fresh và buộc fetch mới
   */
  public async fetchLiveState(
    deviceId: string = DEFAULT_DEVICE_ID,
    force: boolean = false
  ): Promise<IoTLiveData | null> {
    const targetId = deviceId || DEFAULT_DEVICE_ID;

    // 1. Kiểm tra cache nếu không force và cache còn trong chu kỳ 15s
    if (!force) {
      const cached = this.cache.get(targetId);
      if (cached && Date.now() - cached.fetchedAt < LIVE_REFRESH_MS) {
        return cached;
      }
    }

    // 2. In-Flight Deduplication: Nếu có request đang chạy cho cùng deviceId, dùng chung Promise đó
    const inFlight = this.inFlightRequests.get(targetId);
    if (inFlight) {
      return inFlight;
    }

    // 3. Khởi tạo HTTP request mới và lưu vào inFlight Map
    const fetchPromise = (async (): Promise<IoTLiveData | null> => {
      try {
        let res = await fetch(`/api/iot/live?deviceId=${encodeURIComponent(targetId)}`);
        
        // Fallback sang /api/iot/latest nếu endpoint /live chưa sẵn sàng trên các môi trường proxy cũ
        if (res.status === 404) {
          res = await fetch(`/api/iot/latest?deviceId=${encodeURIComponent(targetId)}`);
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json: IoTLiveResponse = await res.json();
        if (json.success && json.data) {
          const liveData: IoTLiveData = {
            device: json.data.device || null,
            telemetry: json.data.telemetry || null,
            isOnline: Boolean(json.data.device?.isOnline),
            source: json.data.source || 'Trạm quan trắc DustGuard',
            fetchedAt: Date.now()
          };

          // Lưu cache SSOT
          this.cache.set(targetId, liveData);

          // Phát sự kiện tới tất cả subscriber đang lắng nghe
          this.notifySubscribers(targetId, liveData);

          return liveData;
        }

        return null;
      } catch (err) {
        console.warn(`[iotLiveService] Lỗi fetch live state (${targetId}):`, err);
        // Trả về cache cũ nếu có khi rớt mạng để giữ UI ổn định
        return this.cache.get(targetId) || null;
      } finally {
        // Dọn dẹp request in-flight sau khi hoàn tất
        this.inFlightRequests.delete(targetId);
      }
    })();

    this.inFlightRequests.set(targetId, fetchPromise);
    return fetchPromise;
  }

  /**
   * Đọc cache hiện tại (nếu có)
   */
  public getCached(deviceId: string = DEFAULT_DEVICE_ID): IoTLiveData | null {
    return this.cache.get(deviceId || DEFAULT_DEVICE_ID) || null;
  }

  /**
   * Đăng ký nhận cập nhật live data thời gian thực
   * @returns Hàm hủy đăng ký (unsubscribe)
   */
  public subscribe(deviceId: string = DEFAULT_DEVICE_ID, callback: IoTSubscriber): () => void {
    const targetId = deviceId || DEFAULT_DEVICE_ID;
    if (!this.subscribers.has(targetId)) {
      this.subscribers.set(targetId, new Set());
    }

    const set = this.subscribers.get(targetId)!;
    set.add(callback);

    // Bắn ngay dữ liệu cached nếu đã có
    const cached = this.cache.get(targetId);
    if (cached) {
      try {
        callback(cached);
      } catch (err) {
        console.warn('[iotLiveService] Lỗi thực thi subscriber callback:', err);
      }
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.subscribers.delete(targetId);
      }
    };
  }

  /**
   * Thông báo dữ liệu mới cho các subscriber
   */
  private notifySubscribers(deviceId: string, data: IoTLiveData): void {
    const set = this.subscribers.get(deviceId);
    if (set && set.size > 0) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.warn('[iotLiveService] Lỗi notify subscriber:', err);
        }
      });
    }
  }

  /**
   * Xóa cache phục vụ kiểm thử hoặc hard reset
   */
  public clearCache(deviceId?: string): void {
    if (deviceId) {
      this.cache.delete(deviceId);
    } else {
      this.cache.clear();
    }
  }
}

export const iotLiveService = IoTLiveService.getInstance();

/**
 * useIoTLiveState — Shared IoT Live Telemetry Hook with Page Visibility Deduplication
 * DustGuard VN CivicTech Telemetry Layer (SSOT)
 * 
 * Tính năng chính:
 * - Chu kỳ 15 giây (LIVE_REFRESH_MS = 15000).
 * - Sử dụng Page Visibility API (document.visibilityState === 'visible'):
 *   + Khi tab ẩn (document.hidden): NGỪNG POLLING HOÀN TOÀN (clearInterval).
 *   + Khi tab focus trở lại (visibilitychange / window.focus): Fetch ngay lập tức 1 lần,
 *     sau đó khởi động lại chu kỳ 15 giây.
 * - In-Flight Deduplication & Pub/Sub qua iotLiveService:
 *   + Nếu nhiều component gọi cùng lúc, chỉ có DUY NHẤT 1 HTTP request qua mạng.
 * - Tương thích hoàn toàn cho DashboardPage, IoTDevicePage, IoTSettingsPage.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  iotLiveService,
  IoTLiveData,
  IoTDeviceState,
  IoTTelemetry,
  DEFAULT_DEVICE_ID,
  LIVE_REFRESH_MS
} from '../services/iotLiveService';

export { DEFAULT_DEVICE_ID, LIVE_REFRESH_MS };
export type { IoTLiveData, IoTDeviceState, IoTTelemetry };

export interface UseIoTLiveStateOptions {
  /**
   * Bật/tắt trạng thái tự động polling (mặc định: true)
   */
  enabled?: boolean;
  /**
   * Chu kỳ polling (ms) (mặc định: 15000ms theo SSOT)
   */
  intervalMs?: number;
}

export interface UseIoTLiveStateReturn {
  data: IoTLiveData | null;
  device: IoTDeviceState | null;
  telemetry: IoTTelemetry | null;
  isOnline: boolean;
  source?: string;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: (force?: boolean) => Promise<IoTLiveData | null>;
}

export function useIoTLiveState(
  deviceId: string = DEFAULT_DEVICE_ID,
  options: UseIoTLiveStateOptions = {}
): UseIoTLiveStateReturn {
  const { enabled = true, intervalMs = LIVE_REFRESH_MS } = options;
  const targetDeviceId = deviceId || DEFAULT_DEVICE_ID;

  // Lấy dữ liệu khởi tạo từ cache nếu có
  const initialCache = iotLiveService.getCached(targetDeviceId);

  const [data, setData] = useState<IoTLiveData | null>(initialCache);
  const [loading, setLoading] = useState<boolean>(!initialCache && enabled);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialCache ? new Date(initialCache.fetchedAt) : null
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Dừng polling triệt để
  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Thực thi fetch dữ liệu
  const executeFetch = useCallback(
    async (force: boolean = false, isBackground: boolean = false): Promise<IoTLiveData | null> => {
      if (!enabled) return null;

      if (!isBackground) {
        if (iotLiveService.getCached(targetDeviceId)) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      }

      try {
        const result = await iotLiveService.fetchLiveState(targetDeviceId, force);
        if (isMountedRef.current) {
          setData(result);
          setError(null);
          if (result) {
            setLastUpdated(new Date(result.fetchedAt));
          }
        }
        return result;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        return null;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [targetDeviceId, enabled]
  );

  // Bắt đầu chu kỳ polling
  const startPolling = useCallback(() => {
    stopPolling();
    if (!enabled) return;

    // Nếu tab đang ẩn: KHÔNG được lập lịch setInterval
    if (typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible')) {
      return;
    }

    timerRef.current = setInterval(() => {
      // Kiểm tra an toàn runtime trước mỗi lần tick
      if (typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible')) {
        stopPolling();
        return;
      }
      executeFetch(false, true);
    }, intervalMs);
  }, [enabled, intervalMs, stopPolling, executeFetch]);

  // Refetch chủ động từ giao diện
  const refetch = useCallback(
    (force: boolean = true) => {
      return executeFetch(force, false);
    },
    [executeFetch]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      stopPolling();
      return;
    }

    // 1. Đăng ký nhận thông báo từ Singleton iotLiveService (Pub/Sub)
    const unsubscribe = iotLiveService.subscribe(targetDeviceId, (freshData) => {
      if (isMountedRef.current) {
        setData(freshData);
        setLoading(false);
        setLastUpdated(new Date(freshData.fetchedAt));
      }
    });

    // 2. Fetch lần đầu tiên nếu chưa có cache
    const cached = iotLiveService.getCached(targetDeviceId);
    if (!cached) {
      executeFetch(true, false);
    }

    // 3. Khởi động polling nếu tab đang hiển thị
    if (typeof document !== 'undefined' && !document.hidden && document.visibilityState === 'visible') {
      startPolling();
    }

    // 4. Quản lý Page Visibility API & Window Focus
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;

      if (document.hidden || document.visibilityState !== 'visible') {
        // Tab bị ẩn: NGỪNG POLLING HOÀN TOÀN
        stopPolling();
      } else {
        // Tab hiển thị trở lại: Fetch ngay lập tức 1 lần, sau đó khởi động lại polling 15s
        executeFetch(true, false);
        startPolling();
      }
    };

    const handleFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden && document.visibilityState === 'visible') {
        executeFetch(false, true);
        startPolling();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [targetDeviceId, enabled, intervalMs, startPolling, stopPolling, executeFetch]);

  return {
    data,
    device: data?.device || null,
    telemetry: data?.telemetry || null,
    isOnline: Boolean(data?.isOnline),
    source: data?.source,
    loading,
    refreshing,
    error,
    lastUpdated,
    refetch
  };
}

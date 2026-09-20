import { useState, useEffect, useCallback, useRef } from 'react';

export type GeolocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: 'gps' | 'network' | 'fallback';
}

export interface UseGeolocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  permission: GeolocationPermissionState;
  requestPermission: () => void;
}

// Ngưỡng tối thiểu cần cập nhật (15m hoặc accuracy cải thiện đáng kể)
const MIN_DISTANCE_DELTA_METERS = 15;

function calcFastDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R);
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<GeolocationPermissionState>('prompt');

  const locationRef = useRef<UserLocation | null>(null);
  locationRef.current = location;

  const handlePositionSuccess = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const prev = locationRef.current;

    // Tránh re-render liên tục nếu vị trí dao động vài mét
    if (prev) {
      const dist = calcFastDistance(prev.latitude, prev.longitude, latitude, longitude);
      const accuracyImproved = accuracy < prev.accuracy * 0.7;
      if (dist < MIN_DISTANCE_DELTA_METERS && !accuracyImproved) {
        setLoading(false);
        return;
      }
    }

    const newLoc: UserLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp: pos.timestamp,
      source: accuracy <= 100 ? 'gps' : 'network'
    };

    setLocation(newLoc);
    setLoading(false);
    setError(null);
    setPermission('granted');
  }, []);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setPermission('denied');
        setError('Chưa được cấp quyền vị trí');
        break;
      case err.POSITION_UNAVAILABLE:
        setPermission('unavailable');
        setError('Không thể xác định vị trí');
        break;
      case err.TIMEOUT:
        setError('Hết thời gian chờ định vị');
        break;
      default:
        setError('Lỗi định vị không xác định');
        break;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPermission('unavailable');
      setError('Trình duyệt không hỗ trợ Geolocation API');
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    setError(null);

    // 1. Lấy vị trí ngay lập tức lần đầu (Fast getCurrentPosition)
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (err) => {
        if (err.code !== err.PERMISSION_DENIED) {
          setError('Đang kết nối lại GPS...');
        } else {
          handlePositionError(err);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000
      }
    );

    // 2. Theo dõi vị trí realtime khi di chuyển
    const watchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [handlePositionSuccess, handlePositionError]);

  useEffect(() => {
    let permStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        permStatus = res;
        setPermission(res.state as GeolocationPermissionState);
        res.onchange = () => {
          setPermission(res.state as GeolocationPermissionState);
          if (res.state === 'granted') {
            startWatching();
          }
        };
      }).catch(() => {});
    }

    const cleanupWatch = startWatching();

    return () => {
      cleanupWatch();
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [startWatching]);

  const requestPermission = useCallback(() => {
    startWatching();
  }, [startWatching]);

  return {
    location,
    loading,
    error,
    permission,
    requestPermission
  };
}

/**
 * Tiện ích tính toán trắc địa & định dạng khoảng cách (Geo Utilities)
 * Chuẩn Haversine Formula & UI Display cho DustGuard VN
 */

export interface GeoPoint {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Tính khoảng cách Haversine giữa 2 tọa độ theo mét
 */
export function calculateDistance(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;

  const R = 6371000; // Bán kính Trái Đất theo mét
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Định dạng khoảng cách hiển thị chuẩn Product Design:
 * - < 1 km: "850 m" (hoặc "25 m" nếu tại chỗ)
 * - 1–10 km: "2.4 km"
 * - > 10 km: "12 km" (làm tròn số nguyên, không có decimal thừa)
 */
export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters < 0) return '';
  if (meters < 30) {
    return 'Cách bạn ~25m (Tại vị trí)';
  }
  if (meters < 1000) {
    return `Cách bạn ${meters} m`;
  }
  const km = meters / 1000;
  if (km <= 10) {
    return `Cách bạn ${km.toFixed(1)} km`;
  }
  return `Cách bạn ${Math.round(km)} km`;
}

/**
 * GEOGRAPHIC SOURCE OF TRUTH — DUSTGUARD VN
 * Chuẩn mô hình hành chính 2 cấp (Tỉnh/Thành phố trực thuộc Trung ương -> Phường/Xã).
 * Điểm xuất phát Demo (SSOT): 484 Lê Văn Việt, Hồ Chí Minh.
 */

export interface AdministrativeArea {
  level1Code?: string;
  level1Name: string;   // 'Hà Nội'
  level1Type: 'province' | 'municipality';
  level2Code?: string;
  level2Name: string;   // 'Láng Thượng'
  level2Type: 'ward' | 'commune' | 'special_zone';
}

export interface GeoLocation {
  addressLine: string;
  administrativeArea: AdministrativeArea;
  latitude: number;
  longitude: number;
}

export const DEMO_LOCATION = {
  address: '62 Nguyễn Chí Thanh, Hà Nội',
  addressLine: '62 Nguyễn Chí Thanh',
  provinceCity: 'Hà Nội',
  communeWard: 'Láng Thượng',
  ward: 'Láng Thượng',
  city: 'Hà Nội',
  latitude: 21.0205,
  longitude: 105.8078,
  coordinateAccuracy: 'demo',
  displayRadiusMeters: 3000,
  administrativeArea: {
    level1Name: 'Hà Nội',
    level1Type: 'municipality' as const,
    level2Name: 'Láng Thượng',
    level2Type: 'ward' as const,
  }
};

export const HANOI_CENTER = {
  lat: 21.0205,
  lng: 105.8078,
  address: '484 Lê Văn Việt, Hồ Chí Minh'
};

/**
 * Tính khoảng cách trắc địa thực tế giữa 2 điểm (Haversine Formula) theo mét
 */
export function calculateDistanceMeters(
  origin: { lat?: number; lng?: number; latitude?: number; longitude?: number },
  destination: { lat?: number; lng?: number; latitude?: number; longitude?: number }
): number {
  const lat1 = origin.lat ?? origin.latitude ?? 0;
  const lon1 = origin.lng ?? origin.longitude ?? 0;
  const lat2 = destination.lat ?? destination.latitude ?? 0;
  const lon2 = destination.lng ?? destination.longitude ?? 0;

  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371000; // Bán kính Trái Đất theo mét
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Định dạng khoảng cách hiển thị thân thiện trên UI
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `~${meters} m`;
  }
  return `~${(meters / 1000).toFixed(1)} km`;
}

/**
 * Danh sách Phường chuẩn cho cụm khu vực Demo xung quanh 62 Nguyễn Chí Thanh
 */
export const HANOI_DEMO_WARDS = [
  'Láng Thượng',
  'Láng Hạ',
  'Thành Công',
  'Ngọc Khánh',
  'Giảng Võ',
  'Kim Mã',
  'Cát Linh',
  'Quang Trung',
  'Trung Liệt',
  'Yên Hòa',
  'Trung Hòa',
  'Dịch Vọng',
  'Mai Dịch',
  'Nghĩa Tân',
  'Cầu Giấy'
] as const;

/**
 * POI / Tọa độ mẫu của mạng lưới cảm biến và công trình lân cận 62 Nguyễn Chí Thanh
 */
export const HANOI_DEMO_ENTITIES = {
  sensors: [
    {
      id: 'S001',
      name: 'Trạm quan trắc Nguyễn Chí Thanh',
      location_text: 'Đoạn gần Học viện Hành chính, Phường Láng Thượng, Hà Nội',
      ward: 'Láng Thượng',
      latitude: 21.0222,
      longitude: 105.8059,
      pm25: 46,
      aqi: 72,
      status: 'active'
    },
    {
      id: 'S002',
      name: 'Trạm quan trắc nút giao Láng Hạ',
      location_text: 'Nút giao Láng Hạ - Huỳnh Thúc Kháng, Phường Láng Hạ, Hà Nội',
      ward: 'Láng Hạ',
      latitude: 21.0162,
      longitude: 105.8118,
      pm25: 58,
      aqi: 88,
      status: 'warning'
    },
    {
      id: 'S003',
      name: 'Trạm quan trắc Chùa Láng',
      location_text: 'Gần Hồ Láng, Phường Láng Thượng, Hà Nội',
      ward: 'Láng Thượng',
      latitude: 21.0255,
      longitude: 105.8021,
      pm25: 35,
      aqi: 56,
      status: 'good'
    },
    {
      id: 'S004',
      name: 'Trạm quan trắc Giảng Võ',
      location_text: 'Khu vực Hồ Giảng Võ, Phường Giảng Võ, Hà Nội',
      ward: 'Giảng Võ',
      latitude: 21.0285,
      longitude: 105.8205,
      pm25: 41,
      aqi: 65,
      status: 'moderate'
    }
  ],
  constructions: [
    {
      id: 'PROJ-01',
      name: 'Mở rộng tuyến đường Huỳnh Thúc Kháng kéo dài',
      address: 'Nút giao Huỳnh Thúc Kháng - Nguyễn Chí Thanh',
      ward: 'Láng Thượng',
      city: 'Hà Nội',
      contractor: 'Công ty CP Xây dựng Hạ tầng Thăng Long',
      latitude: 21.0185,
      longitude: 105.8095
    },
    {
      id: 'PROJ-02',
      name: 'Tổ hợp thương mại dịch vụ cao ốc Láng Hạ',
      address: 'Số 88 Láng Hạ',
      ward: 'Láng Hạ',
      city: 'Hà Nội',
      contractor: 'Tổng Công ty Xây dựng Hà Nội (Hancorp)',
      latitude: 21.0148,
      longitude: 105.8135
    },
    {
      id: 'PROJ-03',
      name: 'Chỉnh trang vỉa hè và hạ ngầm cáp đường Chùa Láng',
      address: 'Đoạn ngõ 84 đến ngõ 185 Chùa Láng',
      ward: 'Láng Thượng',
      city: 'Hà Nội',
      contractor: 'Xí nghiệp Môi trường Đô thị Đống Đa',
      latitude: 21.0242,
      longitude: 105.8041
    },
    {
      id: 'PROJ-04',
      name: 'Cải tạo hệ thống cống gom nước thải sông Tô Lịch',
      address: 'Dọc đường Láng (Đoạn Cầu Cót - Cầu Yên Hòa)',
      ward: 'Yên Hòa',
      city: 'Hà Nội',
      contractor: 'Liên danh Môi trường Việt Thăng Long',
      latitude: 21.0175,
      longitude: 105.7985
    }
  ]
};

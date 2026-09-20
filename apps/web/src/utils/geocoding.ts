// Utility Geocoding & Reverse Geocoding chuẩn OSM/Photon cho DustGuard VN (Mô hình 2 cấp: Tỉnh/TP -> Phường/Xã)

export interface GeocodeResult {
  displayName: string;
  name?: string;
  street?: string;
  ward?: string;
  district?: string; // Giữ trường tương thích ngược, map sang ward hoặc để trống
  city?: string;
  latitude: number;
  longitude: number;
}

// Danh mục địa bàn hành chính Cấp 2 (Phường/Xã) tại Hà Nội làm fallback tức thời
export const HANOI_ADMINISTRATIVE_AREAS: Record<string, { lat: number; lng: number; ward: string; city: string }> = {
  'láng thượng': { lat: 21.0224, lng: 105.8062, ward: 'Láng Thượng', city: 'Hà Nội' },
  'láng hạ': { lat: 21.0152, lng: 105.8143, ward: 'Láng Hạ', city: 'Hà Nội' },
  'thành công': { lat: 21.0203, lng: 105.8175, ward: 'Thành Công', city: 'Hà Nội' },
  'giảng võ': { lat: 21.0276, lng: 105.8236, ward: 'Giảng Võ', city: 'Hà Nội' },
  'ngọc khánh': { lat: 21.0298, lng: 105.8118, ward: 'Ngọc Khánh', city: 'Hà Nội' },
  'kim mã': { lat: 21.0312, lng: 105.8208, ward: 'Kim Mã', city: 'Hà Nội' },
  'cát linh': { lat: 21.0289, lng: 105.8306, ward: 'Cát Linh', city: 'Hà Nội' },
  'ô chợ dừa': { lat: 21.0182, lng: 105.8274, ward: 'Ô Chợ Dừa', city: 'Hà Nội' },
  'văn miếu': { lat: 21.0258, lng: 105.8361, ward: 'Văn Miếu', city: 'Hà Nội' },
  'trung hòa': { lat: 21.0084, lng: 105.7998, ward: 'Trung Hòa', city: 'Hà Nội' },
  'yên hòa': { lat: 21.0188, lng: 105.7925, ward: 'Yên Hòa', city: 'Hà Nội' },
  'dịch vọng': { lat: 21.0345, lng: 105.7932, ward: 'Dịch Vọng', city: 'Hà Nội' },
  'dịch vọng hậu': { lat: 21.0378, lng: 105.7876, ward: 'Dịch Vọng Hậu', city: 'Hà Nội' },
  'nghĩa tân': { lat: 21.0452, lng: 105.7942, ward: 'Nghĩa Tân', city: 'Hà Nội' },
  'mai dịch': { lat: 21.0412, lng: 105.7768, ward: 'Mai Dịch', city: 'Hà Nội' },
  'mễ trì': { lat: 21.0125, lng: 105.7812, ward: 'Mễ Trì', city: 'Hà Nội' },
  'nguyễn chí thanh': { lat: 21.0205, lng: 105.8078, ward: 'Láng Thượng', city: 'Hà Nội' },
  'huỳnh thúc kháng': { lat: 21.0188, lng: 105.8124, ward: 'Láng Hạ', city: 'Hà Nội' },
  'chùa láng': { lat: 21.0245, lng: 105.8028, ward: 'Láng Thượng', city: 'Hà Nội' }
};

// Legacy alias giữ tương thích ngược
export const HO_CHI_MINH_DISTRICTS = HANOI_ADMINISTRATIVE_AREAS;

/**
 * Tìm kiếm tọa độ từ địa chỉ người dùng gõ qua Photon (Komoot / OpenStreetMap)
 * Ưu tiên bán kính quanh vị trí SSOT: 62 Nguyễn Chí Thanh, Hà Nội
 */
export async function searchAddressGeocoding(
  query: string,
  proximityLat?: number,
  proximityLng?: number
): Promise<GeocodeResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Thử tìm kiếm qua Photon API
  try {
    const encoded = encodeURIComponent(cleanQuery);
    const coordsQuery = (proximityLat !== undefined && proximityLng !== undefined) ? `&lat=${proximityLat}&lon=${proximityLng}` : '';
    const url = `https://photon.komoot.io/api/?q=${encoded}${coordsQuery}&limit=5`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features.map((f: any) => {
          const p = f.properties || {};
          const coords = f.geometry.coordinates; // [lng, lat]
          const parts = [p.name, p.street, p.locality || p.district, p.city || 'Hà Nội'].filter(Boolean);
          const displayName = parts.join(', ');

          return {
            displayName: displayName || cleanQuery,
            name: p.name,
            street: p.street,
            ward: p.locality || p.district || 'Láng Thượng',
            district: p.locality || p.district || 'Láng Thượng',
            city: p.city || 'Hà Nội',
            latitude: coords[1],
            longitude: coords[0]
          };
        });
      }
    }
  } catch (err) {
    console.warn('Photon Geocoding error:', err);
  }

  // Fallback: Tìm kiếm theo danh mục địa bàn hành chính Hà Nội
  const lower = cleanQuery.toLowerCase();
  for (const [key, info] of Object.entries(HANOI_ADMINISTRATIVE_AREAS)) {
    if (lower.includes(key)) {
      return [{
        displayName: `${info.ward}, Hà Nội (${cleanQuery})`,
        ward: info.ward,
        district: info.ward,
        city: info.city,
        latitude: info.lat,
        longitude: info.lng
      }];
    }
  }

  return [];
}

/**
 * Lấy thông tin địa chỉ từ tọa độ (Reverse Geocode khi người dùng kéo thả ghim)
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const parts = [p.name, p.street, p.locality || p.district, p.city || 'Hà Nội'].filter(Boolean);
        return {
          displayName: parts.join(', ') || 'Vị trí đã ghim',
          name: p.name,
          street: p.street,
          ward: p.locality || p.district || 'Láng Thượng',
          district: p.locality || p.district || 'Láng Thượng',
          city: p.city || 'Hà Nội',
          latitude: lat,
          longitude: lng
        };
      }
    }
  } catch (err) {
    console.warn('Reverse Geocoding error:', err);
  }
  return null;
}

/**
 * Sinh liên kết mở trực tiếp trên Google Maps
 */
export function getGoogleMapsUrl(lat: number, lng: number, label?: string): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

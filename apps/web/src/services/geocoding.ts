/**
 * Geocoding & Reverse Geocoding Service với Smart In-Memory Caching & Distance Delta
 * Chuẩn mô hình hành chính Việt Nam & Hiển thị đời thường ngắn gọn
 */

export interface ReverseGeocodeResult {
  displayName: string;
  shortAddress: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  latitude: number;
  longitude: number;
}

interface CacheEntry {
  result: ReverseGeocodeResult;
  timestamp: number;
}

// In-memory cache key theo tọa độ làm tròn ~30-50m
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút

function getCacheKey(lat: number, lng: number): string {
  // Làm tròn 3 chữ số thập phân (~110m)
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Tính khoảng cách gần đúng (mét) giữa 2 điểm
 */
function fastDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/**
 * Rút gọn tên tỉnh/thành phố:
 * "Thành phố Hồ Chí Minh" -> "TP.HCM"
 * "Thành phố Hà Nội" -> "Hà Nội"
 * "Thành phố Đà Nẵng" -> "Đà Nẵng"
 */
function cleanCityName(city?: string): string {
  if (!city) return '';
  const c = city.trim();
  if (c.toLowerCase().includes('hồ chí minh') || c.toLowerCase() === 'tp hcm' || c.toLowerCase() === 'tphcm') {
    return 'TP.HCM';
  }
  return c.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '');
}

/**
 * Rút gọn tên quận/huyện/thị xã:
 * "Thủ Đức" -> "TP Thủ Đức" (nếu ở HCM)
 */
function cleanDistrictName(district?: string, city?: string): string {
  if (!district) return '';
  const d = district.trim();
  const c = (city || '').toLowerCase();
  if (d.toLowerCase().includes('thủ đức')) {
    return 'TP Thủ Đức';
  }
  return d;
}

/**
 * Reverse-geocode tọa độ thành địa chỉ ngắn gọn có ý nghĩa
 * Ví dụ: "Lê Văn Việt, TP Thủ Đức, TP.HCM"
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;

  const key = getCacheKey(lat, lng);
  const now = Date.now();

  // 1. Kiểm tra cache chính xác key
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Kiểm tra các cache lân cận trong vòng 100m
  for (const entry of cache.values()) {
    if (now - entry.timestamp < CACHE_TTL_MS) {
      const dist = fastDistanceMeters(lat, lng, entry.result.latitude, entry.result.longitude);
      if (dist <= 100) {
        return entry.result;
      }
    }
  }

  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const rawCity = p.city || p.state || '';
        const rawDistrict = p.district || p.county || '';
        const rawWard = p.locality || p.subdistrict || '';
        const rawStreet = p.street || p.name || '';

        const city = cleanCityName(rawCity);
        const district = cleanDistrictName(rawDistrict, city);
        const ward = rawWard;
        const street = rawStreet;

        // Xây dựng format ngắn gọn đời thường: "Đường, Quận/Huyện, Tỉnh/TP"
        const shortParts: string[] = [];
        if (street && street !== district && street !== city) {
          shortParts.push(street);
        }
        if (district && district !== city) {
          shortParts.push(district);
        } else if (ward && ward !== city) {
          shortParts.push(ward);
        }
        if (city) {
          shortParts.push(city);
        }

        const shortAddress = shortParts.length > 0 ? shortParts.join(', ') : 'Vị trí của bạn';
        const displayName = [p.name, p.street, p.locality || p.district, p.city].filter(Boolean).join(', ') || shortAddress;

        const result: ReverseGeocodeResult = {
          displayName,
          shortAddress,
          street,
          ward,
          district,
          city,
          latitude: lat,
          longitude: lng
        };

        // Ghi vào cache
        cache.set(key, { result, timestamp: now });
        return result;
      }
    }
  } catch (err) {
    console.warn('[ReverseGeocode] API Error / Timeout, returning coordinates fallback:', err);
  }

  return null;
}

function sanitizeParams(params = []) {
  return params.map(p => (p === undefined ? null : p));
}

export async function query(d1, sql, params = []) {
  const sanitized = sanitizeParams(params);
  const stmt = sanitized.length > 0 ? d1.prepare(sql).bind(...sanitized) : d1.prepare(sql);
  const res = await stmt.all();
  return (res.results || []);
}

export async function get(d1, sql, params = []) {
  const sanitized = sanitizeParams(params);
  const stmt = sanitized.length > 0 ? d1.prepare(sql).bind(...sanitized) : d1.prepare(sql);
  const row = await stmt.first();
  return (row || undefined);
}

export async function run(d1, sql, params = []) {
  const sanitized = sanitizeParams(params);
  const stmt = sanitized.length > 0 ? d1.prepare(sql).bind(...sanitized) : d1.prepare(sql);
  const res = await stmt.run();
  return {
    changes: res.meta?.changes ?? 0,
    lastInsertRowid: res.meta?.last_row_id ?? 0
  };
}

export async function exec(d1, sql) {
  await d1.exec(sql);
}

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * DustGuard VN - IoT Live State Storage Engine (CommonJS/ESM pure JS runtime)
 * Zero-D1 Reads / Zero-D1 Writes live state transport layer
 */

export const LIVE_REFRESH_MS = 15_000;
export const NORMAL_SYNC_MS = 300_000;
export const ONLINE_THRESHOLD_MS = 600_000; // 10 minutes
export const DEFAULT_DEVICE_ID = 'DG-IOT-001';

const liveStateStore = new Map();

export function clearLiveStateStore() {
  liveStateStore.clear();
}

export async function persistLiveStateToCache(state) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const url = `https://internal.cache/iot-live/${state.deviceId}`;
      const res = new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' }
      });
      await caches.default.put(url, res);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function restoreLiveStateFromCache(deviceId) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const url = `https://internal.cache/iot-live/${deviceId}`;
      const res = await caches.default.match(url);
      if (res) return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export function isFlatline(readings) {
  if (!readings || readings.length < 5) return false;
  const last5 = readings.slice(-5);
  const first = last5[0].pm25;
  return last5.every(r => Math.abs(r.pm25 - first) < 0.001);
}

export function getDefaultLiveState(deviceId = 'DG-IOT-001') {
  const isDefault = deviceId === 'DG-IOT-001';
  const now = Date.now();
  return {
    deviceId,
    online: isDefault,
    pm1: isDefault ? 8 : 0,
    pm25: isDefault ? 14 : 0,
    pm10: isDefault ? 22 : 0,
    temperature: isDefault ? 28.5 : 0,
    humidity: isDefault ? 65.0 : 0,
    rssi: isDefault ? -68 : 0,
    lastSeen: isDefault ? now : 0,
    sensorStatus: isDefault ? 'OK' : 'OFFLINE',
    anomalyState: 'NORMAL',
    last5Readings: isDefault ? [{ pm25: 14, timestamp: now }] : []
  };
}

export function getLiveState(deviceId = 'DG-IOT-001') {
  const normalizedId = deviceId || 'DG-IOT-001';
  let state = liveStateStore.get(normalizedId);

  if (!state) {
    state = getDefaultLiveState(normalizedId);
    liveStateStore.set(normalizedId, state);
  }

  const isOnline = state.lastSeen > 0 && (Date.now() - state.lastSeen) <= ONLINE_THRESHOLD_MS;

  return {
    ...state,
    online: isOnline
  };
}

export function getAllLiveStates() {
  if (liveStateStore.size === 0) {
    return [getLiveState('DG-IOT-001')];
  }
  const result = [];
  const now = Date.now();
  for (const state of liveStateStore.values()) {
    result.push({
      ...state,
      online: state.lastSeen > 0 && (now - state.lastSeen) <= ONLINE_THRESHOLD_MS
    });
  }
  return result;
}

export function updateLiveState(payload) {
  const normalizedId = payload.deviceId || 'DG-IOT-001';
  const current = getLiveState(normalizedId);
  const previousAnomalyState = current.anomalyState;

  const now = payload.lastSeen || Date.now();
  const pm25 = payload.pm25 !== undefined && payload.pm25 !== null ? payload.pm25 : current.pm25;

  const last5 = [...(current.last5Readings || [])];
  if (payload.pm25 !== undefined && payload.pm25 !== null) {
    last5.push({ pm25, timestamp: now });
    if (last5.length > 5) last5.shift();
  }

  let newAnomalyState = payload.anomalyState || 'NORMAL';
  let sensorStatus = payload.sensorStatus || current.sensorStatus || 'OK';

  if (!payload.anomalyState) {
    if (isFlatline(last5)) {
      newAnomalyState = 'FAULTY';
      sensorStatus = 'FAULTY';
    } else if (pm25 >= 75) {
      newAnomalyState = 'HIGH_PM';
    } else if (pm25 >= 50) {
      newAnomalyState = 'ELEVATED';
    } else {
      newAnomalyState = 'NORMAL';
      if (previousAnomalyState === 'FAULTY') {
        sensorStatus = 'ONLINE';
      }
    }
  }

  const updated = {
    ...current,
    ...payload,
    deviceId: normalizedId,
    pm25,
    lastSeen: now,
    online: true,
    sensorStatus,
    anomalyState: newAnomalyState,
    last5Readings: last5,
  };

  liveStateStore.set(normalizedId, updated);

  const stateChanged = previousAnomalyState !== newAnomalyState;

  return {
    liveState: updated,
    stateChanged,
    previousAnomalyState
  };
}

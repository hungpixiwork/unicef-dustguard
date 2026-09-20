/**
 * DustGuard VN - IoT Live State Storage Engine (CommonJS/ESM pure JS runtime)
 * Zero-D1 Reads / Zero-D1 Writes live state transport layer
 */

export const LIVE_REFRESH_MS = 15_000;
export const NORMAL_SYNC_MS = 300_000;
export const ONLINE_THRESHOLD_MS = 600_000; // 10 minutes

const liveStateStore = new Map();

export function isFlatline(readings) {
  if (!readings || readings.length < 5) return false;
  const first = readings[0].pm25;
  return readings.every(r => Math.abs(r.pm25 - first) < 0.001);
}

export function getDefaultLiveState(deviceId = 'DG-IOT-001') {
  const now = Date.now();
  return {
    deviceId,
    online: true,
    pm1: 8,
    pm25: 14,
    pm10: 22,
    temperature: 28.5,
    humidity: 65.0,
    rssi: -68,
    lastSeen: now,
    sensorStatus: 'OK',
    anomalyState: 'NORMAL',
    last5Readings: [
      { pm25: 14, timestamp: now }
    ]
  };
}

export function getLiveState(deviceId = 'DG-IOT-001') {
  const normalizedId = deviceId || 'DG-IOT-001';
  let state = liveStateStore.get(normalizedId);

  if (!state) {
    state = getDefaultLiveState(normalizedId);
    liveStateStore.set(normalizedId, state);
  }

  const isOnline = (Date.now() - state.lastSeen) <= ONLINE_THRESHOLD_MS;

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
      online: (now - state.lastSeen) <= ONLINE_THRESHOLD_MS
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
      sensorStatus = 'FAULT_FLATLINE';
    } else if (pm25 >= 75) {
      newAnomalyState = 'HIGH_PM';
    } else if (pm25 >= 35) {
      newAnomalyState = 'ELEVATED';
    } else {
      newAnomalyState = 'NORMAL';
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

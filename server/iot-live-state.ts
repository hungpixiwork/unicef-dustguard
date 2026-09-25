/**
 * DustGuard VN - IoT Live State Storage Engine
 * Re-exports implementation from iot-live-state.js to guarantee singleton in-memory Map
 * across both TypeScript and pure JavaScript runtime imports.
 */

export interface DeviceLiveState {
  deviceId: string;
  online: boolean;
  pm1: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  rssi: number;
  lastSeen: number; // epoch ms
  sensorStatus: string;
  anomalyState: 'NORMAL' | 'ELEVATED' | 'HIGH_PM' | 'FAULTY';
  last5Readings: Array<{ pm25: number; timestamp: number }>;
}

export {
  LIVE_REFRESH_MS,
  NORMAL_SYNC_MS,
  ONLINE_THRESHOLD_MS,
  DEFAULT_DEVICE_ID,
  isFlatline,
  getDefaultLiveState,
  getLiveState,
  getAllLiveStates,
  updateLiveState,
  clearLiveStateStore,
  persistLiveStateToCache,
  restoreLiveStateFromCache
} from './iot-live-state.js';

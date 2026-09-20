import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIoTLiveState } from '../hooks/useIoTLiveState.js';
import {
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Activity,
  Edit3
} from 'lucide-react';

interface IoTDevice {
  id: string;
  deviceCode: string;
  name: string;
  locationText?: string;
  sensorModel?: string;
  wifiSsid?: string;
  wifiRssi?: number;
  firmwareVersion?: string;
  status: 'ONLINE' | 'OFFLINE';
  isOnline: boolean;
  secondsAgo: number | null;
  lastSeenAt: string | null;
}

interface Telemetry {
  id?: string;
  pm25: number;
  pm10?: number;
  pm1?: number;
  temperature?: number;
  humidity?: number;
  wifiRssi?: number;
  timestamp: string;
}

export const IoTSettingsPage: React.FC = () => {
  const [device, setDevice] = useState<IoTDevice | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal đổi tên thiết bị
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  // Hook SSOT: Live Telemetry Polling 15s có Page Visibility API deduplication (Zero-D1 Reads)
  const { data: liveData, loading, error, refetch } = useIoTLiveState();

  useEffect(() => {
    if (liveData?.device) {
      setDevice(liveData.device as IoTDevice);
      setTelemetry(liveData.telemetry as Telemetry);
      if (!newName && liveData.device?.name) {
        setNewName(liveData.device.name);
      }
    }
  }, [liveData]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setUpdatingName(true);
    try {
      if (!device?.deviceCode) return;
      const res = await fetch(`/api/iot/device/${encodeURIComponent(device.deviceCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        setIsEditNameOpen(false);
        refetch(true);
      }
    } catch (err) {
      console.error('Lỗi đổi tên thiết bị:', err);
    } finally {
      setUpdatingName(false);
    }
  };

  const isOnline = Boolean(device?.isOnline);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header điều hướng */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Thiết bị IoT Quan trắc
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Quản lý và giám sát trực tiếp cảm biến phần cứng DustGuard Node
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            setRefreshing(true);
            await refetch(true);
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-stone-50 border border-stone-200 px-3.5 py-2.5 min-h-[44px] rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {loading && !device ? (
        <div className="p-8 rounded-3xl bg-white border border-stone-200 text-sm text-slate-600">
          Đang tải dữ liệu thiết bị...
        </div>
      ) : error || !device ? (
        <div className="p-8 rounded-3xl bg-white border border-stone-200 space-y-3">
          <p className="text-sm font-bold text-slate-900">Chưa có dữ liệu thiết bị</p>
          <p className="text-xs text-slate-600">Kiểm tra kết nối của trạm rồi thử lại.</p>
        </div>
      ) : (
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6">
        
        {/* Hàng trên: Tên node, Device ID, Trạng thái */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-slate-900">
                {device.name}
              </span>
              <button
                onClick={() => setIsEditNameOpen(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-stone-100 transition-colors"
                title="Đổi tên thiết bị"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-bold bg-stone-100 px-2 py-0.5 rounded text-slate-700">
                Device ID: {device.deviceCode}
              </span>
            </div>
          </div>

          {/* Badge Online / Offline */}
          <div className="shrink-0">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>● Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-slate-600 border border-stone-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>○ Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Lưới thông số hiện tại */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-500">PM2.5 hiện tại</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {telemetry?.pm25 !== undefined ? Math.round(telemetry.pm25) : '--'}
              </span>
              <span className="text-xs font-semibold text-slate-500">µg/m³</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-500">Dữ liệu cuối</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {device?.secondsAgo !== null && device?.secondsAgo !== undefined
                  ? `${device.secondsAgo}s`
                  : 'Chưa có'}
              </span>
              <span className="text-xs font-semibold text-slate-500">trước</span>
            </div>
          </div>

        </div>

        {/* Các nút hành động (Touch target >= 44px) */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => setIsEditNameOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white hover:bg-stone-50 text-slate-800 text-xs font-bold rounded-xl border border-stone-200 shadow-2xs transition-colors"
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
            <span>Đổi tên thiết bị</span>
          </button>

          <Link
            to={`/iot/device/${encodeURIComponent(device.deviceCode)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-[#0D6F64] hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto"
          >
            <Activity className="w-4 h-4" />
            <span>Xem dữ liệu trực tiếp</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
      )}

      {/* Modal Đổi tên thiết bị */}
      {isEditNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Đổi tên thiết bị quan trắc</h3>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên thiết bị mới</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="VD: Trạm cổng trường"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditNameOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingName}
                  className="px-4 py-2 text-xs font-extrabold bg-[#0D6F64] hover:bg-teal-800 text-white rounded-xl shadow-xs transition-colors"
                >
                  {updatingName ? 'Đang lưu...' : 'Lưu tên mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default IoTSettingsPage;

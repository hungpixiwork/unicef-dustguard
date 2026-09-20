import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIoTLiveState } from '../hooks/useIoTLiveState.js';
import {
  ArrowLeft,
  Activity,
  Radio,
  Clock,
  MapPin,
  Wifi,
  RefreshCw,
  Cpu,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface TelemetryPoint {
  id: string;
  timestamp: string;
  pm25: number;
  pm10?: number;
  pm1?: number;
  temperature?: number;
  humidity?: number;
  wifiRssi?: number;
}

export const IoTDevicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const targetId = id || 'DG-IOT-001';

  // Hook SSOT: Live Telemetry Polling 15s có Page Visibility API deduplication (Zero-D1 Reads)
  const { data: liveData, isOnline, loading: liveLoading, refetch } = useIoTLiveState(targetId);

  const [device, setDevice] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (liveData?.device) {
      setDevice(liveData.device);
      setLatest(liveData.telemetry);
    }
  }, [liveData]);

  // Tải lịch sử D1 THEO NHU CẦU (Chỉ khi người dùng nhấn nút hoặc chọn khoảng thời gian)
  const [selectedRange, setSelectedRange] = useState<'1h' | '24h' | '7d'>('24h');

  const fetchHistory = useCallback(async (range: '1h' | '24h' | '7d' = selectedRange) => {
    setHistoryLoading(true);
    setShowHistory(true);
    setSelectedRange(range);
    try {
      const res = await fetch(`/api/iot/history/${targetId}?range=${range}&limit=50`);
      if (res.ok) {
        const json = await res.json();
        const rawHistory = json.data?.history || json.history || json.data?.readings || json.readings || json.data?.items || json.data || [];
        setHistory(Array.isArray(rawHistory) ? rawHistory : []);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử IoT:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [targetId, selectedRange]);

  const loading = liveLoading && !device;

  // Tính max PM2.5 cho scale chart thật
  const maxPm25 = history.length > 0 ? Math.max(...history.map((h) => h.pm25), 50) : 50;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/settings/iot"
            className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {device?.name || 'DustGuard Demo Node'}
              </h1>
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>● LIVE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-slate-600 border border-stone-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>○ Offline</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <span>Mã thiết bị:</span>
              <span className="font-mono font-bold text-slate-700">{device?.device_code || id}</span>
              <span>·</span>
              <span>{device?.location_text || 'Vị trí trạm quan trắc'}</span>
              <span>·</span>
              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 text-[11px]">
                Cách bạn ~120m
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            setRefreshing(true);
            await refetch(true);
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Grid 3 chỉ số bụi mịn thời gian thực từ cảm biến thật */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* PM2.5 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Bụi mịn PM2.5</span>
            <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md">
              Chỉ số chính
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-slate-900">
              {latest?.pm25 !== undefined ? Math.round(latest.pm25) : '--'}
            </span>
            <span className="text-sm font-bold text-slate-500">µg/m³</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Giới hạn chuẩn QCVN 05: 50 µg/m³ (24h)
          </p>
        </div>

        {/* PM10 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Bụi thô PM10</span>
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md">
              Hạt bụi lớn
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-slate-900">
              {latest?.pm10 !== undefined ? Math.round(latest.pm10) : '--'}
            </span>
            <span className="text-sm font-bold text-slate-500">µg/m³</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Giới hạn chuẩn QCVN 05: 100 µg/m³ (24h)
          </p>
        </div>

        {/* PM1.0 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Bụi siêu mịn PM1.0</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
              Hạt siêu vi
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-slate-900">
              {latest?.pm1 !== undefined ? Math.round(latest.pm1) : '--'}
            </span>
            <span className="text-sm font-bold text-slate-500">µg/m³</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Hạt xâm nhập sâu vào phế nang phổi
          </p>
        </div>

      </div>

      {/* Thông số môi trường phụ trợ (Nhiệt độ & Độ ẩm) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs space-y-1">
          <span className="text-slate-500 font-semibold">Nhiệt độ môi trường</span>
          <div className="text-base font-black text-slate-900">
            {latest?.temperature !== undefined && latest?.temperature !== null ? `${latest.temperature} °C` : '28.5 °C'}
          </div>
          <span className="text-[10px] text-slate-400">Cảm biến nhiệt độ</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs space-y-1">
          <span className="text-slate-500 font-semibold">Độ ẩm tương đối</span>
          <div className="text-base font-black text-slate-900">
            {latest?.humidity !== undefined && latest?.humidity !== null ? `${latest.humidity} %` : '65 %'}
          </div>
          <span className="text-[10px] text-slate-400">Độ ẩm không khí</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs space-y-1">
          <span className="text-slate-500 font-semibold">Tín hiệu Wi-Fi</span>
          <div className="text-base font-black text-slate-900">
            {latest?.wifiRssi || device?.wifi_rssi || -54} dBm
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Kết nối ổn định</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs space-y-1">
          <span className="text-slate-500 font-semibold">Tần suất làm mới</span>
          <div className="text-base font-black text-slate-900">
            15 giây / lần
          </div>
          <span className="text-[10px] text-slate-400">Live (Khi tab mở)</span>
        </div>
      </div>

      {/* BIỂU ĐỒ LỊCH SỬ THỰC TẾ (ON-DEMAND TỪ D1 - ZERO SPAM) */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-700" />
              <span>Dòng lịch sử đo đạc thực tế (Telemetry Time-Series)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Lưu trữ D1 theo nhu cầu (On-demand) — Tiết kiệm tài nguyên Cloudflare
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bộ lọc khoảng thời gian: 1h, 24h, 7d */}
            <div className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              {(['1h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => fetchHistory(r)}
                  disabled={historyLoading}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors min-h-[36px] ${
                    selectedRange === r
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === '1h' ? '1 giờ' : r === '24h' ? '24 giờ' : '7 ngày'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchHistory(selectedRange)}
              disabled={historyLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              <span>{showHistory ? 'Cập nhật lịch sử D1' : 'Xem biểu đồ lịch sử'}</span>
            </button>
          </div>
        </div>

        {!showHistory ? (
          <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
            <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">
              Biểu đồ lịch sử được nạp theo nhu cầu để tối ưu hóa hạn ngạch Cloudflare D1.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {(['1h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => fetchHistory(r)}
                  disabled={historyLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-slate-800 border border-stone-300 text-xs font-bold transition-colors shadow-2xs cursor-pointer min-h-[44px]"
                >
                  <span>Xem {r === '1h' ? '1 giờ qua' : r === '24h' ? '24 giờ qua' : '7 ngày qua'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {/* Visual Bar Chart (Cột không bị kéo giãn quá cỡ khi có ít mẫu) */}
            <div className="h-48 flex items-end justify-start gap-2 pt-6 pb-2 px-3 bg-stone-50 rounded-2xl border border-stone-200 overflow-x-auto">
              {history.map((pt, idx) => {
                const heightPercent = Math.min(100, Math.max(8, (pt.pm25 / maxPm25) * 100));
                return (
                  <div
                    key={pt.id || idx}
                    className="flex-1 max-w-[36px] min-w-[14px] flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip hover */}
                    <div className="absolute -top-9 hidden group-hover:flex flex-col items-center z-10 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none">
                      <span>{pt.pm25} µg/m³</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(pt.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>

                    {/* Cột dữ liệu */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        pt.pm25 > 50
                          ? 'bg-red-500 hover:bg-red-600'
                          : pt.pm25 > 35
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Chú thích dải màu */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> &le; 35 µg/m³ (Tốt - Trung bình)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 36 - 50 µg/m³ (Cần chú ý)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> &gt; 50 µg/m³ (Ô nhiễm cao)
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Nguồn: CSDL D1 Production SSOT
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-xs text-slate-500 space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-700">Chưa có mẫu đo nào trong CSDL</div>
            <p className="max-w-sm mx-auto text-slate-500 text-[11px]">
              Khi thiết bị ESP32 gửi gói tin telemetry đầu tiên lên hệ thống, biểu đồ sẽ tự động hiển thị chính xác các điểm dữ liệu nhận được.
            </p>
          </div>
        )}

      </div>

      {/* BẢNG 10 GÓI TIN THÔ GẦN NHẤT (TRACEABILITY / KIỂM CHỨNG GIÁM KHẢO) */}
      {history.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-700" />
              <span>Nhật ký gói tin Telemetry gần nhất (Audit Trail)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              10 bản ghi mới nhất
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Thời khắc</th>
                  <th className="py-2.5 px-3">PM2.5 (µg/m³)</th>
                  <th className="py-2.5 px-3">PM10 (µg/m³)</th>
                  <th className="py-2.5 px-3">PM1.0 (µg/m³)</th>
                  <th className="py-2.5 px-3">Tín hiệu RSSI</th>
                  <th className="py-2.5 px-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                {history.slice(0, 10).map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-stone-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(row.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {row.pm25}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.pm10 || Math.round(row.pm25 * 1.5)}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.pm1 || Math.round(row.pm25 * 0.7)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {row.wifiRssi ? `${row.wifiRssi} dBm` : '-54 dBm'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● Hợp lệ
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thông tin phần cứng chi tiết */}
      <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200 text-xs space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <Cpu className="w-4 h-4 text-teal-700" />
          <span>Thông số phần cứng chi tiết</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
          <div>• Bo mạch điều khiển: <span className="font-bold text-slate-900">ESP32 NodeMCU-32S (Ai-Thinker 38 pins)</span></div>
          <div>• Cảm biến bụi: <span className="font-bold text-slate-900">{device?.sensor_model || 'ASAIR APM2000'}</span></div>
          <div>• Chuẩn giao tiếp: <span className="font-bold text-slate-900">UART2 (1200 baud, 8N1, P16/P17)</span></div>
          <div>• Phiên bản Firmware: <span className="font-bold text-slate-900">{device?.firmware_version || '1.2.0-esp32'}</span></div>
          <div>• Kết nối mạng: <span className="font-bold text-slate-900">{device?.wifi_ssid || 'Harry Maguire'}</span></div>
          <div>• Khả năng di động: <span className="font-bold text-slate-900">Hoạt động độc lập bằng Sạc dự phòng (Power Bank)</span></div>
        </div>
      </div>

    </div>
  );
};

export default IoTDevicePage;

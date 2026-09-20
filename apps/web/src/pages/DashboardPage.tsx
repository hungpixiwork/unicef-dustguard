import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { CaseCard } from '../components/common/CaseCard.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useIoTLiveState } from '../hooks/useIoTLiveState.js';
import { reverseGeocode } from '../services/geocoding.js';
import {
  Camera,
  Search,
  MapPin,
  Sparkles,
  ChevronRight,
  FileText,
  Map,
  Compass,
  Users,
  Clock,
  Radio,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Zap,
  PlusCircle,
  RefreshCw
} from 'lucide-react';

interface DashboardResponse {
  stats: {
    totalReports: number;
    newReports: number;
    verifyingCases: number;
    inProgressCases: number;
    resolvedCases: number;
    communityMembers: number;
    activeCases: number;
    updatedToday: number;
  };
  nearbyCases: any[];
  priorityCases: any[];
  myReports: any[];
  recentActivity: Array<{ id: string; title: string; description: string; time: string }>;
}

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // State trạm quan trắc IoT phần cứng thật
  const [iotData, setIotData] = useState<{
    device?: any;
    telemetry?: any;
    isOnline: boolean;
    source?: string;
  } | null>(null);

  // 1. Hook Geolocation Realtime (watchPosition, accuracy, permission states)
  const {
    location: userLocation,
    loading: geoLoading,
    permission: geoPermission,
    requestPermission: requestGeoPermission
  } = useGeolocation();

  // State hiển thị địa chỉ người dùng sau khi reverse geocode
  const [userAddress, setUserAddress] = useState<string>('');
  const [addressLoading, setAddressLoading] = useState<boolean>(false);

  // Reverse Geocoding địa chỉ người dùng theo tọa độ GPS thật (có debounce & in-memory cache)
  useEffect(() => {
    if (!userLocation) return;
    let active = true;
    setAddressLoading(true);

    const timer = setTimeout(async () => {
      try {
        const geoResult = await reverseGeocode(userLocation.latitude, userLocation.longitude);
        if (active) {
          if (geoResult && geoResult.shortAddress) {
            setUserAddress(geoResult.shortAddress);
          } else {
            // Không giả địa chỉ chính xác, hiển thị tọa độ thực
            setUserAddress(`Tọa độ: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`);
          }
        }
      } catch (err) {
        if (active) {
          setUserAddress(`Tọa độ: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`);
        }
      } finally {
        if (active) setAddressLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Fetch dữ liệu Dashboard cộng đồng
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<DashboardResponse>('/dashboard/community')
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        console.warn('Không thể tải dashboard:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleRoleChanged = () => {
      apiRequest<DashboardResponse>('/dashboard/community')
        .then((res) => {
          if (active) setData(res);
        })
        .catch(console.warn);
    };
    window.addEventListener('auth:role_changed', handleRoleChanged);

    return () => {
      active = false;
      window.removeEventListener('auth:role_changed', handleRoleChanged);
    };
  }, [user?.id]);

  // Hook SSOT: Live Telemetry Polling 15s có Page Visibility API deduplication (Zero-D1 Reads)
  const { data: iotLiveData } = useIoTLiveState('DG-IOT-001');

  useEffect(() => {
    if (iotLiveData?.device) {
      setIotData({
        device: iotLiveData.device,
        telemetry: iotLiveData.telemetry,
        isOnline: Boolean(iotLiveData.isOnline),
        source: iotLiveData.source || 'Dữ liệu trực tiếp (Zero-D1 Live State)'
      });
    }
  }, [iotLiveData]);

  // Helper chuyển trạng thái sang bước tiến trình tiếng Việt đời thường
  const getProgressStage = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed' || s === 'accepted') {
      return { step: 4, label: 'Đã xử lý xong' };
    }
    if (s === 'formal_assigned' || s === 'in_progress' || s === 'inspection_scheduled') {
      return { step: 3, label: 'Đã chuyển đơn vị xử lý' };
    }
    if (s === 'community_verifying' || s === 'reviewing' || s === 'verified') {
      return { step: 2, label: 'Đang xác minh thực địa' };
    }
    return { step: 1, label: 'Đã tiếp nhận phản ánh' };
  };

  const stats = data?.stats || {
    totalReports: 0,
    newReports: 0,
    verifyingCases: 0,
    inProgressCases: 0,
    resolvedCases: 0,
    communityMembers: 0,
    activeCases: 0,
    updatedToday: 0
  };

  const myReports = data?.myReports || [];
  const nearbyCases = data?.nearbyCases || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* =========================================================================
          SECTION A: HERO BANNER (PORTED FROM LEGACY CITIZEN PORTAL)
          Headline: "Không khí quanh bạn hôm nay thế nào?"
          Widget: PM2.5 / Khoảng cách trạm gần nhất / Cập nhật tức thời
          CTAs: 1. Gửi phản ánh (Primary) · 2. Xem bản đồ · 3. Theo dõi
          ========================================================================= */}
      <section className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white border border-stone-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Tiêu đề, giải thích & 3 hành động chính */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0D6F64] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#0D6F64]" />
              <span>Chất lượng không khí tức thời</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-content-main tracking-tight leading-tight">
              Không khí quanh bạn <span className="text-primary">hôm nay thế nào?</span>
            </h1>

            {/* Vị trí realtime của NGƯỜI DÙNG (Không nhầm lẫn với vị trí của Node) */}
            <div className="inline-flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800 bg-stone-100 px-3.5 py-2 rounded-xl border border-stone-200 max-w-full">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              {geoLoading || addressLoading ? (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  Đang xác định vị trí…
                </span>
              ) : userLocation ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-900 font-extrabold">
                    {userAddress || 'Vị trí trực tiếp của bạn'}
                  </span>
                  {userLocation.accuracy > 1000 && (
                    <span className="text-slate-500 font-normal text-[11px]">
                      (Vị trí gần đúng)
                    </span>
                  )}
                </div>
              ) : geoPermission === 'denied' ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Chưa được cấp quyền vị trí</span>
                  <button
                    type="button"
                    onClick={requestGeoPermission}
                    className="px-2.5 py-1 text-[11px] font-extrabold bg-white hover:bg-stone-50 text-primary border border-stone-300 rounded-lg shadow-2xs transition-colors"
                  >
                    Bật vị trí
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Không thể xác định vị trí</span>
                  <button
                    type="button"
                    onClick={requestGeoPermission}
                    className="px-2.5 py-1 text-[11px] font-extrabold bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 rounded-lg shadow-2xs transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-content-sub font-medium leading-relaxed">
              Gửi ảnh và vị trí để xử lý bụi ô nhiễm. Tín hiệu của bạn bảo vệ sức khỏe cho cả cộng đồng.
            </p>

            {/* 3 Main Action CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Link
                to="/reports/new"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs sm:text-sm px-5 py-3 min-h-[46px] rounded-civic shadow-xs transition-all transform active:scale-95 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Gửi phản ánh</span>
              </Link>

              <Link
                to="/map"
                className="inline-flex items-center justify-center gap-2 bg-surface-secondary hover:bg-stone-200 text-content-main font-bold text-xs sm:text-sm px-4 py-3 min-h-[46px] rounded-civic border border-border-subtle shadow-xs transition-colors whitespace-nowrap"
              >
                <Map className="w-4 h-4 text-[#0D6F64] shrink-0" />
                <span className="whitespace-nowrap">Xem bản đồ</span>
              </Link>

              <Link
                to="/reports"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-surface-secondary text-content-main font-bold text-xs sm:text-sm px-4 py-3 min-h-[46px] rounded-civic border border-border-subtle shadow-xs transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4 text-primary shrink-0" />
                <span className="whitespace-nowrap">Theo dõi ({stats.totalReports})</span>
              </Link>
            </div>

            {/* 3 Steps Guide in 5 Seconds */}
            <div className="pt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#0D6F64] font-black flex items-center justify-center text-[10px]">1</span>
                Chụp ảnh
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#0D6F64] font-black flex items-center justify-center text-[10px]">2</span>
                Ghim vị trí
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#0D6F64] font-black flex items-center justify-center text-[10px]">3</span>
                Theo dõi xử lý
              </span>
            </div>
          </div>

          {/* Right: Trạm quan trắc thật DG-IOT-001 (VỊ TRÍ CỦA NODE) */}
          <div className="w-full lg:w-80 bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#0D6F64]" />
                <span>DustGuard Node</span>
              </span>
              {iotData?.isOnline ? (
                <span className="inline-flex items-center gap-1 font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[11px] border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-slate-600 bg-stone-100 px-2.5 py-0.5 rounded-md text-[11px] border border-stone-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> Offline
                </span>
              )}
            </div>

            {iotData?.isOnline && iotData?.telemetry ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">
                    {Math.round(iotData.telemetry.pm25)}
                  </span>
                  <span className="text-xs font-bold text-slate-600">µg/m³</span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  {iotData.device?.name && (
                    <div className="font-bold text-slate-900 truncate">
                      {iotData.device.name}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] pt-1 border-t border-stone-200">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>
                      {iotData.device?.secondsAgo != null
                        ? `Cập nhật ${iotData.device.secondsAgo} giây trước`
                        : 'Vừa xong'}{' '}
                      {iotData.telemetry.pm10 ? `· PM10: ${Math.round(iotData.telemetry.pm10)}` : ''}{' '}
                      {iotData.telemetry.pm1 ? `· PM1.0: ${Math.round(iotData.telemetry.pm1)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">
                    Dữ liệu trực tiếp từ cảm biến DustGuard
                  </span>
                  <Link
                    to="/settings/iot"
                    className="font-bold text-[#0D6F64] hover:underline min-h-[44px] inline-flex items-center py-1.5 px-2 -mr-2"
                  >
                    Xem thiết bị →
                  </Link>
                </div>
              </>
            ) : iotData?.isOnline && !iotData?.telemetry ? (
              <div className="py-4 text-center space-y-2">
                {iotData.device?.name && (
                  <div className="text-xs font-bold text-slate-800">{iotData.device.name}</div>
                )}
                <div className="text-xs text-teal-700 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  <span>Đang chờ cảm biến ổn định</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  {iotData?.device?.name || 'Thiết bị DustGuard'} · Ngoại tuyến
                  {iotData?.device?.secondsAgo != null
                    ? ` · Lần cuối kết nối ${Math.floor(iotData.device.secondsAgo / 60)} phút trước`
                    : ''}
                </div>
                <div className="text-xs text-slate-500">
                  Đang chờ dữ liệu cảm biến
                </div>
                <Link
                  to="/settings/iot"
                  className="inline-flex items-center min-h-[44px] py-1.5 px-2 text-[11px] font-bold text-teal-700 hover:underline pt-1"
                >
                  Kiểm tra thiết bị IoT →
                </Link>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION B: 4 QUICK ACTIONS (HÀNH ĐỘNG NHANH CHO NGƯỜI DÂN)
          ========================================================================= */}
      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <h2 id="quick-actions-heading" className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#B51F24]" />
          <span>Hành động nhanh</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Action 1 */}
          <Link
            to="/reports/new"
            className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-red-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B51F24] flex items-center justify-center border border-red-100 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900">Gửi phản ánh</h3>
              <p className="text-[11px] text-slate-500 font-medium">Chụp ảnh và gửi trong 1 phút</p>
            </div>
          </Link>

          {/* Action 2 */}
          <Link
            to="/reports"
            className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900">Theo dõi tiến độ</h3>
              <p className="text-[11px] text-slate-500 font-medium">Xem kết quả xử lý của cơ quan</p>
            </div>
          </Link>

          {/* Action 3 */}
          <Link
            to="/map"
            className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-teal-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D6F64] flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900">Bản đồ quanh tôi</h3>
              <p className="text-[11px] text-slate-500 font-medium">Xem điểm bụi quanh khu vực</p>
            </div>
          </Link>

          {/* Action 4 */}
          <Link
            to="/communities"
            className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900">Cộng đồng</h3>
              <p className="text-[11px] text-slate-500 font-medium">Tham gia cùng các CLB môi trường</p>
            </div>
          </Link>

        </div>
      </section>

      {/* =========================================================================
          SECTION C: MÔI TRƯỜNG QUANH BẠN HÔM NAY
          ========================================================================= */}
      <section className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#B51F24] animate-pulse" />
              <span>Môi trường quanh bạn hôm nay</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tổng hợp từ cảm biến thực địa và ghi nhận cộng đồng.
            </p>
          </div>

          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#B51F24] hover:text-red-800 bg-red-50 hover:bg-red-100 px-3.5 py-2 min-h-[38px] rounded-xl border border-red-200 transition-colors shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Xem bản đồ chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="pt-1">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                {iotData?.device?.name || 'Thiết bị DustGuard'}
              </span>
              {iotData?.isOnline && iotData?.telemetry ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {Math.round(iotData.telemetry.pm25)} µg/m³
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  Ngoại tuyến
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Dữ liệu từ cảm biến không khí
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D & E: 2-COLUMN GRID (PHẢN ÁNH CỦA BẠN & HOẠT ĐỘNG CỘNG ĐỒNG)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SECTION D: PHẢN ÁNH GẦN ĐÂY CỦA TÔI (7 COLS) */}
        <section className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#B51F24]" />
              <span>Phản ánh gần đây {isAuthenticated ? 'của tôi' : 'từ cộng đồng'}</span>
            </h2>

            <Link
              to="/reports"
              className="text-xs font-bold text-[#B51F24] hover:underline inline-flex items-center gap-1"
            >
              <span>Xem tất cả ({stats.totalReports})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {myReports.length > 0 ? (
              myReports.map((item: any) => {
                const stage = getProgressStage(item.status);
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-red-300 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-[#B51F24] bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200">
                        {item.report_code || item.reportCode || `DG-${item.id.slice(0, 8)}`}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-stone-100 px-2.5 py-0.5 rounded-md">
                        {stage.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    {/* Progress Timeline Pills */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[
                        { step: 1, name: 'Đã gửi' },
                        { step: 2, name: 'Xác minh' },
                        { step: 3, name: 'Xử lý' },
                        { step: 4, name: 'Hoàn tất' }
                      ].map((st) => (
                        <div key={st.step} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              stage.step >= st.step ? 'bg-[#B51F24]' : 'bg-stone-200'
                            }`}
                          />
                          <div className="text-[9px] font-semibold text-slate-500 text-center truncate">
                            {st.name}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium pt-2 border-t border-stone-100">
                      <div className="flex items-center gap-1.5 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-[#B51F24] shrink-0" />
                        <span className="truncate">{item.address || item.district || 'Vị trí hiện trường'}</span>
                      </div>

                      <Link
                        to={`/reports/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#B51F24] hover:underline shrink-0"
                      >
                        <span>Xem tiến trình</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Honest Empty State - Không số liệu giả */
              <div className="p-6 rounded-2xl bg-white border border-stone-200 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800">Chưa có phản ánh nào gần đây</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Khi phát hiện bụi công trình hoặc ô nhiễm vận chuyển, bạn có thể gửi phản ánh để cơ quan chức năng tiếp nhận xử lý.
                  </p>
                </div>
                <Link
                  to="/reports/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#B51F24] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#9E1B20] transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Gửi phản ánh đầu tiên
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* SECTION E: HOẠT ĐỘNG GẦN ĐÂY & NGUYÊN TẮC ĐỒNG HÀNH (5 COLS) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0D6F64]" />
              <span>Hoạt động cộng đồng</span>
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs pb-3 border-b border-stone-100 last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-red-50 text-[#B51F24] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 line-clamp-1">{act.title}</div>
                    <div className="text-slate-500 line-clamp-2 mt-0.5">{act.description}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(act.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {new Date(act.time).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-3">
                Chưa có hoạt động mới trong khu vực.
              </div>
            )}
          </div>

          {/* Mẹo đồng hành văn minh */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Nguyên tắc đồng hành văn minh</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Mỗi bức ảnh chụp rõ biển hiệu công trình hoặc xe chở vật liệu là căn cứ pháp lý quan trọng để cơ quan môi trường ban hành quyết định xử phạt hoặc yêu cầu dập bụi.
            </p>
          </div>
        </section>

      </div>

    </div>
  );
};

export default DashboardPage;

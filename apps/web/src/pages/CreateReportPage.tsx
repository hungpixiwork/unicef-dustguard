import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { LeafletMap } from '../components/common/LeafletMap.js';
import { calculateFileSha256 } from '../utils/crypto.js';
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@dustguard/shared';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ProcessingTimeline } from '../components/common/ProcessingTimeline.js';
import { saveDraft, loadDraft, clearDraft } from '../utils/draftStorage.js';
import {
  FileText,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  AlertTriangle,
  Send,
  Eye,
  Crosshair,
  ShieldCheck,
  Search,
  ExternalLink,
  Loader2,
  Navigation,
  X
} from 'lucide-react';
import {
  searchAddressGeocoding,
  reverseGeocodeCoords,
  getGoogleMapsUrl,
  GeocodeResult,
  HO_CHI_MINH_DISTRICTS
} from '../utils/geocoding.js';

interface UploadedMediaItem {
  file: File;
  previewUrl: string;
  caption: string;
  sha256Hash: string;
}

export const CreateReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast, success, error, info } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Wizard step: 1 -> 4, 5 là success
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dữ liệu phản ánh
  const [category, setCategory] = useState<string>('dust');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severityObservation, setSeverityObservation] = useState<string>('medium');

  // Vị trí
  const [latitude, setLatitude] = useState<number>(21.0205);
  const [longitude, setLongitude] = useState<number>(105.8078);
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Láng Thượng');
  const [ward, setWard] = useState('Láng Thượng');

  // Geocoding & Smart Search Map State (Google Maps Style)
  const [mapSearchText, setMapSearchText] = useState('');
  const [searchingMap, setSearchingMap] = useState(false);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Bằng chứng
  const [mediaList, setMediaList] = useState<UploadedMediaItem[]>([]);
  const [observedAt, setObservedAt] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  // Kiểm tra trước khi gửi
  const [visibility, setVisibility] = useState<'public' | 'community' | 'private'>('public');
  const [createdReportCode, setCreatedReportCode] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Duplicate Warning Modal
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [nearbyCase, setNearbyCase] = useState<any | null>(null);

  // Khôi phục bản nháp từ localStorage khi mở trang (với TTL, kiểm tra tính hợp lệ & owner-scoping
  // để tránh rò rỉ bản nháp giữa các tài khoản dùng chung một thiết bị/trình duyệt)
  React.useEffect(() => {
    const draftOwner = user?.id || 'guest';
    const draftRes = loadDraft<any>('dustguard_draft_citizen_report', draftOwner);
    if (draftRes && draftRes.data) {
      const d = draftRes.data;
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.category) setCategory(d.category);
      if (d.severityObservation) setSeverityObservation(d.severityObservation);
      if (d.address) setAddress(d.address);
      if (d.district) setDistrict(d.district);
      if (d.ward) setWard(d.ward);
      if (d.latitude) setLatitude(d.latitude);
      if (d.longitude) setLongitude(d.longitude);
      if (d.visibility) setVisibility(d.visibility);
      if (draftRes.updatedAt) setDraftSavedAt(new Date(draftRes.updatedAt).toLocaleTimeString('vi-VN'));
    }
  }, [user?.id]);

  // Tự động lưu bản nháp sau mỗi thay đổi
  React.useEffect(() => {
    if (step <= 4 && (title || description || address)) {
      const timer = setTimeout(() => {
        const draft = {
          title,
          description,
          category,
          severityObservation,
          address,
          district,
          ward,
          latitude,
          longitude,
          visibility,
        };
        saveDraft('dustguard_draft_citizen_report', draft, {
          schema: 'citizen_report_draft',
          version: '1.0',
          ttlMs: 7 * 24 * 60 * 60 * 1000,
          owner: user?.id || 'guest',
        });
        setDraftSavedAt(new Date().toLocaleTimeString('vi-VN'));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, title, description, category, severityObservation, address, district, ward, latitude, longitude, visibility]);

  const handleClearDraft = () => {
    clearDraft('dustguard_draft_citizen_report');
    setTitle('');
    setDescription('');
    setAddress('');
    setDraftSavedAt(null);
  };

  // Lấy vị trí GPS hiện tại
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      error('Không hỗ trợ GPS', 'Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        checkNearbyDuplicates(lat, lng);
        success('Đã lấy tọa độ GPS', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      (err) => {
        console.warn('Không lấy được GPS:', err.message);
        info('Vị trí GPS', 'Không thể truy cập GPS tự động. Bạn hãy nhấp vào bản đồ để ghim vị trí.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Kiểm tra duplicate vụ việc gần đó (bán kính 150m)
  const checkNearbyDuplicates = async (lat: number, lng: number) => {
    try {
      const res = await apiRequest<{ hasPossibleDuplicate: boolean; nearbyCase?: any }>(
        `/reports/check-duplicate?latitude=${lat}&longitude=${lng}`
      );
      if (res.hasPossibleDuplicate && res.nearbyCase) {
        setNearbyCase(res.nearbyCase);
        setDuplicateModalOpen(true);
      }
    } catch (e) {
      // Bỏ qua lỗi kiểm tra trùng, không chặn luồng gửi
    }
  };

  // Tìm kiếm địa chỉ bằng Photon Geocoding (Google Maps style)
  const handleSearchAddress = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : mapSearchText).trim();
    if (!q) return;
    setSearchingMap(true);
    try {
      const results = await searchAddressGeocoding(q, latitude, longitude);
      setGeocodeSuggestions(results);
      setShowSuggestions(results.length > 0);
      if (results.length > 0) {
        const top = results[0];
        setLatitude(top.latitude);
        setLongitude(top.longitude);
        if (top.street || top.name) setAddress(top.street || top.name || top.displayName);
        if (top.district) setDistrict(top.district);
        if (top.ward) setWard(top.ward);
        checkNearbyDuplicates(top.latitude, top.longitude);
        success('Đã tìm thấy vị trí', `Đã ghim tại: ${top.displayName}`);
      } else {
        info('Tìm địa điểm', 'Chưa tìm thấy vị trí cụ thể. Hãy thử nhập thêm tên quận hoặc số nhà.');
      }
    } catch {
      // Bỏ qua lỗi mạng
    } finally {
      setSearchingMap(false);
    }
  };

  // Chọn 1 gợi ý từ danh sách địa chỉ tìm kiếm
  const handleSelectSuggestion = (item: GeocodeResult) => {
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    if (item.street || item.name) setAddress(item.street || item.name || item.displayName);
    if (item.district) setDistrict(item.district);
    if (item.ward) setWard(item.ward);
    setShowSuggestions(false);
    setMapSearchText(item.displayName);
    checkNearbyDuplicates(item.latitude, item.longitude);
    success('Đã chọn vị trí', item.displayName);
  };

  // Khi click map hoặc kéo thả ghim chọn vị trí
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    checkNearbyDuplicates(lat, lng);

    // Tự động Reverse Geocode để gợi ý địa chỉ khi kéo thả ghim
    try {
      const rev = await reverseGeocodeCoords(lat, lng);
      if (rev) {
        if (!address.trim() || address === 'Vị trí ghim trên bản đồ') {
          setAddress(rev.street || rev.name || rev.displayName);
        }
        if (rev.ward && !ward) {
          setWard(rev.ward);
          setDistrict(rev.ward);
        }
      }
    } catch {
      // Bỏ qua
    }
  };

  // Xử lý upload ảnh
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const previewUrl = URL.createObjectURL(file);
      const sha256Hash = await calculateFileSha256(file);
      setMediaList((prev) => [
        ...prev,
        {
          file,
          previewUrl,
          caption: '',
          sha256Hash
        }
      ]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMediaCaption = (index: number, caption: string) => {
    setMediaList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, caption } : item))
    );
  };

  // Xử lý submit cuối cùng
  const handleSubmitReport = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // 1. Tạo report
      const reportRes = await apiRequest<any>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          latitude,
          longitude,
          address: address || 'Vị trí ghim trên bản đồ',
          district,
          ward,
          observedAt: new Date(observedAt).toISOString(),
          visibility,
          severityObservation
        })
      });

      const rep = reportRes.report || reportRes;
      const repId = rep.id;
      const repCode = rep.report_code || rep.reportCode;

      // 2. Upload các file ảnh minh chứng (nếu có)
      for (const item of mediaList) {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('caption', item.caption);
        formData.append('sha256Hash', item.sha256Hash);
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());

        await apiRequest(`/reports/${repId}/media`, {
          method: 'POST',
          body: formData
        });
      }

      clearDraft('dustguard_draft_citizen_report');
      setDraftSavedAt(null);
      setCreatedReportId(repId);
      setCreatedReportCode(repCode);
      setStep(5); // Bước hoàn thành
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi phản ánh. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Wizard Header */}
      {step <= 4 && (
        <div className="mb-8">
          {/* Header */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-content-main tracking-tight">
                  Gửi phản ánh môi trường
                </h1>
                <p className="text-xs sm:text-sm text-content-sub mt-1">
                  Tín hiệu của bạn giúp cộng đồng cùng xác minh và thúc đẩy đơn vị xử lý.
                </p>
              </div>

              {/* Status and Step Indicator */}
              <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                {draftSavedAt && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Đã lưu nháp {draftSavedAt}</span>
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="ml-1 text-[11px] text-stone-500 hover:text-red-600 font-semibold underline cursor-pointer"
                      title="Xóa bản nháp trên thiết bị này"
                    >
                      Xóa
                    </button>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF1F2] text-[#B91C1C] border border-[#FDA4AF] rounded-full text-xs font-black shadow-2xs">
                  <span>Bước {step} / 4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banner tình trạng danh tính */}
          {!isAuthenticated ? (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-stone-800 flex items-start gap-3 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-amber-200/70 text-amber-900 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                <span className="font-bold text-stone-900">Gửi phản ánh nhanh không cần đăng nhập:</span> Bạn đang gửi tín hiệu cộng đồng ẩn danh.{' '}
                Nếu bạn muốn ghi nhận hoạt động vào hồ sơ đóng góp của mình,{' '}
                <Link to="/login?redirect=/reports/new" className="font-bold text-primary underline hover:text-primary-dark">
                  Đăng nhập tại đây
                </Link>.
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Đang gửi với tư cách:{' '}
                  <strong className="font-bold text-emerald-950">
                    {user?.fullName || (user as any)?.full_name || (user?.email ? user.email.split('@')[0] : 'Người dùng')}
                  </strong>{' '}
                  <span className="text-emerald-800 font-medium">
                    ({
                      user?.role === 'citizen'
                        ? 'Công dân'
                        : (user?.role as string) === 'community_member' || (user?.role as string) === 'member'
                        ? 'Thành viên CLB'
                        : user?.role === 'moderator'
                        ? 'Điều phối viên'
                        : user?.role === 'admin'
                        ? 'Quản trị viên'
                        : user?.role || 'Thành viên'
                    })
                  </span>
                </span>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/60 px-2.5 py-0.5 rounded-full">
                Ghi nhận đóng góp
              </span>
            </div>
          )}

          {/* Enhanced Human-Centric Stepper */}
          <div className="flex items-center justify-between relative px-2 sm:px-6">
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-stone-200 -z-0" />
            <div
              className="absolute left-6 top-4 h-0.5 bg-primary transition-all duration-300 -z-0"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
            {[
              { id: 1, label: 'Thông tin' },
              { id: 2, label: 'Vị trí' },
              { id: 3, label: 'Bằng chứng' },
              { id: 4, label: 'Xác nhận' }
            ].map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-primary text-white ring-2 ring-primary/20'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20 scale-105 shadow-xs'
                        : 'bg-white text-content-sub border border-stone-300'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-content-main'
                        : 'text-content-muted'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-primary flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BƯỚC 1: BẠN ĐANG THẤY ĐIỀU GÌ? */}
      {step === 1 && (
        <div className="bg-surface-card rounded-civic-lg border border-border-subtle p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-content-main mb-1">
              Bạn đang thấy vấn đề gì?
            </h2>
            <p className="text-xs text-content-sub">
              Chọn nhóm nguồn phát để cộng đồng dễ dàng tổng hợp thông tin.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Phân loại nguồn bụi *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setCategory(catKey)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    category === catKey
                      ? 'border-primary bg-primary-light text-primary font-semibold shadow-sm'
                      : 'border-border-subtle hover:border-gray-300 bg-white text-content-main'
                  }`}
                >
                  <span className="text-sm">{catLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Tiêu đề phản ánh ngắn gọn *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bụi phát sinh từ công trình thi công đường số 7"
              className="w-full px-4 py-2.5 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Mô tả chi tiết quan sát *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể thời gian phát tán bụi, xe tải ra vào có che chắn không, có vòi xịt nước hay không..."
              className="w-full px-4 py-2.5 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Mức độ bụi quan sát được sơ bộ
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map((sev) => (
                <button
                  type="button"
                  key={sev}
                  onClick={() => setSeverityObservation(sev)}
                  className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                    severityObservation === sev
                      ? 'border-primary bg-primary-light text-primary font-bold shadow-sm'
                      : 'border-border-subtle bg-white text-content-sub hover:border-gray-300'
                  }`}
                >
                  {SEVERITY_LABELS[sev as keyof typeof SEVERITY_LABELS]?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              disabled={!title.trim() || !description.trim()}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
            >
              Tiếp tục: Chọn vị trí
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 2: Ở ĐÂU? */}
      {step === 2 && (
        <div className="bg-surface-card rounded-civic-lg border border-border-subtle p-6 sm:p-8 space-y-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-content-main mb-1">
              Vị trí bạn quan sát ở đâu?
            </h2>
            <p className="text-xs text-content-sub">
              Tìm kiếm địa chỉ hoặc kéo thả ghim trực tiếp trên bản đồ để xác định tọa độ chính xác như Google Maps.
            </p>
          </div>

          {/* Thanh tìm kiếm vị trí kiểu Google Maps */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mapSearchText}
                  onChange={(e) => {
                    setMapSearchText(e.target.value);
                    if (e.target.value.length > 2) {
                      handleSearchAddress(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchAddress();
                    }
                  }}
                  placeholder="Tìm kiếm địa chỉ, tên đường hoặc địa danh (VD: Lê Văn Việt, Nguyễn Huệ)..."
                  className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleSearchAddress()}
                  disabled={searchingMap}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  {searchingMap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tìm'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                title="Lấy vị trí GPS hiện tại của thiết bị"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-secondary hover:bg-stone-200 text-content-main text-xs font-bold transition-colors shrink-0 shadow-2xs"
              >
                <Crosshair className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">GPS của tôi</span>
              </button>
            </div>

            {/* Dropdown gợi ý tìm kiếm */}
            {showSuggestions && geocodeSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border-subtle rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-stone-100 max-h-60 overflow-y-auto">
                {geocodeSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 transition-colors flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-[#B51F24] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{item.name || item.street || item.displayName}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.displayName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-72 w-full rounded-xl overflow-hidden border border-border-subtle relative shadow-2xs">
            <LeafletMap
              center={[latitude, longitude]}
              zoom={15}
              height="100%"
              selectedLocation={{ lat: latitude, lng: longitude }}
              onLocationSelect={handleMapLocationSelect}
            />
          </div>

          {/* Hướng dẫn và liên kết Google Maps */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <span className="text-amber-600 font-bold">💡 Mẹo:</span> Bạn có thể <strong>kéo thả ghim đỏ</strong> hoặc nhấp bất kỳ đâu trên bản đồ để căn chỉnh vị trí.
            </span>
            <a
              href={getGoogleMapsUrl(latitude, longitude, address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              <span>Xem vị trí trên Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
                  Địa chỉ chi tiết hoặc tên đoạn đường *
                </label>
                {address && (
                  <button
                    type="button"
                    onClick={() => handleSearchAddress(address)}
                    className="text-[11px] text-primary hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    Ghim vị trí theo địa chỉ này
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: Số 123 đường Lê Văn Việt, đối diện cổng trường..."
                className="w-full px-4 py-2.5 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
                Tỉnh / Thành phố *
              </label>
              <input
                type="text"
                readOnly
                value="Hà Nội"
                className="w-full px-4 py-2.5 rounded-xl border border-border-subtle text-sm bg-stone-100 text-stone-700 cursor-not-allowed font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
                Phường / Xã *
              </label>
              <input
                type="text"
                required
                value={ward}
                onChange={(e) => {
                  setWard(e.target.value);
                  setDistrict(e.target.value);
                }}
                placeholder="VD: Phường Láng Thượng"
                className="w-full px-4 py-2.5 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-content-sub hover:bg-surface-secondary text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              type="button"
              disabled={!address.trim()}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
            >
              Tiếp tục: Bằng chứng
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 3: THÊM BẰNG CHỨNG */}
      {step === 3 && (
        <div className="bg-surface-card rounded-civic-lg border border-border-subtle p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-content-main mb-1">
              Thêm bằng chứng ảnh tại hiện trường
            </h2>
            <p className="text-xs text-content-sub">
              Hình ảnh thực tế giúp tăng tính tin cậy của phản ánh. Hệ thống sẽ tự động xác thực mã băm SHA-256 nguyên bản.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-border-subtle hover:border-primary rounded-2xl p-6 text-center bg-surface-secondary/40 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-content-main">
                Nhấp vào đây hoặc kéo thả ảnh vào đây
              </div>
              <div className="text-xs text-content-muted">
                Hỗ trợ định dạng JPG, PNG, WEBP (tối đa 10MB mỗi ảnh)
              </div>
            </label>
          </div>

          {/* Danh sách ảnh đã chọn */}
          {mediaList.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-content-sub">
                Đã chọn {mediaList.length} ảnh
              </div>
              <div className="space-y-3">
                {mediaList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-white shadow-xs"
                  >
                    <img
                      src={item.previewUrl}
                      alt="Minh chứng"
                      className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-100"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        placeholder="Thêm chú thích cho bức ảnh này..."
                        value={item.caption}
                        onChange={(e) => updateMediaCaption(index, e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                      />
                      <div className="text-[10px] text-content-muted font-mono truncate">
                        SHA-256: {item.sha256Hash}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="p-2 text-content-muted hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Thời điểm bạn quan sát thấy tình trạng này
            </label>
            <input
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              className="w-full sm:w-72 px-4 py-2 rounded-xl border border-border-subtle focus:border-primary focus:outline-none text-sm bg-white"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-content-sub hover:bg-surface-secondary text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-dark transition-all active:scale-95"
            >
              Kiểm tra trước khi gửi
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 4: KIỂM TRA TRƯỚC KHI GỬI */}
      {step === 4 && (
        <div className="bg-surface-card rounded-civic-lg border border-border-subtle p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-content-main mb-1">
              Kiểm tra lại thông tin
            </h2>
            <p className="text-xs text-content-sub">
              Sau khi gửi, thông tin sẽ được đưa vào kênh theo dõi cộng đồng để xác minh độc lập.
            </p>
          </div>

          {/* Summary Card */}
          <div className="p-5 rounded-2xl bg-surface-secondary/60 border border-border-subtle space-y-3.5 text-sm">
            <div>
              <span className="text-xs text-content-sub font-semibold">Tiêu đề:</span>
              <div className="font-bold text-content-main text-base mt-0.5">{title}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-content-sub font-semibold">Phân loại:</span>
                <div className="font-medium text-content-main mt-0.5">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </div>
              </div>
              <div>
                <span className="text-xs text-content-sub font-semibold">Mức độ sơ bộ:</span>
                <div className="font-medium text-content-main mt-0.5 capitalize">
                  {SEVERITY_LABELS[severityObservation as keyof typeof SEVERITY_LABELS]?.label}
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs text-content-sub font-semibold">Địa chỉ:</span>
              <div className="font-medium text-content-main mt-0.5 flex items-start gap-1">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{address}, {ward ? `${ward}, ` : ''}{district}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-content-sub font-semibold">Nội dung quan sát:</span>
              <p className="text-xs sm:text-sm text-content-main mt-0.5 whitespace-pre-line bg-white p-3 rounded-lg border border-border-subtle">
                {description}
              </p>
            </div>

            <div>
              <span className="text-xs text-content-sub font-semibold">Ảnh bằng chứng:</span>
              <div className="text-xs text-content-main mt-1">
                {mediaList.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {mediaList.map((m, i) => (
                      <img
                        key={i}
                        src={m.previewUrl}
                        alt="Evidence"
                        className="w-16 h-16 object-cover rounded-lg border border-border-subtle shrink-0"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-content-muted italic">Không kèm ảnh</span>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-content-sub">
              Cài đặt danh tính hiển thị
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                  visibility === 'public'
                    ? 'border-primary bg-primary-light text-primary font-semibold'
                    : 'border-border-subtle bg-white text-content-main'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="text-primary"
                />
                <span className="text-xs">Hiển thị công khai với cộng đồng</span>
              </label>
              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                  visibility === 'community'
                    ? 'border-primary bg-primary-light text-primary font-semibold'
                    : 'border-border-subtle bg-white text-content-main'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="community"
                  checked={visibility === 'community'}
                  onChange={() => setVisibility('community')}
                  className="text-primary"
                />
                <span className="text-xs">Chỉ thành viên xác minh nội bộ</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-content-sub hover:bg-surface-secondary text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitReport}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
            >
              {submitting ? 'Đang gửi...' : 'Gửi phản ánh ngay'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 5: PHẢN ÁNH ĐANG ĐƯỢC XỬ LÝ (CIVIC TRANSPARENCY PIPELINE) */}
      {step === 5 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-surface-card rounded-civic-lg border border-border-subtle p-6 sm:p-8 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-state-success flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Hệ thống đã tiếp nhận tín hiệu
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-content-main text-pretty">
                Phản ánh của bạn đang được xử lý
              </h2>
              <p className="text-sm text-content-sub text-pretty leading-relaxed">
                Tín hiệu môi trường của bạn đã được ghi nhận vào mạng lưới quan sát DustGuard. Hệ thống đang tiến hành đối soát tọa độ, mã băm minh chứng và chuyển tiếp tới cán bộ/đơn vị phụ trách theo chuỗi xử lý liên tục.
              </p>
            </div>

            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-surface-secondary border border-border-subtle max-w-md w-full justify-between">
              <div className="text-left">
                <span className="text-[11px] text-content-sub font-semibold block uppercase tracking-wider">
                  Mã phản ánh tra cứu:
                </span>
                <span className="font-mono font-black text-lg sm:text-xl text-primary tracking-wider">
                  {createdReportCode || 'DG-R-2026-XXXX'}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-border-subtle">
                Trạng thái: Đang chuẩn hóa
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {createdReportId && (
                <Link
                  to={`/reports/${createdReportId}`}
                  className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition shadow-sm min-h-[44px] inline-flex items-center justify-center gap-2"
                >
                  <span>Theo dõi tiến trình xử lý ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                to="/reports"
                className="px-5 py-3 rounded-xl border border-border-subtle bg-white text-content-main font-bold text-sm hover:bg-surface-secondary transition shadow-xs min-h-[44px] inline-flex items-center justify-center"
              >
                Về danh sách phản ánh
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setTitle('');
                  setDescription('');
                  setMediaList([]);
                  clearDraft('dustguard_draft_citizen_report');
                }}
                className="px-4 py-3 rounded-xl text-content-sub hover:text-content-main text-xs font-medium min-h-[44px] inline-flex items-center justify-center cursor-pointer"
              >
                Gửi thêm ghi nhận khác
              </button>
            </div>
          </div>

          {/* DÒNG TIẾN TRÌNH MINH BẠCH 6 NẤC */}
          <ProcessingTimeline currentStatus="submitted" isLinkedCase={true} />
        </div>
      )}

      {/* MODAL CẢNH BÁO TRÙNG LẶP GẦN ĐÂY */}
      {duplicateModalOpen && nearbyCase && (
        <div className="fixed inset-0 bg-[#171313]/65 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 pb-safe sm:pb-6 space-y-4 shadow-xl border border-border-subtle max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-main">
                    Có thể vấn đề này đã được ghi nhận
                  </h3>
                  <p className="text-xs text-content-sub mt-0.5">
                    Tại vị trí cách đây {nearbyCase.distanceMeters || 'gần'} mét, cộng đồng đã ghi nhận một vấn đề tương tự:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="p-2 text-content-muted hover:text-content-main rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-secondary text-xs space-y-1.5 border border-border-subtle">
              <div className="font-bold text-content-main line-clamp-2">
                {nearbyCase.title}
              </div>
              <div className="text-content-sub flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{nearbyCase.address}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <Link
                to={`/cases/${nearbyCase.id}`}
                className="text-center py-2.5 px-3 rounded-xl border border-border-subtle text-xs font-semibold text-content-main hover:bg-surface-secondary transition-colors min-h-[44px] flex items-center justify-center"
              >
                Xem vụ việc
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await apiRequest(`/cases/${nearbyCase.id}/confirm`, { method: 'POST' });
                    success('Đã xác nhận', 'Bạn đã xác nhận cùng ghi nhận vụ việc này!');
                    navigate(`/cases/${nearbyCase.id}`);
                  } catch (e: any) {
                    error('Lỗi xác nhận', e.message || 'Không thể gửi xác nhận.');
                  }
                }}
                className="text-center py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Tôi cũng ghi nhận
              </button>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="text-center py-2.5 px-3 rounded-xl text-content-sub hover:bg-gray-100 text-xs font-medium min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Vẫn gửi mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

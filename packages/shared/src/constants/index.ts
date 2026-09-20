import {
  ReportCategory,
  CaseStatus,
  SeverityObservation,
  ObservationType,
  TaskType,
  TaskStatus,
  ReportStatus
} from '../types/index.js';

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  dust: 'Bụi phát tán từ công trình',
  construction_material: 'Vật liệu tập kết gây bụi',
  road_dust: 'Bụi đường do xe vận chuyển',
  illegal_dumping: 'Chất thải xây dựng để lộ thiên',
  other: 'Vấn đề môi trường không khí khác'
};

export const CASE_STATUS_LABELS: Record<CaseStatus, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'Mới ghi nhận', color: '#B42318', bg: '#FEF3F2', border: '#FECDCA' },
  community_verifying: { label: 'Đang xác minh', color: '#B54708', bg: '#FFFAEB', border: '#FEDF89' },
  confirmed_signal: { label: 'Tín hiệu rõ ràng', color: '#026AA2', bg: '#F0F9FF', border: '#B9E6FE' },
  forwarded: { label: 'Đã chuyển đơn vị', color: '#6938EF', bg: '#F9F5FF', border: '#E9D7FE' },
  in_progress: { label: 'Đang xử lý', color: '#3538CD', bg: '#EEF4FF', border: '#C7D7FE' },
  resolved: { label: 'Đã giải quyết', color: '#027A48', bg: '#ECFDF3', border: '#A6F4C5' },
  closed: { label: 'Đã đóng', color: '#344054', bg: '#F2F4F7', border: '#D0D5DD' },
  archived: { label: 'Lưu trữ', color: '#475467', bg: '#F8FAFC', border: '#E2E8F0' }
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Bản nháp', color: '#475467', bg: '#F2F4F7' },
  submitted: { label: 'Đã gửi', color: '#B42318', bg: '#FEF3F2' },
  reviewing: { label: 'Đang kiểm tra', color: '#B54708', bg: '#FFFAEB' },
  verified: { label: 'Đã xác thực', color: '#027A48', bg: '#ECFDF3' },
  rejected: { label: 'Không xác thực', color: '#344054', bg: '#F2F4F7' },
  merged: { label: 'Đã gộp vụ việc', color: '#026AA2', bg: '#F0F9FF' }
};

export const SEVERITY_LABELS: Record<SeverityObservation, { label: string; description: string }> = {
  low: { label: 'Ghi nhận mức nhẹ', description: 'Bụi phát tán cục bộ, ảnh hưởng tầm nhìn gần' },
  medium: { label: 'Ghi nhận mức vừa', description: 'Bụi mù lan sang khu dân cư lân cận hoặc đường đi' },
  high: { label: 'Ghi nhận mức cao', description: 'Bụi dày đặc liên tục, ảnh hưởng trực tiếp sinh hoạt' },
  unknown: { label: 'Chưa xác định mức độ', description: 'Cần cộng đồng hỗ trợ bổ sung thông tin' }
};

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, { label: string; hint: string }> = {
  still_present: { label: 'Tình trạng vẫn còn', hint: 'Bụi vẫn tiếp tục phát sinh tại khu vực' },
  reduced: { label: 'Đã giảm bớt', hint: 'Đã thấy có biện pháp che chắn, tưới nước giảm bụi' },
  resolved: { label: 'Có vẻ đã xử lý xong', hint: 'Khu vực đã sạch sẽ, công trình hoàn tất biện pháp giảm bụi' },
  cannot_confirm: { label: 'Không thể xác nhận', hint: 'Đến hiện trường nhưng không thấy dấu hiệu như phản ánh' },
  additional_evidence: { label: 'Bổ sung thêm hình ảnh', hint: 'Gửi thêm góc chụp mới để làm rõ vấn đề' }
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  field_check: 'Kiểm tra hiện trường',
  photo_update: 'Chụp ảnh cập nhật',
  status_check: 'Xác nhận tiến độ xử lý',
  information_check: 'Đối chiếu địa chỉ & nguồn phát'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Chờ nhận việc', color: '#B42318', bg: '#FEF3F2' },
  claimed: { label: 'Đang thực hiện', color: '#B54708', bg: '#FFFAEB' },
  completed: { label: 'Đã hoàn thành', color: '#027A48', bg: '#ECFDF3' },
  cancelled: { label: 'Đã hủy', color: '#475467', bg: '#F2F4F7' }
};

export const HANOI_CENTER = {
  lat: 21.0205,
  lng: 105.8078,
  address: '484 Lê Văn Việt, Hồ Chí Minh'
};

// Legacy compatibility alias (tránh gãy build cũ nhưng trỏ về chuẩn mới nếu cần)
export const HO_CHI_MINH_CENTER = HANOI_CENTER;

export const DUPLICATE_SEARCH_RADIUS_METERS = 150;

export * from './permissions.js';
export * from './location.js';

// =============================================================
// CẤU HÌNH FRONTEND: đổi nguồn dữ liệu tại MỘT nơi duy nhất
// USE_MOCK  = true : đọc dữ liệu mẫu trong shared/mock (không cần backend)
// USE_MOCK  = false: gọi backend thật
// AUTH_MOCK = true : đăng nhập / đăng ký giả lập ngay trong trình duyệt
//                    (API_SPEC v1 chưa có /auth). Đổi thành false khi
//                    Backend bổ sung API đăng nhập thật.
// MOCK_FAIL = true : mọi POST giao dịch trả error.json để thử giao diện báo lỗi
// API_BASE tự chọn: mở qua backend (:3000) thì dùng '/api',
//          mở qua Live Server (:5500) thì gọi sang localhost:3000
// =============================================================
const CONFIG = {
  USE_MOCK: false,
  AUTH_MOCK: true,
  MOCK_FAIL: false,
  API_BASE: location.port === '3000' ? '/api' : 'http://localhost:3000/api',
  MOCK_BASE: '../shared/mock',
};

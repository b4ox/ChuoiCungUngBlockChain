// =============================================================
// CẤU HÌNH FRONTEND: đổi nguồn dữ liệu tại MỘT nơi duy nhất
// USE_MOCK  = true : đọc dữ liệu mẫu trong shared/mock (không cần backend).
//                    Chỉ xem được các trang công khai; ký giao dịch cần backend thật.
// USE_MOCK  = false: gọi backend thật
// MOCK_FAIL = true : mọi POST ở chế độ mẫu trả error.json để thử giao diện báo lỗi
// API_BASE tự chọn: mở qua backend (:3000) thì dùng '/api',
//          mở qua Live Server (:5500) thì gọi sang localhost:3000
// Mạng, địa chỉ contract và ABI lấy từ GET /api/config (xem wallet.js).
// =============================================================
const CONFIG = {
  USE_MOCK: false,
  MOCK_FAIL: false,
  API_BASE: location.port === '3000' ? '/api' : 'http://localhost:3000/api',
  MOCK_BASE: '../shared/mock',
};

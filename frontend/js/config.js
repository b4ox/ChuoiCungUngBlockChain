// =============================================================
// CẤU HÌNH: chuyển dữ liệu mẫu sang backend tại một nơi duy nhất.
// =============================================================
const CONFIG = {
  USE_MOCK: false,
  MOCK_FAIL: false,
  API_BASE: location.port === '3000' ? '/api' : 'http://localhost:3000/api',
  MOCK_BASE: '../shared/mock',
};

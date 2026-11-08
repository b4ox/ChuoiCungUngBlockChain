// =============================================================
// API HELPER: mọi trang đọc / ghi dữ liệu backend qua apiGet, apiPost, apiPut.
// Tự gắn header "Authorization: Bearer <token>" khi đã đăng nhập bằng ví.
// Giao dịch blockchain KHÔNG đi qua đây mà do người dùng ký trong MetaMask (wallet.js).
// =============================================================

// Bảng ánh xạ GET -> file mock (chế độ USE_MOCK)
const MOCK_FILES = {
  '/accounts': 'accounts.json',
  '/participants': 'participants.json',
  '/products': 'products.json',
  '/events': 'events.json',
  '/config': 'config.json',
  '/businesses': 'businesses.json',
  '/auth/me': 'auth-me.json',
  '/applications/me': 'application.json',
  '/applications': 'applications.json',
};

// =============================================================
// 1. GỬI REQUEST: đổi mọi kiểu lỗi thành Error có câu tiếng Việt
// error.status = mã HTTP (401 = phiên hết hạn) để trang xử lý riêng
// =============================================================
async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.');
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }

  // Backend trả lỗi dạng { success: false, message }
  if (!response.ok || (data && data.success === false)) {
    const error = new Error((data && data.message) || 'Yêu cầu thất bại.');
    error.status = response.status;
    throw error;
  }
  return data;
}

// Header chung: JSON + token phiên (nếu có)
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const session = getStoredSession();
  if (session && session.token) headers.Authorization = 'Bearer ' + session.token;
  return headers;
}

// Đọc phiên trực tiếp từ localStorage (common.js nạp sau file này)
function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('session'));
  } catch (error) {
    return null;
  }
}

// =============================================================
// 2. ĐỌC DỮ LIỆU
// =============================================================
async function apiGet(url) {
  if (CONFIG.USE_MOCK) return mockGet(url);
  return requestJson(CONFIG.API_BASE + url, { headers: authHeaders() });
}

async function mockGet(url) {
  const path = url.split('?')[0];
  // Mọi mã sản phẩm / mọi doanh nghiệp đều dùng một file mẫu
  if (/^\/products\/\d+$/.test(path)) return requestJson(CONFIG.MOCK_BASE + '/product-1.json');
  if (/^\/businesses\/0x[0-9a-fA-F]{40}$/.test(path)) return requestJson(CONFIG.MOCK_BASE + '/business-detail.json');
  if (!MOCK_FILES[path]) throw new Error('Chưa có dữ liệu mẫu cho ' + path);
  return requestJson(CONFIG.MOCK_BASE + '/' + MOCK_FILES[path]);
}

// Đường dẫn ảnh QR của một sản phẩm (mock dùng ảnh mẫu có sẵn)
function qrCodeUrl(productId) {
  if (CONFIG.USE_MOCK) return 'img/qr-sample.png';
  return CONFIG.API_BASE + '/products/' + encodeURIComponent(productId) + '/qrcode';
}

// =============================================================
// 3. GHI DỮ LIỆU NGOÀI CHUỖI (hồ sơ, đăng nhập) — không tốn gas
// =============================================================
async function apiSend(method, url, body = {}) {
  if (CONFIG.USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const file = CONFIG.MOCK_FAIL ? 'error.json' : (url.startsWith('/applications') ? 'application.json' : 'tx-success.json');
    return requestJson(CONFIG.MOCK_BASE + '/' + file);
  }
  return requestJson(CONFIG.API_BASE + url, { method, headers: authHeaders(), body: JSON.stringify(body) });
}

function apiPost(url, body) {
  return apiSend('POST', url, body);
}

function apiPut(url, body) {
  return apiSend('PUT', url, body);
}

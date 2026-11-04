// =============================================================
// API HELPER: mọi trang đọc / ghi dữ liệu qua apiGet và apiPost.
// Trang không cần biết dữ liệu đến từ backend thật, file mock
// hay bộ đăng nhập giả lập — chỉ cần đổi cờ trong config.js.
// =============================================================

// Bảng ánh xạ GET -> file mock (theo LO_TRINH_FRONTEND, mục 2)
const MOCK_FILES = {
  '/accounts': 'accounts.json',
  '/participants': 'participants.json',
  '/products': 'products.json',
  '/events': 'events.json',
};

// =============================================================
// 1. GỬI REQUEST: đổi mọi kiểu lỗi thành Error có câu tiếng Việt
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

  // Backend trả lỗi dạng { success: false, message } (ví dụ "Sai vai tro")
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Yêu cầu thất bại.');
  }
  return data;
}

// =============================================================
// 2. ĐỌC DỮ LIỆU
// =============================================================
async function apiGet(url) {
  let data;
  if (!CONFIG.USE_MOCK) {
    data = await requestJson(CONFIG.API_BASE + url);
  } else {
    data = await mockGet(url);
  }

  // Đánh dấu ví nào đã có tài khoản đăng nhập (trang Đăng ký cần biết)
  if (url === '/accounts' && CONFIG.AUTH_MOCK) {
    data = markAccountsWithLogin(data);
  }
  return data;
}

async function mockGet(url) {
  const path = url.split('?')[0];

  // Mọi mã sản phẩm đều dùng product-1.json (theo bảng ánh xạ)
  if (/^\/products\/\d+$/.test(path)) {
    return requestJson(CONFIG.MOCK_BASE + '/product-1.json');
  }
  if (!MOCK_FILES[path]) {
    throw new Error('Chưa có dữ liệu mẫu cho ' + path);
  }
  return requestJson(CONFIG.MOCK_BASE + '/' + MOCK_FILES[path]);
}

// Đường dẫn ảnh QR của một sản phẩm (mock dùng ảnh mẫu có sẵn)
function qrCodeUrl(productId) {
  if (CONFIG.USE_MOCK) return 'img/qr-sample.png';
  return CONFIG.API_BASE + '/products/' + encodeURIComponent(productId) + '/qrcode';
}

// =============================================================
// 3. GHI DỮ LIỆU: tự gắn "from" = ví của người đang đăng nhập
// =============================================================
async function apiPost(url, body = {}) {
  if (url.startsWith('/auth/') && CONFIG.AUTH_MOCK) {
    return mockAuth(url, body);
  }

  const payload = { ...body, from: localStorage.getItem('currentAccount') };
  if (!CONFIG.USE_MOCK) {
    return requestJson(CONFIG.API_BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Chế độ mock: giả lập thời gian đào khối rồi trả kết quả mẫu
  await new Promise(resolve => setTimeout(resolve, 800));
  const file = CONFIG.MOCK_FAIL ? 'error.json' : 'tx-success.json';
  return requestJson(CONFIG.MOCK_BASE + '/' + file);
}

// =============================================================
// 4. ĐĂNG NHẬP GIẢ LẬP (khi CONFIG.AUTH_MOCK = true)
// API_SPEC v1 chưa có /auth nên tạm lưu tài khoản trong localStorage
// của trình duyệt này; mật khẩu chỉ lưu dạng băm SHA-256.
// Request/response giữ đúng hình dạng đã đề xuất cho Backend:
//   POST /auth/register { username, password, displayName, address }
//   POST /auth/login    { username, password } -> { token, user }
// =============================================================
const AUTH_USERS_KEY = 'authUsers';

function loadAuthUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function markAccountsWithLogin(accounts) {
  const users = loadAuthUsers();
  return accounts.map(account => ({
    ...account,
    hasLogin: users.some(user => sameAddress(user.address, account.address)),
  }));
}

function sameAddress(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

async function hashPassword(username, password) {
  if (!window.crypto || !crypto.subtle) {
    throw new Error('Trình duyệt chặn mã hoá. Hãy mở trang qua localhost hoặc 127.0.0.1.');
  }
  const bytes = new TextEncoder().encode(username + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function publicUser(user) {
  return { username: user.username, displayName: user.displayName, address: user.address };
}

async function mockAuth(url, body) {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (url === '/auth/register') return mockRegister(body);
  if (url === '/auth/login') return mockLogin(body);
  throw new Error('Không hỗ trợ ' + url);
}

async function mockRegister(body) {
  const users = loadAuthUsers();
  const username = String(body.username || '').trim().toLowerCase();
  if (users.some(user => user.username === username)) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }
  if (users.some(user => sameAddress(user.address, body.address))) {
    throw new Error('Ví này đã gắn với một tài khoản khác');
  }

  const user = {
    username,
    displayName: String(body.displayName || '').trim(),
    address: body.address,
    passwordHash: await hashPassword(username, String(body.password || '')),
  };
  users.push(user);
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  return { success: true, user: publicUser(user) };
}

async function mockLogin(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const user = loadAuthUsers().find(item => item.username === username);
  const hash = await hashPassword(username, String(body.password || ''));
  if (!user || user.passwordHash !== hash) {
    throw new Error('Sai tên đăng nhập hoặc mật khẩu');
  }
  return { success: true, token: 'mock-' + Date.now(), user: publicUser(user) };
}

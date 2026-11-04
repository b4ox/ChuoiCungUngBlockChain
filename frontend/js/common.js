// =============================================================
// TIỆN ÍCH CHUNG cho mọi trang: phiên đăng nhập, thanh điều hướng,
// toast, nút đang xử lý và các hàm định dạng dữ liệu.
// Thứ tự nạp: config.js -> api.js -> common.js -> script của trang.
// =============================================================

// Vai trò trên contract (enum Role trong CONTRACT_INTERFACE)
const ROLE = { NONE: 0, MANUFACTURER: 1, TRANSPORTER: 2, DISTRIBUTOR: 3, RETAILER: 4 };

// =============================================================
// 1. PHIÊN ĐĂNG NHẬP
// Lưu trong localStorage để tải lại trang vẫn còn đăng nhập.
// 'currentAccount' giữ địa chỉ ví để apiPost tự gắn "from".
// =============================================================
const SESSION_KEY = 'session';

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (error) {
    return null;
  }
}

function saveSession(loginResult) {
  const session = { token: loginResult.token, user: loginResult.user };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('currentAccount', loginResult.user.address);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('currentAccount');
  location.href = 'login.html';
}

// Ghép tài khoản đăng nhập với vai trò đang có trên blockchain
async function loadCurrentUser(session) {
  const accounts = await apiGet('/accounts');
  const address = session.user.address.toLowerCase();
  const account = accounts.find(item => item.address.toLowerCase() === address);
  if (!account) {
    return { ...session.user, role: ROLE.NONE, roleText: 'Ví không có trên Ganache', isAdmin: false };
  }
  return { ...session.user, role: account.role, roleText: account.roleText, isAdmin: account.isAdmin };
}

// =============================================================
// 2. KHỞI TẠO TRANG
// requireLogin = true: chưa đăng nhập thì chuyển tới login.html,
// kèm ?next= để đăng nhập xong quay lại đúng trang đang mở.
// Trả về người dùng hiện tại (hoặc null nếu là khách).
// =============================================================
async function initPage(options = {}) {
  const session = getSession();
  if (options.requireLogin && !session) {
    const next = currentPageName() + location.search;
    location.replace('login.html?next=' + encodeURIComponent(next));
    return null;
  }

  let user = null;
  if (session) {
    try {
      user = await loadCurrentUser(session);
    } catch (error) {
      // Backend tắt: vẫn cho vào trang, chỉ chưa biết vai trò
      user = { ...session.user, role: ROLE.NONE, roleText: 'Chưa xác định', isAdmin: false };
      showToast(error.message);
    }
  }
  renderNavbar(user);
  return user;
}

function currentPageName() {
  return location.pathname.split('/').pop() || 'index.html';
}

// =============================================================
// 3. THANH ĐIỀU HƯỚNG: sinh bằng JS để 7 trang luôn giống nhau.
// Khách (chưa đăng nhập) chỉ thấy trang Tra cứu.
// Trên điện thoại menu tự gập lại (navbar-expand-lg của Bootstrap).
// =============================================================
const NAV_LINKS = [
  { href: 'index.html', icon: 'bi-grid-1x2', label: 'Tổng quan', needLogin: true },
  { href: 'products.html', icon: 'bi-box-seam', label: 'Sản phẩm', needLogin: true },
  { href: 'actions.html', icon: 'bi-arrow-left-right', label: 'Xử lý đơn', needLogin: true },
  { href: 'trace.html', icon: 'bi-search', label: 'Tra cứu', needLogin: false },
  { href: 'admin.html', icon: 'bi-people', label: 'Thành viên', needLogin: true },
];

function navLinksHtml(user) {
  const current = currentPageName();
  const links = NAV_LINKS.filter(link => user || !link.needLogin);
  return links.map(link => {
    const active = link.href === current ? ' active" aria-current="page' : '';
    return `<li class="nav-item">
      <a class="nav-link${active}" href="${link.href}"><i class="bi ${link.icon} me-1"></i>${link.label}</a>
    </li>`;
  }).join('');
}

function userMenuHtml(user) {
  if (!user) {
    return `<a class="btn btn-light btn-sm" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Đăng nhập</a>`;
  }
  return `<div class="dropdown">
    <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i class="bi bi-person-circle me-1"></i>${escapeHtml(user.displayName)}
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li class="px-3 py-2 small">
        <div class="fw-semibold">${escapeHtml(user.isAdmin ? 'Quản trị viên' : user.roleText)}</div>
        <div class="text-body-secondary">@${escapeHtml(user.username)} · <span class="font-monospace">${shortAddress(user.address)}</span></div>
      </li>
      <li><hr class="dropdown-divider"></li>
      <li><button class="dropdown-item" type="button" id="logoutButton"><i class="bi bi-box-arrow-right me-1"></i>Đăng xuất</button></li>
    </ul>
  </div>`;
}

function renderNavbar(user) {
  const modeText = CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Blockchain';
  document.getElementById('appNav').innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container">
        <a class="navbar-brand fw-bold" href="${user ? 'index.html' : 'trace.html'}"><i class="bi bi-boxes me-2"></i>TraceChain</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                aria-controls="mainNav" aria-expanded="false" aria-label="Mở menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto">${navLinksHtml(user)}</ul>
          <div class="d-flex align-items-center gap-2 py-2 py-lg-0">
            <span class="badge rounded-pill text-bg-secondary"><i class="bi bi-hdd-network me-1"></i>${modeText}</span>
            ${userMenuHtml(user)}
          </div>
        </div>
      </div>
    </nav>`;
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) logoutButton.addEventListener('click', logout);
}

// =============================================================
// 4. THÔNG BÁO & NÚT ĐANG XỬ LÝ
// =============================================================
function showToast(message, type = 'danger') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Đóng"></button>
    </div>`;
  container.appendChild(toast);
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  new bootstrap.Toast(toast, { delay: 5000 }).show();
}

// Khoá nút + spinner trong lúc chờ giao dịch; gọi lại với busy=false để mở
function setButtonBusy(button, busy) {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Đang xử lý...';
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.label || button.innerHTML;
  }
}

// Hiện / ẩn ô báo lỗi trong form (message rỗng = ẩn)
function showFormError(box, message) {
  box.textContent = message || '';
  box.classList.toggle('d-none', !message);
}

function transactionMessage(result) {
  if (CONFIG.USE_MOCK) return 'Giao dịch mẫu thành công (dữ liệu mẫu không thay đổi).';
  return 'Thành công! Block #' + result.blockNumber + ' · tx ' + shortAddress(result.txHash);
}

// =============================================================
// 5. ĐỊNH DẠNG DỮ LIỆU
// =============================================================
function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function shortAddress(address) {
  return address ? address.slice(0, 6) + '…' + address.slice(-4) : '—';
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// Màu badge theo status 0–5: xám, vàng (đang chở), xanh dương (ở kho/cửa hàng), xanh lá (đã bán)
const STATUS_COLORS = ['secondary', 'warning', 'primary', 'warning', 'primary', 'success'];

function statusBadge(status, text) {
  const color = STATUS_COLORS[status] || 'secondary';
  return `<span class="badge text-bg-${color}">${escapeHtml(text)}</span>`;
}

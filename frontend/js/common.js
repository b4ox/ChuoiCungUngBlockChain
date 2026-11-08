// =============================================================
// TIỆN ÍCH CHUNG cho mọi trang: phiên đăng nhập bằng ví, thanh điều hướng,
// toast, nút đang xử lý và các hàm định dạng dữ liệu.
// Thứ tự nạp: config.js -> api.js -> common.js -> (wallet.js) -> script của trang.
// =============================================================

// Vai trò trên contract (enum Role trong CONTRACT_INTERFACE)
const ROLE = { NONE: 0, MANUFACTURER: 1, TRANSPORTER: 2, DISTRIBUTOR: 3, RETAILER: 4 };
const ROLE_TEXT = ['Chưa đăng ký', 'Nhà sản xuất', 'Vận chuyển', 'Nhà phân phối', 'Nhà bán lẻ'];

// =============================================================
// 1. PHIÊN ĐĂNG NHẬP BẰNG VÍ
// Lưu { token, address } trong localStorage để tải lại trang vẫn còn đăng nhập.
// Token do backend cấp sau khi kiểm tra chữ ký MetaMask (POST /auth/login).
// =============================================================
const SESSION_KEY = 'session';

function getSession() {
  return getStoredSession();
}

function saveSession(loginResult) {
  const session = { token: loginResult.token, address: loginResult.address };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function logout() {
  try {
    await apiPost('/auth/logout');
  } catch (error) {
    // phiên đã hết hạn ở backend thì bỏ qua
  }
  clearSession();
  location.href = 'login.html';
}

// Hỏi backend: ví này là ai trên blockchain, hồ sơ đang ở trạng thái nào
async function loadCurrentUser() {
  const me = await apiGet('/auth/me');
  const member = me.member;
  const active = !!(member && member.isActive);
  const app = me.application;
  return {
    address: me.address,
    isAdmin: me.isAdmin,
    member,
    application: app,
    isActive: active,
    // Chỉ vai trò ĐANG HOẠT ĐỘNG trên chuỗi mới mở chức năng
    role: active ? member.role : ROLE.NONE,
    roleText: active ? member.roleText : ROLE_TEXT[0],
    // Vai trò đang xin (hồ sơ chờ duyệt) để hiện chức năng bị khoá
    pendingRole: !active && app && app.status === 'pending' ? app.role : ROLE.NONE,
    displayName: (member && member.name) || (app && app.company) || (me.isAdmin ? 'Quản trị viên' : shortAddress(me.address)),
  };
}

// Câu mô tả trạng thái tài khoản, dùng ở navbar và các trang
function accountStatusText(user) {
  if (user.isAdmin) return 'Quản trị viên';
  if (user.isActive) return user.roleText;
  if (user.member && !user.member.isActive) return 'Đã bị thu hồi vai trò';
  if (user.application && user.application.status === 'pending') return 'Hồ sơ chờ duyệt';
  if (user.application && user.application.status === 'rejected') return 'Hồ sơ bị từ chối';
  return 'Chưa đăng ký doanh nghiệp';
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
    goToLogin();
    return null;
  }

  let user = null;
  if (session) {
    try {
      user = await loadCurrentUser();
    } catch (error) {
      if (error.status === 401) {
        clearSession(); // token hết hạn hoặc backend vừa khởi động lại
        if (options.requireLogin) { goToLogin(); return null; }
      } else {
        showToast(error.message);
      }
    }
  }
  renderNavbar(user);
  watchWalletAccount(user);
  return user;
}

function goToLogin() {
  const next = currentPageName() + location.search;
  location.replace('login.html?next=' + encodeURIComponent(next));
}

function currentPageName() {
  return location.pathname.split('/').pop() || 'index.html';
}

// Đổi tài khoản trong MetaMask -> phiên cũ không còn đúng người -> đăng nhập lại.
// Đổi mạng -> tải lại trang cho chắc.
function watchWalletAccount(user) {
  if (!window.ethereum || !window.ethereum.on) return;
  window.ethereum.on('accountsChanged', accounts => {
    const now = (accounts[0] || '').toLowerCase();
    if (user && now !== user.address.toLowerCase()) {
      clearSession();
      location.href = 'login.html?changed=1&next=' + encodeURIComponent(currentPageName() + location.search);
    }
  });
  window.ethereum.on('chainChanged', () => location.reload());
}

// =============================================================
// 3. THANH ĐIỀU HƯỚNG: sinh bằng JS để mọi trang luôn giống nhau.
// Khách chỉ thấy Tra cứu và Doanh nghiệp. Quản trị chỉ hiện cho ví admin.
// =============================================================
const NAV_LINKS = [
  { href: 'index.html', icon: 'bi-grid-1x2', label: 'Tổng quan', show: 'user' },
  { href: 'products.html', icon: 'bi-box-seam', label: 'Sản phẩm', show: 'user' },
  { href: 'actions.html', icon: 'bi-arrow-left-right', label: 'Xử lý đơn', show: 'user' },
  { href: 'trace.html', icon: 'bi-search', label: 'Tra cứu', show: 'all' },
  { href: 'businesses.html', icon: 'bi-buildings', label: 'Doanh nghiệp', show: 'all' },
  { href: 'admin.html', icon: 'bi-shield-check', label: 'Quản trị', show: 'admin' },
];

function navLinksHtml(user) {
  const current = currentPageName();
  const links = NAV_LINKS.filter(link =>
    link.show === 'all' || (link.show === 'user' && user) || (link.show === 'admin' && user && user.isAdmin));
  return links.map(link => {
    const active = link.href === current ? ' active" aria-current="page' : '';
    return `<li class="nav-item">
      <a class="nav-link${active}" href="${link.href}"><i class="bi ${link.icon} me-1"></i>${link.label}</a>
    </li>`;
  }).join('');
}

function userMenuHtml(user) {
  if (!user) {
    return `<a class="btn btn-light btn-sm" href="login.html"><i class="bi bi-wallet2 me-1"></i>Đăng nhập bằng ví</a>`;
  }
  return `<div class="dropdown">
    <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i class="bi bi-wallet2 me-1"></i>${escapeHtml(user.displayName)}
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li class="px-3 py-2 small">
        <div class="fw-semibold">${escapeHtml(accountStatusText(user))}</div>
        <div class="text-body-secondary font-monospace">${shortAddress(user.address)}</div>
      </li>
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item" href="register.html"><i class="bi bi-file-earmark-person me-1"></i>Hồ sơ doanh nghiệp</a></li>
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
  new bootstrap.Toast(toast, { delay: 6000 }).show();
}

// Khoá nút + spinner trong lúc chờ; gọi lại với busy=false để mở.
// label: chữ hiện khi đang chờ (vd "Xác nhận trong MetaMask...")
function setButtonBusy(button, busy, label = 'Đang xử lý...') {
  if (busy) {
    if (!button.dataset.label) button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>${escapeHtml(label)}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.label || button.innerHTML;
    delete button.dataset.label;
  }
}

// Hiện / ẩn ô báo lỗi trong form (message rỗng = ẩn)
function showFormError(box, message) {
  box.textContent = message || '';
  box.classList.toggle('d-none', !message);
}

// Câu báo thành công sau khi giao dịch vào khối
function transactionMessage(result) {
  return 'Đã ghi lên blockchain! Khối #' + result.blockNumber + ' · tx ' + shortAddress(result.txHash);
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

function sameAddress(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function formatTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
}

// Màu badge theo status 0–5: xám, vàng (đang chở), xanh dương (ở kho/cửa hàng), xanh lá (đã bán)
const STATUS_COLORS = ['secondary', 'warning', 'primary', 'warning', 'primary', 'success'];

function statusBadge(status, text) {
  const color = STATUS_COLORS[status] || 'secondary';
  return `<span class="badge text-bg-${color}">${escapeHtml(text)}</span>`;
}

// Ghi chú tự động của contract viết không dấu -> hiển thị có dấu
function noteText(note) {
  return note === 'San pham duoc tao' ? 'Sản phẩm được tạo' : note;
}

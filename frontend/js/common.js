// =============================================================
// TIỆN ÍCH CHUNG: giữ vai đã chọn và hiển thị dữ liệu an toàn.
// =============================================================
function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function shortAddress(address) {
  return address ? address.slice(0, 6) + '…' + address.slice(-4) : '—';
}

function statusBadge(status, text) {
  const colors = ['gray', 'amber', 'blue', 'amber', 'blue', 'green'];
  return '<span class="status-badge ' + (colors[status] || 'gray') + '"><span></span>' + escapeHtml(text || 'Không xác định') + '</span>';
}

function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  if (type === 'success') toast.classList.add('success');
  toast.textContent = message;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

async function setupAccountPicker() {
  const select = document.getElementById('accountSelect');
  try {
    const accounts = await apiGet('/accounts');
    select.innerHTML = '';
    accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.address;
      option.textContent = account.isAdmin ? 'Quản trị viên' : (account.name || shortAddress(account.address)) + ' · ' + account.roleText;
      select.appendChild(option);
    });
    const saved = localStorage.getItem('currentAccount');
    if (accounts.some(account => account.address === saved)) select.value = saved;
    if (select.value) localStorage.setItem('currentAccount', select.value);
    select.addEventListener('change', () => {
      localStorage.setItem('currentAccount', select.value);
      document.dispatchEvent(new CustomEvent('accountChanged', { detail: accounts.find(account => account.address === select.value) }));
    });
    document.dispatchEvent(new CustomEvent('accountChanged', { detail: accounts.find(account => account.address === select.value) }));
  } catch (error) { select.innerHTML = '<option>Không tải được tài khoản</option>'; showToast(error.message); }
}

// =============================================================
// ĐIỀU HƯỚNG: các trang dùng cùng danh sách để luôn nhất quán.
// =============================================================
function renderNavigation() {
  const links = [ ['index.html', 'bi-grid-1x2', 'Tổng quan'], ['products.html', 'bi-box2', 'Sản phẩm'], ['actions.html', 'bi-arrow-left-right', 'Xử lý đơn'], ['trace.html', 'bi-search', 'Tra cứu'], ['admin.html', 'bi-people', 'Thành viên'] ];
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.side-nav').forEach(nav => {
    nav.innerHTML = links.map(([url, icon, label]) => '<a class="nav-item' + (url === current ? ' active' : '') + '" href="' + url + '"' + (url === current ? ' aria-current="page"' : '') + '><i class="bi ' + icon + '"></i> ' + label + '</a>').join('');
  });
}
renderNavigation();

function transactionMessage(result) {
  if (CONFIG.USE_MOCK) return 'Đã thử giao dịch. Dữ liệu mẫu không được lưu.';
  return 'Thành công · Block #' + result.blockNumber + ' · ' + shortAddress(result.txHash);
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

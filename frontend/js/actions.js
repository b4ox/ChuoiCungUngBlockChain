// =============================================================
// XỬ LÝ ĐƠN: chỉ liệt kê sản phẩm mà vai trò của người đang đăng nhập
// có thể xử lý ở trạng thái hiện tại (contract vẫn kiểm tra lại lần nữa).
// =============================================================
let currentUser = null;

// Trả về hành động hợp lệ cho sản phẩm, hoặc null nếu không có
function actionFor(product, user) {
  if (user.role === ROLE.TRANSPORTER && (product.status === 0 || product.status === 2)) {
    return { path: 'pickup', label: 'Nhận hàng đi giao', icon: 'bi-truck' };
  }
  if (user.role === ROLE.DISTRIBUTOR && product.status === 1) {
    return { path: 'receive', label: 'Xác nhận đã nhận', icon: 'bi-box-arrow-in-down' };
  }
  if (user.role === ROLE.RETAILER && product.status === 3) {
    return { path: 'receive', label: 'Xác nhận đã nhận', icon: 'bi-box-arrow-in-down' };
  }
  const ownsIt = product.currentOwner.toLowerCase() === user.address.toLowerCase();
  if (user.role === ROLE.RETAILER && product.status === 4 && ownsIt) {
    return { path: 'sell', label: 'Đánh dấu đã bán', icon: 'bi-bag-check' };
  }
  return null;
}

function actionCard(product, action) {
  return `<div class="col-md-6 col-xl-4">
    <form class="card h-100 action-form" data-id="${product.id}" data-path="${action.path}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h2 class="h6 fw-semibold mb-0">${escapeHtml(product.name)}</h2>
          ${statusBadge(product.status, product.statusText)}
        </div>
        <p class="small text-body-secondary mb-3">Mã #${product.id} · ${escapeHtml(product.origin)}</p>
        <label class="form-label small" for="note-${product.id}">Ghi chú (không bắt buộc)</label>
        <input class="form-control form-control-sm" id="note-${product.id}" name="note" maxlength="200" placeholder="Ví dụ: Kho Hà Nội, nhiệt độ 4°C">
      </div>
      <div class="card-footer bg-body">
        <button class="btn btn-primary btn-sm w-100" type="submit"><i class="bi ${action.icon} me-1"></i>${action.label}</button>
      </div>
    </form>
  </div>`;
}

function renderActions(products) {
  const items = products
    .map(product => ({ product, action: actionFor(product, currentUser) }))
    .filter(item => item.action);
  document.getElementById('actionList').innerHTML = items.map(item => actionCard(item.product, item.action)).join('');
  const state = document.getElementById('actionState');
  state.textContent = 'Không có sản phẩm nào cần bạn xử lý lúc này.';
  state.parentElement.classList.toggle('d-none', items.length > 0);
}

async function loadActions() {
  try {
    renderActions(await apiGet('/products'));
  } catch (error) {
    document.getElementById('actionState').textContent = 'Không tải được danh sách sản phẩm.';
    showToast(error.message);
  }
}

async function submitAction(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  setButtonBusy(button, true);
  try {
    const url = '/products/' + form.dataset.id + '/' + form.dataset.path;
    const result = await apiPost(url, { note: form.elements.note.value.trim() });
    showToast(transactionMessage(result), 'success');
    await loadActions();
  } catch (error) {
    showToast(error.message); // ví dụ nguyên văn lỗi contract: "Sai vai tro"
  } finally {
    setButtonBusy(button, false);
  }
}

function roleInfoText(user) {
  if (user.isAdmin) return 'Quản trị viên không trực tiếp xử lý hàng. Hãy đăng nhập bằng tài khoản vận chuyển, nhà phân phối hoặc nhà bán lẻ.';
  if (user.role === ROLE.NONE) return 'Ví của bạn chưa có vai trò trên blockchain, nên chưa có việc cần xử lý.';
  return 'Bạn đang xử lý với vai trò: ' + user.roleText + '.';
}

// =============================================================
// KHỞI ĐỘNG: bắt buộc đăng nhập
// =============================================================
(async function start() {
  currentUser = await initPage({ requireLogin: true });
  if (!currentUser) return;
  document.getElementById('roleInfo').textContent = roleInfoText(currentUser);
  document.getElementById('actionList').addEventListener('submit', submitAction);
  loadActions();
})();

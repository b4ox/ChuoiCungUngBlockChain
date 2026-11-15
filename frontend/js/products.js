// =============================================================
// SẢN PHẨM: bảng sản phẩm có lọc trạng thái (lọc ngay tại trình duyệt
// để chế độ mock và backend thật cho kết quả giống nhau) + form tạo mới.
// =============================================================
let products = [];
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

// =============================================================
// ĐỐI TÁC: chỉ gợi ý doanh nghiệp đang hoạt động, đúng vai trò.
// =============================================================
function fillInviteOptions(id, participants, role) {
  const select = document.getElementById(id);
  const choices = participants.filter(item => item.role === role && item.isActive);
  select.innerHTML = '<option value="">Không chọn</option>' + choices.map(item => `<option value="${escapeHtml(item.address)}">${escapeHtml(item.name)} · ${escapeHtml(shortAddress(item.address))}</option>`).join('');
  select.disabled = false;
}

async function loadInviteOptions() {
  const state = document.getElementById('inviteOptionsState');
  try {
    const [participants, config] = await Promise.all([apiGet('/participants'), getChainConfig()]);
    const hasMethod = Array.isArray(config.abi) && config.abi.some(item => item.type === 'function' && item.name === 'createProductWithInvites');
    if (!hasMethod) { state.textContent = 'Contract chưa hỗ trợ lời mời; bạn vẫn có thể tạo sản phẩm.'; return; }
    fillInviteOptions('transporter', participants, ROLE.TRANSPORTER);
    fillInviteOptions('distributor', participants, ROLE.DISTRIBUTOR);
    state.textContent = 'Bạn có thể mời đối tác ngay hoặc thực hiện sau.';
  } catch (error) { state.textContent = 'Không tải được danh sách đối tác; bạn vẫn có thể tạo sản phẩm.'; }
}

function matchesFilter(product, filter) {
  if (filter === '') return true;
  if (filter === 'transit') return product.status === 1 || product.status === 3;
  return product.status === Number(filter);
}

function productRow(product) {
  return `<tr>
    <td>
      <a class="fw-semibold" href="trace.html?id=${product.id}">${escapeHtml(product.name)}</a>
      <div class="small text-body-secondary">Mã #${product.id}</div>
    </td>
    <td>${escapeHtml(product.origin)}</td>
    <td>${escapeHtml(product.currentOwnerName || shortAddress(product.currentOwner))}</td>
    <td>${statusBadge(product.status, product.statusText)}</td>
  </tr>`;
}

function renderProducts() {
  const filter = document.getElementById('statusFilter').value;
  const shown = products.filter(product => matchesFilter(product, filter));
  document.getElementById('productBody').innerHTML = shown.map(productRow).join('');
  document.getElementById('productCount').textContent = 'Hiển thị ' + shown.length + ' / ' + products.length + ' sản phẩm';
  document.getElementById('productState').textContent = shown.length ? '' : 'Không có sản phẩm phù hợp.';
}

async function loadProducts() {
  try {
    products = await apiGet('/products');
    renderProducts();
  } catch (error) {
    document.getElementById('productCount').textContent = 'Chưa có dữ liệu';
    document.getElementById('productState').textContent = 'Không tải được danh sách sản phẩm.';
    showToast(error.message);
  }
}

// =============================================================
// TẠO SẢN PHẨM: chỉ Nhà sản xuất đã duyệt; ký bằng MetaMask; form giữ nguyên nội dung nếu lỗi
// =============================================================
async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('productFormError');
  const body = {
    name: form.elements.name.value.trim(),
    origin: form.elements.origin.value.trim(),
    description: form.elements.description.value.trim(),
  };
  if (!body.name || !body.origin || !body.description) {
    showFormError(errorBox, 'Vui lòng nhập đủ tên, nơi sản xuất và mô tả.');
    return;
  }

  showFormError(errorBox, '');
  setButtonBusy(button, true, 'Xác nhận trong MetaMask...');
  try {
    // Không gửi lời mời thì giữ nguyên luồng tạo sản phẩm v1.
    const args = [body.name, body.origin, body.description];
    const transporter = form.elements.transporter.value;
    const distributor = form.elements.distributor.value;
    const method = transporter || distributor ? 'createProductWithInvites' : 'createProduct';
    if (method === 'createProductWithInvites') args.push(transporter || EMPTY_ADDRESS, distributor || EMPTY_ADDRESS);
    const result = await sendContractTx(method, args, () => setButtonBusy(button, true, 'Đang chờ vào khối...'));
    const productId = productIdFromReceipt(result);
    form.reset();
    bootstrap.Modal.getOrCreateInstance('#productModal').hide();
    showToast('Đã tạo sản phẩm #' + productId + '. ' + transactionMessage(result), 'success');
    await refreshPublicData();
    await loadProducts();
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// KHỞI ĐỘNG: bắt buộc đăng nhập; ?status= trên URL chọn sẵn bộ lọc
// =============================================================
(async function start() {
  const user = await initPage({ requireLogin: false });

  const isManufacturer = Boolean(user && user.role === ROLE.MANUFACTURER);
  const waitingManufacturer = Boolean(user && user.pendingRole === ROLE.MANUFACTURER);
  document.getElementById('openProductForm').classList.toggle('d-none', !isManufacturer);
  document.getElementById('lockedProductButton').classList.toggle('d-none', !waitingManufacturer);

  const filter = document.getElementById('statusFilter');
  const requested = new URLSearchParams(location.search).get('status');
  if (requested && [...filter.options].some(option => option.value === requested)) filter.value = requested;
  filter.addEventListener('change', renderProducts);
  document.getElementById('productForm').addEventListener('submit', submitProduct);
  if (isManufacturer) loadInviteOptions();
  loadProducts();
})();

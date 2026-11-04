// =============================================================
// DANH SÁCH SẢN PHẨM: lọc tại giao diện để mock và API giống nhau.
// =============================================================
let products = [];
const filter = document.getElementById('statusFilter');
const productDialog = document.getElementById('productDialog');
let isCreatingProduct = false;

function renderProducts() {
  const shown = products.filter(product => filter.value === '' || (filter.value === 'transit' ? product.status === 1 || product.status === 3 : product.status === Number(filter.value)));
  document.getElementById('productCount').textContent = shown.length + ' sản phẩm được hiển thị';
  document.getElementById('productState').textContent = shown.length ? '' : 'Không có sản phẩm phù hợp.';
  document.getElementById('productBody').innerHTML = shown.map(product => '<tr><td><div class="product-cell"><span class="product-icon"><i class="bi bi-box2"></i></span><span><a class="product-link" href="trace.html?id=' + encodeURIComponent(product.id) + '">' + escapeHtml(product.name) + '</a><small>Mã SP #' + escapeHtml(product.id) + '</small></span></div></td><td>' + escapeHtml(product.origin) + '</td><td>' + escapeHtml(product.currentOwnerName || shortAddress(product.currentOwner)) + '</td><td>' + statusBadge(product.status, product.statusText) + '</td></tr>').join('');
}

async function loadProducts() {
  try { products = await apiGet('/products'); renderProducts(); }
  catch (error) {
    document.getElementById('productState').textContent = 'Không thể tải danh sách sản phẩm. Vui lòng tải lại trang.';
    document.getElementById('productCount').textContent = 'Chưa có dữ liệu';
    showToast(error.message);
  }
}

// =============================================================
// TẠO SẢN PHẨM: chỉ hiện cho nhà sản xuất, luôn mở lại nút sau giao dịch.
// =============================================================
document.addEventListener('accountChanged', event => {
  const canCreate = Boolean(event.detail && event.detail.role === 1);
  document.getElementById('openProductDialog').hidden = !canCreate;
  document.getElementById('roleHint').hidden = canCreate;
  if (!canCreate && productDialog.open && !isCreatingProduct) productDialog.close();
});

function closeProductDialog() {
  if (!isCreatingProduct) productDialog.close();
}

async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('productFormError');
  const data = new FormData(form);
  const body = { name: data.get('name').trim(), origin: data.get('origin').trim(), description: data.get('description').trim() };
  if (!body.name || !body.origin || !body.description) { errorBox.textContent = 'Vui lòng nhập đầy đủ thông tin sản phẩm.'; errorBox.hidden = false; return; }
  errorBox.hidden = true;
  isCreatingProduct = true;
  button.disabled = true;
  button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Đang xử lý...';
  try {
    const result = await apiPost('/products', body);
    form.reset();
    productDialog.close();
    showToast(transactionMessage(result), 'success');
    await loadProducts();
  } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
  finally { isCreatingProduct = false; button.disabled = false; button.textContent = 'Thêm sản phẩm'; }
}

document.getElementById('openProductDialog').addEventListener('click', () => { document.getElementById('productFormError').hidden = true; productDialog.showModal(); document.getElementById('productName').focus(); });
document.getElementById('closeProductDialog').addEventListener('click', closeProductDialog);
document.getElementById('cancelProductDialog').addEventListener('click', closeProductDialog);
productDialog.addEventListener('cancel', event => { if (isCreatingProduct) event.preventDefault(); });
filter.addEventListener('change', renderProducts);
const requestedStatus = new URLSearchParams(location.search).get('status');
if (requestedStatus && Array.from(filter.options).some(option => option.value === requestedStatus)) filter.value = requestedStatus;
document.getElementById('productForm').addEventListener('submit', submitProduct);
document.getElementById('dataMode').textContent = CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Dữ liệu từ backend';
document.getElementById('mockNotice').hidden = !CONFIG.USE_MOCK;
setupAccountPicker();
loadProducts();

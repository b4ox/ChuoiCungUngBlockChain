// =============================================================
// XỬ LÝ ĐƠN: chỉ gợi ý thao tác phù hợp vai và trạng thái sản phẩm.
// =============================================================
let actionProducts = [];
let currentActionAccount = null;

function actionFor(product, account) {
  if (!account) return null;
  if (account.role === 2 && (product.status === 0 || product.status === 2)) return { path: 'pickup', label: 'Nhận hàng đi giao' };
  if ((account.role === 3 && product.status === 1) || (account.role === 4 && product.status === 3)) return { path: 'receive', label: 'Xác nhận đã nhận' };
  if (account.role === 4 && product.status === 4 && product.currentOwner.toLowerCase() === account.address.toLowerCase()) return { path: 'sell', label: 'Đánh dấu đã bán' };
  return null;
}

function renderActions() {
  const items = actionProducts.map(product => ({ product, action: actionFor(product, currentActionAccount) })).filter(item => item.action);
  document.getElementById('actionState').textContent = items.length ? '' : 'Không có sản phẩm cần xử lý cho vai trò này.';
  document.getElementById('actionList').innerHTML = items.map(({ product, action }) => '<article class="action-row"><div><strong>' + escapeHtml(product.name) + '</strong><p>Mã SP #' + escapeHtml(product.id) + ' · ' + escapeHtml(product.origin) + '</p>' + statusBadge(product.status, product.statusText) + '</div><form class="action-form" data-id="' + escapeHtml(product.id) + '" data-path="' + action.path + '"><label>Ghi chú <input name="note" maxlength="500" placeholder="Thêm ghi chú (không bắt buộc)"></label><button class="primary-button" type="submit">' + action.label + '</button></form></article>').join('');
}

async function loadActions() {
  try { actionProducts = await apiGet('/products'); renderActions(); }
  catch (error) { document.getElementById('actionState').textContent = 'Không thể tải sản phẩm cần xử lý.'; showToast(error.message); }
}

async function submitAction(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button');
  const label = button.textContent;
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Đang xử lý...';
  try { const result = await apiPost('/products/' + form.dataset.id + '/' + form.dataset.path, { note: form.elements.note.value.trim() }); showToast(transactionMessage(result), 'success'); await loadActions(); }
  catch (error) { showToast(error.message); }
  finally { button.disabled = false; button.textContent = label; }
}

document.addEventListener('accountChanged', event => { currentActionAccount = event.detail; renderActions(); });
document.getElementById('actionList').addEventListener('submit', submitAction);
document.querySelector('.mode-text').textContent = CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Dữ liệu từ backend';
document.querySelectorAll('.mock-only').forEach(item => { item.hidden = !CONFIG.USE_MOCK; });
setupAccountPicker();
loadActions();

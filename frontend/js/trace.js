// =============================================================
// TRA CỨU: hiển thị thông tin và lịch sử theo mã sản phẩm đã chọn.
// =============================================================
const steps = ['Đã sản xuất', 'Đang tới nhà phân phối', 'Ở nhà phân phối', 'Đang tới cửa hàng', 'Ở cửa hàng', 'Đã bán'];

// =============================================================
// DẤU MỐC: dùng trạng thái hiện tại và dữ liệu lịch sử riêng biệt.
// =============================================================
function milestoneDetails(item) {
  const time = item.time ? formatTime(item.time) : 'Chưa có thông tin';
  const actor = item.actorName || (item.actor ? shortAddress(item.actor) : 'Chưa có thông tin');
  return '<div class="milestone-details"><p><i class="bi bi-clock" aria-hidden="true"></i><span><b>Thời gian</b>' + escapeHtml(time) + '</span></p><p><i class="bi bi-person" aria-hidden="true"></i><span><b>Người thực hiện</b>' + escapeHtml(actor) + '</span></p><p><i class="bi bi-geo-alt" aria-hidden="true"></i><span><b>Địa điểm</b>Chưa có thông tin riêng</span></p><p><i class="bi bi-chat-left-text" aria-hidden="true"></i><span><b>Ghi chú</b>' + escapeHtml(item.note || 'Không có ghi chú') + '</span></p></div>';
}

function renderMilestones(product, history) {
  document.getElementById('traceProgress').innerHTML = steps.map((label, index) => {
    const records = history.filter(item => item.status === index);
    const reached = index <= product.status;
    const state = index === product.status ? 'current' : (reached ? 'complete' : 'upcoming');
    const stateText = index === product.status ? 'Hiện tại' : (reached ? 'Đã hoàn thành' : 'Chưa đến');
    const detail = records.length ? records.map(milestoneDetails).join('') : '<p class="milestone-empty">' + (reached ? 'Chưa có thông tin chi tiết cho dấu mốc này.' : 'Thông tin sẽ xuất hiện khi đến bước này.') + '</p>' + milestoneDetails({});
    const title = records.length && records[0].statusText ? records[0].statusText : label;
    return '<li class="milestone ' + state + '"><span class="milestone-marker" aria-hidden="true">' + (reached ? '<i class="bi bi-check-lg"></i>' : (index + 1)) + '</span><details class="milestone-card"' + (state === 'current' ? ' open' : '') + '><summary class="milestone-heading"><span class="milestone-title"><span class="milestone-number">BƯỚC 0' + (index + 1) + '</span><span class="milestone-name">' + escapeHtml(title) + '</span></span><span class="milestone-summary-end"><span class="milestone-state">' + stateText + '</span><span class="milestone-toggle" aria-hidden="true"><i class="bi bi-chevron-down"></i></span></span></summary><div class="milestone-content">' + detail + '</div></details></li>';
  }).join('');
}

function renderTrace(data) {
  const product = data.product;
  document.getElementById('traceName').textContent = product.name;
  document.getElementById('traceCode').textContent = '#' + product.id;
  document.getElementById('traceOrigin').textContent = product.origin;
  document.getElementById('traceManufacturer').textContent = product.manufacturerName || shortAddress(product.manufacturer);
  document.getElementById('traceOwner').textContent = product.currentOwnerName || shortAddress(product.currentOwner);
  document.getElementById('traceDescription').textContent = product.description;
  document.getElementById('traceStatus').innerHTML = statusBadge(product.status, product.statusText);
  renderMilestones(product, data.history || []);
  const image = document.getElementById('qrImage');
  document.getElementById('openQrDialog').hidden = true;
  document.getElementById('qrLabel').textContent = CONFIG.USE_MOCK ? 'Mã QR có khi kết nối backend' : 'Đang tải mã QR...';
  image.removeAttribute('src');
  if (!CONFIG.USE_MOCK) image.src = CONFIG.API_BASE + '/products/' + encodeURIComponent(product.id) + '/qrcode';
  document.getElementById('traceResult').hidden = false;
}

async function findProduct(id) {
  const state = document.getElementById('traceState');
  document.getElementById('traceResult').hidden = true;
  if (!/^\d+$/.test(id) || Number(id) < 1) { state.textContent = 'Vui lòng nhập mã sản phẩm hợp lệ.'; return; }
  state.textContent = 'Đang tra cứu...';
  try { const data = await apiGet('/products/' + encodeURIComponent(id)); renderTrace(data); state.textContent = ''; }
  catch (error) { state.textContent = error.message === 'Không tìm thấy sản phẩm' || error.message === 'San pham khong ton tai' ? 'Không tìm thấy sản phẩm.' : 'Không thể tải thông tin sản phẩm.'; showToast(error.message); }
}

document.getElementById('traceForm').addEventListener('submit', event => { event.preventDefault(); const id = document.getElementById('traceId').value.trim(); history.replaceState(null, '', '?id=' + encodeURIComponent(id)); findProduct(id); });
document.querySelector('.mode-text').textContent = CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Dữ liệu từ backend';
document.querySelectorAll('.mock-only').forEach(item => { item.hidden = !CONFIG.USE_MOCK; });
setupAccountPicker();
// =============================================================
// MÃ QR: chỉ cho phóng to sau khi ảnh tải thành công.
// =============================================================
const qrImage = document.getElementById('qrImage');
const qrDialog = document.getElementById('qrDialog');
const openQrDialog = document.getElementById('openQrDialog');
qrImage.addEventListener('load', () => { openQrDialog.hidden = false; document.getElementById('qrLabel').textContent = 'Mã QR tra cứu'; });
qrImage.addEventListener('error', () => { openQrDialog.hidden = true; document.getElementById('qrLabel').textContent = 'Không tải được mã QR.'; });
openQrDialog.addEventListener('click', () => { document.getElementById('qrLarge').src = qrImage.src; qrDialog.showModal(); });
document.getElementById('closeQrDialog').addEventListener('click', () => qrDialog.close());
document.getElementById('doneQrDialog').addEventListener('click', () => qrDialog.close());
const initialId = new URLSearchParams(location.search).get('id');
if (initialId) { document.getElementById('traceId').value = initialId; findProduct(initialId); }

// =============================================================
// TRA CỨU: trang công khai cho người tiêu dùng. Mở trace.html?id=1
// (ví dụ từ mã QR) là hiển thị ngay, không cần bấm tìm.
// =============================================================
const STEP_LABELS = ['Đã sản xuất', 'Đang tới NPP', 'Ở nhà phân phối', 'Đang tới cửa hàng', 'Ở cửa hàng', 'Đã bán'];

// Tên thành viên có link sang hồ sơ công khai; địa chỉ lạ thì hiện rút gọn
function actorLink(address, name) {
  if (!name) return escapeHtml(shortAddress(address));
  return `<a href="businesses.html?address=${encodeURIComponent(address)}">${escapeHtml(name)}</a>`;
}

function renderInfo(product) {
  document.getElementById('traceName').textContent = product.name;
  document.getElementById('traceStatus').innerHTML = statusBadge(product.status, product.statusText);
  document.getElementById('traceCode').textContent = '#' + product.id;
  document.getElementById('traceOrigin').textContent = product.origin;
  document.getElementById('traceManufacturer').innerHTML = actorLink(product.manufacturer, product.manufacturerName);
  document.getElementById('traceOwner').innerHTML = actorLink(product.currentOwner, product.currentOwnerName);
  document.getElementById('traceDescription').textContent = product.description;
}

// Bước đã qua: dấu tích xanh; bước hiện tại: nền xanh dương; bước sau: xám
function renderSteps(status) {
  document.getElementById('stepTrack').innerHTML = STEP_LABELS.map((label, index) => {
    let state = '';
    if (index < status) state = 'done';
    if (index === status) state = status === 5 ? 'done' : 'current';
    const mark = state === 'done' ? '<i class="bi bi-check-lg"></i>' : index + 1;
    return `<li class="${state}"><span class="step-dot">${mark}</span>${label}</li>`;
  }).join('');
}

function renderTimeline(history) {
  document.getElementById('timeline').innerHTML = history.map(item => `<li>
    <div class="d-flex flex-wrap gap-2 align-items-center mb-1">
      ${statusBadge(item.status, item.statusText)}
      <span class="small text-body-secondary"><i class="bi bi-clock me-1"></i>${formatTime(item.time)}</span>
    </div>
    <div class="small"><i class="bi bi-person me-1"></i>${actorLink(item.actor, item.actorName)}</div>
    <div class="small text-body-secondary"><i class="bi bi-chat-left-text me-1"></i>${escapeHtml(noteText(item.note) || 'Không có ghi chú')}</div>
  </li>`).join('');
}

function renderQr(productId) {
  const url = qrCodeUrl(productId);
  document.getElementById('qrImage').src = url;
  document.getElementById('qrLarge').src = url;
}

async function findProduct(id) {
  const state = document.getElementById('traceState');
  const result = document.getElementById('traceResult');
  result.classList.add('d-none');
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    state.innerHTML = '<span class="text-danger">Mã sản phẩm phải là số nguyên dương.</span>';
    return;
  }

  state.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang tra cứu...';
  try {
    const data = await apiGet('/products/' + id);
    renderInfo(data.product);
    renderSteps(data.product.status);
    renderTimeline(data.history || []);
    renderQr(data.product.id);
    result.classList.remove('d-none');
    state.textContent = '';
  } catch (error) {
    const notFound = error.message === 'San pham khong ton tai';
    state.innerHTML = `<span class="text-danger">${notFound ? 'Không tìm thấy sản phẩm' : escapeHtml(error.message)}</span>`;
  }
}

function submitTrace(event) {
  event.preventDefault();
  const id = document.getElementById('traceId').value.trim();
  history.replaceState(null, '', '?id=' + encodeURIComponent(id)); // giữ mã trên URL để chia sẻ
  findProduct(id);
}

// =============================================================
// KHỞI ĐỘNG: không bắt buộc đăng nhập
// =============================================================
(async function start() {
  await initPage({ requireLogin: false });
  document.getElementById('traceForm').addEventListener('submit', submitTrace);
  document.getElementById('qrImage').addEventListener('error', () => {
    document.getElementById('qrLabel').textContent = 'Không tải được mã QR.';
  });
  const initialId = new URLSearchParams(location.search).get('id');
  if (initialId) {
    document.getElementById('traceId').value = initialId;
    findProduct(initialId);
  }
})();

// =============================================================
// DOANH NGHIỆP (trang công khai)
// businesses.html            -> danh sách, tìm kiếm, lọc vai trò
// businesses.html?address=0x -> hồ sơ công khai + hoạt động trên chuỗi
// Chỉ hiện thông tin công khai; người đại diện, điện thoại, email không bao giờ có ở đây.
// =============================================================
let businesses = [];
let chain = { explorerUrl: '' };

function activeBadge(business) {
  return business.isActive
    ? '<span class="verified"><i class="bi bi-patch-check-fill me-1"></i>Đã xác minh trên chuỗi</span>'
    : '<span class="badge text-bg-danger">Đã bị thu hồi</span>';
}

// =============================================================
// 1. DANH SÁCH
// =============================================================
function matches(business) {
  const search = document.getElementById('bizSearch').value.trim().toLowerCase();
  const role = document.getElementById('bizRole').value;
  const showRevoked = document.getElementById('bizShowRevoked').checked;
  const text = [business.name, business.taxCode, business.hq, business.address].join(' ').toLowerCase();
  if (!showRevoked && !business.isActive) return false;
  if (role && business.role !== Number(role)) return false;
  return !search || text.includes(search);
}

function businessCard(b) {
  return `<div class="col-md-6 col-xl-4">
    <article class="card h-100 biz-card"><div class="card-body d-flex flex-column gap-2">
      <div class="d-flex flex-wrap justify-content-between gap-2">
        <span class="badge text-bg-primary">${escapeHtml(b.roleText)}</span>${activeBadge(b)}
      </div>
      <h2 class="h6 fw-semibold mb-0">${escapeHtml(b.name)}</h2>
      ${b.intro ? `<p class="small mb-0">${escapeHtml(b.intro)}</p>` : ''}
      <div class="small text-body-secondary mt-auto">
        ${b.taxCode ? 'MST ' + escapeHtml(b.taxCode) + ' · ' : ''}${escapeHtml(b.hq || 'Chưa có địa chỉ')}<br>
        ${b.stats.steps} thao tác trên chuỗi${b.approvedAt ? ' · tham gia ' + formatDate(b.approvedAt) : ''}
      </div>
      <a class="btn btn-outline-primary btn-sm align-self-start" href="businesses.html?address=${b.address}">Xem hồ sơ</a>
    </div></article></div>`;
}

function renderList() {
  const shown = businesses.filter(matches);
  document.getElementById('bizList').innerHTML = shown.map(businessCard).join('');
  let state = '';
  if (!businesses.length) state = 'Chưa có doanh nghiệp nào được duyệt.';
  else if (!shown.length) state = 'Không có doanh nghiệp nào khớp.';
  document.getElementById('bizState').textContent = state;
}

async function loadList() {
  try {
    businesses = await apiGet('/businesses');
    renderList();
  } catch (error) {
    document.getElementById('bizState').textContent = 'Không tải được danh sách doanh nghiệp.';
    showToast(error.message);
  }
}

// =============================================================
// 2. CHI TIẾT
// =============================================================
function explorerLink(kind, value, text) {
  if (!chain.explorerUrl || !value) return escapeHtml(text);
  return `<a href="${chain.explorerUrl}/${kind}/${value}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
}

function infoHtml(b) {
  const website = b.website ? `<a href="${escapeHtml(b.website)}" target="_blank" rel="noopener">${escapeHtml(b.website.replace(/^https?:\/\//, ''))}</a>` : '—';
  return `<dl class="row small mb-0">
    <dt class="col-sm-4 text-body-secondary">Mã số thuế</dt><dd class="col-sm-8">${escapeHtml(b.taxCode || '—')}</dd>
    <dt class="col-sm-4 text-body-secondary">Trụ sở</dt><dd class="col-sm-8">${escapeHtml(b.hq || '—')}</dd>
    <dt class="col-sm-4 text-body-secondary">Website</dt><dd class="col-sm-8">${website}</dd>
    <dt class="col-sm-4 text-body-secondary">Ví</dt><dd class="col-sm-8 font-monospace text-break">${explorerLink('address', b.address, b.address)}</dd>
    <dt class="col-sm-4 text-body-secondary">Ngày duyệt</dt><dd class="col-sm-8">${formatDate(b.approvedAt)}</dd>
    <dt class="col-sm-4 text-body-secondary">Giao dịch cấp vai trò</dt><dd class="col-sm-8 font-monospace">${b.txHash ? explorerLink('tx', b.txHash, shortAddress(b.txHash)) : '—'}</dd>
  </dl>`;
}

function statsHtml(b) {
  const stat = (value, label) => `<div class="col-4"><div class="biz-stat"><b>${value}</b><span>${label}</span></div></div>`;
  return `<div class="row g-2 my-3">${stat(b.stats.steps, 'Thao tác trên chuỗi')}${stat(b.stats.productsCreated, 'Sản phẩm đã tạo')}${stat(formatDate(b.stats.lastActivity), 'Hoạt động gần nhất')}</div>`;
}

function activityHtml(activity) {
  if (!activity.length) return '<p class="small text-body-secondary mb-0">Chưa có hoạt động nào trên chuỗi.</p>';
  return '<ul class="timeline">' + activity.map(a => `<li>
    <div class="d-flex flex-wrap gap-2 align-items-center mb-1">${statusBadge(a.status, a.statusText)}
      <a class="small" href="trace.html?id=${a.productId}">#${a.productId} ${escapeHtml(a.productName)}</a></div>
    <div class="small text-body-secondary">${formatTime(a.time)}${a.note ? ' · ' + escapeHtml(noteText(a.note)) : ''}</div>
  </li>`).join('') + '</ul>';
}

function detailHtml(b) {
  return `<div class="card mb-3"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div><h1 class="h4 fw-bold mb-1">${escapeHtml(b.name)}</h1><span class="badge text-bg-primary">${escapeHtml(b.roleText)}</span></div>
        ${activeBadge(b)}
      </div>
      ${b.intro ? `<p class="mt-3 mb-0">${escapeHtml(b.intro)}</p>` : ''}
      ${statsHtml(b)}${infoHtml(b)}
      <p class="small text-body-secondary mt-3 mb-0"><i class="bi bi-lock me-1"></i>Người đại diện, số điện thoại và email chỉ quản trị viên xem được.</p>
    </div></div>
    <div class="card"><div class="card-body">
      <h2 class="h6 fw-semibold mb-3">Hoạt động gần đây trên blockchain</h2>${activityHtml(b.activity)}
    </div></div>`;
}

async function loadDetail(address) {
  document.getElementById('listView').classList.add('d-none');
  document.getElementById('detailView').classList.remove('d-none');
  const body = document.getElementById('detailBody');
  body.innerHTML = '<p class="text-body-secondary">Đang tải...</p>';
  try {
    const business = await apiGet('/businesses/' + encodeURIComponent(address));
    document.title = business.name + ' | TraceChain';
    body.innerHTML = detailHtml(business);
  } catch (error) {
    body.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
  }
}

// =============================================================
// KHỞI ĐỘNG: không bắt buộc đăng nhập
// =============================================================
(async function start() {
  await initPage({ requireLogin: false });
  try {
    chain = await apiGet('/config');
  } catch (error) {
    // thiếu cấu hình chỉ mất link Etherscan
  }
  const address = new URLSearchParams(location.search).get('address');
  if (address) {
    loadDetail(address);
    return;
  }
  ['bizSearch', 'bizRole', 'bizShowRevoked'].forEach(id => document.getElementById(id).addEventListener('input', renderList));
  loadList();
})();

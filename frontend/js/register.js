// =============================================================
// ĐĂNG KÝ DOANH NGHIỆP BẰNG VÍ
// Bước 1: đăng nhập bằng chữ ký MetaMask (miễn phí)
// Bước 2: gửi hồ sơ (lưu ở backend, chưa ghi gì lên blockchain, miễn phí)
// Bước 3: chờ quản trị viên duyệt (sửa hồ sơ được trong lúc chờ)
// Bước 4: đã duyệt -> vai trò nằm trên blockchain, chức năng mở
// =============================================================
const ROLE_DESC = ['', 'Tạo sản phẩm, khai báo nguồn gốc', 'Nhận hàng và vận chuyển giữa các chặng',
  'Nhận hàng từ nhà sản xuất, chuyển tiếp cho cửa hàng', 'Nhận hàng và bán cho người tiêu dùng'];
const FIELDS = ['company', 'taxCode', 'hq', 'website', 'intro', 'rep', 'phone', 'email'];
// Đã duyệt thì tên, mã số thuế, vai trò gắn với dữ liệu trên chuỗi -> không tự sửa
const LOCKED_AFTER_APPROVAL = ['company', 'taxCode'];

let currentUser = null;
let formMode = 'new'; // 'new' = gửi mới, 'pending' = sửa khi chờ duyệt, 'approved' = sửa thông tin giới thiệu

// =============================================================
// 1. THANH BƯỚC
// =============================================================
function stepOf(user) {
  if (!user) return 1;
  if (user.isActive) return 5; // xong cả 4 bước
  if (user.application && user.application.status === 'pending') return 3;
  return 2;
}

function renderSteps(step) {
  const items = document.querySelectorAll('#regSteps li');
  items.forEach((li, index) => {
    li.classList.toggle('done', index + 1 < step);
    li.classList.toggle('current', index + 1 === step);
  });
}

// =============================================================
// 2. KHUNG TRẠNG THÁI THEO TỪNG TRƯỜNG HỢP
// =============================================================
function statusHtml(user) {
  const app = user.application;
  if (user.isAdmin) {
    return `<div class="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span><i class="bi bi-shield-check me-1"></i>Đây là ví quản trị. Ví này duyệt hồ sơ, không cần đăng ký.</span>
      <a class="btn btn-primary btn-sm" href="admin.html">Mở Quản trị</a></div>`;
  }
  if (user.isActive) {
    return `<div class="alert alert-success">
      <div class="fw-semibold mb-1"><i class="bi bi-patch-check me-1"></i>${escapeHtml(user.member.name)} đã được duyệt · ${escapeHtml(user.roleText)}</div>
      <div class="small mb-2">Vai trò đã ghi trên blockchain. Bạn dùng được mọi chức năng của ${escapeHtml(user.roleText)}.</div>
      <div class="d-flex flex-wrap gap-2">
        <a class="btn btn-success btn-sm" href="index.html">Vào Tổng quan</a>
        <a class="btn btn-outline-success btn-sm" href="businesses.html?address=${user.address}">Xem hồ sơ công khai</a>
        ${app ? '<button class="btn btn-outline-secondary btn-sm" type="button" data-action="edit">Sửa thông tin giới thiệu</button>' : ''}
      </div></div>`;
  }
  if (user.member && !user.member.isActive) {
    return `<div class="alert alert-danger"><i class="bi bi-slash-circle me-1"></i>
      Vai trò ${escapeHtml(user.member.roleText)} của ví này đã bị quản trị viên thu hồi. Lịch sử cũ vẫn giữ trên blockchain.
      Liên hệ quản trị viên nếu cần mở lại.</div>`;
  }
  if (app && app.status === 'pending') return pendingHtml(app);
  if (app && app.status === 'rejected') {
    return `<div class="alert alert-danger"><div class="fw-semibold">Hồ sơ ${escapeHtml(app.id)} bị từ chối</div>
      <div class="small">Lý do: ${escapeHtml(app.reason)}. Sửa lại thông tin bên dưới và gửi hồ sơ mới.</div></div>`;
  }
  return '';
}

function pendingHtml(app) {
  return `<div class="card mb-3"><div class="card-body">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <h2 class="h5 fw-semibold mb-0">Hồ sơ ${escapeHtml(app.id)} đang chờ duyệt</h2>
      <span class="badge text-bg-warning">Chờ duyệt</span>
    </div>
    <dl class="row small mb-2">
      <dt class="col-sm-4 text-body-secondary">Doanh nghiệp</dt><dd class="col-sm-8">${escapeHtml(app.company)}</dd>
      <dt class="col-sm-4 text-body-secondary">Mã số thuế</dt><dd class="col-sm-8">${escapeHtml(app.taxCode)}</dd>
      <dt class="col-sm-4 text-body-secondary">Vai trò xin cấp</dt><dd class="col-sm-8">${escapeHtml(app.roleText)}</dd>
      <dt class="col-sm-4 text-body-secondary">Gửi lúc</dt><dd class="col-sm-8">${formatTime(app.submittedAt)}</dd>
    </dl>
    <p class="small text-body-secondary mb-2"><i class="bi bi-lock me-1"></i>Trong lúc chờ, bạn đăng nhập được nhưng chức năng
      ${escapeHtml(app.roleText)} còn khoá. Hãy chuẩn bị sẵn SepoliaETH trong ví để trả phí gas khi bắt đầu thao tác.</p>
    <button class="btn btn-outline-primary btn-sm" type="button" data-action="edit"><i class="bi bi-pencil me-1"></i>Sửa hồ sơ</button>
  </div></div>`;
}

// =============================================================
// 3. FORM HỒ SƠ
// =============================================================
function renderRoleOptions() {
  document.getElementById('roleOptions').innerHTML = [1, 2, 3, 4].map(role => `<div class="col-sm-6">
    <label class="role-option">
      <input class="form-check-input" type="radio" name="role" value="${role}">
      <span><b>${ROLE_TEXT[role]}</b><small>${ROLE_DESC[role]}</small></span>
    </label></div>`).join('');
}

function fillForm(app) {
  const form = document.getElementById('appForm');
  for (const field of FIELDS) form.elements[field].value = app ? app[field] || '' : '';
  form.querySelectorAll('input[name="role"]').forEach(radio => { radio.checked = !!app && Number(radio.value) === app.role; });
}

// Mở form theo chế độ: gửi mới / sửa khi chờ duyệt / sửa thông tin giới thiệu sau khi duyệt
function openForm(mode, app) {
  formMode = mode;
  const form = document.getElementById('appForm');
  fillForm(app);
  const locked = mode === 'approved';
  LOCKED_AFTER_APPROVAL.forEach(field => { form.elements[field].disabled = locked; });
  form.querySelectorAll('input[name="role"]').forEach(radio => { radio.disabled = locked; });
  document.getElementById('agreeRow').classList.toggle('d-none', mode !== 'new');
  document.getElementById('cancelEdit').classList.toggle('d-none', mode === 'new');
  document.getElementById('formTitle').textContent = mode === 'new' ? 'Hồ sơ doanh nghiệp' : 'Sửa hồ sơ';
  document.getElementById('submitButton').textContent = mode === 'new' ? 'Gửi hồ sơ' : 'Lưu thay đổi';
  document.getElementById('formWallet').textContent = shortAddress(currentUser.address);
  showFormError(document.getElementById('formError'), '');
  form.classList.remove('d-none');
}

function readForm() {
  const form = document.getElementById('appForm');
  const body = {};
  for (const field of FIELDS) body[field] = form.elements[field].value.trim();
  const role = form.querySelector('input[name="role"]:checked');
  body.role = role ? Number(role.value) : 0;
  return body;
}

// Kiểm tra nhanh ở trình duyệt; backend vẫn kiểm tra lại đầy đủ
function validateForm(body) {
  if (body.company.length < 3) return 'Nhập tên doanh nghiệp (tối thiểu 3 ký tự).';
  if (!/^\d{10}(-\d{3})?$/.test(body.taxCode)) return 'Mã số thuế gồm 10 chữ số, chi nhánh thêm -XXX.';
  if (!/^0\d{9}$/.test(body.phone)) return 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
  if (!body.role) return 'Chọn vai trò muốn được cấp.';
  if (formMode === 'new' && !document.getElementById('agree').checked) return 'Cần xác nhận thông tin là chính xác.';
  return '';
}

async function submitForm(event) {
  event.preventDefault();
  const body = readForm();
  const errorBox = document.getElementById('formError');
  const problem = validateForm(body);
  showFormError(errorBox, problem);
  if (problem) return;

  const button = document.getElementById('submitButton');
  setButtonBusy(button, true);
  try {
    if (formMode === 'new') await apiPost('/applications', body);
    else await apiPut('/applications/me', body);
    showToast(formMode === 'new' ? 'Đã gửi hồ sơ. Không tốn phí gas.' : 'Đã lưu thay đổi.', 'success');
    await refresh();
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// 4. VẼ LẠI TOÀN TRANG THEO TRẠNG THÁI MỚI NHẤT
// =============================================================
async function refresh() {
  if (getSession()) currentUser = await loadCurrentUser();
  render(currentUser);
}

function render(user) {
  renderSteps(stepOf(user));
  document.getElementById('guestBox').classList.toggle('d-none', !!user);
  document.getElementById('appForm').classList.add('d-none');
  document.getElementById('statusBox').innerHTML = user ? statusHtml(user) : '';
  if (!user || user.isAdmin || user.member) return;
  const app = user.application;
  if (!app) openForm('new', null);
  else if (app.status === 'rejected') openForm('new', app);
}

function onStatusClick(event) {
  if (!event.target.closest('[data-action="edit"]')) return;
  const app = currentUser.application;
  openForm(app.status === 'approved' ? 'approved' : 'pending', app);
  document.getElementById('appForm').scrollIntoView({ behavior: 'smooth' });
}

async function signIn() {
  const button = document.getElementById('signInButton');
  const errorBox = document.getElementById('guestError');
  showFormError(errorBox, '');
  setButtonBusy(button, true, 'Đang chờ MetaMask...');
  try {
    await signInWithWallet();
    location.reload(); // nạp lại navbar với phiên mới
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// KHỞI ĐỘNG: trang mở cho cả khách (bước 1 nằm ngay tại đây)
// =============================================================
(async function start() {
  renderRoleOptions();
  currentUser = await initPage({ requireLogin: false });
  render(currentUser);
  document.getElementById('signInButton').addEventListener('click', signIn);
  document.getElementById('appForm').addEventListener('submit', submitForm);
  document.getElementById('statusBox').addEventListener('click', onStatusClick);
  document.getElementById('cancelEdit').addEventListener('click', () => render(currentUser));
})();

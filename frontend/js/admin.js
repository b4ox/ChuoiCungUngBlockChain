// =============================================================
// QUẢN TRỊ (chỉ ví owner của contract)
// - Duyệt hồ sơ: ký registerParticipant trong MetaMask -> chờ vào khối
//   -> báo backend (POST /applications/:id/approve) để đánh dấu đã duyệt.
// - Từ chối: chỉ ghi ở backend kèm lý do, không tốn gas.
// - Thu hồi / mở lại vai trò: ký deactivateParticipant / registerParticipant.
// =============================================================
let applications = [];
let members = [];
let currentTab = 'pending';
const confirmRevoke = {}; // địa chỉ -> true khi đã bấm "Thu hồi" lần 1

// =============================================================
// 1. TAB
// =============================================================
function renderTabs() {
  document.querySelectorAll('#adminTabs [data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === currentTab);
  });
  ['pending', 'approved', 'rejected'].forEach(status => {
    document.querySelector(`[data-count="${status}"]`).textContent = applications.filter(a => a.status === status).length;
  });
  document.querySelector('[data-count="members"]').textContent = members.length;
  document.getElementById('applicationPane').classList.toggle('d-none', currentTab === 'members');
  document.getElementById('memberPane').classList.toggle('d-none', currentTab !== 'members');
}

// =============================================================
// 2. THẺ HỒ SƠ
// =============================================================
function applicationInfo(app) {
  const row = (label, value) => `<dt class="col-sm-3 text-body-secondary">${label}</dt><dd class="col-sm-9">${value}</dd>`;
  return `<dl class="row small mb-2">
    ${row('Vai trò xin cấp', '<b>' + escapeHtml(app.roleText) + '</b>')}
    ${row('Mã số thuế', escapeHtml(app.taxCode))}
    ${row('Trụ sở', escapeHtml(app.hq))}
    ${row('Website', escapeHtml(app.website || '—'))}
    ${row('Giới thiệu', escapeHtml(app.intro || '—'))}
    ${row('Đại diện', escapeHtml(app.rep) + ' · ' + escapeHtml(app.phone) + ' · ' + escapeHtml(app.email))}
    ${row('Ví', '<span class="font-monospace text-break">' + escapeHtml(app.address) + '</span>')}
    ${row('Gửi lúc', formatTime(app.submittedAt) + (app.updatedAt !== app.submittedAt ? ' · sửa ' + formatTime(app.updatedAt) : ''))}
  </dl>`;
}

function applicationActions(app) {
  if (app.status === 'approved') {
    return `<p class="small text-body-secondary mb-0">Duyệt lúc ${formatTime(app.decidedAt)}${app.txHash ? ' · tx <span class="font-monospace">' + shortAddress(app.txHash) + '</span>' : ''}</p>`;
  }
  if (app.status === 'rejected') return `<p class="small mb-0">Lý do từ chối: ${escapeHtml(app.reason)}</p>`;
  return `<div class="d-flex flex-wrap gap-2 align-items-center">
      <button class="btn btn-primary btn-sm" type="button" data-action="approve" data-id="${app.id}"><i class="bi bi-check2-circle me-1"></i>Duyệt và ghi lên blockchain</button>
      <button class="btn btn-outline-danger btn-sm" type="button" data-action="toggle-reject" data-id="${app.id}">Từ chối</button>
      <span class="small text-body-secondary">Duyệt = ký registerParticipant bằng ví quản trị (tốn phí gas)</span>
    </div>
    <div class="mt-2 d-none" id="reject-${app.id}">
      <label class="form-label small" for="reason-${app.id}">Lý do từ chối (doanh nghiệp sẽ thấy)</label>
      <textarea class="form-control form-control-sm mb-2" id="reason-${app.id}" rows="2" maxlength="300" placeholder="Ví dụ: Mã số thuế không khớp tên doanh nghiệp"></textarea>
      <button class="btn btn-danger btn-sm" type="button" data-action="reject" data-id="${app.id}">Xác nhận từ chối</button>
    </div>`;
}

function applicationCard(app) {
  const badge = { pending: 'warning', approved: 'success', rejected: 'danger' }[app.status];
  return `<div class="card mb-3"><div class="card-body">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <h2 class="h6 fw-semibold mb-0">${escapeHtml(app.company)}</h2>
      <span><span class="small text-body-secondary font-monospace me-2">${escapeHtml(app.id)}</span><span class="badge text-bg-${badge}">${escapeHtml(app.statusText)}</span></span>
    </div>
    ${applicationInfo(app)}${applicationActions(app)}
  </div></div>`;
}

function renderApplications() {
  if (currentTab === 'members') return;
  const shown = applications.filter(app => app.status === currentTab);
  document.getElementById('applicationList').innerHTML = shown.map(applicationCard).join('');
  document.getElementById('applicationState').textContent = shown.length ? '' : 'Không có hồ sơ nào ở mục này.';
}

// =============================================================
// 3. BẢNG THÀNH VIÊN TRÊN CHUỖI
// =============================================================
function matchesMember(member) {
  const search = document.getElementById('memberSearch').value.trim().toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const active = document.getElementById('activeFilter').value;
  const text = (member.name + ' ' + member.address).toLowerCase();
  if (search && !text.includes(search)) return false;
  if (role && member.role !== Number(role)) return false;
  if (active && member.isActive !== (active === 'active')) return false;
  return true;
}

function memberAction(member) {
  if (!member.isActive) {
    return `<button class="btn btn-outline-success btn-sm" type="button" data-action="reactivate" data-address="${member.address}">Mở lại</button>`;
  }
  const label = confirmRevoke[member.address] ? 'Bấm lần nữa để thu hồi' : 'Thu hồi';
  return `<button class="btn btn-outline-danger btn-sm" type="button" data-action="revoke" data-address="${member.address}">${label}</button>`;
}

function memberRow(member) {
  const status = member.isActive
    ? '<span class="badge text-bg-success">Đang hoạt động</span>'
    : '<span class="badge text-bg-secondary">Đã thu hồi</span>';
  return `<tr>
    <td class="fw-semibold"><a href="businesses.html?address=${member.address}">${escapeHtml(member.name)}</a></td>
    <td class="font-monospace small" title="${escapeHtml(member.address)}">${shortAddress(member.address)}</td>
    <td>${escapeHtml(member.roleText)}</td>
    <td>${status}</td>
    <td class="text-end">${memberAction(member)}</td>
  </tr>`;
}

function renderMembers() {
  const shown = members.filter(matchesMember);
  document.getElementById('memberBody').innerHTML = shown.map(memberRow).join('');
  let state = '';
  if (!members.length) state = 'Chưa có thành viên nào.';
  else if (!shown.length) state = 'Không tìm thấy thành viên phù hợp.';
  document.getElementById('memberState').textContent = state;
}

async function loadAll() {
  try {
    [applications, members] = await Promise.all([apiGet('/applications'), apiGet('/participants')]);
    renderTabs();
    renderApplications();
    renderMembers();
  } catch (error) {
    document.getElementById('applicationState').textContent = 'Không tải được dữ liệu.';
    showToast(error.message);
  }
}

// =============================================================
// 4. HÀNH ĐỘNG: duyệt, từ chối, thu hồi, mở lại
// =============================================================
async function approve(app, button) {
  setButtonBusy(button, true, 'Xác nhận trong MetaMask...');
  try {
    const result = await sendContractTx('registerParticipant', [app.address, app.company, app.role],
      () => setButtonBusy(button, true, 'Đang chờ vào khối...'));
    await apiPost('/applications/' + app.id + '/approve', { txHash: result.txHash });
    showToast('Đã duyệt ' + app.company + '. ' + transactionMessage(result), 'success');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

async function reject(app, button) {
  const reason = document.getElementById('reason-' + app.id).value.trim();
  if (reason.length < 5) {
    showToast('Nhập lý do từ chối (tối thiểu 5 ký tự).');
    return;
  }
  setButtonBusy(button, true);
  try {
    await apiPost('/applications/' + app.id + '/reject', { reason });
    showToast('Đã từ chối hồ sơ ' + app.id + '.', 'success');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// Thu hồi cần bấm 2 lần để tránh bấm nhầm (không dùng hộp confirm của trình duyệt)
async function revokeOrReactivate(member, button, revoking) {
  if (revoking && !confirmRevoke[member.address]) {
    confirmRevoke[member.address] = true;
    renderMembers();
    return;
  }
  delete confirmRevoke[member.address];
  setButtonBusy(button, true, 'MetaMask...');
  try {
    const method = revoking ? 'deactivateParticipant' : 'registerParticipant';
    const args = revoking ? [member.address] : [member.address, member.name, member.role];
    const result = await sendContractTx(method, args, () => setButtonBusy(button, true, 'Đang chờ...'));
    showToast((revoking ? 'Đã thu hồi ' : 'Đã mở lại ') + member.name + '. ' + transactionMessage(result), 'success');
    await refreshPublicData();
    await loadAll();
  } catch (error) {
    showToast(error.message);
    renderMembers();
  }
}

async function onAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const app = applications.find(item => item.id === button.dataset.id);
  const member = members.find(item => item.address === button.dataset.address);
  const action = button.dataset.action;
  if (action === 'approve') await approve(app, button);
  if (action === 'toggle-reject') document.getElementById('reject-' + app.id).classList.toggle('d-none');
  if (action === 'reject') await reject(app, button);
  if (action === 'revoke') await revokeOrReactivate(member, button, true);
  if (action === 'reactivate') await revokeOrReactivate(member, button, false);
}

// =============================================================
// KHỞI ĐỘNG: bắt buộc đăng nhập bằng ví quản trị
// =============================================================
(async function start() {
  const user = await initPage({ requireLogin: true });
  if (!user) return;
  document.getElementById('notAdmin').classList.toggle('d-none', user.isAdmin);
  document.getElementById('adminArea').classList.toggle('d-none', !user.isAdmin);
  if (!user.isAdmin) return;

  document.getElementById('adminTabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    currentTab = tab.dataset.tab;
    renderTabs();
    renderApplications();
  });
  document.getElementById('applicationList').addEventListener('click', onAction);
  document.getElementById('memberBody').addEventListener('click', onAction);
  ['memberSearch', 'roleFilter', 'activeFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderMembers);
  });
  loadAll();
})();

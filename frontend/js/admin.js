// =============================================================
// THÀNH VIÊN: ai cũng xem được danh sách; chỉ quản trị viên được
// cấp vai trò cho ví (gọi registerParticipant qua POST /participants).
// =============================================================
let members = [];

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

function memberRow(member) {
  const status = member.isActive
    ? '<span class="badge text-bg-success">Đang hoạt động</span>'
    : '<span class="badge text-bg-secondary">Ngừng hoạt động</span>';
  return `<tr>
    <td class="fw-semibold">${escapeHtml(member.name)}</td>
    <td class="font-monospace small" title="${escapeHtml(member.address)}">${shortAddress(member.address)}</td>
    <td>${escapeHtml(member.roleText)}</td>
    <td>${status}</td>
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

// Ô chọn ví trong form: chỉ các ví chưa có vai trò (trừ ví admin)
function renderFreeAccounts(accounts) {
  const free = accounts.filter(account => !account.isAdmin && account.role === ROLE.NONE);
  const options = free.map(account =>
    `<option value="${escapeHtml(account.address)}">Account ${account.index} · ${escapeHtml(account.address)}</option>`);
  const placeholder = free.length ? 'Chọn ví' : 'Không còn ví trống';
  document.getElementById('memberAccount').innerHTML = `<option value="">${placeholder}</option>` + options.join('');
}

async function loadMembers() {
  try {
    const [participants, accounts] = await Promise.all([apiGet('/participants'), apiGet('/accounts')]);
    members = participants;
    renderMembers();
    renderFreeAccounts(accounts);
  } catch (error) {
    document.getElementById('memberState').textContent = 'Không tải được danh sách thành viên.';
    showToast(error.message);
  }
}

async function submitMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('memberFormError');
  const body = {
    account: form.elements.account.value,
    name: form.elements.name.value.trim(),
    role: Number(form.elements.role.value),
  };
  if (!body.account || !body.name) {
    showFormError(errorBox, 'Vui lòng chọn ví và nhập tên thành viên.');
    return;
  }

  showFormError(errorBox, '');
  setButtonBusy(button, true);
  try {
    const result = await apiPost('/participants', body);
    form.reset();
    bootstrap.Modal.getOrCreateInstance('#memberModal').hide();
    showToast(transactionMessage(result), 'success');
    await loadMembers();
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// KHỞI ĐỘNG: bắt buộc đăng nhập; nút cấp vai trò chỉ dành cho admin
// =============================================================
(async function start() {
  const user = await initPage({ requireLogin: true });
  if (!user) return;

  document.getElementById('openMemberForm').classList.toggle('d-none', !user.isAdmin);
  if (user.isAdmin) {
    document.getElementById('adminHint').textContent = 'Cấp vai trò cho ví mới đăng ký để họ bắt đầu thao tác.';
  }
  document.getElementById('memberForm').addEventListener('submit', submitMember);
  ['memberSearch', 'roleFilter', 'activeFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderMembers);
  });
  loadMembers();
})();

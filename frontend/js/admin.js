// =============================================================
// THÀNH VIÊN: lọc dữ liệu đã tải, không thay đổi danh sách gốc.
// =============================================================
let members = [];
let membersLoaded = false;
let isRegistering = false;
const adminDialog = document.getElementById('adminDialog');

function filteredMembers() {
  const search = document.getElementById('memberSearch').value.trim().toLocaleLowerCase('vi');
  const role = document.getElementById('memberFilterRole').value;
  const active = document.getElementById('memberFilterActive').value;
  return members.filter(member => {
    const matchesText = (member.name || '').toLocaleLowerCase('vi').includes(search) || (member.address || '').toLowerCase().includes(search);
    const matchesRole = role === '' || member.role === Number(role);
    const matchesActive = active === '' || member.isActive === (active === 'active');
    return matchesText && matchesRole && matchesActive;
  });
}

function renderMembers() {
  if (!membersLoaded) return;
  const shown = filteredMembers();
  document.getElementById('memberCount').textContent = 'Hiển thị ' + shown.length + ' / ' + members.length + ' thành viên';
  document.getElementById('memberState').textContent = shown.length ? '' : (members.length ? 'Không tìm thấy thành viên phù hợp.' : 'Chưa có thành viên.');
  document.getElementById('memberBody').innerHTML = shown.map(member => '<tr><td><strong>' + escapeHtml(member.name) + '</strong></td><td title="' + escapeHtml(member.address) + '">' + escapeHtml(shortAddress(member.address)) + '</td><td>' + escapeHtml(member.roleText) + '</td><td><span class="member-status ' + (member.isActive ? 'active' : 'inactive') + '">' + (member.isActive ? 'Đang hoạt động' : 'Không hoạt động') + '</span></td></tr>').join('');
}

function renderAvailableAccounts(accounts) {
  const available = accounts.filter(account => !account.isAdmin && account.role === 0);
  const select = document.getElementById('memberAccount');
  select.innerHTML = '<option value="">' + (available.length ? 'Chọn tài khoản' : 'Không có tài khoản chưa đăng ký') + '</option>' + available.map(account => '<option value="' + escapeHtml(account.address) + '">' + escapeHtml(account.address) + '</option>').join('');
}

async function loadMembers() {
  try {
    const [loadedMembers, accounts] = await Promise.all([apiGet('/participants'), apiGet('/accounts')]);
    members = loadedMembers;
    membersLoaded = true;
    renderMembers();
    renderAvailableAccounts(accounts);
  } catch (error) {
    membersLoaded = false;
    document.getElementById('memberState').textContent = 'Không thể tải danh sách thành viên.';
    document.getElementById('memberCount').textContent = 'Chưa có dữ liệu';
    showToast(error.message);
  }
}

// =============================================================
// ĐĂNG KÝ: chỉ quản trị viên thấy nút, giữ form khi giao dịch lỗi.
// =============================================================
document.addEventListener('accountChanged', event => {
  const isAdmin = Boolean(event.detail && event.detail.isAdmin);
  document.getElementById('openAdminDialog').hidden = !isAdmin;
  document.getElementById('adminHint').hidden = isAdmin;
  if (!isAdmin && adminDialog.open && !isRegistering) adminDialog.close();
});

function closeAdminDialog() {
  if (!isRegistering) adminDialog.close();
}

async function registerMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('adminFormError');
  const name = document.getElementById('memberName').value.trim();
  if (!name) { errorBox.textContent = 'Vui lòng nhập tên thành viên.'; errorBox.hidden = false; return; }
  const body = { account: document.getElementById('memberAccount').value, name, role: Number(document.getElementById('memberRole').value) };
  errorBox.hidden = true;
  isRegistering = true;
  button.disabled = true;
  button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Đang xử lý...';
  try {
    const result = await apiPost('/participants', body);
    form.reset();
    adminDialog.close();
    showToast(transactionMessage(result), 'success');
    await loadMembers();
  } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
  finally { isRegistering = false; button.disabled = false; button.textContent = 'Đăng ký thành viên'; }
}

document.getElementById('openAdminDialog').addEventListener('click', () => { document.getElementById('adminFormError').hidden = true; adminDialog.showModal(); document.getElementById('memberName').focus(); });
document.getElementById('closeAdminDialog').addEventListener('click', closeAdminDialog);
document.getElementById('cancelAdminDialog').addEventListener('click', closeAdminDialog);
adminDialog.addEventListener('cancel', event => { if (isRegistering) event.preventDefault(); });
document.getElementById('adminForm').addEventListener('submit', registerMember);
document.getElementById('memberSearch').addEventListener('input', renderMembers);
document.getElementById('memberFilterRole').addEventListener('change', renderMembers);
document.getElementById('memberFilterActive').addEventListener('change', renderMembers);
document.querySelector('.mode-text').textContent = CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Dữ liệu từ backend';
document.querySelectorAll('.mock-only').forEach(item => { item.hidden = !CONFIG.USE_MOCK; });
setupAccountPicker();
loadMembers();

// =============================================================
// ĐĂNG KÝ: tạo tài khoản đăng nhập gắn với một ví Ganache còn trống,
// đăng ký xong tự đăng nhập luôn.
// =============================================================

// Danh sách ví lấy từ /accounts; ví đã có tài khoản thì khoá lại
async function loadWallets() {
  const select = document.getElementById('address');
  try {
    const accounts = await apiGet('/accounts');
    const options = accounts.map(account => {
      const label = 'Account ' + account.index + ' · ' + shortAddress(account.address) + ' · ' + walletRoleText(account);
      const taken = account.hasLogin ? ' disabled' : '';
      const suffix = account.hasLogin ? ' (đã có tài khoản)' : '';
      return `<option value="${escapeHtml(account.address)}"${taken}>${escapeHtml(label + suffix)}</option>`;
    });
    select.innerHTML = '<option value="">Chọn ví</option>' + options.join('');
  } catch (error) {
    select.innerHTML = '<option value="">Không tải được danh sách ví</option>';
    showToast(error.message);
  }
}

function walletRoleText(account) {
  if (account.isAdmin) return 'Quản trị viên';
  return account.role === ROLE.NONE ? 'Chưa có vai trò' : account.roleText;
}

// Kiểm tra dữ liệu trước khi gửi; trả về câu lỗi hoặc '' nếu hợp lệ
function validateRegister(data) {
  if (!data.displayName) return 'Vui lòng nhập tên hiển thị.';
  if (!/^[a-z0-9_]{3,20}$/.test(data.username)) return 'Tên đăng nhập gồm 3–20 ký tự a-z, 0-9 hoặc _.';
  if (data.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (data.password !== data.confirmPassword) return 'Hai lần nhập mật khẩu không khớp.';
  if (!data.address) return 'Vui lòng chọn ví Ganache.';
  return '';
}

async function submitRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('registerError');
  const data = Object.fromEntries(new FormData(form));
  data.username = data.username.trim().toLowerCase();
  data.displayName = data.displayName.trim();

  const problem = validateRegister(data);
  showFormError(errorBox, problem);
  if (problem) return;

  setButtonBusy(button, true);
  try {
    const { confirmPassword, ...body } = data;
    await apiPost('/auth/register', body);
    const result = await apiPost('/auth/login', { username: body.username, password: body.password });
    saveSession(result);
    location.href = 'index.html';
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// KHỞI ĐỘNG
// =============================================================
if (getSession()) {
  location.replace('index.html');
}
document.getElementById('loginLink').href = 'login.html' + location.search;
document.getElementById('registerForm').addEventListener('submit', submitRegister);
loadWallets();

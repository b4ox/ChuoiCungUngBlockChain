// =============================================================
// ĐĂNG NHẬP: kiểm tra tài khoản, lưu phiên rồi quay về trang
// người dùng định mở (tham số ?next=).
// =============================================================

// Chỉ cho quay về trang .html trong cùng thư mục (tránh chuyển hướng ra web lạ)
function nextPage() {
  const next = new URLSearchParams(location.search).get('next') || '';
  return /^[a-z]+\.html(\?[\w=&%-]*)?$/.test(next) ? next : 'index.html';
}

async function submitLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const errorBox = document.getElementById('loginError');
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;

  if (!username || !password) {
    showFormError(errorBox, 'Vui lòng nhập tên đăng nhập và mật khẩu.');
    return;
  }

  showFormError(errorBox, '');
  setButtonBusy(button, true);
  try {
    const result = await apiPost('/auth/login', { username, password });
    saveSession(result);
    location.href = nextPage();
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// Hiện / ẩn mật khẩu đang gõ
function togglePassword() {
  const input = document.getElementById('password');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  this.innerHTML = showing ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
}

// =============================================================
// TÀI KHOẢN DEMO: gắn 5 tên đăng nhập với Account 0–4 của Ganache
// để buổi demo không phải đăng ký từng người. Chỉ dùng khi giả lập.
// =============================================================
const DEMO_USERS = [
  { username: 'admin', displayName: 'Quản trị viên', index: 0 },
  { username: 'nhasanxuat', displayName: 'Công ty Trà Thái Nguyên', index: 1 },
  { username: 'vanchuyen', displayName: 'Giao Hàng Nhanh', index: 2 },
  { username: 'nhaphanphoi', displayName: 'NPP Miền Bắc', index: 3 },
  { username: 'banle', displayName: 'Siêu thị ABC', index: 4 },
];

async function createDemoUsers() {
  const button = this;
  setButtonBusy(button, true);
  let created = 0;
  try {
    const accounts = await apiGet('/accounts');
    for (const demo of DEMO_USERS) {
      const account = accounts.find(item => item.index === demo.index);
      if (!account || account.hasLogin) continue; // ví đã có tài khoản thì bỏ qua
      await apiPost('/auth/register', { ...demo, address: account.address, password: '123456' });
      created++;
    }
    showToast(created ? 'Đã tạo ' + created + ' tài khoản demo.' : 'Tài khoản demo đã có sẵn.', 'success');
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// =============================================================
// KHỞI ĐỘNG: đã đăng nhập rồi thì vào thẳng trang chính
// =============================================================
if (getSession()) {
  location.replace(nextPage());
}
document.getElementById('registerLink').href = 'register.html' + location.search;
document.getElementById('loginForm').addEventListener('submit', submitLogin);
document.getElementById('togglePassword').addEventListener('click', togglePassword);
document.getElementById('demoBox').classList.toggle('d-none', !CONFIG.AUTH_MOCK);
document.getElementById('createDemoButton').addEventListener('click', createDemoUsers);

// =============================================================
// ĐĂNG NHẬP BẰNG VÍ: kết nối MetaMask -> ký thông điệp -> nhận token.
// Xong thì đưa người dùng tới đúng chỗ:
//   ví quản trị -> Quản trị; thành viên đang hoạt động -> trang định mở;
//   ví chưa là thành viên -> trang Hồ sơ doanh nghiệp.
// =============================================================

// Chỉ cho quay về trang .html trong cùng thư mục (tránh chuyển hướng ra web lạ)
function nextPage() {
  const next = new URLSearchParams(location.search).get('next') || '';
  return /^[a-z]+\.html(\?[\w=&%.-]*)?$/.test(next) ? next : 'index.html';
}

async function destinationAfterLogin() {
  const user = await loadCurrentUser();
  if (user.isAdmin) return new URLSearchParams(location.search).get('next') ? nextPage() : 'admin.html';
  if (user.isActive) return nextPage();
  return 'register.html';
}

async function login() {
  const button = document.getElementById('loginButton');
  const errorBox = document.getElementById('loginError');
  showFormError(errorBox, '');
  setButtonBusy(button, true, 'Đang chờ MetaMask...');
  try {
    await signInWithWallet();
    location.href = await destinationAfterLogin();
  } catch (error) {
    showFormError(errorBox, error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

// Hiện tên mạng thật lấy từ backend (Sepolia, hoặc Ganache Local khi chạy thử)
async function showNetworkName() {
  try {
    const config = await getChainConfig();
    document.getElementById('networkName').textContent = config.chainName;
  } catch (error) {
    showFormError(document.getElementById('loginError'), error.message);
  }
}

// =============================================================
// KHỞI ĐỘNG: đã đăng nhập (token còn hạn) thì vào thẳng
// =============================================================
(async function start() {
  const params = new URLSearchParams(location.search);
  document.getElementById('changedAlert').classList.toggle('d-none', !params.get('changed'));
  document.getElementById('noWallet').classList.toggle('d-none', hasWallet());
  document.getElementById('loginButton').disabled = !hasWallet();
  document.getElementById('loginButton').addEventListener('click', login);
  showNetworkName();

  if (getSession()) {
    try {
      location.replace(await destinationAfterLogin());
    } catch (error) {
      clearSession(); // token hết hạn -> ở lại trang đăng nhập
    }
  }
})();

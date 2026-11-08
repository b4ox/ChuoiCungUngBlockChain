// =============================================================
// TỔNG QUAN: 4 thẻ thống kê + bảng hoạt động gần đây
// (lấy từ event StatusChanged qua GET /events)
// =============================================================

function renderWelcome(user) {
  document.getElementById('welcome').textContent = 'Xin chào, ' + user.displayName + ' · ' + accountStatusText(user);
  const alertBox = document.getElementById('roleAlert');
  const message = roleAlertHtml(user);
  alertBox.innerHTML = message;
  alertBox.classList.toggle('d-none', !message);
}

// Ví đăng nhập được nhưng chưa dùng được chức năng nào -> nói rõ vì sao và làm gì tiếp
function roleAlertHtml(user) {
  if (user.isAdmin || user.isActive) return '';
  const app = user.application;
  if (user.member && !user.member.isActive) {
    return '<i class="bi bi-slash-circle me-1"></i>Vai trò của ví này đã bị quản trị viên thu hồi.';
  }
  if (app && app.status === 'pending') {
    return `<i class="bi bi-hourglass-split me-1"></i>Hồ sơ <b>${escapeHtml(app.id)}</b> đang chờ duyệt. Chức năng
      ${escapeHtml(app.roleText)} sẽ mở khi quản trị viên ghi vai trò lên blockchain. <a href="register.html">Xem hồ sơ</a>`;
  }
  if (app && app.status === 'rejected') {
    return `<i class="bi bi-x-circle me-1"></i>Hồ sơ ${escapeHtml(app.id)} bị từ chối: ${escapeHtml(app.reason)}.
      <a href="register.html">Sửa và gửi lại</a>`;
  }
  return '<i class="bi bi-file-earmark-plus me-1"></i>Ví này chưa đăng ký doanh nghiệp. <a href="register.html">Gửi hồ sơ</a> để được cấp vai trò.';
}

function renderStats(products, participants) {
  const inTransit = products.filter(product => product.status === 1 || product.status === 3);
  const sold = products.filter(product => product.status === 5);
  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('inTransit').textContent = inTransit.length;
  document.getElementById('soldProducts').textContent = sold.length;
  document.getElementById('totalParticipants').textContent = participants.length;
}

function activityRow(event, products) {
  const product = products.find(item => item.id === event.productId);
  const name = product ? product.name : 'Sản phẩm #' + event.productId;
  return `<tr>
    <td><a href="trace.html?id=${event.productId}">${escapeHtml(name)}</a><div class="small text-body-secondary">Mã #${event.productId}</div></td>
    <td>${statusBadge(event.status, event.statusText)}</td>
    <td>${escapeHtml(event.actorName || shortAddress(event.actor))}</td>
    <td class="text-nowrap">${formatTime(event.time)}</td>
    <td><span class="badge text-bg-light font-monospace">#${escapeHtml(event.blockNumber)}</span></td>
  </tr>`;
}

function renderActivity(events, products) {
  // Mới nhất lên đầu, chỉ lấy 10 dòng
  const recent = [...events].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
  document.getElementById('activityBody').innerHTML = recent.map(event => activityRow(event, products)).join('');
  document.getElementById('activityState').textContent = recent.length ? '' : 'Chưa có hoạt động nào.';
}

async function loadDashboard() {
  try {
    const [products, participants, events] = await Promise.all([
      apiGet('/products'),
      apiGet('/participants'),
      apiGet('/events?limit=20'),
    ]);
    renderStats(products, participants);
    renderActivity(events, products);
  } catch (error) {
    document.getElementById('activityState').textContent = 'Không tải được dữ liệu. Hãy kiểm tra backend rồi tải lại trang.';
    showToast(error.message);
  }
}

// =============================================================
// KHỞI ĐỘNG: bắt buộc đăng nhập
// =============================================================
(async function start() {
  const user = await initPage({ requireLogin: true });
  if (!user) return;
  renderWelcome(user);
  loadDashboard();
})();

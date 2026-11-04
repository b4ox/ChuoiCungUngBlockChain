// =============================================================
// TỔNG QUAN: 4 thẻ thống kê + bảng hoạt động gần đây
// (lấy từ event StatusChanged qua GET /events)
// =============================================================

function renderWelcome(user) {
  const roleText = user.isAdmin ? 'Quản trị viên' : user.roleText;
  document.getElementById('welcome').textContent = 'Xin chào, ' + user.displayName + ' · ' + roleText;
  const waitingForRole = !user.isAdmin && user.role === ROLE.NONE;
  document.getElementById('roleAlert').classList.toggle('d-none', !waitingForRole);
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

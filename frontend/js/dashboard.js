// =============================================================
// TỔNG QUAN: thống kê từ dữ liệu thực tế và sắp xếp hoạt động mới nhất.
// =============================================================
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function renderStats(products, participants) {
  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('inTransit').textContent = products.filter(product => product.status === 1 || product.status === 3).length;
  document.getElementById('soldProducts').textContent = products.filter(product => product.status === 5).length;
  document.getElementById('totalParticipants').textContent = participants.length;
}

function renderActivity(events, products) {
  const body = document.getElementById('activityBody');
  const state = document.getElementById('activityState');
  const recent = [...events].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
  state.textContent = recent.length ? '' : 'Chưa có hoạt động nào.';
  body.innerHTML = recent.map(event => {
    const product = products.find(item => item.id === event.productId);
    const name = product ? product.name : 'Sản phẩm #' + event.productId;
    return '<tr><td><div class="product-cell"><span class="product-icon"><i class="bi bi-box2"></i></span><span><strong>' + escapeHtml(name) + '</strong><small>Mã SP #' + escapeHtml(event.productId) + '</small></span></div></td><td>' + statusBadge(event.status, event.statusText) + '</td><td>' + escapeHtml(event.actorName || shortAddress(event.actor)) + '</td><td>' + escapeHtml(formatDate(event.time)) + '</td><td><span class="block-number">#' + escapeHtml(event.blockNumber) + '</span></td></tr>';
  }).join('');
}

async function loadDashboard() {
  try {
    const [products, participants, events] = await Promise.all([apiGet('/products'), apiGet('/participants'), apiGet('/events?limit=20')]);
    renderStats(products, participants);
    renderActivity(events, products);
  } catch (error) { document.getElementById('activityState').textContent = 'Không thể tải dữ liệu. Hãy kiểm tra kết nối và tải lại trang.'; showToast(error.message); }
}

document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
document.querySelector('.mode-pill').innerHTML = '<span></span> ' + (CONFIG.USE_MOCK ? 'Dữ liệu mẫu' : 'Dữ liệu từ backend');
setupAccountPicker();
loadDashboard();

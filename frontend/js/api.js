// =============================================================
// API DÙNG CHUNG: các trang không cần biết nguồn dữ liệu là gì.
// =============================================================
async function readJson(url, options) {
  let response;
  try { response = await fetch(url, options); }
  catch (error) { throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối.'); }
  let data;
  try { data = await response.json(); }
  catch (error) { throw new Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
  if (!response.ok) throw new Error(data.message || 'Không thể tải dữ liệu.');
  return data;
}

async function apiGet(url) {
  if (!CONFIG.USE_MOCK) return readJson(CONFIG.API_BASE + url);
  const path = url.split('?')[0];
  const files = { '/accounts': 'accounts.json', '/participants': 'participants.json', '/products': 'products.json', '/events': 'events.json' };
  const detail = path.match(/^\/products\/(\d+)$/);
  if (detail) return mockProductDetail(Number(detail[1]));
  const file = files[path];
  if (!file) throw new Error('Không có dữ liệu mẫu cho yêu cầu này.');
  return readJson(CONFIG.MOCK_BASE + '/' + file);
}

// =============================================================
// CHI TIẾT MẪU: ghép lịch sử từ sự kiện cho các sản phẩm còn lại.
// =============================================================
async function mockProductDetail(id) {
  if (id === 1) return readJson(CONFIG.MOCK_BASE + '/product-1.json');
  const [products, events] = await Promise.all([readJson(CONFIG.MOCK_BASE + '/products.json'), readJson(CONFIG.MOCK_BASE + '/events.json')]);
  const product = products.find(item => item.id === id);
  if (!product) throw new Error('Không tìm thấy sản phẩm');
  const history = events.filter(item => item.productId === id).sort((a, b) => new Date(a.time) - new Date(b.time));
  return { product, history };
}

async function apiPost(url, body = {}) {
  if (CONFIG.USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = await readJson(CONFIG.MOCK_BASE + '/' + (CONFIG.MOCK_FAIL ? 'error.json' : 'tx-success.json'));
    if (!result.success) throw new Error(result.message);
    return result;
  }
  return readJson(CONFIG.API_BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, from: localStorage.getItem('currentAccount') }) });
}

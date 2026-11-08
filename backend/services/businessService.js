// =============================================================
// DOANH NGHIỆP CÔNG KHAI: ai cũng xem được, không cần đăng nhập.
// Ghép 2 nguồn: vai trò + hoạt động đọc từ blockchain (đáng tin, không sửa được)
// và thông tin giới thiệu trong hồ sơ đã duyệt (MST, trụ sở, website, giới thiệu).
// Không bao giờ trả người đại diện, điện thoại, email.
// =============================================================
const { getAddress, isAddress } = require('ethers');
const service = require('./index');
const applications = require('./applicationService');
const { httpError } = require('../utils/validate');

const CACHE_MS = 10 * 1000; // đọc chuỗi khá chậm trên Sepolia nên nhớ kết quả 10 giây
let cache = { at: 0, data: null };

// Đọc thành viên + toàn bộ lịch sử sản phẩm một lần, dùng chung cho list và detail
async function loadChainData() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const [participants, products] = await Promise.all([service.getParticipants(), service.getAllHistories()]);
  cache = { at: Date.now(), data: { participants, products } };
  return cache.data;
}

function sameAddress(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

// Đếm thao tác trên chuỗi của một ví và liệt kê hoạt động (mới nhất trước)
function activityOf(address, products) {
  const activity = [];
  for (const { product, history } of products) {
    for (const h of history) {
      if (sameAddress(h.actor, address)) {
        activity.push({ productId: product.id, productName: product.name, status: h.status,
          statusText: h.statusText, time: h.time, note: h.note });
      }
    }
  }
  activity.sort((a, b) => new Date(b.time) - new Date(a.time));
  return activity;
}

function toBusiness(member, profile, products) {
  const activity = activityOf(member.address, products);
  const p = profile || {};
  return {
    address: member.address, name: member.name, role: member.role, roleText: member.roleText, isActive: member.isActive,
    taxCode: p.taxCode || '', hq: p.hq || '', website: p.website || '', intro: p.intro || '',
    approvedAt: p.decidedAt || null, txHash: p.txHash || '',
    stats: {
      steps: activity.length,
      productsCreated: products.filter((x) => sameAddress(x.product.manufacturer, member.address)).length,
      lastActivity: activity.length ? activity[0].time : null,
    },
    activity,
  };
}

// GET /businesses: danh sách (bỏ phần activity cho nhẹ)
async function listBusinesses() {
  const { participants, products } = await loadChainData();
  const profiles = applications.approvedByAddress();
  return participants.map((m) => {
    const { activity, ...business } = toBusiness(m, profiles[m.address.toLowerCase()], products);
    return business;
  });
}

// GET /businesses/:address: chi tiết + 20 hoạt động gần nhất + sản phẩm đã tạo
async function getBusiness(addressParam) {
  if (!isAddress(addressParam)) throw httpError(400, 'Địa chỉ ví không hợp lệ');
  const address = getAddress(addressParam);
  const { participants, products } = await loadChainData();
  const member = participants.find((m) => sameAddress(m.address, address));
  if (!member) throw httpError(404, 'Không tìm thấy doanh nghiệp với ví này');
  const business = toBusiness(member, applications.approvedByAddress()[address.toLowerCase()], products);
  business.activity = business.activity.slice(0, 20);
  business.products = products
    .filter((x) => sameAddress(x.product.manufacturer, address))
    .map((x) => ({ id: x.product.id, name: x.product.name, status: x.product.status, statusText: x.product.statusText }));
  return business;
}

// Gọi sau khi có giao dịch mới để trang Doanh nghiệp cập nhật ngay
function clearCache() {
  cache = { at: 0, data: null };
}

module.exports = { listBusinesses, getBusiness, clearCache };

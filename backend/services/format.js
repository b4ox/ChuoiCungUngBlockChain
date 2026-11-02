// =============================================================
// ĐỊNH DẠNG DỮ LIỆU TRẢ VỀ
// Contract trả BigInt, số enum và timestamp (giây) -> đổi sang JSON
// dễ đọc theo đúng shared/API_SPEC.md: number, chuỗi ISO, kèm chữ tiếng Việt.
// =============================================================
const STATUS_TEXT = ['Đã sản xuất', 'Đang tới nhà phân phối', 'Ở nhà phân phối',
  'Đang tới cửa hàng', 'Ở cửa hàng', 'Đã bán'];
const ROLE_TEXT = ['Chưa đăng ký', 'Nhà sản xuất', 'Vận chuyển', 'Nhà phân phối', 'Nhà bán lẻ'];

function toIso(seconds) {
  return new Date(Number(seconds) * 1000).toISOString();
}

// names: object { địa chỉ viết thường: tên thành viên }
function nameOf(names, address) {
  return names[address.toLowerCase()] || '';
}

function formatParticipant(address, p) {
  const role = Number(p.role);
  return { address, name: p.name, role, roleText: ROLE_TEXT[role], isActive: p.isActive };
}

function formatProduct(p, names) {
  const status = Number(p.status);
  return {
    id: Number(p.id),
    name: p.name,
    origin: p.origin,
    description: p.description,
    manufacturer: p.manufacturer,
    manufacturerName: nameOf(names, p.manufacturer),
    currentOwner: p.currentOwner,
    currentOwnerName: nameOf(names, p.currentOwner),
    status,
    statusText: STATUS_TEXT[status],
    createdAt: toIso(p.createdAt),
  };
}

function formatHistory(h, names) {
  const status = Number(h.status);
  return {
    status,
    statusText: STATUS_TEXT[status],
    actor: h.actor,
    actorName: nameOf(names, h.actor),
    time: toIso(h.timestamp),
    note: h.note,
  };
}

// ev: log StatusChanged đã giải mã; seconds: timestamp của block chứa log
function formatEvent(ev, names, seconds) {
  const status = Number(ev.args.status);
  return {
    productId: Number(ev.args.id),
    status,
    statusText: STATUS_TEXT[status],
    actor: ev.args.actor,
    actorName: nameOf(names, ev.args.actor),
    note: ev.args.note,
    blockNumber: ev.blockNumber,
    txHash: ev.transactionHash,
    time: toIso(seconds),
  };
}

module.exports = {
  STATUS_TEXT, ROLE_TEXT, toIso,
  formatParticipant, formatProduct, formatHistory, formatEvent,
};

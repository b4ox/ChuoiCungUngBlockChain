// =============================================================
// HỒ SƠ DOANH NGHIỆP (lưu ngoài chuỗi, file backend/data/applications.json)
// Vòng đời: pending (chờ duyệt) -> approved (admin đã ghi vai trò lên chuỗi)
//                               -> rejected (kèm lý do, doanh nghiệp gửi hồ sơ mới)
// Thông tin cá nhân (người đại diện, điện thoại, email) KHÔNG lên blockchain
// vì dữ liệu trên chuỗi công khai vĩnh viễn.
// =============================================================
const { getAddress } = require('ethers');
const { readJson, writeJson } = require('../utils/jsonStore');
const { httpError, parseRole } = require('../utils/validate');
const { ROLE_TEXT } = require('./format');
const service = require('./index');

const FILE = 'applications.json';
const STATUS_TEXT = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Bị từ chối' };
// Sau khi duyệt, doanh nghiệp tự sửa được các trường này (không ảnh hưởng dữ liệu trên chuỗi)
const FREE_FIELDS = ['hq', 'website', 'intro', 'rep', 'email', 'phone'];

function load() {
  return readJson(FILE, { nextId: 1, items: [] });
}

function withText(app) {
  return { ...app, roleText: ROLE_TEXT[app.role], statusText: STATUS_TEXT[app.status] };
}

// =============================================================
// KIỂM TRA DỮ LIỆU HỒ SƠ: trả object đã làm sạch hoặc ném lỗi 400
// =============================================================
function cleanText(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function checkField(ok, message) {
  if (!ok) throw httpError(400, message);
}

function cleanApplication(body) {
  const a = {
    company: cleanText(body.company, 80), taxCode: cleanText(body.taxCode, 14), hq: cleanText(body.hq, 150),
    website: cleanText(body.website, 120), intro: cleanText(body.intro, 300), rep: cleanText(body.rep, 60),
    email: cleanText(body.email, 100), phone: cleanText(body.phone, 10), role: parseRole(body.role),
  };
  checkField(a.company.length >= 3, 'Tên doanh nghiệp tối thiểu 3 ký tự');
  checkField(/^\d{10}(-\d{3})?$/.test(a.taxCode), 'Mã số thuế gồm 10 chữ số, chi nhánh thêm -XXX');
  checkField(a.hq.length >= 5, 'Nhập địa chỉ trụ sở');
  checkField(!a.website || /^https?:\/\/\S+\.\S+$/.test(a.website), 'Website phải bắt đầu bằng http:// hoặc https://');
  checkField(a.rep.length >= 3, 'Nhập họ tên người đại diện theo pháp luật');
  checkField(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email), 'Email chưa đúng định dạng');
  checkField(/^0\d{9}$/.test(a.phone), 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0');
  return a;
}

// =============================================================
// PHÍA DOANH NGHIỆP
// =============================================================

// Hồ sơ mới nhất của một ví (null nếu chưa gửi)
function findLatest(data, address) {
  const list = data.items.filter((x) => x.address.toLowerCase() === address.toLowerCase());
  return list.length ? list[list.length - 1] : null;
}

function getMine(address) {
  const app = findLatest(load(), address);
  return app ? withText(app) : null;
}

async function submit(address, body) {
  const data = load();
  const latest = findLatest(data, address);
  if (latest && latest.status === 'pending') throw httpError(400, 'Hồ sơ đang chờ duyệt. Hãy sửa hồ sơ thay vì gửi mới.');
  if (latest && latest.status === 'approved') throw httpError(400, 'Ví này đã được duyệt. Muốn sửa thông tin hãy dùng mục Hồ sơ.');
  const member = await service.getParticipant(address);
  if (member && member.isActive) throw httpError(400, 'Ví này đã là thành viên trên blockchain');

  const now = new Date().toISOString();
  const app = {
    id: 'HS-' + String(data.nextId).padStart(4, '0'), address: getAddress(address), ...cleanApplication(body),
    status: 'pending', reason: '', txHash: '', submittedAt: now, updatedAt: now, decidedAt: null,
  };
  data.nextId++;
  data.items.push(app);
  writeJson(FILE, data);
  return withText(app);
}

// Sửa hồ sơ: đang chờ duyệt -> sửa mọi trường; đã duyệt -> chỉ FREE_FIELDS
function updateMine(address, body) {
  const data = load();
  const app = findLatest(data, address);
  if (!app || app.status === 'rejected') throw httpError(400, 'Không có hồ sơ để sửa. Hãy gửi hồ sơ mới.');

  const clean = cleanApplication({ ...app, ...body, role: app.status === 'approved' ? app.role : (body.role || app.role) });
  const fields = app.status === 'pending' ? Object.keys(clean) : FREE_FIELDS;
  for (const field of fields) app[field] = clean[field];
  app.updatedAt = new Date().toISOString();
  writeJson(FILE, data);
  return withText(app);
}

// =============================================================
// PHÍA QUẢN TRỊ VIÊN
// =============================================================
function list(status) {
  const items = load().items.filter((x) => !status || x.status === status);
  return items.reverse().map(withText);
}

function findById(data, id) {
  const app = data.items.find((x) => x.id === id);
  if (!app) throw httpError(404, 'Không tìm thấy hồ sơ ' + id);
  if (app.status !== 'pending') throw httpError(400, 'Hồ sơ ' + id + ' không còn ở trạng thái chờ duyệt');
  return app;
}

// Admin đã ký registerParticipant trong MetaMask; backend kiểm tra trên chuỗi
// rằng ví thật sự đã có đúng vai trò rồi mới đánh dấu "đã duyệt".
async function approve(id, txHash) {
  const data = load();
  const app = findById(data, id);
  const member = await service.getParticipant(app.address);
  if (!member || !member.isActive || member.role !== app.role) {
    throw httpError(400, 'Chưa thấy vai trò ' + ROLE_TEXT[app.role] + ' của ví này trên blockchain. Giao dịch đã được xác nhận chưa?');
  }
  app.status = 'approved';
  app.txHash = /^0x[0-9a-fA-F]{64}$/.test(txHash || '') ? txHash : '';
  app.decidedAt = new Date().toISOString();
  writeJson(FILE, data);
  return withText(app);
}

function reject(id, reasonParam) {
  const reason = cleanText(reasonParam, 300);
  if (reason.length < 5) throw httpError(400, 'Nhập lý do từ chối (tối thiểu 5 ký tự)');
  const data = load();
  const app = findById(data, id);
  app.status = 'rejected';
  app.reason = reason;
  app.decidedAt = new Date().toISOString();
  writeJson(FILE, data);
  return withText(app);
}

// Hồ sơ đã duyệt mới nhất của mỗi ví -> dùng cho trang Doanh nghiệp công khai
function approvedByAddress() {
  const map = {};
  for (const app of load().items) {
    if (app.status === 'approved') map[app.address.toLowerCase()] = app;
  }
  return map;
}

module.exports = { getMine, submit, updateMine, list, approve, reject, approvedByAddress, STATUS_TEXT };

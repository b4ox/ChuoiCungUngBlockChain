// =============================================================
// SERVICE GIẢ (MOCK_CHAIN=true): cùng tên hàm với supplyChainService
// nhưng đọc dữ liệu trong shared/mock/ thay vì gọi Ganache.
// Dùng để chạy backend khi chưa có contract / chưa bật Ganache.
// =============================================================
const fs = require('fs');
const path = require('path');
const { CONTRACT_ADDRESS, CHAIN_ID } = require('../config/blockchain');
const { httpError, requireAddress, parseId } = require('../utils/validate');

const MOCK_DIR = path.join(__dirname, '../../shared/mock');

// Đọc lại file mỗi lần gọi để sửa mock là thấy ngay, không cần khởi động lại
function readMock(fileName) {
  return JSON.parse(fs.readFileSync(path.join(MOCK_DIR, fileName), 'utf8'));
}

async function getHealth() {
  return { ok: true, chainId: CHAIN_ID, blockNumber: 0, contract: CONTRACT_ADDRESS };
}

async function getProducts(status) {
  const products = readMock('products.json');
  if (status === undefined) return products;
  return products.filter((p) => p.status === status);
}

// Sản phẩm 1 có file riêng; sản phẩm khác lấy lịch sử từ events.json
async function getProductDetail(idParam) {
  const id = parseId(idParam);
  if (id === 1) return readMock('product-1.json');
  const product = readMock('products.json').find((p) => p.id === id);
  if (!product) throw httpError(400, 'San pham khong ton tai');
  const history = readMock('events.json')
    .filter((e) => e.productId === id)
    .sort((a, b) => a.status - b.status)
    .map((e) => ({ status: e.status, statusText: e.statusText, actor: e.actor,
      actorName: e.actorName, time: e.time, note: e.note }));
  return { product, history };
}

async function getEvents(limit) {
  return readMock('events.json').slice(0, limit);
}

// Ví quản trị trong dữ liệu mẫu = tài khoản có isAdmin
async function getOwner() {
  return readMock('accounts.json').find((a) => a.isAdmin).address;
}

async function getParticipant(address) {
  const found = readMock('participants.json').find((p) => p.address.toLowerCase() === address.toLowerCase());
  return found || null;
}

// Mọi sản phẩm kèm lịch sử (ghép từ products.json + events.json)
async function getAllHistories() {
  const result = [];
  for (const product of readMock('products.json')) {
    result.push(await getProductDetail(product.id));
  }
  return result;
}

// Mọi giao dịch ghi đều "thành công" với cùng một kết quả mẫu
async function fakeTx(from) {
  requireAddress(from, 'from');
  const { success, txHash, blockNumber } = readMock('tx-success.json');
  return { success, txHash, blockNumber };
}

module.exports = {
  getHealth,
  getOwner,
  getParticipant,
  getAllHistories,
  getAccounts: async () => readMock('accounts.json'),
  getParticipants: async () => readMock('participants.json'),
  getProducts,
  getProductDetail,
  getEvents,
  registerParticipant: (from) => fakeTx(from),
  createProduct: async (from) => ({ ...(await fakeTx(from)), productId: readMock('tx-success.json').productId }),
  pickUp: (from) => fakeTx(from),
  receive: (from) => fakeTx(from),
  sell: (from) => fakeTx(from),
};

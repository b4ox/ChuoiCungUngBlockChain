// =============================================================
// SERVICE: gom MỌI lời gọi contract vào một chỗ.
// Route chỉ gọi các hàm ở đây, không đụng trực tiếp tới contract.
// =============================================================
const {
  provider, readContract, getContract, CONTRACT_ADDRESS, CONTRACT_READY, DEPLOY_BLOCK, GANACHE_CHAIN_ID, CHAIN_ID,
} = require('../config/blockchain');
const { getAddress, ZeroAddress } = require('ethers');
const fmt = require('./format');
const invitationLogic = require('./invitationLogic');
const {
  httpError, requireAddress, requireText, parseId, parseRole, parseTask, parseStage,
} = require('../utils/validate');

// Số khối tối đa mỗi lần hỏi event (RPC công khai của Sepolia giới hạn khoảng quét)
const LOG_CHUNK_SIZE = Number(process.env.LOG_CHUNK_SIZE) || 5000;
// Chưa ghi deployBlock thì chỉ quét chừng này khối gần nhất, tránh quét cả triệu khối
const FALLBACK_SCAN_BLOCKS = 100000;

// =============================================================
// HÀM ĐỌC DÙNG CHUNG
// =============================================================

// Bảng tra { địa chỉ viết thường: tên } để điền các trường ...Name
async function getNameMap() {
  const names = {};
  const list = await readContract.getAllParticipants();
  for (const address of list) {
    const p = await readContract.participants(address);
    names[address.toLowerCase()] = p.name;
  }
  return names;
}

// Kiểm tra nhanh: blockchain có kết nối được không, contract đã deploy đúng địa chỉ chưa
async function getHealth() {
  if (!CONTRACT_READY) {
    throw httpError(500, 'Chưa có địa chỉ contract. Deploy rồi điền "address" trong shared/contract/deployment.json');
  }
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  if ((await provider.getCode(CONTRACT_ADDRESS)) === '0x') {
    throw httpError(500, `Chưa có contract tại ${CONTRACT_ADDRESS}, hãy deploy lại`);
  }
  return { ok: true, chainId: Number(network.chainId), blockNumber, contract: CONTRACT_ADDRESS };
}

// Ví quản trị = người đã deploy contract
async function getOwner() {
  return readContract.owner();
}

// =============================================================
// TÀI KHOẢN VÀ THÀNH VIÊN
// =============================================================

// Tài khoản Ganache (chỉ có ở mạng local), kèm vai trò đã đăng ký trên contract.
// Sepolia không có tài khoản mở khoá sẵn nên trả mảng rỗng.
async function getAccounts() {
  let addresses = [];
  try {
    addresses = (await provider.send('eth_accounts', [])).map((a) => getAddress(a));
  } catch (err) {
    return [];
  }
  const owner = (await readContract.owner()).toLowerCase();
  const accounts = [];
  for (let i = 0; i < addresses.length; i++) {
    const p = fmt.formatParticipant(addresses[i], await readContract.participants(addresses[i]));
    const isAdmin = p.address.toLowerCase() === owner;
    // Admin không đăng ký vai trò nên đặt sẵn tên "Admin"
    const name = p.name || (isAdmin ? 'Admin' : '');
    accounts.push({ index: i, address: p.address, name, role: p.role, roleText: p.roleText, isAdmin });
  }
  return accounts;
}

async function getParticipants() {
  const list = await readContract.getAllParticipants();
  const result = [];
  for (const address of list) {
    result.push(fmt.formatParticipant(address, await readContract.participants(address)));
  }
  return result;
}

// Thành viên của một địa chỉ; null nếu chưa từng được cấp vai trò
async function getParticipant(address) {
  const p = fmt.formatParticipant(getAddress(address), await readContract.participants(address));
  return p.role === 0 ? null : p;
}

// =============================================================
// SẢN PHẨM
// =============================================================

// Mọi sản phẩm (id 1..productCount); lọc theo status nếu có
async function getProducts(status) {
  const count = Number(await readContract.productCount());
  const names = await getNameMap();
  const result = [];
  for (let id = 1; id <= count; id++) {
    const product = fmt.formatProduct(await readContract.getProduct(id), names);
    if (status === undefined || product.status === status) {
      result.push(product);
    }
  }
  return result;
}

async function getProductDetail(idParam) {
  const id = parseId(idParam);
  const product = await readContract.getProduct(id);
  const history = await readContract.getHistory(id);
  const names = await getNameMap();
  return {
    product: fmt.formatProduct(product, names),
    history: history.map((h) => fmt.formatHistory(h, names)),
    invitations: await loadInvitations(id, product.manufacturer, names), // v1.2
  };
}

// Mọi sản phẩm kèm lịch sử, dùng để thống kê hoạt động của từng doanh nghiệp
async function getAllHistories() {
  const count = Number(await readContract.productCount());
  const names = await getNameMap();
  const result = [];
  for (let id = 1; id <= count; id++) {
    const product = fmt.formatProduct(await readContract.getProduct(id), names);
    const history = (await readContract.getHistory(id)).map((h) => fmt.formatHistory(h, names));
    result.push({ product, history });
  }
  return result;
}

// =============================================================
// LỜI MỜI (v1.2): đọc getInvitations(id) của contract. Mời / chấp nhận /
// từ chối do doanh nghiệp tự ký trong MetaMask, backend chỉ đọc và tính
// sẵn giai đoạn (stage) để frontend chia nhóm. Contract cũ chưa có hàm
// getInvitations thì trả mảng rỗng thay vì báo lỗi.
// =============================================================
function invitationsSupported() {
  try {
    return readContract.interface.getFunction('getInvitations') !== null;
  } catch (err) {
    return false;
  }
}

// 4 lời mời đã định dạng của một sản phẩm ([] nếu contract chưa hỗ trợ)
async function loadInvitations(id, manufacturer, names) {
  if (!invitationsSupported()) return [];
  const raw = await readContract.getInvitations(id);
  return invitationLogic.formatInvitations(raw, manufacturer, names);
}

// Mọi sản phẩm kèm 4 lời mời, làm đầu vào cho invitationLogic
async function getInvitationEntries() {
  const count = Number(await readContract.productCount());
  const names = await getNameMap();
  const entries = [];
  for (let id = 1; id <= count; id++) {
    const raw = await readContract.getProduct(id);
    entries.push({
      product: fmt.formatProduct(raw, names),
      invitations: await loadInvitations(id, raw.manufacturer, names),
    });
  }
  return entries;
}

// GET /invitations?address=&stage=
async function getInvitationsFor(address, stage) {
  requireAddress(address, 'address');
  const stageFilter = parseStage(stage);
  if (!invitationsSupported()) return [];
  return invitationLogic.invitationsFor(await getInvitationEntries(), address, stageFilter);
}

// GET /invitations/to-send?address=
async function getInvitesToSend(address) {
  requireAddress(address, 'address');
  if (!invitationsSupported()) return [];
  return invitationLogic.invitesToSend(await getInvitationEntries(), address);
}

// =============================================================
// HOẠT ĐỘNG GẦN ĐÂY: đọc event StatusChanged, mới nhất trước.
// Trên Sepolia không thể hỏi một lần từ khối 0, nên quét từng đoạn
// LOG_CHUNK_SIZE khối và nhớ lại những gì đã quét (lần sau chỉ quét khối mới).
// =============================================================
const eventCache = { scannedTo: null, items: [], blockTimes: {} };

function scanStartBlock(latest) {
  if (DEPLOY_BLOCK > 0 || CHAIN_ID === GANACHE_CHAIN_ID) return DEPLOY_BLOCK;
  return Math.max(0, latest - FALLBACK_SCAN_BLOCKS);
}

async function blockTime(blockNumber) {
  if (eventCache.blockTimes[blockNumber] === undefined) {
    eventCache.blockTimes[blockNumber] = (await provider.getBlock(blockNumber)).timestamp;
  }
  return eventCache.blockTimes[blockNumber];
}

async function scanNewEvents() {
  const latest = await provider.getBlockNumber();
  let from = eventCache.scannedTo === null ? scanStartBlock(latest) : eventCache.scannedTo + 1;
  while (from <= latest) {
    const to = Math.min(from + LOG_CHUNK_SIZE - 1, latest);
    const logs = await readContract.queryFilter('StatusChanged', from, to);
    for (const ev of logs) {
      eventCache.items.push({ ev, seconds: await blockTime(ev.blockNumber) });
    }
    eventCache.scannedTo = to;
    from = to + 1;
  }
}

async function getEvents(limit) {
  await scanNewEvents();
  const names = await getNameMap(); // tên có thể đổi, nên ghép tên mỗi lần trả
  const latest = eventCache.items.slice(-limit).reverse();
  return latest.map((item) => fmt.formatEvent(item.ev, names, item.seconds));
}

// =============================================================
// HÀM GHI (API v1, CHỈ CHẠY VỚI GANACHE LOCAL): backend tự ký bằng
// tài khoản đã mở khoá. Trên Sepolia người dùng ký trong MetaMask.
// =============================================================
async function sendTx(from, method, args) {
  const contract = await getContract(requireAddress(from, 'from'));
  // Gọi thử (không tốn gas) trước khi gửi thật: nếu contract revert,
  // ethers đọc được đúng câu lỗi (vd "Sai vai tro"). Gửi thẳng thì
  // Ganache 7 trả lỗi theo dạng ethers v6 không giải mã được.
  await contract[method].staticCall(...args);
  const tx = await contract[method](...args);
  const receipt = await tx.wait();
  return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber, receipt };
}

// Bỏ receipt (chỉ dùng nội bộ) trước khi trả JSON
function txResult(r) {
  return { success: r.success, txHash: r.txHash, blockNumber: r.blockNumber };
}

async function registerParticipant(from, body) {
  const account = requireAddress(body.account, 'account');
  const name = requireText(body.name, 'name');
  return txResult(await sendTx(from, 'registerParticipant', [account, name, parseRole(body.role)]));
}

// Lấy id sản phẩm mới từ event ProductCreated trong receipt
// v1.2: có transporter / distributor thì tạo kèm lời mời trong cùng giao dịch
async function createProduct(from, body) {
  const args = [requireText(body.name, 'name'), requireText(body.origin, 'origin'), body.description || ''];
  let method = 'createProduct';
  if (body.transporter || body.distributor) {
    method = 'createProductWithInvites';
    args.push(body.transporter ? requireAddress(body.transporter, 'transporter') : ZeroAddress);
    args.push(body.distributor ? requireAddress(body.distributor, 'distributor') : ZeroAddress);
  }
  const r = await sendTx(from, method, args);
  let productId = null;
  for (const log of r.receipt.logs) {
    const parsed = readContract.interface.parseLog(log);
    if (parsed && parsed.name === 'ProductCreated') productId = Number(parsed.args.id);
  }
  return { ...txResult(r), productId };
}

async function pickUp(from, id, note) {
  return txResult(await sendTx(from, 'pickUpProduct', [parseId(id), note || '']));
}

async function receive(from, id, note) {
  return txResult(await sendTx(from, 'receiveProduct', [parseId(id), note || '']));
}

async function sell(from, id, note) {
  return txResult(await sendTx(from, 'markAsSold', [parseId(id), note || '']));
}

// v1.2 (Ganache): body { task, invitee } / { task }
async function invite(from, id, body) {
  const args = [parseId(id), parseTask(body.task), requireAddress(body.invitee, 'invitee')];
  return txResult(await sendTx(from, 'inviteParticipant', args));
}

async function accept(from, id, body) {
  return txResult(await sendTx(from, 'acceptInvitation', [parseId(id), parseTask(body.task)]));
}

async function decline(from, id, body) {
  return txResult(await sendTx(from, 'declineInvitation', [parseId(id), parseTask(body.task)]));
}

module.exports = {
  getHealth, getOwner, getAccounts, getParticipants, getParticipant,
  getProducts, getProductDetail, getAllHistories, getEvents,
  registerParticipant, createProduct, pickUp, receive, sell,
  // v1.2: lời mời
  invitationsSupported, getInvitationsFor, getInvitesToSend, invite, accept, decline,
};

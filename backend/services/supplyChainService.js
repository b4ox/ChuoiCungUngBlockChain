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
const invitationTasks = require('./invitationTasks');
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

// Bảng tra { địa chỉ viết thường: { name, role, isActive } } — v1.3 cần biết ai còn hợp lệ
async function getMemberMap() {
  const members = {};
  const list = await readContract.getAllParticipants();
  for (const address of list) {
    const p = await readContract.participants(address);
    members[address.toLowerCase()] = { name: p.name, role: Number(p.role), isActive: p.isActive };
  }
  return members;
}

function namesFromMembers(members) {
  const names = {};
  for (const key of Object.keys(members)) names[key] = members[key].name;
  return names;
}

// Bảng tra { địa chỉ viết thường: tên } để điền các trường ...Name
async function getNameMap() {
  return namesFromMembers(await getMemberMap());
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
  const raw = await readContract.getProduct(id);
  const history = await readContract.getHistory(id);
  const members = await getMemberMap();
  const names = namesFromMembers(members);
  const product = fmt.formatProduct(raw, names);
  const { invitations, handovers } = await loadInvitationData(id, product, members); // v1.2, v1.3
  return {
    product,
    history: history.map((h) => fmt.formatHistory(h, names)),
    invitations,
    handovers,
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
// LỜI MỜI VÀ GIAO NHẬN (v1.2, v1.3): đọc getInvitations / getHandovers.
// Mời, nhận lời, xác nhận giao nhận do doanh nghiệp tự ký trong MetaMask;
// backend chỉ đọc và tính sẵn "việc của từng ví" (invitationTasks.js).
// Contract cũ chưa có hàm hoặc đọc lỗi -> trả [] thay vì làm hỏng trang.
// =============================================================
function contractHas(name) {
  try {
    return readContract.interface.getFunction(name) !== null;
  } catch (err) {
    return false;
  }
}

function invitationsSupported() {
  return contractHas('getInvitations');
}

// 4 lời mời + 4 bước giao nhận đã định dạng của một sản phẩm
async function loadInvitationData(id, product, members) {
  if (!invitationsSupported()) return { invitations: [], handovers: [] };
  try {
    const rawInvitations = await readContract.getInvitations(id);
    const invitations = invitationLogic.formatInvitations(rawInvitations, product.manufacturer, members);
    let handovers = [];
    if (contractHas('getHandovers')) {
      handovers = invitationLogic.formatHandovers(await readContract.getHandovers(id), product, invitations, members);
    }
    return { invitations, handovers };
  } catch (err) {
    console.warn(`Không đọc được lời mời của sản phẩm #${id}:`, err.shortMessage || err.message);
    return { invitations: [], handovers: [] };
  }
}

async function readAllEntries() {
  const count = Number(await readContract.productCount());
  const members = await getMemberMap();
  const names = namesFromMembers(members);
  const entries = [];
  for (let id = 1; id <= count; id++) {
    const product = fmt.formatProduct(await readContract.getProduct(id), names);
    entries.push({ product, ...(await loadInvitationData(id, product, members)) });
  }
  return entries;
}

// =============================================================
// NHỚ TẠM 10 GIÂY: mỗi lần đọc hết sản phẩm tốn nhiều lời gọi RPC (Sepolia chậm).
// Các request gửi cùng lúc dùng chung một lần đọc. fresh = true (frontend gửi ngay
// sau một giao dịch) luôn đọc lại, chỉ dùng chung với request fresh khác vừa bắt đầu.
// =============================================================
const ENTRY_CACHE_MS = 10 * 1000;
const FRESH_SHARE_MS = 1000;
let entryCache = { at: 0, data: null, pending: null, pendingAt: 0, pendingFresh: false };

function canReusePending(fresh, now) {
  if (!entryCache.pending) return false;
  if (fresh) return entryCache.pendingFresh && now - entryCache.pendingAt < FRESH_SHARE_MS;
  return true;
}

function getInvitationEntries(fresh) {
  const now = Date.now();
  if (!fresh && entryCache.data && now - entryCache.at < ENTRY_CACHE_MS) return Promise.resolve(entryCache.data);
  if (canReusePending(fresh, now)) return entryCache.pending;
  const pending = readAllEntries().then((data) => {
    if (entryCache.pending === pending) entryCache = { at: Date.now(), data, pending: null, pendingAt: 0, pendingFresh: false };
    return data;
  });
  pending.catch(() => {
    if (entryCache.pending === pending) entryCache.pending = null;
  });
  entryCache = { ...entryCache, pending, pendingAt: now, pendingFresh: Boolean(fresh) };
  return pending;
}

function clearEntryCache() {
  entryCache = { at: 0, data: null, pending: null, pendingAt: 0, pendingFresh: false };
}

// GET /invitations?address=&stage=&fresh=1
async function getInvitationsFor(address, stage, fresh) {
  requireAddress(address, 'address');
  const stageFilter = parseStage(stage);
  if (!invitationsSupported()) return [];
  return invitationTasks.invitationsFor(await getInvitationEntries(fresh), address, stageFilter);
}

// GET /invitations/to-send?address=&fresh=1
async function getInvitesToSend(address, fresh) {
  requireAddress(address, 'address');
  if (!invitationsSupported()) return [];
  return invitationTasks.invitesToSend(await getInvitationEntries(fresh), address);
}

// GET /invitations/blocked?fresh=1 (v1.3)
async function getBlockedTasks(fresh) {
  if (!invitationsSupported()) return [];
  return invitationTasks.blockedTasks(await getInvitationEntries(fresh));
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
  clearEntryCache(); // dữ liệu lời mời / giao nhận vừa đổi
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

// v1.3 (Ganache): bên gửi xác nhận đã giao; người mời huỷ; admin chuyển nhiệm vụ
async function send(from, id, note) {
  return txResult(await sendTx(from, 'confirmSent', [parseId(id), note || '']));
}

async function cancel(from, id, body) {
  return txResult(await sendTx(from, 'cancelInvitation', [parseId(id), parseTask(body.task)]));
}

async function reassign(from, id, body) {
  const args = [parseId(id), parseTask(body.task), requireAddress(body.invitee, 'invitee'), body.note || ''];
  return txResult(await sendTx(from, 'reassignTask', args));
}

module.exports = {
  getHealth, getOwner, getAccounts, getParticipants, getParticipant,
  getProducts, getProductDetail, getAllHistories, getEvents,
  registerParticipant, createProduct, pickUp, receive, sell,
  // v1.2: lời mời
  invitationsSupported, getInvitationsFor, getInvitesToSend, invite, accept, decline,
  // v1.3: giao nhận hai đầu, huỷ lời mời, admin chuyển nhiệm vụ
  getBlockedTasks, send, cancel, reassign,
};

// =============================================================
// SERVICE: gom MỌI lời gọi contract vào một chỗ.
// Route chỉ gọi các hàm ở đây, không đụng trực tiếp tới contract.
// =============================================================
const { provider, readContract, getContract, CONTRACT_ADDRESS } = require('../config/blockchain');
const { getAddress } = require('ethers');
const fmt = require('./format');
const { httpError, requireAddress, requireText, parseId, parseRole } = require('../utils/validate');

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

// Kiểm tra nhanh: Ganache có chạy không, contract đã deploy đúng địa chỉ chưa
async function getHealth() {
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  if ((await provider.getCode(CONTRACT_ADDRESS)) === '0x') {
    throw httpError(500, `Chưa có contract tại ${CONTRACT_ADDRESS}, hãy deploy lại`);
  }
  return { ok: true, chainId: Number(network.chainId), blockNumber, contract: CONTRACT_ADDRESS };
}

// =============================================================
// TÀI KHOẢN VÀ THÀNH VIÊN
// =============================================================

// 10 tài khoản Ganache, kèm vai trò đã đăng ký trên contract
async function getAccounts() {
  // Ganache trả địa chỉ viết thường -> đổi sang dạng checksum như mọi chỗ khác
  const addresses = (await provider.send('eth_accounts', [])).map((a) => getAddress(a));
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
  };
}

// =============================================================
// HOẠT ĐỘNG GẦN ĐÂY: đọc event StatusChanged, mới nhất trước
// =============================================================
async function getEvents(limit) {
  const logs = await readContract.queryFilter('StatusChanged', 0, 'latest');
  const latest = logs.reverse().slice(0, limit);
  const names = await getNameMap();
  const blockTimes = {}; // nhiều event có thể chung một block
  const result = [];
  for (const ev of latest) {
    if (blockTimes[ev.blockNumber] === undefined) {
      blockTimes[ev.blockNumber] = (await provider.getBlock(ev.blockNumber)).timestamp;
    }
    result.push(fmt.formatEvent(ev, names, blockTimes[ev.blockNumber]));
  }
  return result;
}

// =============================================================
// HÀM GHI: gửi giao dịch, chờ đào khối, trả kết quả
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
async function createProduct(from, body) {
  const args = [requireText(body.name, 'name'), requireText(body.origin, 'origin'), body.description || ''];
  const r = await sendTx(from, 'createProduct', args);
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

module.exports = {
  getHealth, getAccounts, getParticipants, getProducts, getProductDetail, getEvents,
  registerParticipant, createProduct, pickUp, receive, sell,
};

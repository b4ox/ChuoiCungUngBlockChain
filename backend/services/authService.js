// =============================================================
// ĐĂNG NHẬP BẰNG VÍ (kiểu "Sign-In with Ethereum")
// 1. Frontend xin một nonce cho địa chỉ ví -> backend trả kèm thông điệp cần ký.
// 2. Người dùng ký thông điệp trong MetaMask (không tạo giao dịch, không tốn phí).
// 3. Backend dùng ethers.verifyMessage tính ngược ra địa chỉ đã ký; khớp thì cấp token.
// Nonce dùng một lần và hết hạn nhanh, nên chép lại chữ ký cũ không đăng nhập được.
// Nonce và phiên lưu trong bộ nhớ: khởi động lại backend thì người dùng ký lại.
// =============================================================
const crypto = require('crypto');
const { verifyMessage, getAddress } = require('ethers');
const { CHAIN_ID } = require('../config/blockchain');
const { httpError, requireAddress } = require('../utils/validate');

const NONCE_TTL_MS = 10 * 60 * 1000;      // 10 phút để ký
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // phiên dùng được 12 giờ

const nonces = new Map();   // địa chỉ viết thường -> { message, expiresAt }
const sessions = new Map(); // token -> { address, expiresAt }

function buildMessage(address, origin, nonce) {
  const host = origin.replace(/^https?:\/\//, '');
  return `${host} muốn bạn đăng nhập TraceChain bằng ví:\n${address}\n\n` +
    'Ký thông điệp này để chứng minh bạn giữ ví. Không tạo giao dịch, không tốn phí.\n\n' +
    `URI: ${origin}\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

// Bước 1: cấp nonce + thông điệp cho một địa chỉ
function createNonce(addressParam, origin) {
  const address = getAddress(requireAddress(addressParam, 'address'));
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = buildMessage(address, origin, nonce);
  nonces.set(address.toLowerCase(), { message, expiresAt: Date.now() + NONCE_TTL_MS });
  return { address, nonce, message };
}

// Bước 3: kiểm tra chữ ký, đúng thì cấp token phiên
function login(addressParam, signature) {
  const address = getAddress(requireAddress(addressParam, 'address'));
  const key = address.toLowerCase();
  const pending = nonces.get(key);
  if (!pending || pending.expiresAt < Date.now()) {
    throw httpError(400, 'Thông điệp đăng nhập đã hết hạn. Hãy bấm đăng nhập lại.');
  }
  nonces.delete(key); // mỗi nonce chỉ dùng một lần

  let signer;
  try {
    signer = verifyMessage(pending.message, signature);
  } catch (err) {
    throw httpError(400, 'Chữ ký không hợp lệ');
  }
  if (signer.toLowerCase() !== key) throw httpError(401, 'Chữ ký không khớp với địa chỉ ví');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { address, expiresAt });
  return { token, address, expiresAt: new Date(expiresAt).toISOString() };
}

// Tra phiên theo token; hết hạn hoặc không có thì trả null
function getSession(token) {
  const session = token ? sessions.get(token) : null;
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function logout(token) {
  sessions.delete(token);
  return { success: true };
}

module.exports = { createNonce, login, getSession, logout, buildMessage };

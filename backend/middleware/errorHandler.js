// =============================================================
// MIDDLEWARE LỖI: mọi lỗi từ route đều về đây và trả cùng một dạng
//   { success: false, message }
// - 400: contract revert, dữ liệu gửi lên sai
// - 401/403/404: chưa đăng nhập, không phải admin, không tìm thấy (httpError)
// - 500: không kết nối được blockchain / chưa deploy contract / lỗi khác
// =============================================================
const { RPC_URL, CONTRACT_ADDRESS, CHAIN_NAME } = require('../config/blockchain');

// Mất kết nối RPC (Ganache tắt, mất mạng tới Sepolia): ethers báo lỗi mạng
function isConnectionError(err) {
  const text = `${err.code} ${err.message} ${err.error && err.error.code}`;
  return text.includes('ECONNREFUSED') || text.includes('NETWORK_ERROR') ||
    text.includes('ECONNRESET') || text.includes('fetch failed');
}

// Gọi hàm đọc vào địa chỉ chưa có contract -> kết quả rỗng "0x"
function isMissingContract(err) {
  return err.code === 'BAD_DATA' && err.value === '0x';
}

function getMessage(err) {
  // express.json() không đọc được body
  if (err.type === 'entity.parse.failed') return 'Dữ liệu gửi lên không phải JSON hợp lệ';
  // Lỗi revert: ethers v6 đặt câu lỗi của contract trong err.reason
  if (err.reason) return err.reason;
  return err.shortMessage || err.message;
}

// Tài khoản không có trong Ganache: provider.getSigner(from) báo "invalid account"
function isUnknownAccount(err) {
  return /invalid account/i.test(err.message);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (isConnectionError(err)) {
    return res.status(500).json({ success: false, message: `Không kết nối được blockchain ${CHAIN_NAME} tại ${RPC_URL}` });
  }
  if (isMissingContract(err)) {
    const where = CONTRACT_ADDRESS || '(chưa điền địa chỉ trong deployment.json)';
    return res.status(500).json({ success: false, message: `Chưa có contract tại ${where}, hãy deploy lại` });
  }
  if (isUnknownAccount(err)) {
    return res.status(400).json({ success: false, message: 'API ghi cũ chỉ chạy với Ganache local. Trên Sepolia hãy ký giao dịch bằng MetaMask.' });
  }
  // Lỗi do mình chủ động tạo (httpError) hoặc lỗi JSON sai cú pháp đã có status
  // Lỗi từ ethers (có err.code) coi là lỗi dữ liệu / revert -> 400
  const status = err.status || (err.code ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: getMessage(err) });
}

module.exports = errorHandler;

// =============================================================
// KIỂM TRA DỮ LIỆU ĐẦU VÀO
// Bắt lỗi sớm ở backend (HTTP 400) thay vì để ethers báo lỗi khó hiểu.
// =============================================================
const { isAddress } = require('ethers');

// Tạo lỗi có mã HTTP để middleware lỗi trả đúng status
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requireAddress(value, field) {
  if (typeof value !== 'string' || !isAddress(value)) {
    throw httpError(400, `Thiếu hoặc sai địa chỉ ví "${field}"`);
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `Thiếu trường "${field}"`);
  }
  return value.trim();
}

// Mã sản phẩm là số nguyên không âm; id không tồn tại để contract tự báo lỗi
function parseId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw httpError(400, 'Mã sản phẩm không hợp lệ');
  }
  return Number(value);
}

// Vai trò chỉ nhận 1..4 (dùng đúng câu lỗi của contract)
function parseRole(value) {
  const role = Number(value);
  if (!Number.isInteger(role) || role < 1 || role > 4) {
    throw httpError(400, 'Vai tro khong hop le');
  }
  return role;
}

module.exports = { httpError, requireAddress, requireText, parseId, parseRole };

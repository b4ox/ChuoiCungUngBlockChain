// =============================================================
// LƯU DỮ LIỆU NGOÀI CHUỖI VÀO FILE JSON (backend/data/)
// Dự án không dùng database, nên hồ sơ doanh nghiệp được lưu thành file.
// Ghi ra file tạm rồi đổi tên để file không bị hỏng nếu đang ghi dở mà tắt máy.
// Thư mục data/ nằm trong .gitignore: mỗi máy có dữ liệu riêng.
// =============================================================
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

function filePath(name) {
  return path.join(DATA_DIR, name);
}

// Đọc file; chưa có file thì trả bản sao của giá trị mặc định
function readJson(name, defaultValue) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return JSON.parse(JSON.stringify(defaultValue));
    throw err;
  }
}

function writeJson(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const target = filePath(name);
  const temp = target + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, target);
}

module.exports = { readJson, writeJson, DATA_DIR };

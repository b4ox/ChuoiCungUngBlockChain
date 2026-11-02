// =============================================================
// ĐỊA CHỈ CÔNG KHAI CHO MÃ QR
// "localhost" chỉ mở được trên chính máy chạy backend, nên mặc định
// dùng IP mạng LAN để điện thoại cùng Wi-Fi quét QR là mở được trang.
// PUBLIC_URL trong .env (nếu có) được ưu tiên.
// =============================================================
const os = require('os');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const item of interfaces[name]) {
      if (item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return 'localhost';
}

function getPublicUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  return `http://${getLanIp()}:${process.env.PORT || 3000}`;
}

module.exports = { getPublicUrl };

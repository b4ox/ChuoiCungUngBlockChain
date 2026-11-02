// =============================================================
// CHỌN SERVICE: MOCK_CHAIN=true -> dữ liệu mẫu, ngược lại -> Ganache thật.
// Mọi route require('../services') nên chỉ cần đổi .env là chuyển chế độ.
// =============================================================
require('../config/blockchain'); // nạp .env trước khi đọc MOCK_CHAIN

const USE_MOCK = process.env.MOCK_CHAIN === 'true';

module.exports = USE_MOCK ? require('./mockService') : require('./supplyChainService');
module.exports.USE_MOCK = USE_MOCK;

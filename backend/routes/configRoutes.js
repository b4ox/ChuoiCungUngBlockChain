// =============================================================
// ROUTE CẤU HÌNH CHUỖI CHO FRONTEND
// Frontend (được backend phục vụ) không đọc được thư mục shared/, nên lấy
// địa chỉ contract, ABI và mạng qua đây để tự ký giao dịch bằng MetaMask.
// =============================================================
const router = require('express').Router();
const {
  abi, CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, CONTRACT_READY, RPC_URL, EXPLORER_URL, SEPOLIA_CHAIN_ID,
} = require('../config/blockchain');

// GET /api/config
router.get('/', (req, res) => {
  res.json({
    chainId: CHAIN_ID,
    chainIdHex: '0x' + CHAIN_ID.toString(16),
    chainName: CHAIN_NAME,
    // MetaMask có sẵn Sepolia; mạng khác (Ganache) cần rpcUrl để tự thêm mạng
    rpcUrl: CHAIN_ID === SEPOLIA_CHAIN_ID ? '' : RPC_URL,
    currencySymbol: CHAIN_ID === SEPOLIA_CHAIN_ID ? 'SepoliaETH' : 'ETH',
    explorerUrl: EXPLORER_URL,
    contract: CONTRACT_READY ? CONTRACT_ADDRESS : '',
    abi,
  });
});

module.exports = router;

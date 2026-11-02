// =============================================================
// KẾT NỐI TỚI GANACHE VÀ TẠO ĐỐI TƯỢNG CONTRACT
// - ABI và địa chỉ đọc thẳng từ shared/contract/ (không copy vào backend),
//   nên khi Contract cập nhật chỉ cần git pull.
// - CONTRACT_ADDRESS / RPC_URL trong .env (nếu có) được ưu tiên.
// =============================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ethers } = require('ethers');

const abi = require('../../shared/contract/SupplyChain.abi.json');
const deployment = require('../../shared/contract/deployment.json');

const RPC_URL = process.env.RPC_URL || deployment.rpcUrl;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || deployment.address;
const CHAIN_ID = deployment.chainId;

// staticNetwork: không dò mạng lúc khởi động, nên khi Ganache tắt
// server vẫn chạy và chỉ báo lỗi ở request cần blockchain.
const network = new ethers.Network('ganache', CHAIN_ID);
const provider = new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: network });

// Contract chỉ đọc (không cần ký, không tốn gas)
const readContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

// Contract gắn signer để ghi. Tài khoản Ganache đã unlock sẵn
// nên chỉ cần địa chỉ, không cần private key (chỉ hợp với demo local).
async function getContract(from) {
  const signer = await provider.getSigner(from);
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

module.exports = { provider, readContract, getContract, RPC_URL, CONTRACT_ADDRESS, CHAIN_ID };

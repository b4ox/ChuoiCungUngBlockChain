// =============================================================
// KẾT NỐI BLOCKCHAIN VÀ TẠO ĐỐI TƯỢNG CONTRACT
// - ABI và địa chỉ đọc thẳng từ shared/contract/ (không copy vào backend),
//   nên khi Contract cập nhật chỉ cần git pull.
// - Mặc định chạy Sepolia theo deployment.json. Muốn chạy Ganache local
//   thì đặt RPC_URL, CHAIN_ID, CONTRACT_ADDRESS, DEPLOY_BLOCK trong .env.
// =============================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ethers } = require('ethers');

const abi = require('../../shared/contract/SupplyChain.abi.json');
const deployment = require('../../shared/contract/deployment.json');

const SEPOLIA_CHAIN_ID = 11155111;
const GANACHE_CHAIN_ID = 1337;

const RPC_URL = process.env.RPC_URL || deployment.rpcUrl;
const CHAIN_ID = Number(process.env.CHAIN_ID || deployment.chainId);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || deployment.address || '';
const DEPLOY_BLOCK = Number(process.env.DEPLOY_BLOCK || deployment.deployBlock || 0);
const EXPLORER_URL = CHAIN_ID === SEPOLIA_CHAIN_ID ? (deployment.explorerUrl || 'https://sepolia.etherscan.io') : '';

function chainName(chainId) {
  if (chainId === SEPOLIA_CHAIN_ID) return 'Sepolia';
  if (chainId === GANACHE_CHAIN_ID) return 'Ganache Local';
  return 'Chain ' + chainId;
}
const CHAIN_NAME = chainName(CHAIN_ID);

// staticNetwork: không dò mạng lúc khởi động, nên khi mất mạng
// server vẫn chạy và chỉ báo lỗi ở request cần blockchain.
const network = new ethers.Network(CHAIN_NAME, CHAIN_ID);
const provider = new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: network });

// Chưa deploy (address rỗng) thì trỏ tạm vào địa chỉ 0x000…: mọi lời gọi
// sẽ báo "Chưa có contract" thay vì làm sập server lúc khởi động.
const CONTRACT_READY = ethers.isAddress(CONTRACT_ADDRESS);
const contractTarget = CONTRACT_READY ? CONTRACT_ADDRESS : ethers.ZeroAddress;

// Contract chỉ đọc (không cần ký, không tốn gas)
const readContract = new ethers.Contract(contractTarget, abi, provider);

// Contract gắn signer để ghi: CHỈ dùng với Ganache local (tài khoản đã
// unlock sẵn), cho npm run seed và các API ghi cũ của v1. Trên Sepolia
// người dùng tự ký giao dịch trong MetaMask, backend không giữ khoá nào.
async function getContract(from) {
  const signer = await provider.getSigner(from);
  return new ethers.Contract(contractTarget, abi, signer);
}

module.exports = {
  abi, provider, readContract, getContract,
  RPC_URL, CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, CONTRACT_READY, DEPLOY_BLOCK, EXPLORER_URL,
  SEPOLIA_CHAIN_ID, GANACHE_CHAIN_ID, deployment,
};

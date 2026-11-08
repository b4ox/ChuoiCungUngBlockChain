// =============================================================
// VÍ METAMASK: kết nối ví, chuyển đúng mạng, ký đăng nhập, gửi giao dịch.
// Cần nạp ethers.js (bản UMD qua CDN) TRƯỚC file này.
// Backend không giữ khoá nào: mọi giao dịch ghi lên chuỗi do người dùng
// tự xác nhận trong MetaMask và tự trả phí gas bằng ví của mình.
// =============================================================
let chainConfig = null;

// Mạng, địa chỉ contract, ABI lấy từ backend (GET /api/config), nhớ lại cho lần sau
async function getChainConfig() {
  if (!chainConfig) chainConfig = await apiGet('/config');
  return chainConfig;
}

function hasWallet() {
  return !!window.ethereum;
}

// =============================================================
// 1. ĐỔI LỖI CỦA METAMASK / ETHERS THÀNH CÂU TIẾNG VIỆT
// =============================================================
function walletError(error) {
  const code = error.code || (error.info && error.info.error && error.info.error.code);
  const text = String(error.shortMessage || error.message || '');
  if (code === 4001 || code === 'ACTION_REJECTED') return new Error('Bạn đã từ chối trong MetaMask.');
  if (code === -32002) return new Error('MetaMask đang có một yêu cầu chờ. Hãy mở MetaMask để xử lý.');
  if (code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(text)) {
    return new Error('Ví không đủ ' + ((chainConfig && chainConfig.currencySymbol) || 'ETH') + ' để trả phí gas. Lấy thêm từ faucet.');
  }
  if (error.reason) return new Error(error.reason); // câu lỗi của contract, vd "Sai vai tro"
  return new Error(text || 'Giao dịch thất bại.');
}

// =============================================================
// 2. KẾT NỐI VÍ VÀ CHUYỂN MẠNG
// =============================================================
async function ensureNetwork() {
  const config = await getChainConfig();
  const current = await window.ethereum.request({ method: 'eth_chainId' });
  if (current.toLowerCase() === config.chainIdHex) return;
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: config.chainIdHex }] });
  } catch (error) {
    // 4902 = MetaMask chưa có mạng này (Ganache local) -> thêm mạng rồi chuyển
    if (error.code !== 4902 || !config.rpcUrl) throw walletError(error);
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: config.chainIdHex, chainName: config.chainName, rpcUrls: [config.rpcUrl],
        nativeCurrency: { name: 'Ether', symbol: config.currencySymbol, decimals: 18 } }],
    });
  }
}

async function connectWallet() {
  if (!hasWallet()) throw new Error('Trình duyệt chưa có MetaMask. Cài tiện ích MetaMask rồi tải lại trang.');
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    await ensureNetwork();
    return ethers.getAddress(accounts[0]);
  } catch (error) {
    throw error instanceof Error && !error.code ? error : walletError(error);
  }
}

// =============================================================
// 3. ĐĂNG NHẬP BẰNG CHỮ KÝ
// Xin thông điệp có nonce -> ký trong MetaMask (miễn phí) -> backend kiểm tra -> token
// =============================================================
async function signInWithWallet() {
  const address = await connectWallet();
  const { message } = await apiGet('/auth/nonce?address=' + address);
  let signature;
  try {
    const hexMessage = ethers.hexlify(ethers.toUtf8Bytes(message));
    signature = await window.ethereum.request({ method: 'personal_sign', params: [hexMessage, address] });
  } catch (error) {
    throw walletError(error);
  }
  const result = await apiPost('/auth/login', { address, signature });
  saveSession(result);
  return result;
}

// =============================================================
// 4. GỬI GIAO DỊCH LÊN CONTRACT
// Gọi thử (staticCall, không tốn gas) trước để biết sớm lỗi của contract,
// rồi mới mở MetaMask cho người dùng xác nhận và chờ giao dịch vào khối.
// =============================================================
async function getSignedContract() {
  const config = await getChainConfig();
  if (!config.contract) throw new Error('Chưa có địa chỉ contract. Quản trị viên cần deploy và cập nhật deployment.json.');
  await connectWallet();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const session = getSession();
  if (session && !sameAddress(await signer.getAddress(), session.address)) {
    throw new Error('MetaMask đang chọn ví khác với ví đã đăng nhập (' + shortAddress(session.address) + ').');
  }
  return new ethers.Contract(config.contract, config.abi, signer);
}

async function sendContractTx(method, args, onSent) {
  const contract = await getSignedContract();
  try {
    await contract[method].staticCall(...args);
    const tx = await contract[method](...args);
    if (onSent) onSent(tx.hash); // đã ký, đang chờ vào khối
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber, receipt, contract };
  } catch (error) {
    throw walletError(error);
  }
}

// Lấy id sản phẩm mới từ event ProductCreated trong receipt
function productIdFromReceipt(result) {
  for (const log of result.receipt.logs) {
    const parsed = result.contract.interface.parseLog(log);
    if (parsed && parsed.name === 'ProductCreated') return Number(parsed.args.id);
  }
  return null;
}

// Link xem giao dịch trên Etherscan (rỗng nếu mạng local)
function explorerTxUrl(txHash) {
  return chainConfig && chainConfig.explorerUrl ? chainConfig.explorerUrl + '/tx/' + txHash : '';
}

// Báo backend bỏ dữ liệu nhớ tạm để trang Doanh nghiệp cập nhật ngay
async function refreshPublicData() {
  try {
    await apiPost('/businesses/refresh');
  } catch (error) {
    // không quan trọng: dữ liệu tự làm mới sau 10 giây
  }
}

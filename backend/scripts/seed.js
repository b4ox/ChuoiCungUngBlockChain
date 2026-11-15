// =============================================================
// SEED DỮ LIỆU DEMO (npm run seed)
// Chạy trên Ganache vừa khởi động + contract vừa deploy:
//   - Đăng ký 4 thành viên (Account 1..4)
//   - Tạo 3 sản phẩm ở 3 trạng thái: Đã bán, Ở nhà phân phối, Đã sản xuất
//   - v1.2: nếu contract có lời mời thì mời / chấp nhận trước mỗi bước
// Dùng chính service của backend nên cũng là bài kiểm tra luồng 6 bước.
// =============================================================
const { provider, readContract, RPC_URL, CONTRACT_ADDRESS, CHAIN_ID, GANACHE_CHAIN_ID } = require('../config/blockchain');
const service = require('../services/supplyChainService');

const MEMBERS = [
  { index: 1, name: 'Công ty Trà Thái Nguyên', role: 1 },
  { index: 2, name: 'Giao Hàng Nhanh', role: 2 },
  { index: 3, name: 'NPP Miền Bắc', role: 3 },
  { index: 4, name: 'Siêu thị ABC', role: 4 },
];

const PRODUCTS = [
  { name: 'Trà xanh Thái Nguyên – Lô 01', origin: 'Tân Cương, Thái Nguyên',
    description: 'Trà búp khô 500g, thu hoạch 10/2026', steps: 5 },
  { name: 'Cà phê Robusta – Lô 07', origin: 'Buôn Ma Thuột, Đắk Lắk',
    description: 'Cà phê nhân rang mộc 1kg', steps: 2 },
  { name: 'Gạo ST25 – Lô 15', origin: 'Sóc Trăng',
    description: 'Gạo đóng túi 5kg', steps: 0 },
];

// =============================================================
// ĐƯA SẢN PHẨM ĐI QUA "steps" bước sau khi tạo (tối đa 5 bước)
// =============================================================
async function moveProduct(acc, id, steps) {
  const actions = [
    () => service.pickUp(acc[2], id, 'Nhận tại xưởng'),
    () => service.receive(acc[3], id, 'Nhập kho nhà phân phối'),
    () => service.pickUp(acc[2], id, 'Xuất kho tới cửa hàng'),
    () => service.receive(acc[4], id, 'Lên kệ cửa hàng'),
    () => service.sell(acc[4], id, 'Bán cho khách hàng'),
  ];
  for (let i = 0; i < steps; i++) {
    await actions[i]();
  }
}

// =============================================================
// LỜI MỜI (v1.2, chỉ khi contract đã hỗ trợ). Lời mời nhiệm vụ 0, 1
// được gửi lúc tạo sản phẩm; mỗi sản phẩm để lại một tình huống demo:
//   steps 0: GHN và NPP mới được mời, chưa trả lời -> tab "Lời mời"
//   steps 2: đã nhận nhiệm vụ 0, 1; NPP chưa mời chặng 2 -> "Cần mời"
//   steps 5: đủ 4 nhiệm vụ đã chấp nhận
// =============================================================
async function prepareInvites(acc, id, steps) {
  if (!service.invitationsSupported() || steps === 0) return;
  await service.accept(acc[2], id, { task: 0 });
  await service.accept(acc[3], id, { task: 1 });
  if (steps <= 2) return;
  await service.invite(acc[3], id, { task: 2, invitee: acc[2] });
  await service.invite(acc[3], id, { task: 3, invitee: acc[4] });
  await service.accept(acc[2], id, { task: 2 });
  await service.accept(acc[4], id, { task: 3 });
}

async function main() {
  // Seed cần tài khoản mở khoá sẵn, chỉ Ganache có. Trên Sepolia doanh nghiệp tự đăng ký.
  if (CHAIN_ID !== GANACHE_CHAIN_ID) {
    console.log('Seed chỉ chạy với Ganache local (CHAIN_ID=1337 trong backend/.env). Trên Sepolia không cần seed.');
    return;
  }
  console.log(`Seed vào contract ${CONTRACT_ADDRESS} tại ${RPC_URL}`);
  const acc = await provider.send('eth_accounts', []);

  if (Number(await readContract.productCount()) > 0) {
    console.log('Contract đã có sản phẩm. Hãy khởi động lại Ganache, deploy lại rồi chạy seed.');
    return;
  }

  for (const m of MEMBERS) {
    await service.registerParticipant(acc[0], { account: acc[m.index], name: m.name, role: m.role });
    console.log(`  + Thành viên: ${m.name}`);
  }

  for (const p of PRODUCTS) {
    const input = service.invitationsSupported() ? { ...p, transporter: acc[2], distributor: acc[3] } : p;
    const { productId } = await service.createProduct(acc[1], input);
    await prepareInvites(acc, productId, p.steps);
    await moveProduct(acc, productId, p.steps);
    console.log(`  + Sản phẩm #${productId}: ${p.name} (đi ${p.steps} bước)`);
  }
  console.log('Seed xong.');
}

main().catch((err) => {
  console.error('Seed thất bại:', err.reason || err.shortMessage || err.message);
  process.exitCode = 1;
});

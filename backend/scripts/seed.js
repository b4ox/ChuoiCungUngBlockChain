// =============================================================
// SEED DỮ LIỆU DEMO (npm run seed)
// Chạy trên Ganache vừa khởi động + contract vừa deploy:
//   - Đăng ký 4 thành viên (Account 1..4)
//   - Tạo 3 sản phẩm ở 3 trạng thái: Đã bán, Ở nhà phân phối, Đã sản xuất
// Dùng chính service của backend nên cũng là bài kiểm tra luồng 6 bước.
// =============================================================
const { provider, readContract, RPC_URL, CONTRACT_ADDRESS } = require('../config/blockchain');
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

async function main() {
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
    const { productId } = await service.createProduct(acc[1], p);
    await moveProduct(acc, productId, p.steps);
    console.log(`  + Sản phẩm #${productId}: ${p.name} (đi ${p.steps} bước)`);
  }
  console.log('Seed xong.');
}

main().catch((err) => {
  console.error('Seed thất bại:', err.reason || err.shortMessage || err.message);
  process.exitCode = 1;
});

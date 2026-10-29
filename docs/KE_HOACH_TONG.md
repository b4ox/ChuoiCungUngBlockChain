# Kế hoạch dự án: Chuỗi cung ứng ứng dụng Blockchain

> **Bản sao trong repo** của tài liệu trên Claude, để cả nhóm và AI agent đọc được. Chủ sở hữu: điều phối viên `b4ox`.
> Cập nhật: 2026-10-29. Khi có mâu thuẫn, `AGENTS.md` và các file trong `shared/` được ưu tiên.
>
> ⚠️ Đây là kế hoạch ban đầu. Một số chi tiết đã được thay thế khi chia nhóm: ABI/địa chỉ contract nằm ở `shared/contract/` (không còn `backend/config/contract.json`),
> danh sách API chính thức ở `shared/API_SPEC.md`, nhánh Git theo `AGENTS.md` (`master` ← `dev` ← `contract` · `backend` · `frontend`).

## 1. Tổng quan & mục tiêu

Dự án xây dựng một DApp truy xuất nguồn gốc sản phẩm: mỗi lô hàng được ghi lên blockchain từ lúc sản xuất đến khi bán cho người tiêu dùng, và ai cũng tra cứu được lịch sử bằng mã sản phẩm hoặc mã QR. Toàn bộ chạy trên máy local, phục vụ demo và học tập.

**Bài toán:** trong chuỗi cung ứng truyền thống, dữ liệu nằm rải rác ở từng bên và có thể bị sửa. Blockchain giúp mỗi bước chuyển giao được ghi lại kèm thời gian, địa chỉ ví người thực hiện, và không thể chỉnh sửa về sau.

**Mục tiêu demo:**

- Viết, biên dịch và deploy smart contract trên [Remix IDE](https://remix.ethereum.org), kết nối tới blockchain local (Ganache).
- Mỗi vai trò (sản xuất, vận chuyển, phân phối, bán lẻ) thao tác trên giao diện web để cập nhật trạng thái sản phẩm.
- Người tiêu dùng nhập mã sản phẩm để xem toàn bộ hành trình dạng timeline.
- Code ngắn gọn, dễ đọc, có chú thích tiếng Việt cho từng khối lớn.

**Ngoài phạm vi:** deploy lên mạng thật/testnet, token thanh toán, bảo mật cấp production, tối ưu gas.

**Công nghệ chọn:**

| Thành phần | Công nghệ | Lý do |
| --- | --- | --- |
| Smart contract | Solidity ^0.8.20, viết trên Remix IDE | Không cần cài compiler, deploy trực tiếp |
| Blockchain local | Ganache (GUI hoặc `ganache` CLI), port 7545/8545 | Có sẵn 10 tài khoản đã mở khóa, mỗi tài khoản 100 ETH ảo |
| Đồng bộ file | `@remix-project/remixd` | Remix đọc/ghi thẳng file `.sol` trong thư mục dự án |
| Backend | Node.js + Express + ethers.js v6 | Phổ biến, ít cấu hình, dễ hiểu |
| Frontend | HTML + CSS + JavaScript thuần, Bootstrap 5 | Không cần build, mở là chạy |
| Tiện ích | `qrcode` (tạo mã QR), `dotenv`, `cors`, `nodemon` | Thư viện nhỏ, một chức năng |

## 2. Kiến trúc hệ thống

Hệ thống có 3 lớp chạy trên cùng một máy: frontend gọi backend qua REST, backend gọi contract trên Ganache qua ethers.js. Remix chỉ tham gia lúc viết và deploy contract.

```text
  [Thư mục contracts/] <--remixd--> [Remix IDE] --(1) deploy, JSON-RPC--> +-----------------------+
                                        |                                 |       GANACHE         |
                                        | (2) copy ABI + address          | Blockchain local :7545|
                                        v     vào shared/contract/        | 10 tài khoản, 100 ETH |
  [Frontend HTML/JS] --REST /api--> [Backend Express] --ethers.js-------> | Contract SupplyChain  |
   trình duyệt :3000                 ký tx thay người dùng                +-----------------------+
```

**Giai đoạn phát triển:** file `.sol` nằm trong thư mục dự án, Remix mở nó qua remixd, compile và deploy lên Ganache. Sau khi deploy, copy ABI + địa chỉ contract sang backend — đây là “cây cầu” giữa Remix và backend.

**Giai đoạn chạy demo:** người dùng thao tác trên frontend → backend tạo giao dịch, ký bằng tài khoản Ganache tương ứng vai trò → Ganache đào khối ngay lập tức → backend trả kết quả và frontend cập nhật giao diện. Remix vẫn có thể dùng song song để gọi trực tiếp hàm contract khi cần kiểm tra.

## 3. Vai trò & luồng nghiệp vụ

Có 5 vai trò ghi dữ liệu và 1 vai trò chỉ đọc. Mỗi vai trò gắn với một tài khoản Ganache; Admin là tài khoản đã deploy contract.

| Vai trò | Tài khoản Ganache | Được phép làm |
| --- | --- | --- |
| Admin (owner) | Account 0 | Đăng ký thành viên và gán vai trò; xem toàn bộ hệ thống |
| Nhà sản xuất (Manufacturer) | Account 1 | Tạo sản phẩm/lô hàng mới |
| Đơn vị vận chuyển (Transporter) | Account 2 | Nhận hàng đi giao (2 chặng) |
| Nhà phân phối (Distributor) | Account 3 | Xác nhận đã nhận hàng từ nhà sản xuất |
| Nhà bán lẻ (Retailer) | Account 4 | Xác nhận nhận hàng, đánh dấu đã bán |
| Người tiêu dùng | Không cần ví | Tra cứu nguồn gốc theo mã sản phẩm / QR (chỉ đọc, không tốn gas) |

**Vòng đời sản phẩm** — trạng thái chỉ đi một chiều, mỗi bước chỉ đúng vai trò mới được thực hiện:

1. `Manufactured` (0) — Nhà sản xuất gọi `createProduct(name, origin, description)`.
2. `InTransitToDistributor` (1) — Vận chuyển gọi `pickUpProduct(id)`.
3. `AtDistributor` (2) — Nhà phân phối gọi `receiveProduct(id)`.
4. `InTransitToRetailer` (3) — Vận chuyển gọi `pickUpProduct(id)` lần hai.
5. `AtRetailer` (4) — Nhà bán lẻ gọi `receiveProduct(id)`.
6. `Sold` (5) — Nhà bán lẻ gọi `markAsSold(id)`.

Mỗi bước lưu một bản ghi lịch sử gồm: trạng thái, địa chỉ người thực hiện, thời gian (`block.timestamp`), ghi chú (ví dụ “Kho Hà Nội”, “Nhiệt độ 4°C”). Gọi sai thứ tự hoặc sai vai trò thì giao dịch bị `revert` kèm thông báo lỗi rõ ràng.

## 4. Smart contract `SupplyChain.sol`

Một contract duy nhất (\~150 dòng) chứa toàn bộ logic; không dùng thư viện ngoài, không kế thừa, chỉ dùng `enum`, `struct`, `mapping`, mảng và `modifier`.

**Thành phần chính:**

| Nhóm | Tên | Vai trò |
| --- | --- | --- |
| Enum | `Role`, `Status` | Vai trò thành viên; 6 trạng thái sản phẩm |
| Struct | `Participant`, `Product`, `History` | Thành viên; thông tin sản phẩm; một bước trong hành trình |
| Mapping | `participants`, `products`, `histories` | Tra theo địa chỉ ví / theo mã sản phẩm |
| Modifier | `onlyOwner`, `onlyRole`, `productExists` | Kiểm tra quyền và dữ liệu trước khi chạy hàm |
| Event | `ParticipantRegistered`, `ProductCreated`, `StatusChanged` | Backend/frontend đọc log để hiển thị hoạt động mới |
| Hàm ghi | `registerParticipant`, `createProduct`, `pickUpProduct`, `receiveProduct`, `markAsSold` | Thay đổi dữ liệu, tốn gas |
| Hàm đọc | `getProduct`, `getHistory`, `getAllParticipants`, `productCount` | Miễn phí, không cần ký |

**Code mẫu** (chuỗi trong `require` viết không dấu vì Solidity chỉ nhận ASCII nếu không dùng tiền tố `unicode`):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChain
 * @notice Truy xuất nguồn gốc sản phẩm qua các bên trong chuỗi cung ứng.
 */
contract SupplyChain {
    // ===== 1. KIỂU DỮ LIỆU =====
    // Vai trò của thành viên. None = chưa đăng ký.
    enum Role { None, Manufacturer, Transporter, Distributor, Retailer }

    // Các trạng thái sản phẩm, chỉ đi một chiều từ 0 -> 5.
    enum Status {
        Manufactured,           // 0: vừa sản xuất
        InTransitToDistributor, // 1: đang chở tới nhà phân phối
        AtDistributor,          // 2: đã ở nhà phân phối
        InTransitToRetailer,    // 3: đang chở tới cửa hàng
        AtRetailer,             // 4: đã ở cửa hàng
        Sold                    // 5: đã bán
    }

    struct Participant {
        string name;
        Role role;
        bool isActive;
    }

    struct Product {
        uint256 id;
        string name;
        string origin;        // nơi sản xuất
        string description;
        address manufacturer;
        address currentOwner; // ai đang giữ hàng
        Status status;
        uint256 createdAt;
    }

    // Mỗi bước trong hành trình của sản phẩm
    struct History {
        Status status;
        address actor;
        uint256 timestamp;
        string note;
    }

    // ===== 2. BIẾN TRẠNG THÁI =====
    address public owner;                               // admin = người deploy
    uint256 public productCount;                        // cũng là id của sản phẩm mới nhất
    mapping(address => Participant) public participants;
    address[] public participantList;                   // để liệt kê thành viên
    mapping(uint256 => Product) public products;
    mapping(uint256 => History[]) private histories;

    // ===== 3. EVENTS =====
    event ParticipantRegistered(address indexed account, string name, Role role);
    event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
    event StatusChanged(uint256 indexed id, Status status, address indexed actor, string note);

    // ===== 4. MODIFIERS: kiểm tra điều kiện trước khi chạy hàm =====
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi admin duoc phep");
        _;
    }

    modifier onlyRole(Role _role) {
        Participant memory p = participants[msg.sender];
        require(p.isActive && p.role == _role, "Sai vai tro");
        _;
    }

    modifier productExists(uint256 _id) {
        require(_id > 0 && _id <= productCount, "San pham khong ton tai");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ===== 5. QUẢN LÝ THÀNH VIÊN (chỉ admin) =====
    function registerParticipant(address _account, string memory _name, Role _role)
        external onlyOwner
    {
        require(_role != Role.None, "Vai tro khong hop le");
        // Chỉ thêm vào danh sách nếu là thành viên mới (tránh trùng)
        if (participants[_account].role == Role.None) {
            participantList.push(_account);
        }
        participants[_account] = Participant(_name, _role, true);
        emit ParticipantRegistered(_account, _name, _role);
    }

    // ===== 6. NGHIỆP VỤ CHUỖI CUNG ỨNG =====
    // Bước 0: nhà sản xuất tạo sản phẩm
    function createProduct(string memory _name, string memory _origin, string memory _description)
        external onlyRole(Role.Manufacturer)
    {
        productCount++;
        products[productCount] = Product(
            productCount, _name, _origin, _description,
            msg.sender, msg.sender, Status.Manufactured, block.timestamp
        );
        _addHistory(productCount, Status.Manufactured, "San pham duoc tao");
        emit ProductCreated(productCount, _name, msg.sender);
    }

    // Bước 1 và 3: đơn vị vận chuyển nhận hàng đi giao
    function pickUpProduct(uint256 _id, string memory _note)
        external onlyRole(Role.Transporter) productExists(_id)
    {
        Product storage p = products[_id];
        if (p.status == Status.Manufactured) {
            p.status = Status.InTransitToDistributor;
        } else if (p.status == Status.AtDistributor) {
            p.status = Status.InTransitToRetailer;
        } else {
            revert("Chua the van chuyen o trang thai nay");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 2 và 4: nhà phân phối / nhà bán lẻ xác nhận đã nhận hàng
    function receiveProduct(uint256 _id, string memory _note)
        external productExists(_id)
    {
        Participant memory me = participants[msg.sender];
        require(me.isActive, "Chua duoc dang ky");
        Product storage p = products[_id];

        if (me.role == Role.Distributor && p.status == Status.InTransitToDistributor) {
            p.status = Status.AtDistributor;
        } else if (me.role == Role.Retailer && p.status == Status.InTransitToRetailer) {
            p.status = Status.AtRetailer;
        } else {
            revert("Sai vai tro hoac sai trang thai");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 5: nhà bán lẻ bán cho người tiêu dùng
    function markAsSold(uint256 _id, string memory _note)
        external onlyRole(Role.Retailer) productExists(_id)
    {
        Product storage p = products[_id];
        require(p.status == Status.AtRetailer, "San pham chua den cua hang");
        require(p.currentOwner == msg.sender, "Ban khong giu san pham nay");
        p.status = Status.Sold;
        _addHistory(_id, Status.Sold, _note);
    }

    // ===== 7. HÀM ĐỌC (view, không tốn gas) =====
    function getProduct(uint256 _id) external view productExists(_id) returns (Product memory) {
        return products[_id];
    }

    function getHistory(uint256 _id) external view productExists(_id) returns (History[] memory) {
        return histories[_id];
    }

    function getAllParticipants() external view returns (address[] memory) {
        return participantList;
    }

    // ===== 8. HÀM NỘI BỘ =====
    // Ghi một bước vào lịch sử và phát event để bên ngoài theo dõi
    function _addHistory(uint256 _id, Status _status, string memory _note) internal {
        histories[_id].push(History(_status, msg.sender, block.timestamp, _note));
        emit StatusChanged(_id, _status, msg.sender, _note);
    }
}
```

**Deploy trên Remix:**

1. Mở Ganache (GUI: port 7545, hoặc `npx ganache -p 8545 -d` để có bộ tài khoản cố định mỗi lần chạy).
2. Chạy `npx @remix-project/remixd -s ./contracts -u https://remix.ethereum.org`, trên Remix chọn workspace **localhost** để mở file `SupplyChain.sol` trong dự án.
3. Tab **Solidity Compiler**: chọn compiler 0.8.20+, mở *Advanced Configurations* → **EVM version = paris** (Ganache chưa hỗ trợ opcode `PUSH0` của bản Shanghai, để mặc định sẽ lỗi `invalid opcode`).
4. Tab **Deploy & Run**: Environment = *Dev - Ganache Provider* (hoặc *Custom - External Http Provider*) → nhập `http://127.0.0.1:7545` → chọn Account 0 → **Deploy**.
5. Copy địa chỉ contract và ABI (tab Compiler → nút *ABI*) dán vào `backend/config/contract.json`.
6. Thử nhanh trên Remix: gọi `registerParticipant` cho Account 1–4, rồi `createProduct` bằng Account 1.

## 5. Backend (Node.js + Express + ethers.js)

Backend là lớp trung gian mỏng: nhận yêu cầu REST từ frontend, gọi contract trên Ganache bằng ethers.js, rồi trả JSON đã “dịch” sang dạng dễ đọc. Không dùng database: mọi dữ liệu nằm trên blockchain.

**Cách ký giao dịch:** tài khoản Ganache đã được mở khóa sẵn, nên backend dùng `provider.getSigner(address)` để ký thay người dùng mà không cần lưu private key. Frontend chỉ gửi kèm địa chỉ `from` (tài khoản đang đóng vai). Cách này chỉ phù hợp demo local.

**API endpoints:**

| Method | Endpoint | Body | Gọi hàm contract |
| --- | --- | --- | --- |
| GET | `/api/accounts` | — | `eth_accounts` + `participants(addr)` |
| GET | `/api/participants` | — | `getAllParticipants`, `participants` |
| POST | `/api/participants` | `from, account, name, role` | `registerParticipant` |
| GET | `/api/products` | — | `productCount` + `getProduct` (vòng lặp 1..n) |
| GET | `/api/products/:id` | — | `getProduct` + `getHistory` |
| POST | `/api/products` | `from, name, origin, description` | `createProduct` |
| POST | `/api/products/:id/pickup` | `from, note` | `pickUpProduct` |
| POST | `/api/products/:id/receive` | `from, note` | `receiveProduct` |
| POST | `/api/products/:id/sell` | `from, note` | `markAsSold` |
| GET | `/api/products/:id/qrcode` | — | (không) — trả ảnh QR trỏ tới trang tra cứu |
| GET | `/api/events?limit=20` | — | `queryFilter(StatusChanged)` — hoạt động gần đây |

Giao dịch ghi trả về `{ success, txHash, blockNumber }`; lỗi `revert` trả HTTP 400 kèm lý do từ contract (ví dụ “Sai vai tro”).

**Kết nối blockchain** — `backend/config/blockchain.js`:

```javascript
// =============================================================
// KẾT NỐI TỚI GANACHE VÀ TẠO ĐỐI TƯỢNG CONTRACT
// - RPC_URL và địa chỉ contract lấy từ .env / contract.json
// - getContract(from): trả về contract đã gắn signer để ghi
// =============================================================
require('dotenv').config();
const { ethers } = require('ethers');
const { address, abi } = require('./contract.json'); // copy từ Remix

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:7545');

// Contract chỉ đọc (không cần ký, không tốn gas)
const readContract = new ethers.Contract(address, abi, provider);

// Contract có signer: dùng cho các hàm ghi dữ liệu
async function getContract(from) {
  const signer = await provider.getSigner(from); // tài khoản Ganache đã unlock
  return new ethers.Contract(address, abi, signer);
}

module.exports = { provider, readContract, getContract };
```

**Lớp xử lý nghiệp vụ** — `backend/services/supplyChainService.js` (trích):

```javascript
// =============================================================
// SERVICE: gom mọi lời gọi contract vào một chỗ
// Contract trả về BigInt và số enum -> đổi sang JSON dễ đọc
// =============================================================
const { readContract, getContract } = require('../config/blockchain');

const STATUS = ['Đã sản xuất', 'Đang tới NPP', 'Ở nhà phân phối',
                'Đang tới cửa hàng', 'Ở cửa hàng', 'Đã bán'];
const ROLE = ['Chưa đăng ký', 'Nhà sản xuất', 'Vận chuyển', 'Nhà phân phối', 'Nhà bán lẻ'];

// Chuyển struct Product từ contract sang object thường
function formatProduct(p) {
  return {
    id: Number(p.id),
    name: p.name,
    origin: p.origin,
    description: p.description,
    manufacturer: p.manufacturer,
    currentOwner: p.currentOwner,
    status: Number(p.status),
    statusText: STATUS[Number(p.status)],
    createdAt: new Date(Number(p.createdAt) * 1000).toISOString(),
  };
}

// Đọc 1 sản phẩm kèm lịch sử
async function getProductDetail(id) {
  const product = formatProduct(await readContract.getProduct(id));
  const history = (await readContract.getHistory(id)).map(h => ({
    status: Number(h.status),
    statusText: STATUS[Number(h.status)],
    actor: h.actor,
    time: new Date(Number(h.timestamp) * 1000).toISOString(),
    note: h.note,
  }));
  return { product, history };
}

// Hàm dùng chung cho mọi giao dịch ghi: gửi tx, chờ đào khối, trả kết quả
async function sendTx(from, method, ...args) {
  const contract = await getContract(from);
  const tx = await contract[method](...args);
  const receipt = await tx.wait();
  return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

module.exports = {
  STATUS, ROLE, getProductDetail,
  createProduct: (from, d) => sendTx(from, 'createProduct', d.name, d.origin, d.description),
  pickUp:        (from, id, note) => sendTx(from, 'pickUpProduct', id, note || ''),
  receive:       (from, id, note) => sendTx(from, 'receiveProduct', id, note || ''),
  sell:          (from, id, note) => sendTx(from, 'markAsSold', id, note || ''),
};
```

**Route mẫu** — `backend/routes/productRoutes.js` (trích):

```javascript
// =============================================================
// ROUTES SẢN PHẨM: mỗi route chỉ lấy dữ liệu từ request,
// gọi service và trả JSON. Lỗi được xử lý tập trung.
// =============================================================
const router = require('express').Router();
const service = require('../services/supplyChainService');

router.get('/:id', async (req, res, next) => {
  try { res.json(await service.getProductDetail(req.params.id)); }
  catch (err) { next(err); }
});

router.post('/:id/pickup', async (req, res, next) => {
  try { res.json(await service.pickUp(req.body.from, req.params.id, req.body.note)); }
  catch (err) { next(err); }
});

module.exports = router;
```

**Middleware lỗi** — lấy lý do `revert` từ ethers v6 để hiển thị cho người dùng:

```javascript
// Bắt mọi lỗi từ routes. ethers v6 đặt lý do revert trong err.reason
app.use((err, req, res, next) => {
  const message = err.reason || err.shortMessage || err.message;
  res.status(400).json({ success: false, message });
});
```

`server.js` chỉ gồm: `express.json()`, `cors()`, `express.static('../frontend')` (phục vụ luôn giao diện), gắn các router dưới `/api`, middleware lỗi, `listen(3000)`.

## 6. Frontend (HTML + Bootstrap + JavaScript thuần)

Giao diện gồm 5 trang dùng chung một thanh menu, một file CSS và một file `api.js` gọi backend bằng `fetch`. Không dùng framework hay bước build.

**Thanh điều hướng chung:** bên phải có dropdown **“Đang đóng vai”** liệt kê các tài khoản Ganache kèm vai trò (ví dụ “Account 1 – Nhà sản xuất”). Lựa chọn lưu trong `localStorage`; mọi yêu cầu ghi gửi kèm địa chỉ này làm `from`. Đổi vai chỉ bằng một cú click — rất tiện khi demo cả chuỗi trên một máy.

| Trang | File | Chức năng chính |
| --- | --- | --- |
| Dashboard | `index.html` | Thẻ thống kê (tổng sản phẩm, số đang vận chuyển, đã bán, số thành viên); bảng “Hoạt động gần đây” từ event `StatusChanged` |
| Quản trị | `admin.html` | Form đăng ký thành viên (chọn địa chỉ, nhập tên, chọn vai trò); bảng danh sách thành viên |
| Sản phẩm | `products.html` | Form tạo sản phẩm (chỉ hiện khi đang là Nhà sản xuất); bảng sản phẩm có badge màu theo trạng thái, ô lọc theo trạng thái |
| Xử lý đơn | `actions.html` | Danh sách sản phẩm mà vai trò hiện tại có thể xử lý; nút “Nhận hàng đi giao” / “Xác nhận đã nhận” / “Đánh dấu đã bán” + ô ghi chú |
| Tra cứu | `trace.html?id=` | Nhập mã sản phẩm → thông tin sản phẩm, mã QR, thanh tiến trình 6 bước và timeline lịch sử (thời gian, người thực hiện, ghi chú) |

**Chi tiết UI để không sơ sài:**

- Badge trạng thái theo màu Bootstrap: xám (đã sản xuất), vàng (đang vận chuyển), xanh dương (ở kho/cửa hàng), xanh lá (đã bán).
- Toast góc màn hình sau mỗi giao dịch: thành công hiển thị `txHash` rút gọn và số block; thất bại hiển thị lý do revert.
- Nút bị khóa và hiện spinner trong lúc chờ giao dịch được đào.
- Địa chỉ ví hiển thị rút gọn `0x12ab…9f3c` kèm tên thành viên nếu đã đăng ký.
- Trang tra cứu dùng được trên điện thoại (quét QR trong cùng mạng LAN).

**File gọi API dùng chung** — `frontend/js/api.js`:

```javascript
// =============================================================
// API HELPER: mọi trang đều gọi backend qua 2 hàm này
// - apiGet(url): đọc dữ liệu
// - apiPost(url, data): ghi dữ liệu, tự động gắn "from" = vai đang chọn
// =============================================================
const API_BASE = 'http://localhost:3000/api';

function getCurrentAccount() {
  return localStorage.getItem('currentAccount');
}

async function apiGet(url) {
  const res = await fetch(API_BASE + url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

async function apiPost(url, body = {}) {
  const res = await fetch(API_BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, from: getCurrentAccount() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message); // ví dụ: "Sai vai tro"
  return data;
}
```

**Ví dụ xử lý nút bấm** — trong `actions.js`:

```javascript
// Khi bấm nút hành động: khóa nút -> gọi API -> báo kết quả -> tải lại bảng
async function handleAction(productId, action, button) {
  const note = document.getElementById(`note-${productId}`).value;
  button.disabled = true;
  try {
    const result = await apiPost(`/products/${productId}/${action}`, { note });
    showToast(`Thành công! Block #${result.blockNumber}`, 'success');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    button.disabled = false;
  }
}
```

## 7. Cấu trúc thư mục dự án

Toàn bộ nằm trong `C:\ChuoiCungUngBlockChain`, chia 3 thư mục tương ứng 3 lớp:

```text
ChuoiCungUngBlockChain/
├── contracts/                  # Remix đọc/ghi qua remixd
│   └── SupplyChain.sol
├── backend/
│   ├── config/
│   │   ├── blockchain.js       # provider, contract, signer
│   │   └── contract.json       # { address, abi } copy từ Remix
│   ├── services/
│   │   └── supplyChainService.js
│   ├── routes/
│   │   ├── accountRoutes.js
│   │   ├── participantRoutes.js
│   │   ├── productRoutes.js
│   │   └── eventRoutes.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── server.js
│   ├── .env                    # RPC_URL, PORT
│   └── package.json
├── frontend/
│   ├── index.html  admin.html  products.html  actions.html  trace.html
│   ├── css/style.css
│   └── js/
│       ├── api.js              # apiGet / apiPost
│       ├── common.js           # navbar, chọn vai, toast, rút gọn địa chỉ
│       └── dashboard.js  admin.js  products.js  actions.js  trace.js
└── README.md                   # hướng dẫn cài đặt và chạy demo
```

**Cài đặt backend:** `npm init -y` rồi `npm i express ethers cors dotenv qrcode` và `npm i -D nodemon`; thêm script `"dev": "nodemon server.js"`.

## 8. Lộ trình triển khai

6 giai đoạn, ước tính khoảng 10–12 ngày làm việc cho một người; mỗi giai đoạn kết thúc bằng một thứ chạy được.

**Giai đoạn 1 — Môi trường (0,5 ngày)**

- [ ] Cài Node.js LTS, Ganache, tạo cấu trúc thư mục
- [ ] Kết nối Remix với thư mục `contracts/` qua remixd

**Giai đoạn 2 — Smart contract (2 ngày)**

- [ ] Viết `SupplyChain.sol`, compile với EVM version `paris`
- [ ] Deploy lên Ganache, thử toàn bộ luồng 6 bước bằng giao diện Remix
- [ ] Thử các ca lỗi: sai vai trò, sai thứ tự, mã sản phẩm không tồn tại
- [ ] Lưu address + ABI vào `contract.json`

**Giai đoạn 3 — Backend (2–3 ngày)**

- [ ] `blockchain.js`, service, middleware lỗi
- [ ] Các route theo bảng API ở mục 5
- [ ] Thử từng endpoint bằng Postman hoặc Thunder Client

**Giai đoạn 4 — Frontend (3 ngày)**

- [ ] Layout chung: navbar, dropdown “Đang đóng vai”, toast
- [ ] Trang Quản trị và Sản phẩm
- [ ] Trang Xử lý đơn
- [ ] Trang Tra cứu với timeline và QR
- [ ] Dashboard thống kê + hoạt động gần đây

**Giai đoạn 5 — Tích hợp & hoàn thiện (1–2 ngày)**

- [ ] Chạy trọn kịch bản demo ở mục 9, sửa lỗi
- [ ] Script `seed` tạo sẵn thành viên và vài sản phẩm mẫu để demo nhanh
- [ ] Rà lại chú thích code

**Giai đoạn 6 — Tài liệu (0,5–1 ngày)**

- [ ] README: cài đặt, deploy, chạy
- [ ] Chụp màn hình / quay video demo

## 9. Kịch bản demo, kiểm thử & quy ước code

**Khởi động khi demo:** (1) mở Ganache → (2) deploy contract trên Remix, cập nhật `contract.json` → (3) `cd backend && npm run dev` → (4) mở `http://localhost:3000`.

**Kịch bản demo \~10 phút:**

1. Admin (Account 0) đăng ký 4 thành viên: “Công ty Trà Thái Nguyên”, “Giao Hàng Nhanh”, “NPP Miền Bắc”, “Siêu thị ABC”.
2. Đổi sang Nhà sản xuất → tạo sản phẩm “Trà xanh Thái Nguyên – Lô 01”.
3. Thử lỗi có chủ đích: vẫn ở vai Nhà sản xuất bấm “Xác nhận đã nhận” → toast báo “Sai vai tro hoac sai trang thai”. Đây là điểm nhấn: contract tự bảo vệ quy trình.
4. Lần lượt đổi vai: Vận chuyển nhận hàng → NPP xác nhận → Vận chuyển nhận chặng 2 → Siêu thị xác nhận → Đánh dấu đã bán.
5. Mở trang Tra cứu (hoặc quét QR bằng điện thoại) → timeline 6 bước với thời gian và người thực hiện.
6. Mở tab *Blocks / Transactions* của Ganache để chỉ các giao dịch tương ứng trên chuỗi.

**Danh sách kiểm thử:**

| Ca kiểm thử | Kết quả mong đợi |
| --- | --- |
| Tài khoản không phải admin gọi `registerParticipant` | Revert “Chi admin duoc phep” |
| Tài khoản chưa đăng ký gọi `createProduct` | Revert “Sai vai tro” |
| `pickUpProduct` khi sản phẩm đang ở trạng thái 1 | Revert “Chua the van chuyen o trang thai nay” |
| Nhà bán lẻ `receiveProduct` khi hàng còn ở bước 1 | Revert “Sai vai tro hoac sai trang thai” |
| `markAsSold` khi chưa tới cửa hàng | Revert “San pham chua den cua hang” |
| `getProduct(999)` | Revert “San pham khong ton tai”; API trả 400 |
| Chạy đủ 6 bước | `getHistory` trả đúng 6 bản ghi theo thứ tự |

**Quy ước code & chú thích:**

- Mỗi file bắt đầu bằng khối chú thích `// =====` nêu file làm gì; mỗi nhóm hàm lớn có tiêu đề đánh số như trong contract mẫu.
- Chú thích giải thích *tại sao*, không lặp lại code; viết tiếng Việt (trừ chuỗi trong Solidity).
- Tên biến/hàm tiếng Anh, `camelCase`; tham số Solidity có tiền tố `_`.
- Không dùng thuật toán phức tạp: chỉ `if/else`, vòng lặp `for` đơn giản, `async/await`.
- Mỗi hàm JavaScript ≤ \~30 dòng; logic dùng chung đặt trong `common.js` / service.

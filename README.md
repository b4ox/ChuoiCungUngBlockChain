# Chuỗi Cung Ứng ứng dụng Blockchain

**Truy xuất nguồn gốc sản phẩm minh bạch, không thể chỉnh sửa, từ nhà sản xuất đến tay người tiêu dùng.**

![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636?logo=solidity)
![Ethereum Sepolia](https://img.shields.io/badge/Network-Sepolia-627EEA?logo=ethereum)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![ethers.js](https://img.shields.io/badge/ethers.js-v6-2535A0)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)
![MetaMask](https://img.shields.io/badge/Wallet-MetaMask-F6851B?logo=metamask&logoColor=white)

Đây là một ứng dụng phi tập trung (DApp). Mỗi lô hàng được ghi lên blockchain Ethereum qua từng chặng:
**Nhà sản xuất → Vận chuyển → Nhà phân phối → Vận chuyển → Nhà bán lẻ → Đã bán.**
Mọi lần chuyển giao đều lưu lại thời gian, ví của bên thực hiện và ghi chú, và không ai sửa được về sau.
Người tiêu dùng chỉ cần nhập mã sản phẩm hoặc quét mã QR là xem được toàn bộ hành trình.

---

## Mục lục

- [Bài toán](#bài-toán)
- [Tính năng chính](#tính-năng-chính)
- [Quy trình nghiệp vụ](#quy-trình-nghiệp-vụ)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ](#công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Kiểm thử](#kiểm-thử)
- [Tài liệu](#tài-liệu)
- [Nhóm phát triển](#nhóm-phát-triển)

## Bài toán

Trong chuỗi cung ứng truyền thống, dữ liệu nằm rải rác ở từng doanh nghiệp và có thể bị sửa đổi.
Người mua khó biết sản phẩm thật sự đến từ đâu và đã qua tay những ai.

Dự án dùng smart contract để mỗi bước giao nhận trở thành một bản ghi công khai và bất biến trên blockchain.
Các bên được giả định là **đã ký hợp đồng ngoài đời**. Website không thay thế hợp đồng, chỉ ghi lại
**bằng chứng thực hiện**: ai được giao việc gì, ai đã nhận lời, ai đã giao và nhận hàng vào lúc nào.
Giá cả và điều khoản hợp đồng không bao giờ được ghi lên chuỗi.

## Tính năng chính

| Tính năng | Mô tả |
| --- | --- |
| 🔐 **Đăng nhập bằng ví MetaMask** | Doanh nghiệp ký một thông điệp (miễn phí) để đăng nhập, không cần mật khẩu. |
| 📝 **Đăng ký và duyệt doanh nghiệp** | Doanh nghiệp gửi hồ sơ, quản trị viên duyệt và gán vai trò trên chuỗi. Thông tin liên hệ không bao giờ công khai. |
| ✉️ **Lời mời theo từng lô hàng** | Nhà sản xuất mời đơn vị vận chuyển và nhà phân phối. Nhà phân phối mời tiếp vận chuyển chặng 2 và nhà bán lẻ. |
| 🤝 **Giao nhận hai đầu** | Trạng thái chỉ đổi khi **cả bên giao và bên nhận** đều xác nhận. |
| 🛡️ **Contract tự bảo vệ quy trình** | Sai vai trò hoặc sai thứ tự thì giao dịch bị từ chối kèm lý do rõ ràng. |
| 🔎 **Tra cứu công khai** | Ai cũng xem được timeline của sản phẩm theo mã hoặc mã QR, không cần ví, dùng tốt trên điện thoại. |
| 📊 **Bảng điều khiển** | Thống kê sản phẩm, thành viên và hoạt động gần đây đọc trực tiếp từ event trên chuỗi. |
| 🧑‍💼 **Quản trị** | Duyệt, thu hồi doanh nghiệp và chuyển nhiệm vụ của bên bị khoá sang doanh nghiệp khác. |

## Quy trình nghiệp vụ

Mỗi sản phẩm (một lô hàng) đi qua 6 trạng thái theo đúng một chiều:

```text
 Đã sản xuất ─▶ Đang tới NPP ─▶ Ở nhà phân phối ─▶ Đang tới cửa hàng ─▶ Ở cửa hàng ─▶ Đã bán
     (0)            (1)               (2)                 (3)               (4)         (5)
```

| Vai trò | Việc được làm |
| --- | --- |
| Quản trị viên | Duyệt hoặc thu hồi doanh nghiệp, chuyển nhiệm vụ khi một bên bị khoá |
| Nhà sản xuất | Tạo lô hàng, mời vận chuyển chặng 1 và nhà phân phối, xác nhận đã giao |
| Đơn vị vận chuyển | Nhận lời mời, xác nhận đã nhận và đã giao ở mỗi chặng |
| Nhà phân phối | Xác nhận đã nhận hàng, mời vận chuyển chặng 2 và nhà bán lẻ |
| Nhà bán lẻ | Xác nhận đã nhận hàng, đánh dấu đã bán |
| Người tiêu dùng | Tra cứu nguồn gốc, không cần ví và không tốn phí |

Chi tiết quy tắc mời, từ chối, huỷ và chuyển nhiệm vụ: [docs/QUY_TRINH_GIAO_NHAN.md](docs/QUY_TRINH_GIAO_NHAN.md).

## Kiến trúc

```text
                         ┌──────────────────────────────┐
   Ghi dữ liệu           │   Ethereum Sepolia           │
   (người dùng tự ký) ──▶│   Smart contract SupplyChain │
          ▲              └──────────────▲───────────────┘
          │ MetaMask                    │ ethers.js (JSON-RPC, chỉ đọc)
┌─────────┴─────────┐   REST /api   ┌───┴──────────────────┐
│ Frontend          │──────────────▶│ Backend              │
│ HTML + Bootstrap  │               │ Node.js + Express    │
└───────────────────┘               │ (hồ sơ, đăng nhập,   │
                                    │  mã QR, gom dữ liệu) │
                                    └──────────────────────┘
```

- **Ghi lên chuỗi:** frontend gửi giao dịch qua MetaMask. Người dùng tự xác nhận và trả phí gas. Backend **không giữ private key nào**.
- **Đọc dữ liệu:** frontend gọi REST API, backend đọc contract và event rồi trả JSON dễ dùng.
- **Ngoài chuỗi:** hồ sơ doanh nghiệp và phiên đăng nhập do backend lưu, không công khai.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Smart contract | Solidity ^0.8.20, viết và deploy bằng Remix IDE (EVM `paris`) |
| Blockchain | Ethereum **Sepolia** testnet. Chạy thử: Ganache local |
| Ví | MetaMask, ethers.js v6 |
| Backend | Node.js 20, Express 4, ethers.js v6, `qrcode` |
| Frontend | HTML, Bootstrap 5, JavaScript thuần (không cần build) |

## Cấu trúc thư mục

```text
ChuoiCungUngBlockChain/
├── contracts/        # SupplyChain.sol, bộ test Remix, hướng dẫn deploy (DEPLOY.md)
├── backend/          # REST API Express: routes, services, script seed, test
├── frontend/         # Giao diện web: tổng quan, đăng nhập, doanh nghiệp, sản phẩm, xử lý đơn, quản trị, tra cứu
├── shared/           # Giao diện dùng chung: ABI, địa chỉ contract, đặc tả API, dữ liệu mock
└── docs/             # Kế hoạch, quy trình nghiệp vụ, lộ trình từng phần
```

## Bắt đầu nhanh

### Yêu cầu

- [Node.js](https://nodejs.org) 20 trở lên
- Trình duyệt có tiện ích [MetaMask](https://metamask.io)
- [Remix IDE](https://remix.ethereum.org) để deploy contract

### Cài đặt

```bash
git clone https://github.com/b4ox/ChuoiCungUngBlockChain.git
cd ChuoiCungUngBlockChain
npm install                            # Ganache + remixd (chỉ cần khi chạy local)
npm --prefix backend install
cp backend/.env.example backend/.env   # để trống = dùng Sepolia theo shared/contract/deployment.json
```

### Cách 1: Chạy trên Sepolia

1. Deploy contract bằng Remix + MetaMask một lần, rồi điền `address`, `deployer`, `deployBlock`
   vào `shared/contract/deployment.json`. Hướng dẫn: [contracts/DEPLOY.md](contracts/DEPLOY.md).
2. Khởi động backend:
   ```bash
   npm run backend
   ```
3. Mở <http://localhost:3000>.
4. **Doanh nghiệp:** chọn mạng Sepolia trong MetaMask, lấy SepoliaETH miễn phí từ faucet,
   bấm **Đăng nhập bằng ví** rồi gửi hồ sơ.
5. **Quản trị viên** (ví đã deploy contract): vào trang **Quản trị** để duyệt hồ sơ.

Dữ liệu trên Sepolia tồn tại lâu dài, không cần deploy hay tạo lại dữ liệu mỗi lần chạy.

### Cách 2: Chạy thử trên Ganache local

1. Khởi động blockchain local (chainId 1337, 10 tài khoản cố định):
   ```bash
   npm run chain
   ```
2. Deploy `SupplyChain.sol` bằng Remix (bật *Enable optimization* 200 runs; môi trường
   *Custom - External Http Provider* → `http://127.0.0.1:7545`; dùng Account 0 cho giao dịch đầu tiên).
   Địa chỉ contract sẽ là `0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab`.
3. Trong `backend/.env`, bỏ chú thích các dòng cấu hình Ganache (`RPC_URL`, `CHAIN_ID`, `CONTRACT_ADDRESS`, `DEPLOY_BLOCK`).
4. Tạo dữ liệu mẫu (tuỳ chọn) và chạy backend:
   ```bash
   npm run seed
   npm run backend
   ```
5. Trong MetaMask, thêm mạng `http://127.0.0.1:7545` (chain ID 1337) và import khoá Account 0 làm ví quản trị.

Dữ liệu mẫu gồm 4 doanh nghiệp và 4 sản phẩm ở các tình huống khác nhau (đã bán, chờ mời, chờ trả lời, chờ xác nhận nhận hàng).

> Trên Windows có thể chạy `chay-dev.bat` để mở cùng lúc remixd và backend.

### Các lệnh có sẵn

| Lệnh | Tác dụng |
| --- | --- |
| `npm run chain` | Chạy Ganache local tại cổng 7545 |
| `npm run remixd` | Kết nối thư mục `contracts/` với Remix IDE |
| `npm run backend` | Chạy backend (kèm giao diện) tại <http://localhost:3000> |
| `npm run seed` | Tạo dữ liệu demo trên Ganache |

## Kiểm thử

| Phần | Phạm vi |
| --- | --- |
| Smart contract | 26 test Remix (`contracts/tests/`) và 53 ca kịch bản trên Ganache |
| Backend | 25 ca gọi API thật trên Ganache |
| Frontend | 13 ca chạy giao diện thật: đăng nhập bằng ví, nhận lời, giao nhận hai đầu, mời, huỷ, chuyển nhiệm vụ |

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [docs/QUY_TRINH_GIAO_NHAN.md](docs/QUY_TRINH_GIAO_NHAN.md) | Quy trình lời mời và giao nhận hai đầu |
| [docs/KE_HOACH_TONG.md](docs/KE_HOACH_TONG.md) | Kế hoạch tổng: nghiệp vụ, kiến trúc, thiết kế ban đầu |
| [shared/CONTRACT_INTERFACE.md](shared/CONTRACT_INTERFACE.md) | Các hàm, event và enum của contract |
| [shared/API_SPEC.md](shared/API_SPEC.md) | Đặc tả REST API |
| [contracts/DEPLOY.md](contracts/DEPLOY.md) | Hướng dẫn deploy contract |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Phân công và quy trình làm việc của nhóm |

## Nhóm phát triển

| Thành viên | Phụ trách |
| --- | --- |
| [@nhungtrieu2005uh-bot](https://github.com/nhungtrieu2005uh-bot) | Smart contract |
| [@b4ox](https://github.com/b4ox) | Backend, điều phối dự án |
| [@vothinhungoc7980-coder](https://github.com/vothinhungoc7980-coder) | Frontend |

---

> ⚠️ Dự án phục vụ mục đích học tập và demo, chạy trên mạng thử nghiệm Sepolia hoặc blockchain local.
> Chưa được kiểm toán bảo mật và không dùng cho tài sản thật.

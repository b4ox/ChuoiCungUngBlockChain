# Backend — REST API

Express + ethers.js v6, nối tới contract `SupplyChain` trên Sepolia (hoặc Ganache khi chạy thử). Đặc tả API: `../shared/API_SPEC.md` (v1.1).

Backend chỉ **đọc** chuỗi. Giao dịch ghi do người dùng ký bằng MetaMask ở frontend. Backend lo thêm phần ngoài chuỗi:
đăng nhập bằng chữ ký ví (`/auth`), hồ sơ doanh nghiệp (`/applications`, lưu `data/applications.json`), doanh nghiệp công khai (`/businesses`).

## Chạy lần đầu (Sepolia)

```powershell
# Contract đã deploy lên Sepolia và có địa chỉ trong ../shared/contract/deployment.json (xem ../contracts/DEPLOY.md, mục 5)
cd backend
npm install
copy .env.example .env   # để trống các biến chuỗi = dùng Sepolia theo deployment.json
npm run dev              # http://localhost:3000
```

Kiểm tra nhanh: mở `http://localhost:3000/api/health`. Thử từng endpoint: `tests/api.http`.

## Chạy thử với Ganache local

```powershell
npm run chain            # thư mục gốc, terminal 1
# Deploy bằng Remix (Custom - External Http Provider, Account 0, giao dịch đầu tiên)
# backend/.env: RPC_URL=http://127.0.0.1:7545  CHAIN_ID=1337  CONTRACT_ADDRESS=0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab  DEPLOY_BLOCK=0
npm run seed             # 4 thành viên + 3 sản phẩm mẫu (chỉ chạy được với Ganache)
npm run dev
```

## Chế độ mock

Đặt `MOCK_CHAIN=true` trong `.env`: các GET đọc chuỗi trả dữ liệu trong `../shared/mock/`, API ghi cũ trả `tx-success.json`.
Đăng nhập bằng ví và hồ sơ doanh nghiệp vẫn chạy thật (không cần blockchain). Ví quản trị = tài khoản `isAdmin` trong `accounts.json`.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `server.js` | Khởi động Express, phục vụ `../frontend`, gắn router `/api` |
| `config/blockchain.js` | Provider, contract đọc/ghi; ABI + địa chỉ đọc từ `../shared/contract/` |
| `services/supplyChainService.js` | Mọi lời gọi contract (đọc event theo đoạn khối) |
| `services/authService.js` | Nonce, kiểm tra chữ ký ví, phiên |
| `services/applicationService.js` | Hồ sơ doanh nghiệp (file JSON) |
| `services/businessService.js` | Doanh nghiệp công khai |
| `middleware/auth.js` | `requireAuth`, `requireAdmin` |
| `services/mockService.js` | Bản giả đọc `shared/mock/` |
| `services/format.js` | Đổi BigInt/enum/timestamp sang JSON theo API_SPEC |
| `routes/*Routes.js` | Mỗi route: đọc request → gọi service → trả JSON |
| `middleware/errorHandler.js` | Lỗi revert → 400, mất kết nối/chưa deploy → 500 |
| `scripts/seed.js` | Dữ liệu demo |

## Lỗi thường gặp

| Thông báo | Cách xử lý |
| --- | --- |
| `Không kết nối được blockchain …` | Sepolia: kiểm tra mạng / đổi `RPC_URL`. Ganache: chạy `npm run chain` |
| `Chưa có contract tại …` | Chưa điền `address` trong `deployment.json`, hoặc Ganache vừa khởi động lại → deploy lại |
| `Phiên đăng nhập đã hết hạn` | Backend vừa khởi động lại (phiên lưu trong bộ nhớ) → đăng nhập lại bằng ví |
| Lỗi khi đọc event trên Sepolia | Giảm `LOG_CHUNK_SIZE` trong `.env` (RPC công khai giới hạn số khối mỗi lần) |
| `Contract đã có sản phẩm` (khi seed) | Seed chỉ chạy một lần; muốn làm lại thì khởi động lại Ganache + deploy lại |
| Điện thoại quét QR không mở được | Đặt `PUBLIC_URL=http://<IP máy>:3000` trong `.env`, điện thoại cùng Wi-Fi |

d
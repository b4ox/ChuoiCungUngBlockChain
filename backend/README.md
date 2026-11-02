# Backend — REST API

Express + ethers.js v6, nối tới contract `SupplyChain` trên Ganache. Đặc tả API: `../shared/API_SPEC.md`.

## Chạy lần đầu

```powershell
# Thư mục gốc, terminal 1: chạy Ganache
npm run chain

# Deploy SupplyChain.sol bằng Remix (Account 0, giao dịch đầu tiên) -> xem ../contracts/DEPLOY.md
# Địa chỉ sẽ trùng shared/contract/deployment.json

# Terminal 2
cd backend
npm install
copy .env.example .env
npm run seed      # 4 thành viên + 3 sản phẩm mẫu (chỉ chạy trên contract mới deploy)
npm run dev       # http://localhost:3000
```

Kiểm tra nhanh: mở `http://localhost:3000/api/health`. Thử từng endpoint: `tests/api.http`.

## Chế độ mock

Đặt `MOCK_CHAIN=true` trong `.env`: mọi GET trả dữ liệu trong `../shared/mock/`, mọi POST trả `tx-success.json`.
Không cần Ganache.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `server.js` | Khởi động Express, phục vụ `../frontend`, gắn router `/api` |
| `config/blockchain.js` | Provider, contract đọc/ghi; ABI + địa chỉ đọc từ `../shared/contract/` |
| `services/supplyChainService.js` | Mọi lời gọi contract |
| `services/mockService.js` | Bản giả đọc `shared/mock/` |
| `services/format.js` | Đổi BigInt/enum/timestamp sang JSON theo API_SPEC |
| `routes/*Routes.js` | Mỗi route: đọc request → gọi service → trả JSON |
| `middleware/errorHandler.js` | Lỗi revert → 400, mất kết nối/chưa deploy → 500 |
| `scripts/seed.js` | Dữ liệu demo |

## Lỗi thường gặp

| Thông báo | Cách xử lý |
| --- | --- |
| `Không kết nối được blockchain (Ganache)` | Chạy `npm run chain` ở thư mục gốc |
| `Chưa có contract tại 0x…` | Ganache vừa khởi động lại → deploy lại bằng Remix |
| `Contract đã có sản phẩm` (khi seed) | Seed chỉ chạy một lần; muốn làm lại thì khởi động lại Ganache + deploy lại |
| Điện thoại quét QR không mở được | Đặt `PUBLIC_URL=http://<IP máy>:3000` trong `.env`, điện thoại cùng Wi-Fi |

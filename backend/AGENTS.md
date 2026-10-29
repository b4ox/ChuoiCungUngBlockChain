# AGENTS.md — Vùng BACKEND (chủ sở hữu: thành viên B – `b4ox`)

Quy tắc chung ở `../AGENTS.md` vẫn áp dụng. File này bổ sung cho vùng Backend.
Lộ trình, checklist và ca kiểm thử: `../docs/LO_TRINH_BACKEND.md`. Code mẫu: `../docs/KE_HOACH_TONG.md`, mục 5.

## Được sửa
(Trừ `AGENTS.md` và `CLAUDE.md` trong thư mục này — đó là thông tin chung, chỉ điều phối viên `b4ox` sửa.)
- `backend/**`
- `shared/API_SPEC.md`, `shared/mock/**`

Chỉ đọc: `shared/contract/**`, `shared/CONTRACT_INTERFACE.md`, `contracts/**`, `frontend/**`.
Không copy ABI vào `backend/` — luôn `require('../../shared/contract/SupplyChain.abi.json')` từ `backend/config/`.

## Công nghệ cố định
Node.js 20, Express 4, ethers.js **v6**, `cors`, `dotenv`, `qrcode`, `nodemon`. CommonJS (`require`).
KHÔNG dùng: TypeScript, database/ORM, NestJS/Fastify, web3.js, ethers v5.

## Cấu trúc
```
backend/
├── config/blockchain.js        # provider, readContract, getContract(from)
├── services/supplyChainService.js  # mọi lời gọi contract + format dữ liệu
├── routes/{account,participant,product,event}Routes.js
├── middleware/errorHandler.js
├── scripts/seed.js             # npm run seed
├── tests/api.http              # request mẫu cho Thunder Client / REST Client
├── server.js
└── .env.example
```
Route chỉ: đọc request → gọi service → trả JSON. Không gọi contract trực tiếp trong route.

## Quy tắc quan trọng
- Ký giao dịch bằng tài khoản Ganache đã unlock: `await provider.getSigner(from)`. Không lưu private key.
- Luôn đổi `BigInt` → `Number` và timestamp → chuỗi ISO trước khi trả JSON.
- Response phải đúng `shared/API_SPEC.md`: đọc → trả thẳng dữ liệu; ghi → `{ success, txHash, blockNumber }`;
  lỗi → HTTP 400/500 `{ success: false, message }` (message = `err.reason || err.shortMessage || err.message`).
- Mọi thay đổi `API_SPEC.md` phải đi kèm cập nhật `shared/mock/` trong cùng thay đổi, và chỉ được THÊM sau M1.
- `MOCK_CHAIN=true` trong `.env` → các route GET trả file trong `shared/mock/` (dùng khi chưa có contract).
- `server.js` phục vụ `frontend/` bằng `express.static(path.join(__dirname, '../frontend'))` — không sửa file trong `frontend/`.

## Kiểm tra
- `npm run dev` khởi động không lỗi; `GET /api/health` trả `ok: true` khi Ganache chạy.
- Response thật khớp cấu trúc mock tương ứng.
- Bảng ca kiểm thử trong `docs/LO_TRINH_BACKEND.md`, mục 6.

# Chuỗi cung ứng ứng dụng Blockchain

DApp truy xuất nguồn gốc sản phẩm: Nhà sản xuất → Vận chuyển → Nhà phân phối → Vận chuyển → Nhà bán lẻ → Đã bán.
Chạy hoàn toàn trên máy local: Remix IDE + Ganache + Express + HTML/Bootstrap.

## Phân công

| Vùng | Thư mục | Người phụ trách | Tài liệu |
| --- | --- | --- | --- |
| Smart contract | `contracts/`, `shared/contract/`, `shared/CONTRACT_INTERFACE.md` | A – `nhungtrieu2005uh-bot` | Lộ trình Smart Contract |
| Backend | `backend/`, `shared/API_SPEC.md`, `shared/mock/` | B – `b4ox` (kiêm điều phối) | Lộ trình Backend |
| Frontend | `frontend/` | C – `vothinhungoc7980-coder` | Lộ trình Frontend |

Thông tin chung (file ở thư mục gốc, `.github/`, mọi `AGENTS.md`/`CLAUDE.md`) chỉ điều phối viên `b4ox` được sửa.

Quy tắc làm việc (cho người và AI agent): xem `AGENTS.md`. Claude Code đọc `CLAUDE.md`, ChatGPT Codex đọc `AGENTS.md`.

## Cài đặt (một lần)

```bash
npm install                 # Ganache + remixd ở thư mục gốc
cd backend && npm install   # sau khi Backend đã có package.json
cp backend/.env.example backend/.env
```

## Chạy toàn hệ thống

1. `npm run chain` — Ganache tại `http://127.0.0.1:7545` (chainId 1337, 10 tài khoản cố định).
2. Deploy contract:
   - `npm run remixd`, mở https://remix.ethereum.org → workspace **localhost** → `SupplyChain.sol`.
   - Compiler 0.8.20+, Advanced → **EVM version = paris** → Compile.
   - Deploy & Run → Environment **Custom - External Http Provider** → `http://127.0.0.1:7545` → Account 0 → Deploy.
   - Địa chỉ phải trùng `shared/contract/deployment.json` (nếu Ganache vừa khởi động và đây là giao dịch đầu tiên). Nếu khác, đặt `CONTRACT_ADDRESS` trong `backend/.env`.
3. `npm run seed` — tạo sẵn thành viên và sản phẩm mẫu.
4. `npm run backend` — mở `http://localhost:3000`.

## Git

`master` ← `dev` ← `contract/*`, `backend/*`, `frontend/*`. Mọi thay đổi qua Pull Request vào `dev`; chỉ `b4ox` merge.
PR có file ngoài vùng của người mở sẽ bị workflow **Zone guard** đánh dấu đỏ.

# Chuỗi cung ứng ứng dụng Blockchain

DApp truy xuất nguồn gốc sản phẩm: Nhà sản xuất → Vận chuyển → Nhà phân phối → Vận chuyển → Nhà bán lẻ → Đã bán.
Chạy hoàn toàn trên máy local: Remix IDE + Ganache + Express + HTML/Bootstrap.

## Phân công

| Vùng | Thư mục | Người phụ trách | Tài liệu |
| --- | --- | --- | --- |
| Smart contract | `contracts/`, `shared/contract/`, `shared/CONTRACT_INTERFACE.md` | A – `nhungtrieu2005uh-bot` | [docs/LO_TRINH_CONTRACT.md](docs/LO_TRINH_CONTRACT.md) |
| Backend | `backend/`, `shared/API_SPEC.md`, `shared/mock/` | B – `b4ox` (kiêm điều phối) | [docs/LO_TRINH_BACKEND.md](docs/LO_TRINH_BACKEND.md) |
| Frontend | `frontend/` | C – `vothinhungoc7980-coder` | [docs/LO_TRINH_FRONTEND.md](docs/LO_TRINH_FRONTEND.md) |

Thông tin chung (file ở thư mục gốc, `.github/`, `docs/`, mọi `AGENTS.md`/`CLAUDE.md`) chỉ điều phối viên `b4ox` được sửa.

Tài liệu: thư mục [`docs/`](docs/README.md) — kế hoạch tổng và lộ trình của từng vùng.

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

## Git — 3 nhánh cố định

`master` (demo) ← `dev` (ghép code) ← `contract` · `backend` · `frontend`. Mỗi người chỉ làm trên nhánh của mình, không tạo nhánh khác.
Mọi thay đổi vào `dev` đi qua Pull Request; chỉ `b4ox` merge, bằng **Create a merge commit**.
PR có file ngoài vùng của người mở sẽ bị workflow **Zone guard** đánh dấu đỏ.

## Quy trình mỗi phiên làm việc

| Lúc | Việc | GitHub Desktop |
| --- | --- | --- |
| Đầu phiên | Về nhánh của mình, lấy code mới của cả nhóm | Chọn nhánh → Fetch origin → Branch → Update from dev |
| Trong phiên | Chỉ sửa file trong vùng mình, commit nhỏ | Kiểm tra danh sách file trước khi Commit |
| Cuối phiên | Đẩy nhánh lên GitHub (kể cả việc dở) | Push origin |
| Xong một phần | Mở Pull Request vào `dev` | Branch → Create Pull Request (base: `dev`) |
| Cuối ngày | Báo tiến độ: Xong · Đang làm · Vướng · Cần ai | — |

Nếu dùng AI agent: mở từ thư mục của mình (`cd frontend && claude` / `codex`) và đảm bảo đang ở đúng nhánh.

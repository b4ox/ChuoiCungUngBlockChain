# Chuỗi cung ứng ứng dụng Blockchain

DApp truy xuất nguồn gốc sản phẩm: Nhà sản xuất → Vận chuyển → Nhà phân phối → Vận chuyển → Nhà bán lẻ → Đã bán.
Contract chạy trên mạng thử nghiệm **Sepolia**. Doanh nghiệp đăng nhập và đăng ký bằng **ví MetaMask** của mình,
quản trị viên duyệt hồ sơ, mọi giao dịch do người dùng tự ký và trả phí gas bằng SepoliaETH (miễn phí từ faucet).
Công nghệ: Remix IDE + MetaMask + Express + HTML/Bootstrap. Vẫn chạy thử được trên Ganache local.

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
npm install                 # Ganache + remixd ở thư mục gốc (chỉ cần nếu chạy thử local)
cd backend && npm install
cp backend/.env.example backend/.env   # để trống = dùng Sepolia theo shared/contract/deployment.json
```

## Chạy trên Sepolia (chính thức)

1. Quản trị viên deploy contract bằng Remix + MetaMask, điền `address`, `deployer`, `deployBlock`
   vào `shared/contract/deployment.json` — xem [contracts/DEPLOY.md](contracts/DEPLOY.md), mục 5. Làm **một lần**.
2. `npm run backend` — mở `http://localhost:3000`.
3. Doanh nghiệp: cài MetaMask, chọn Sepolia, lấy SepoliaETH từ faucet → **Đăng nhập bằng ví** → gửi hồ sơ.
4. Quản trị viên (đăng nhập bằng ví đã deploy) → **Quản trị** → duyệt hồ sơ (ký giao dịch trong MetaMask).
5. Doanh nghiệp đã duyệt dùng chức năng của vai trò; ai cũng xem được trang **Doanh nghiệp** và **Tra cứu**.

Dữ liệu trên Sepolia tồn tại lâu dài, không cần deploy hay seed lại mỗi lần chạy. Hồ sơ doanh nghiệp lưu ở
`backend/data/applications.json` (không commit, nên mỗi máy chạy backend có hồ sơ riêng).

## Chạy thử trên Ganache local

1. `npm run chain` — Ganache tại `http://127.0.0.1:7545` (chainId 1337, 10 tài khoản cố định).
2. Deploy bằng Remix (Custom - External Http Provider, Account 0, giao dịch đầu tiên) → địa chỉ `0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab`.
3. Trong `backend/.env`: `RPC_URL=http://127.0.0.1:7545`, `CHAIN_ID=1337`, `CONTRACT_ADDRESS=0xe78A…a8Ab`, `DEPLOY_BLOCK=0`.
4. `npm run seed` (tuỳ chọn, tạo 4 thành viên + 3 sản phẩm) → `npm run backend`.
5. MetaMask: thêm mạng `http://127.0.0.1:7545`, chain ID 1337; import khoá Account 0 làm ví quản trị.

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

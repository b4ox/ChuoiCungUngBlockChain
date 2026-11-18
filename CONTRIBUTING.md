# Hướng dẫn làm việc cho nhóm phát triển

Tài liệu này dành cho thành viên nhóm. Giới thiệu dự án và cách chạy: xem [README.md](README.md).
Quy tắc đầy đủ cho người và AI agent: [AGENTS.md](AGENTS.md) (Claude Code đọc qua `CLAUDE.md`, ChatGPT Codex đọc trực tiếp).

## Phân công

| Vùng | Thư mục | Người phụ trách | Tài liệu |
| --- | --- | --- | --- |
| Smart contract | `contracts/`, `shared/contract/`, `shared/CONTRACT_INTERFACE.md` | A – `nhungtrieu2005uh-bot` | [docs/LO_TRINH_CONTRACT.md](docs/LO_TRINH_CONTRACT.md) |
| Backend | `backend/`, `shared/API_SPEC.md`, `shared/mock/` | B – `b4ox` (kiêm điều phối) | [docs/LO_TRINH_BACKEND.md](docs/LO_TRINH_BACKEND.md) |
| Frontend | `frontend/` | C – `vothinhungoc7980-coder` | [docs/LO_TRINH_FRONTEND.md](docs/LO_TRINH_FRONTEND.md) |

Thông tin chung (file ở thư mục gốc, `.github/`, `docs/`, mọi `AGENTS.md`/`CLAUDE.md`) chỉ điều phối viên `b4ox` được sửa.

Tài liệu nội bộ: thư mục [`docs/`](docs/README.md), gồm kế hoạch tổng và lộ trình của từng vùng.

## Git: 3 nhánh cố định

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

## Ghi chú khi chạy

- Hồ sơ doanh nghiệp lưu ở `backend/data/applications.json` (không commit), nên mỗi máy chạy backend có hồ sơ riêng.
- Khi chạy Ganache (`-d`): Account 0 = Admin (deploy), 1 = Nhà sản xuất, 2 = Vận chuyển, 3 = Nhà phân phối, 4 = Nhà bán lẻ.
- Deploy lên Sepolia: bật **Enable optimization (200 runs)** trong Remix vì contract v1.3 sát giới hạn 24KB.

# AGENTS.md — Quy tắc chung cho AI agent (ChatGPT Codex, Claude Code, ...)

> File này là nguồn quy tắc DUY NHẤT cho mọi AI agent làm việc trong repo.
> Claude Code đọc qua `CLAUDE.md` (file đó chỉ import file này). ChatGPT Codex đọc trực tiếp.
> Mỗi thư mục con (`contracts/`, `backend/`, `frontend/`) có thêm `AGENTS.md` riêng — quy tắc riêng được ưu tiên hơn quy tắc chung khi mâu thuẫn.

## 1. Dự án

Tài liệu: `docs/KE_HOACH_TONG.md` (kế hoạch tổng, code mẫu) và `docs/LO_TRINH_<VÙNG>.md` (lộ trình, checklist, ca kiểm thử của từng vùng). Đọc lộ trình của vùng mình trước khi bắt đầu một nhiệm vụ.

DApp truy xuất nguồn gốc sản phẩm trong chuỗi cung ứng, chạy hoàn toàn trên máy local để demo.

| Lớp | Công nghệ | Thư mục |
| --- | --- | --- |
| Smart contract | Solidity ^0.8.20, viết và deploy bằng Remix IDE, EVM version `paris` | `contracts/` |
| Blockchain local | Ganache CLI, port 7545, chainId 1337, tài khoản cố định (`-d`) | (chạy bằng `npm run chain`) |
| Backend | Node.js 20, Express 4, ethers.js v6, CommonJS | `backend/` |
| Frontend | HTML + Bootstrap 5 + JavaScript thuần, không build | `frontend/` |
| Giao tiếp chung | ABI, API spec, dữ liệu mock | `shared/` |

Luồng: Frontend --(REST /api)--> Backend --(ethers.js, JSON-RPC)--> Ganache (contract SupplyChain).
Frontend KHÔNG gọi blockchain trực tiếp.

## 2. Ranh giới sở hữu (QUAN TRỌNG NHẤT)

Dự án chia cho 3 người. Agent đang làm việc cho người sở hữu thư mục mà agent được mở trong đó
(xác định bằng thư mục làm việc hiện tại: `contracts/`, `backend/` hoặc `frontend/`).

| Thành viên | GitHub | Vai trò |
| --- | --- | --- |
| A | `nhungtrieu2005uh-bot` | Contract |
| B | `b4ox` | Backend **+ Điều phối viên** (người duy nhất sửa thông tin chung) |
| C | `vothinhungoc7980-coder` | Frontend |

| Đường dẫn | Chủ sở hữu | Agent của Contract | Agent của Backend (b4ox) | Agent của Frontend |
| --- | --- | --- | --- | --- |
| `contracts/**` | A | Sửa | Chỉ đọc | Chỉ đọc |
| `shared/contract/**`, `shared/CONTRACT_INTERFACE.md` | A | Sửa | Chỉ đọc | Chỉ đọc |
| `backend/**`, `shared/API_SPEC.md`, `shared/mock/**` | B | Chỉ đọc | Sửa | Chỉ đọc |
| `frontend/**` | C | Chỉ đọc | Chỉ đọc | Sửa |
| **Thông tin chung:** mọi file ở thư mục gốc (`AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `.gitignore`...), `.github/**`, `docs/**`, `shared/README.md`, và `AGENTS.md`/`CLAUDE.md` ở MỌI thư mục | Điều phối viên `b4ox` | Không sửa | Chỉ sửa khi b4ox yêu cầu rõ | Không sửa |

Quy tắc bắt buộc:

1. **Chỉ tạo/sửa/xoá file trong vùng "Sửa" của mình.** Không ngoại lệ, kể cả sửa lỗi chính tả.
2. **Thông tin chung chỉ điều phối viên `b4ox` được sửa.** Agent của Backend chỉ sửa các file này khi người dùng
   (b4ox) yêu cầu rõ ràng là việc điều phối; nếu không, coi như chỉ đọc. Agent của Contract/Frontend không bao giờ sửa.
3. Nếu agent được mở ở thư mục gốc (không rõ vùng), **hỏi người dùng đang làm phần nào** trước khi sửa bất kỳ file nào.
4. Nếu nhiệm vụ cần thay đổi ngoài vùng (ví dụ cần thêm trường vào API, đổi hàm contract, sửa rule):
   **DỪNG LẠI**, không sửa, và trả lời người dùng bằng một "Đề xuất thay đổi" gồm: file cần đổi, chủ sở hữu, nội dung đề xuất, lý do.
5. Không bao giờ "sửa tạm" code của người khác cho chạy được. Thay vào đó dùng mock / dữ liệu giả trong vùng của mình.
6. Trước khi kết thúc, liệt kê mọi file đã thay đổi và xác nhận tất cả nằm trong vùng "Sửa".

Ranh giới này được GitHub kiểm tra tự động: workflow `.github/workflows/zone-guard.yml` đánh dấu đỏ mọi Pull Request
có file ngoài vùng của người mở PR, và `.github/CODEOWNERS` buộc `b4ox` duyệt mọi PR.

## 3. Giao diện chung đã chốt (interface v1)

Ba phần ghép được với nhau nhờ các file trong `shared/`. Sau mốc M1 (hết Ngày 2) chúng được coi là **đóng băng**:

- `shared/CONTRACT_INTERFACE.md` + `shared/contract/SupplyChain.abi.json` + `shared/contract/deployment.json` — chủ: Contract.
- `shared/API_SPEC.md` + `shared/mock/*.json` — chủ: Backend.

Luật thay đổi:
- Chỉ chủ sở hữu được sửa. Được phép THÊM (hàm mới, endpoint mới, trường mới). KHÔNG được đổi tên / xoá / đổi kiểu / đổi thứ tự enum.
- Thay đổi phá vỡ tương thích → tăng version, ghi mục Changelog cuối file, PR riêng, chủ sở hữu bên phụ thuộc phải duyệt.
- Khi sửa `API_SPEC.md` phải sửa `shared/mock/` trong cùng thay đổi (và ngược lại).
- Enum cố định: `Role` None=0, Manufacturer=1, Transporter=2, Distributor=3, Retailer=4.
  `Status` Manufactured=0, InTransitToDistributor=1, AtDistributor=2, InTransitToRetailer=3, AtRetailer=4, Sold=5.

## 4. Phong cách code (áp dụng mọi thư mục)

- Ưu tiên **đơn giản, dễ hiểu** cho người mới học: `if/else`, vòng `for`, `async/await`. Không dùng thuật toán phức tạp, metaprogramming, pattern nặng nề.
- **Chú thích tiếng Việt** cho mọi khối code lớn, theo mẫu:
  ```
  // =============================================================
  // TÊN KHỐI: giải thích ngắn khối này làm gì, vì sao
  // =============================================================
  ```
  Chú thích giải thích *tại sao*, không lặp lại code. (Riêng chuỗi trong `require/revert` Solidity viết không dấu.)
- Tên biến/hàm tiếng Anh, `camelCase`; hằng số `UPPER_SNAKE_CASE`; tham số Solidity có tiền tố `_`.
- Mỗi hàm JavaScript tối đa ~30 dòng; logic dùng chung đưa vào file tiện ích của vùng mình.
- Không thêm thư viện/framework mới khi chưa được người dùng đồng ý; nếu thêm, ghi lý do.
- Không bao giờ ghi private key, mnemonic, `.env` thật vào code hay commit.

## 5. Git — mô hình 3 nhánh cố định

| Nhánh | Dùng cho | Ai push |
| --- | --- | --- |
| `master` | Bản demo ổn định | Không ai push thẳng; chỉ `b4ox` merge từ `dev` ở mốc M3, M4 |
| `dev` | Nơi ghép code của cả nhóm | Không ai push thẳng; chỉ nhận Pull Request |
| `contract` | Mọi việc của vùng Contract | `nhungtrieu2005uh-bot` |
| `backend` | Mọi việc của vùng Backend **và** việc điều phối (file chung) | `b4ox` |
| `frontend` | Mọi việc của vùng Frontend | `vothinhungoc7980-coder` |

Không tạo nhánh nào khác. Mỗi người chỉ làm trên đúng nhánh của mình.

Quy trình mỗi phiên làm việc:

1. **Đầu phiên:** `git checkout <nhánh-của-mình>` → `git fetch origin` → `git merge origin/dev`
   (GitHub Desktop: chọn nhánh → Fetch origin → Branch → Update from dev).
2. **Trong phiên:** commit nhỏ, thường xuyên, theo mẫu `feat(backend): them route products`, `fix(frontend): ...`, `docs(contract): ...`.
3. **Cuối phiên:** commit hết → `git push` nhánh của mình (việc dở dang cũng push).
4. **Xong một phần (1–2 ngày/lần):** mở Pull Request `<nhánh-của-mình>` → `dev`. Zone guard phải xanh, `b4ox` duyệt.
   Merge bằng **Create a merge commit** (không Squash, không Rebase). Nhánh KHÔNG bị xoá sau khi merge, dùng tiếp.

Quy tắc cho AI agent:

- Đầu mỗi nhiệm vụ chạy `git branch --show-current`. Nhánh phải khớp vùng đang làm
  (`contracts/` ↔ `contract`, `backend/` ↔ `backend`, `frontend/` ↔ `frontend`).
  Nếu đang ở `master`, `dev` hoặc nhánh của người khác → **DỪNG**, báo người dùng chuyển nhánh, không sửa file.
- Agent KHÔNG tự `git push`, KHÔNG tạo/xoá/đổi tên nhánh, KHÔNG `git push --force`, KHÔNG `rebase`, KHÔNG sửa lịch sử.
  Chỉ commit khi người dùng yêu cầu.
- Trước khi commit: `git status` chỉ được chứa file trong vùng của mình.

## 6. Môi trường chạy

| Thành phần | Lệnh | Địa chỉ |
| --- | --- | --- |
| Ganache | `npm run chain` (ở thư mục gốc) | `http://127.0.0.1:7545`, chainId 1337 |
| Remix ↔ thư mục `contracts/` | `npm run remixd` | Remix → workspace *localhost* |
| Backend (+ phục vụ frontend) | `cd backend && npm run dev` | `http://localhost:3000` |
| Frontend chạy riêng (mock) | VS Code Live Server mở từ thư mục gốc | `http://127.0.0.1:5500/frontend/index.html` |

Ganache chạy với `-d` nên 10 tài khoản luôn giống nhau trên máy mọi người:
Account 0 = Admin (deploy), 1 = Nhà sản xuất, 2 = Vận chuyển, 3 = Nhà phân phối, 4 = Nhà bán lẻ.

## 7. Định nghĩa "xong" cho một nhiệm vụ của agent

- [ ] Chỉ sửa file trong vùng của mình (liệt kê file đã sửa).
- [ ] Code chạy được theo cách kiểm tra trong `AGENTS.md` của thư mục con.
- [ ] Không phá vỡ interface v1 trong `shared/`.
- [ ] Khối code lớn có chú thích tiếng Việt.

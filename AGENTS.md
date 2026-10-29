# AGENTS.md — Quy tắc chung cho AI agent (ChatGPT Codex, Claude Code, ...)

> File này là nguồn quy tắc DUY NHẤT cho mọi AI agent làm việc trong repo.
> Claude Code đọc qua `CLAUDE.md` (file đó chỉ import file này). ChatGPT Codex đọc trực tiếp.
> Mỗi thư mục con (`contracts/`, `backend/`, `frontend/`) có thêm `AGENTS.md` riêng — quy tắc riêng được ưu tiên hơn quy tắc chung khi mâu thuẫn.

## 1. Dự án

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

| Đường dẫn | Chủ sở hữu | Agent của Contract | Agent của Backend | Agent của Frontend |
| --- | --- | --- | --- | --- |
| `contracts/**` | A – Contract | Sửa | Chỉ đọc | Chỉ đọc |
| `shared/contract/**`, `shared/CONTRACT_INTERFACE.md` | A – Contract | Sửa | Chỉ đọc | Chỉ đọc |
| `backend/**` | B – Backend | Chỉ đọc | Sửa | Chỉ đọc |
| `shared/API_SPEC.md`, `shared/mock/**` | B – Backend | Chỉ đọc | Sửa | Chỉ đọc |
| `frontend/**` | C – Frontend | Chỉ đọc | Chỉ đọc | Sửa |
| File gốc (`AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `.gitignore`, `.github/**`, `shared/README.md`) | Cả nhóm | Không sửa | Không sửa | Không sửa |

Quy tắc bắt buộc:

1. **Chỉ tạo/sửa/xoá file trong vùng "Sửa" của mình.** Không ngoại lệ, kể cả sửa lỗi chính tả.
2. Nếu agent được mở ở thư mục gốc (không rõ vùng), **hỏi người dùng đang làm phần nào** trước khi sửa bất kỳ file nào.
3. Nếu nhiệm vụ cần thay đổi ngoài vùng (ví dụ cần thêm trường vào API, đổi hàm contract):
   **DỪNG LẠI**, không sửa, và trả lời người dùng bằng một "Đề xuất thay đổi" gồm: file cần đổi, chủ sở hữu, nội dung đề xuất, lý do.
4. Không bao giờ "sửa tạm" code của người khác cho chạy được. Thay vào đó dùng mock / dữ liệu giả trong vùng của mình.
5. Trước khi kết thúc, liệt kê mọi file đã thay đổi và xác nhận tất cả nằm trong vùng "Sửa".

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

## 5. Git

- Nhánh: `main` (bản demo ổn định) ← `dev` (tích hợp) ← nhánh việc `contract/<việc>`, `backend/<việc>`, `frontend/<việc>`.
- Commit theo mẫu Conventional Commits có scope: `feat(backend): them route products`, `fix(frontend): ...`, `docs(contract): ...`.
- Agent KHÔNG tự `git push`, KHÔNG commit lên `dev`/`main`, KHÔNG `git push --force`, KHÔNG sửa lịch sử. Chỉ commit khi người dùng yêu cầu.
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

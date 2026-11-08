# AGENTS.md — Vùng FRONTEND (chủ sở hữu: thành viên C – `vothinhungoc7980-coder`)

Quy tắc chung ở `../AGENTS.md` vẫn áp dụng. File này bổ sung cho vùng Frontend.
Lộ trình, checklist và ca kiểm thử: `../docs/LO_TRINH_FRONTEND.md`. Mô tả 5 trang và code mẫu: `../docs/KE_HOACH_TONG.md`, mục 6.

## Được sửa
(Trừ `AGENTS.md` và `CLAUDE.md` trong thư mục này — đó là thông tin chung, chỉ điều phối viên `b4ox` sửa.)
- `frontend/**` — và chỉ thế thôi.

Chỉ đọc: `shared/API_SPEC.md`, `shared/mock/**`, `shared/CONTRACT_INTERFACE.md`. Không đụng `backend/`, `contracts/`.
Thiếu dữ liệu cần hiển thị → viết "Đề xuất thay đổi" cho Backend, không tự sửa `shared/`.

## Công nghệ cố định
HTML5 + CSS + JavaScript thuần (script thường, không ES module bundler), Bootstrap 5.3 + Bootstrap Icons qua CDN.
ethers.js **v6.13.4 bản UMD** qua CDN (`https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js`), chỉ dùng trong `js/wallet.js`
để làm việc với MetaMask (kết nối, chuyển mạng, ký đăng nhập, gửi giao dịch).
KHÔNG dùng: React/Vue/Angular, npm build, TypeScript, jQuery, web3.js.

## Cấu trúc
```
frontend/
├── index.html  admin.html  products.html  actions.html  trace.html
├── login.html  register.html  businesses.html
├── css/style.css
├── img/qr-sample.png            # ảnh QR dùng khi chạy mock
└── js/
    ├── config.js                # CONFIG.USE_MOCK, API_BASE, MOCK_BASE, MOCK_FAIL
    ├── api.js                   # apiGet / apiPost / apiPut (+ token, ánh xạ mock)
    ├── common.js                # phiên ví, navbar, showToast, shortAddress, statusBadge
    ├── wallet.js                # MetaMask: connectWallet, signInWithWallet, sendContractTx
    └── dashboard.js admin.js products.js actions.js trace.js login.js register.js businesses.js
```
Thứ tự nạp script: (ethers UMD) → `config.js` → `api.js` → `common.js` → (`wallet.js`) → script của trang.
Trang cần ví (login, register, products, actions, admin) nạp thêm ethers + `wallet.js`.

## Quy tắc quan trọng
- Mọi dữ liệu backend lấy qua `apiGet` / `apiPost` / `apiPut` trong `api.js`. Trang KHÔNG gọi `fetch` trực tiếp.
- Phiên đăng nhập `{ token, address }` lưu ở `localStorage` key `session`; `api.js` tự gắn `Authorization: Bearer`.
- Giao dịch lên chuỗi CHỈ qua `sendContractTx(method, args)` trong `wallet.js` (MetaMask hỏi người dùng xác nhận).
  Không gọi các API ghi cũ của v1 (`POST /products`, `/participants`...).
- Chức năng theo vai trò chỉ mở khi vai trò trên chuỗi đang hoạt động (`user.isActive`); hồ sơ chờ duyệt hiện nút bị khoá.
- Khi `CONFIG.USE_MOCK = true`: GET đọc `../shared/mock/<file>.json` theo bảng ánh xạ; POST trả `tx-success.json`
  sau 800 ms (hoặc `error.json` nếu `MOCK_FAIL = true`); ảnh QR dùng `img/qr-sample.png`.
- Hiển thị trạng thái/vai trò bằng `statusText`/`roleText` từ API, màu badge theo `status` (0–5).
- Khi chờ giao dịch: khoá nút + spinner ("Xác nhận trong MetaMask..." rồi "Đang chờ vào khối..."); luôn mở lại nút trong `finally`.
- Mỗi trang có 1 file JS riêng; hàm dùng chung đặt trong `common.js`.

## Kiểm tra
- Chạy bằng Live Server mở từ THƯ MỤC GỐC: `http://127.0.0.1:5500/frontend/index.html` (mock).
- Console không lỗi đỏ; thử cả `MOCK_FAIL = true`.
- Bảng ca kiểm thử trong `docs/LO_TRINH_FRONTEND.md`, mục 6.

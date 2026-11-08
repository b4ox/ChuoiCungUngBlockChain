# Hướng dẫn triển khai SupplyChain

> Mạng chính thức của dự án là **Sepolia** (mục 5). Mục 1–4 giữ lại cho ai muốn chạy thử trên Ganache local.

## 1. Môi trường

- Node.js theo cấu hình dự án: 20.
- Solidity compiler: 0.8.20.
- EVM version: paris.
- Blockchain: Ganache local.
- RPC: http://127.0.0.1:7545.
- Chain ID: 1337.

## 2. Khởi động

Chạy các lệnh tại thư mục gốc chứa package.json.

Cài thư viện:

```powershell
npm install
```

Terminal thứ nhất — chạy Ganache:

```powershell
npm run chain
```

Terminal thứ hai — kết nối file với Remix:

```powershell
npx remixd -s ./contracts -u https://app.remix.live
```

Giữ cả hai terminal chạy.
Địa chỉ sau -u phải trùng tên miền Remix đang mở.

## 3. Compile và deploy

1. Mở Remix, kết nối RemixD với thư mục contracts.
2. Mở SupplyChain.sol.
3. Chọn compiler 0.8.20, EVM version paris.
4. Compile SupplyChain.sol.
5. Chọn Custom - External Http Provider.
6. Nhập http://127.0.0.1:7545.
7. Chọn địa chỉ Account 0 của Ganache để deploy.
8. Tắt Verify Contract on Explorers, giữ Value = 0.
9. Deploy, gọi owner để đối chiếu địa chỉ admin.
10. Copy địa chỉ thực tế vào shared/contract/deployment.json.

Địa chỉ admin:

0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1

## 4. Xuất ABI

Sau khi compile SupplyChain.sol, mở tab Solidity Compiler → ABI (nút copy) và dán vào `shared/contract/SupplyChain.abi.json` (JSON mảng, thụt lề 2 dấu cách).

## 5. Deploy lên Sepolia bằng MetaMask

Chuẩn bị một ví MetaMask riêng cho quản trị viên. Ví nào deploy thì ví đó là owner, tức là người duyệt hồ sơ doanh nghiệp.

1. MetaMask → bật **Show test networks** → chọn mạng **Sepolia**.
2. Lấy SepoliaETH miễn phí từ một faucet (ví dụ Google Cloud Web3 Faucet). Deploy tốn vài phần nghìn đến khoảng 0,02 SepoliaETH tuỳ giá gas lúc đó.
3. Remix → Solidity Compiler: 0.8.20, Advanced → EVM version **paris**, Compile `SupplyChain.sol`.
4. Deploy & Run → Environment: **Injected Provider - MetaMask**. MetaMask hỏi kết nối, chọn ví quản trị.
   Kiểm tra dòng bên dưới ghi `Sepolia (11155111) network`.
5. Bấm **Deploy** → MetaMask hiện phí gas → **Xác nhận**. Chờ khoảng 15 giây.
6. Mở giao dịch deploy trên https://sepolia.etherscan.io (bấm link trong terminal Remix) và ghi lại:
   - địa chỉ contract (`Contract Created` hoặc mục Deployed Contracts trong Remix),
   - số khối (`Block`),
   - địa chỉ ví đã deploy.
7. Điền vào `shared/contract/deployment.json`: `address`, `deployer`, `deployBlock`, sửa `note`.
8. Trong Remix gọi `owner()` để đối chiếu đúng ví quản trị.

Không có dữ liệu mẫu trên Sepolia: doanh nghiệp tự đăng ký trên website, quản trị viên duyệt.
`npm run seed` chỉ chạy được với Ganache local (cần tài khoản đã mở khoá).

## 6. Chạy thử trên Ganache local thay vì Sepolia

Không cần sửa `deployment.json`. Tạo `backend/.env`:

```
RPC_URL=http://127.0.0.1:7545
CHAIN_ID=1337
CONTRACT_ADDRESS=0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab
DEPLOY_BLOCK=0
```

Trong MetaMask thêm mạng tuỳ chỉnh `http://127.0.0.1:7545`, chain ID `1337`, rồi import khoá riêng của Account 0 làm ví quản trị.

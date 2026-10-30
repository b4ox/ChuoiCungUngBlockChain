# Hướng dẫn triển khai SupplyChain

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

Sau khi compile SupplyChain.sol,
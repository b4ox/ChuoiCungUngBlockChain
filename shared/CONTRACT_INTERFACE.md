# CONTRACT_INTERFACE.md — SupplyChain v1

> Chủ sở hữu: **Contract (A)**. Trạng thái: **bản nháp v1** — A xác nhận và đóng băng tại mốc M1 (hết Ngày 2).
> Backend và Frontend dựa vào file này. Sau M1 chỉ được THÊM; đổi/xoá phải tăng version và ghi Changelog.

## Enum

| Role | Giá trị | Ý nghĩa |
| --- | --- | --- |
| None | 0 | Chưa đăng ký |
| Manufacturer | 1 | Nhà sản xuất |
| Transporter | 2 | Vận chuyển |
| Distributor | 3 | Nhà phân phối |
| Retailer | 4 | Nhà bán lẻ |

| Status | Giá trị | Ý nghĩa | Ai đưa sản phẩm vào trạng thái này |
| --- | --- | --- | --- |
| Manufactured | 0 | Đã sản xuất | Manufacturer – `createProduct` |
| InTransitToDistributor | 1 | Đang tới nhà phân phối | Transporter – `pickUpProduct` |
| AtDistributor | 2 | Ở nhà phân phối | Distributor – `receiveProduct` |
| InTransitToRetailer | 3 | Đang tới cửa hàng | Transporter – `pickUpProduct` |
| AtRetailer | 4 | Ở cửa hàng | Retailer – `receiveProduct` |
| Sold | 5 | Đã bán | Retailer – `markAsSold` |

## Struct (thứ tự trường cố định)

```solidity
struct Participant { string name; Role role; bool isActive; }
struct Product { uint256 id; string name; string origin; string description;
                 address manufacturer; address currentOwner; Status status; uint256 createdAt; }
struct History { Status status; address actor; uint256 timestamp; string note; }
```

## Hàm ghi (tốn gas)

| Hàm | Ai được gọi | Điều kiện |
| --- | --- | --- |
| `registerParticipant(address _account, string _name, Role _role)` | owner (Account 0) | `_role != None` |
| `createProduct(string _name, string _origin, string _description)` | Manufacturer | — |
| `pickUpProduct(uint256 _id, string _note)` | Transporter | status 0 → 1 hoặc 2 → 3 |
| `receiveProduct(uint256 _id, string _note)` | Distributor (1 → 2) / Retailer (3 → 4) | đúng vai + đúng trạng thái |
| `markAsSold(uint256 _id, string _note)` | Retailer đang giữ hàng | status 4 → 5 |

## Hàm đọc (miễn phí)

| Hàm | Trả về |
| --- | --- |
| `owner()` | `address` |
| `productCount()` | `uint256` — cũng là id sản phẩm mới nhất (id bắt đầu từ 1) |
| `participants(address)` | `(string name, Role role, bool isActive)` |
| `getAllParticipants()` | `address[]` |
| `getProduct(uint256 _id)` | `Product` |
| `getHistory(uint256 _id)` | `History[]` theo thứ tự thời gian |

## Event

```solidity
event ParticipantRegistered(address indexed account, string name, Role role);
event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
event StatusChanged(uint256 indexed id, Status status, address indexed actor, string note);
```
`StatusChanged` được phát ở MỌI bước (kể cả khi tạo sản phẩm, status = 0).

## Câu lỗi (giữ nguyên văn — frontend hiển thị lại)

| Câu lỗi | Khi nào |
| --- | --- |
| `Chi admin duoc phep` | Không phải owner gọi `registerParticipant` |
| `Vai tro khong hop le` | Đăng ký với role None |
| `Sai vai tro` | Sai vai trò / chưa đăng ký ở hàm có `onlyRole` |
| `Chua duoc dang ky` | Tài khoản chưa đăng ký gọi `receiveProduct` |
| `San pham khong ton tai` | id = 0 hoặc > productCount |
| `Chua the van chuyen o trang thai nay` | `pickUpProduct` sai trạng thái |
| `Sai vai tro hoac sai trang thai` | `receiveProduct` sai vai/trạng thái |
| `San pham chua den cua hang` | `markAsSold` khi status != 4 |
| `Ban khong giu san pham nay` | `markAsSold` bởi retailer không giữ hàng |

## Triển khai
- Compile: Solidity 0.8.20+, **EVM version = paris**.
- ABI: `shared/contract/SupplyChain.abi.json`. Địa chỉ: `shared/contract/deployment.json`.

## Changelog
- v1.0.0 — bản đầu tiên.

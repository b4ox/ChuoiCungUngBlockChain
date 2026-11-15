# CONTRACT_INTERFACE.md — SupplyChain v1.2

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
| `registerParticipant(address _account, string _name, Role _role)` | owner (ví đã deploy) | `_role != None`. Gọi lại cho ví đã có thì ghi đè tên/vai trò và mở lại ví bị khoá |
| `deactivateParticipant(address _account)` | owner | Ví đã đăng ký và đang hoạt động → `isActive = false` (v1.1) |
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
event ParticipantDeactivated(address indexed account); // v1.1
```
`StatusChanged` được phát ở MỌI bước (kể cả khi tạo sản phẩm, status = 0).

## Câu lỗi (giữ nguyên văn — frontend hiển thị lại)

| Câu lỗi | Khi nào |
| --- | --- |
| `Chi admin duoc phep` | Không phải owner gọi `registerParticipant` |
| `Vai tro khong hop le` | Đăng ký với role None |
| `Sai vai tro` | Sai vai trò / chưa đăng ký ở hàm có `onlyRole` |
| `Chua duoc dang ky` | Tài khoản chưa đăng ký (hoặc đã bị khoá) gọi `receiveProduct`; thu hồi ví chưa đăng ký |
| `Thanh vien da bi khoa` | Thu hồi ví đã bị khoá (v1.1) |
| `San pham khong ton tai` | id = 0 hoặc > productCount |
| `Chua the van chuyen o trang thai nay` | `pickUpProduct` sai trạng thái |
| `Sai vai tro hoac sai trang thai` | `receiveProduct` sai vai/trạng thái |
| `San pham chua den cua hang` | `markAsSold` khi status != 4 |
| `Ban khong giu san pham nay` | `markAsSold` bởi retailer không giữ hàng |

## Lời mời v1.2

`Task` lần lượt là `TransportToDistributor = 0`, `Distribute = 1`,
`TransportToRetailer = 2`, `Retail = 3`. Nhà sản xuất mời cho task 0 và 1.
Nhà phân phối đã chấp nhận task 1 mời cho task 2 và 3.

```solidity
struct Invitation { address invitee; bool accepted; }

function inviteParticipant(uint256 _id, Task _task, address _invitee) external;
function acceptInvitation(uint256 _id, Task _task) external;
function declineInvitation(uint256 _id, Task _task) external;
function createProductWithInvites(string memory _name, string memory _origin, string memory _description,
    address _transporter, address _distributor) external;
function getInvitations(uint256 _id) external view returns (Invitation[4] memory);

event InvitationSent(uint256 indexed id, Task task, address indexed invitee, address indexed inviter);
event InvitationAccepted(uint256 indexed id, Task task, address indexed invitee);
event InvitationDeclined(uint256 indexed id, Task task, address indexed invitee);
```

- Địa chỉ `0x0` là ô chưa mời. Trong `createProductWithInvites`, truyền `0x0` cho đối tác muốn mời sau.
- Chỉ mời hoặc mời lại khi trạng thái sản phẩm chưa vượt chỉ số task và chưa có người chấp nhận. Người được mời phải đang hoạt động và đúng vai trò. Từ chối một lời mời đang chờ sẽ làm trống ô đó.
- `pickUpProduct` và `receiveProduct` yêu cầu đúng ví đã chấp nhận lời mời. Trước khi vận chuyển, bên nhận chặng đó cũng phải chấp nhận và còn hoạt động với đúng vai trò. `markAsSold` vẫn yêu cầu nhà bán lẻ đang giữ hàng.

| Câu lỗi | Khi nào |
| --- | --- |
| `Ban khong co quyen moi nhiem vu nay` | Ví gọi không phải đối tác đang hoạt động có quyền mời cho nhiệm vụ |
| `Nhiem vu da qua` | Mời hoặc chấp nhận sau khi bước tương ứng đã qua |
| `Nhiem vu da co nguoi nhan` | Mời lại khi đã có người chấp nhận |
| `Doanh nghiep khong dung vai tro` | Lời mời dành cho ví không hợp lệ, bị khóa hoặc sai vai trò, hoặc ví đổi sang sai vai trước khi chấp nhận |
| `Ban khong duoc moi` | Ví gọi không phải ví được mời |
| `Da chap nhan roi` | Chấp nhận lại hoặc từ chối sau khi đã chấp nhận |
| `Ban chua nhan loi moi cho nhiem vu nay` | Nhận chở hoặc nhận hàng mà chưa chấp nhận đúng nhiệm vụ |
| `Ben nhan chua chap nhan loi moi` | Bên nhận chưa chấp nhận hoặc không còn đủ điều kiện nhận |

## Triển khai
- Compile: Solidity 0.8.20+, **EVM version = paris**.
- ABI: `shared/contract/SupplyChain.abi.json`. Địa chỉ: `shared/contract/deployment.json`.
- Mạng chính thức: **Sepolia** (chainId 11155111), deploy bằng Remix + MetaMask (xem `contracts/DEPLOY.md`).
  Ví deploy là owner (quản trị viên). `deployBlock` trong `deployment.json` giúp backend chỉ đọc event từ khối đó trở đi.

## Changelog
- v1.0.0 — bản đầu tiên.
- v1.1.0 — THÊM `deactivateParticipant`, event `ParticipantDeactivated`, câu lỗi `Thanh vien da bi khoa`. Không đổi gì của v1.0.
- v1.2.0 — Thêm lời mời theo nhiệm vụ. Giữ nguyên chữ ký cũ, đổi điều kiện thực hiện `pickUpProduct` và `receiveProduct`.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChain
 * @notice Truy xuất nguồn gốc sản phẩm qua các bên trong chuỗi cung ứng.
 */
contract SupplyChain {
    // ===== 1. KIỂU DỮ LIỆU =====
    // Vai trò của thành viên. None = chưa đăng ký.
    enum Role { None, Manufacturer, Transporter, Distributor, Retailer }

    // Các trạng thái sản phẩm, chỉ đi một chiều từ 0 -> 5.
    enum Status {
        Manufactured,           // 0: vừa sản xuất
        InTransitToDistributor, // 1: đang chở tới nhà phân phối
        AtDistributor,          // 2: đã ở nhà phân phối
        InTransitToRetailer,    // 3: đang chở tới cửa hàng
        AtRetailer,             // 4: đã ở cửa hàng
        Sold                    // 5: đã bán
    }

    struct Participant {
        string name;
        Role role;
        bool isActive;
    }

    struct Product {
        uint256 id;
        string name;
        string origin;        // nơi sản xuất
        string description;
        address manufacturer;
        address currentOwner; // ai đang giữ hàng
        Status status;
        uint256 createdAt;
    }

    // Mỗi bước trong hành trình của sản phẩm
    struct History {
        Status status;
        address actor;
        uint256 timestamp;
        string note;
    }

    // ===== 2. BIẾN TRẠNG THÁI =====
    address public owner;                               // admin = người deploy
    uint256 public productCount;                        // cũng là id của sản phẩm mới nhất
    mapping(address => Participant) public participants;
    address[] public participantList;                   // để liệt kê thành viên
    mapping(uint256 => Product) public products;
    mapping(uint256 => History[]) private histories;

    // ===== 3. EVENTS =====
    event ParticipantRegistered(address indexed account, string name, Role role);
    event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
    event StatusChanged(uint256 indexed id, Status status, address indexed actor, string note);

    // ===== 4. MODIFIERS: kiểm tra điều kiện trước khi chạy hàm =====
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi admin duoc phep");
        _;
    }

    modifier onlyRole(Role _role) {
        Participant memory p = participants[msg.sender];
        require(p.isActive && p.role == _role, "Sai vai tro");
        _;
    }

    modifier productExists(uint256 _id) {
        require(_id > 0 && _id <= productCount, "San pham khong ton tai");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ===== 5. QUẢN LÝ THÀNH VIÊN (chỉ admin) =====
    function registerParticipant(address _account, string memory _name, Role _role)
        external onlyOwner
    {
        require(_role != Role.None, "Vai tro khong hop le");
        // Chỉ thêm vào danh sách nếu là thành viên mới (tránh trùng)
        if (participants[_account].role == Role.None) {
            participantList.push(_account);
        }
        participants[_account] = Participant(_name, _role, true);
        emit ParticipantRegistered(_account, _name, _role);
    }

    // ===== 6. NGHIỆP VỤ CHUỖI CUNG ỨNG =====
    // Bước 0: nhà sản xuất tạo sản phẩm
    function createProduct(string memory _name, string memory _origin, string memory _description)
        external onlyRole(Role.Manufacturer)
    {
        productCount++;
        products[productCount] = Product(
            productCount, _name, _origin, _description,
            msg.sender, msg.sender, Status.Manufactured, block.timestamp
        );
        _addHistory(productCount, Status.Manufactured, "San pham duoc tao");
        emit ProductCreated(productCount, _name, msg.sender);
    }

    // Bước 1 và 3: đơn vị vận chuyển nhận hàng đi giao
    function pickUpProduct(uint256 _id, string memory _note)
        external onlyRole(Role.Transporter) productExists(_id)
    {
        Product storage p = products[_id];
        if (p.status == Status.Manufactured) {
            p.status = Status.InTransitToDistributor;
        } else if (p.status == Status.AtDistributor) {
            p.status = Status.InTransitToRetailer;
        } else {
            revert("Chua the van chuyen o trang thai nay");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 2 và 4: nhà phân phối / nhà bán lẻ xác nhận đã nhận hàng
    function receiveProduct(uint256 _id, string memory _note)
        external productExists(_id)
    {
        Participant memory me = participants[msg.sender];
        require(me.isActive, "Chua duoc dang ky");
        Product storage p = products[_id];

        if (me.role == Role.Distributor && p.status == Status.InTransitToDistributor) {
            p.status = Status.AtDistributor;
        } else if (me.role == Role.Retailer && p.status == Status.InTransitToRetailer) {
            p.status = Status.AtRetailer;
        } else {
            revert("Sai vai tro hoac sai trang thai");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 5: nhà bán lẻ bán cho người tiêu dùng
    function markAsSold(uint256 _id, string memory _note)
        external onlyRole(Role.Retailer) productExists(_id)
    {
        Product storage p = products[_id];
        require(p.status == Status.AtRetailer, "San pham chua den cua hang");
        require(p.currentOwner == msg.sender, "Ban khong giu san pham nay");
        p.status = Status.Sold;
        _addHistory(_id, Status.Sold, _note);
    }

    // ===== 7. HÀM ĐỌC (view, không tốn gas) =====
    function getProduct(uint256 _id) external view productExists(_id) returns (Product memory) {
        return products[_id];
    }

    function getHistory(uint256 _id) external view productExists(_id) returns (History[] memory) {
        return histories[_id];
    }

    function getAllParticipants() external view returns (address[] memory) {
        return participantList;
    }

    // ===== 8. HÀM NỘI BỘ =====
    // Ghi một bước vào lịch sử và phát event để bên ngoài theo dõi
    function _addHistory(uint256 _id, Status _status, string memory _note) internal {
        histories[_id].push(History(_status, msg.sender, block.timestamp, _note));
        emit StatusChanged(_id, _status, msg.sender, _note);
    }
}

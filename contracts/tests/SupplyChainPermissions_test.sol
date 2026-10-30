// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";

// Các ca độc lập để không phụ thuộc dữ liệu demo hoặc thứ tự chạy.
contract SupplyChainPermissionsTest {
    // Kiểm tra quyền hoặc trạng thái với dữ liệu riêng của từng ca.
    function unregisteredCannotCreateProduct() public {
        SupplyChain target = new SupplyChain();
        bool rejected = false;
        try target.createProduct("Test", "Dak Lak", "Test") {
            Assert.ok(false, "Khong duoc tao san pham");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "Sai vai tro", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
        Assert.equal(target.productCount(), uint256(0), "Khong duoc tang so san pham");
    }

    // Kiểm tra quyền hoặc trạng thái với dữ liệu riêng của từng ca.
    function cannotPickUpInTransitProduct() public {
        SupplyChain target = newProduct(true);
        bool rejected = false;
        try target.pickUpProduct(1, "Lay lan hai") {
            Assert.ok(false, "Khong duoc lay hang hai lan");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "Chua the van chuyen o trang thai nay", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
        assertUnchanged(target, SupplyChain.Status.InTransitToDistributor, 2);
    }

    // Kiểm tra quyền hoặc trạng thái với dữ liệu riêng của từng ca.
    function retailerCannotReceiveTooEarly() public {
        SupplyChain target = newProduct(true);
        target.registerParticipant(address(this), "Cua hang", SupplyChain.Role.Retailer);
        bool rejected = false;
        try target.receiveProduct(1, "Nhan sai buoc") {
            Assert.ok(false, "Khong duoc nhan sai buoc");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "Sai vai tro hoac sai trang thai", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
        assertUnchanged(target, SupplyChain.Status.InTransitToDistributor, 2);
    }

    // Hàm hỗ trợ tạo dữ liệu và xác nhận thao tác lỗi không thay đổi dữ liệu.
    function newProduct(bool _pickUp) internal returns (SupplyChain target) {
        target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.createProduct("Lo test", "Dak Lak", "Du lieu test");
        target.registerParticipant(address(this), "Van chuyen", SupplyChain.Role.Transporter);
        if (_pickUp) {
            target.pickUpProduct(1, "Lay hang");
        }
    }

    function assertUnchanged(SupplyChain _target, SupplyChain.Status _status, uint256 _length) internal {
        SupplyChain.Product memory product = _target.getProduct(1);
        SupplyChain.History[] memory records = _target.getHistory(1);
        Assert.equal(uint256(product.status), uint256(_status), "Trang thai bi thay doi");
        Assert.equal(product.currentOwner, address(this), "Nguoi giu bi thay doi");
        Assert.equal(records.length, _length, "Lich su bi thay doi");
        Assert.equal(_target.productCount(), uint256(1), "So san pham bi thay doi");
    }
}

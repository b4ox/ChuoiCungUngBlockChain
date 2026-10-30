// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";

// Các ca độc lập để không phụ thuộc dữ liệu demo hoặc thứ tự chạy.
contract SupplyChainValidationTest {
    // Kiểm tra quyền hoặc trạng thái với dữ liệu riêng của từng ca.
    function cannotSellBeforeArrival() public {
        SupplyChain target = newProduct(false);
        target.registerParticipant(address(this), "Cua hang", SupplyChain.Role.Retailer);
        bool rejected = false;
        try target.markAsSold(1, "Ban som") {
            Assert.ok(false, "Khong duoc ban som");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "San pham chua den cua hang", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
        assertUnchanged(target, SupplyChain.Status.Manufactured, 1);
    }

    // Kiểm tra quyền hoặc trạng thái với dữ liệu riêng của từng ca.
    function nonexistentProductIsRejected() public {
        SupplyChain target = newProduct(false);
        bool rejected = false;
        try target.getProduct(999) returns (SupplyChain.Product memory) {
            Assert.ok(false, "Khong duoc doc ID khong ton tai");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "San pham khong ton tai", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
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

    // Luồng chuẩn kết thúc ở Sold và lưu đủ sáu bước.
    function fullJourneyHasSixOrderedRecords() public {
        SupplyChain chain = newProduct(true);
        chain.registerParticipant(address(this), "Kho", SupplyChain.Role.Distributor);
        chain.receiveProduct(1, "Nhan tai kho");
        chain.registerParticipant(address(this), "Van chuyen", SupplyChain.Role.Transporter);
        chain.pickUpProduct(1, "Chuyen den cua hang");
        chain.registerParticipant(address(this), "Cua hang", SupplyChain.Role.Retailer);
        chain.receiveProduct(1, "Cua hang nhan");
        chain.markAsSold(1, "Da ban");

        SupplyChain.History[] memory records = chain.getHistory(1);
        Assert.equal(records.length, uint256(6), "Phai co 6 buoc");
        for (uint256 i = 0; i < records.length; i++) {
            Assert.equal(uint256(records[i].status), i, "Sai thu tu trang thai");
            Assert.equal(records[i].actor, address(this), "Sai nguoi thuc hien");
            if (i > 0) {
                Assert.ok(records[i].timestamp >= records[i - 1].timestamp, "Sai thu tu thoi gian");
            }
        }
        Assert.equal(records[0].note, "San pham duoc tao", "Sai ghi chu tao");
        Assert.equal(records[5].note, "Da ban", "Sai ghi chu ban");
        assertUnchanged(chain, SupplyChain.Status.Sold, 6);
    }
}

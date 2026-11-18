// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/JourneyFixture.sol";

// Các ca độc lập để không phụ thuộc dữ liệu demo hoặc thứ tự chạy.
contract SupplyChainValidationTest is JourneyFixture {
    // Không bán khi hàng chưa tới cửa hàng.
    function cannotSellBeforeArrival() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        try team.retailer.sell(target, 1) {
            Assert.ok(false, "Khong duoc ban som");
        } catch Error(string memory reason) {
            Assert.equal(reason, "San pham chua den cua hang", "Sai cau loi");
        }
        Assert.equal(uint256(target.getProduct(1).status), uint256(SupplyChain.Status.Manufactured), "Trang thai bi thay doi");
        Assert.equal(target.getHistory(1).length, uint256(1), "Lich su bi thay doi");
    }

    // Đọc id không tồn tại bị từ chối.
    function nonexistentProductIsRejected() public {
        (SupplyChain target,) = newChain();
        try target.getProduct(999) returns (SupplyChain.Product memory) {
            Assert.ok(false, "Khong duoc doc ID khong ton tai");
        } catch Error(string memory reason) {
            Assert.equal(reason, "San pham khong ton tai", "Sai cau loi");
        }
    }

    // v1.3: một đầu xác nhận thì chưa đổi trạng thái; đủ hai đầu mới chuyển và ghi cả hai bên.
    function handoverNeedsBothSides() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        target.confirmSent(1, "NSX da giao");
        Assert.equal(uint256(target.getProduct(1).status), uint256(0), "Mot dau chua duoc doi trang thai");
        try target.confirmSent(1, "Gui lai") {
            Assert.ok(false, "Khong xac nhan gui hai lan");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Da xac nhan gui roi", "Sai cau loi");
        }
        team.transporter1.pickUp(target, 1);
        Assert.equal(uint256(target.getProduct(1).status), uint256(1), "Du hai dau phai sang trang thai 1");
        SupplyChain.Handover[4] memory steps = target.getHandovers(1);
        Assert.equal(steps[0].sender, address(this), "Sai ben gui");
        Assert.equal(steps[0].receiver, address(team.transporter1), "Sai ben nhan");
        Assert.equal(steps[0].sentNote, "NSX da giao", "Sai ghi chu gui");
    }

    // Bên nhận xác nhận trước cũng được; chỉ người đang giữ hàng mới xác nhận gửi.
    function receiverMayConfirmFirst() public {
        (SupplyChain target, Team memory team) = newProduct(true);
        team.distributor.receiveIt(target, 1);
        Assert.equal(uint256(target.getProduct(1).status), uint256(1), "Mot dau chua duoc doi trang thai");
        try team.distributor.send(target, 1) {
            Assert.ok(false, "NPP chua giu hang thi khong xac nhan gui");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ban khong giu san pham nay", "Sai cau loi");
        }
        team.transporter1.send(target, 1);
        Assert.equal(uint256(target.getProduct(1).status), uint256(2), "Du hai dau phai sang trang thai 2");
        Assert.equal(target.getProduct(1).currentOwner, address(team.distributor), "NPP phai giu hang");
    }

    // Luồng chuẩn kết thúc ở Sold và lưu đủ sáu bước; người thực hiện mỗi bước là bên nhận.
    function fullJourneyHasSixOrderedRecords() public {
        (SupplyChain chain, Team memory team) = newProduct(true);
        finishJourney(chain, team);
        address[6] memory actors = [
            address(this), address(team.transporter1), address(team.distributor),
            address(team.transporter2), address(team.retailer), address(team.retailer)
        ];
        SupplyChain.History[] memory records = chain.getHistory(1);
        Assert.equal(records.length, uint256(6), "Phai co 6 buoc");
        for (uint256 i = 0; i < records.length; i++) {
            Assert.equal(uint256(records[i].status), i, "Sai thu tu trang thai");
            Assert.equal(records[i].actor, actors[i], "Sai nguoi thuc hien");
        }
        Assert.equal(records[0].note, "San pham duoc tao", "Sai ghi chu tao");
        Assert.equal(records[5].note, "Da ban", "Sai ghi chu ban");
        Assert.equal(uint256(chain.getProduct(1).status), uint256(SupplyChain.Status.Sold), "Phai la Sold");
    }
}

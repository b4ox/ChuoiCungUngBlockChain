// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/JourneyFixture.sol";

// =============================================================
// v1.3 – THAY ĐỔI LỜI MỜI VÀ ADMIN CHUYỂN NHIỆM VỤ (R1–R5)
// =============================================================
contract SupplyChainInvitationTest is JourneyFixture {
    // R2: đã nhận lời vẫn rút lui được khi chặng chưa bắt đầu.
    function partnerCanWithdrawBeforeLegStarts() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        team.transporter1.decline(target, 1, SupplyChain.Task.TransportToDistributor);
        Assert.equal(target.getInvitations(1)[0].invitee, address(0), "O nhiem vu phai trong");
    }

    // R3 + R4: NSX huỷ NPP đã nhận lời thì lời mời chặng 2 bị xoá theo.
    function cancelDistributorClearsSecondLeg() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        team.distributor.invite(target, 1, SupplyChain.Task.TransportToRetailer, address(team.transporter2));
        team.distributor.invite(target, 1, SupplyChain.Task.Retail, address(team.retailer));
        team.retailer.accept(target, 1, SupplyChain.Task.Retail);
        target.cancelInvitation(1, SupplyChain.Task.Distribute);
        SupplyChain.Invitation[4] memory list = target.getInvitations(1);
        Assert.equal(list[1].invitee, address(0), "NPP phai bi huy");
        Assert.equal(list[2].invitee, address(0), "Chang 2 phai bi xoa");
        Assert.equal(list[3].invitee, address(0), "Chang 2 phai bi xoa");
    }

    // Chặng đã bắt đầu (đã có một bên xác nhận) thì không huỷ / rút lui được.
    function invitationsLockedAfterLegStarts() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        target.confirmSent(1, "NSX da giao");
        try target.cancelInvitation(1, SupplyChain.Task.TransportToDistributor) {
            Assert.ok(false, "Chang da bat dau thi khong huy duoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Nhiem vu da qua", "Sai cau loi");
        }
        try team.distributor.decline(target, 1, SupplyChain.Task.Distribute) {
            Assert.ok(false, "Chang da bat dau thi khong rut lui duoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Nhiem vu da qua", "Sai cau loi");
        }
    }

    // R1: không mời đè người đã nhận còn hợp lệ; người đó bị khoá thì mời người khác được.
    function replaceAcceptedPartnerOnlyWhenInvalid() public {
        (SupplyChain target, Team memory team) = newProduct(false);
        Actor backup = newActor(target, "Van chuyen du phong", SupplyChain.Role.Transporter);
        try target.inviteParticipant(1, SupplyChain.Task.TransportToDistributor, address(backup)) {
            Assert.ok(false, "Khong moi de nguoi da nhan");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Nhiem vu da co nguoi nhan", "Sai cau loi");
        }
        target.deactivateParticipant(address(team.transporter1));
        target.inviteParticipant(1, SupplyChain.Task.TransportToDistributor, address(backup));
        Assert.equal(target.getInvitations(1)[0].invitee, address(backup), "Phai moi duoc nguoi khac");
    }

    // R5: bên đang chở hàng bị khoá -> admin chuyển nhiệm vụ, hàng tiếp tục đi.
    function adminReassignsLockedTransporter() public {
        (SupplyChain target, Team memory team) = newProduct(true);
        Actor backup = newActor(target, "Van chuyen du phong", SupplyChain.Role.Transporter);
        try target.reassignTask(1, SupplyChain.Task.TransportToDistributor, address(backup), "Chuyen") {
            Assert.ok(false, "Ben cu con hop le thi khong chuyen");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Doanh nghiep hien tai van hop le", "Sai cau loi");
        }
        target.deactivateParticipant(address(team.transporter1));
        target.reassignTask(1, SupplyChain.Task.TransportToDistributor, address(backup), "Admin chuyen nhiem vu");
        Assert.equal(target.getProduct(1).currentOwner, address(backup), "Hang phai chuyen sang ben moi");
        Assert.equal(target.getHistory(1).length, uint256(3), "Lich su phai ghi thao tac admin");
        backup.send(target, 1);
        team.distributor.receiveIt(target, 1);
        Assert.equal(uint256(target.getProduct(1).status), uint256(2), "Hang phai toi NPP");
    }
}

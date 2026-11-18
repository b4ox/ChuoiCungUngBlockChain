// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../SupplyChain.sol";

// =============================================================
// ĐỐI TÁC GIẢ LẬP: mỗi Actor là một địa chỉ riêng (vận chuyển, NPP, bán lẻ).
// v1.3 không cho đổi vai trò của ví đã đăng ký, nên mỗi vai cần một ví riêng.
// Lỗi revert của contract được chuyển nguyên văn ra ngoài để test bắt bằng catch Error.
// =============================================================
contract Actor {
    function accept(SupplyChain _chain, uint256 _id, SupplyChain.Task _task) external {
        _chain.acceptInvitation(_id, _task);
    }

    function decline(SupplyChain _chain, uint256 _id, SupplyChain.Task _task) external {
        _chain.declineInvitation(_id, _task);
    }

    function invite(SupplyChain _chain, uint256 _id, SupplyChain.Task _task, address _who) external {
        _chain.inviteParticipant(_id, _task, _who);
    }

    function cancel(SupplyChain _chain, uint256 _id, SupplyChain.Task _task) external {
        _chain.cancelInvitation(_id, _task);
    }

    // Bên gửi xác nhận đã giao
    function send(SupplyChain _chain, uint256 _id) external {
        _chain.confirmSent(_id, "Da giao");
    }

    // Vận chuyển xác nhận đã nhận hàng
    function pickUp(SupplyChain _chain, uint256 _id) external {
        _chain.pickUpProduct(_id, "Da nhan");
    }

    // NPP / bán lẻ xác nhận đã nhận hàng
    function receiveIt(SupplyChain _chain, uint256 _id) external {
        _chain.receiveProduct(_id, "Da nhan");
    }

    function sell(SupplyChain _chain, uint256 _id) external {
        _chain.markAsSold(_id, "Da ban");
    }
}

// =============================================================
// DỰNG DỮ LIỆU: contract test là admin và nhà sản xuất, 4 đối tác là Actor.
// =============================================================
abstract contract JourneyFixture {
    struct Team {
        Actor transporter1;  // task 0
        Actor distributor;   // task 1
        Actor transporter2;  // task 2
        Actor retailer;      // task 3
    }

    // Contract mới + 1 sản phẩm (id 1) chưa có lời mời
    function newChain() internal returns (SupplyChain chain, Team memory team) {
        chain = new SupplyChain();
        chain.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        team.transporter1 = newActor(chain, "Van chuyen 1", SupplyChain.Role.Transporter);
        team.distributor = newActor(chain, "Kho", SupplyChain.Role.Distributor);
        team.transporter2 = newActor(chain, "Van chuyen 2", SupplyChain.Role.Transporter);
        team.retailer = newActor(chain, "Cua hang", SupplyChain.Role.Retailer);
        chain.createProduct("Lo test", "Dak Lak", "Du lieu test");
    }

    function newActor(SupplyChain _chain, string memory _name, SupplyChain.Role _role) internal returns (Actor actor) {
        actor = new Actor();
        _chain.registerParticipant(address(actor), _name, _role);
    }

    // Chặng 1 đã đủ hai bên nhận lời; _ship = true thì giao nhận xong bước 0 (status 1)
    function newProduct(bool _ship) internal returns (SupplyChain chain, Team memory team) {
        (chain, team) = newChain();
        chain.inviteParticipant(1, SupplyChain.Task.TransportToDistributor, address(team.transporter1));
        chain.inviteParticipant(1, SupplyChain.Task.Distribute, address(team.distributor));
        team.transporter1.accept(chain, 1, SupplyChain.Task.TransportToDistributor);
        team.distributor.accept(chain, 1, SupplyChain.Task.Distribute);
        if (!_ship) return (chain, team);
        chain.confirmSent(1, "NSX da giao");
        team.transporter1.pickUp(chain, 1);
    }

    // Từ status 1 đi tới Sold, mỗi bước đủ hai đầu xác nhận
    function finishJourney(SupplyChain _chain, Team memory _team) internal {
        _team.transporter1.send(_chain, 1);
        _team.distributor.receiveIt(_chain, 1);
        _team.distributor.invite(_chain, 1, SupplyChain.Task.TransportToRetailer, address(_team.transporter2));
        _team.distributor.invite(_chain, 1, SupplyChain.Task.Retail, address(_team.retailer));
        _team.transporter2.accept(_chain, 1, SupplyChain.Task.TransportToRetailer);
        _team.retailer.accept(_chain, 1, SupplyChain.Task.Retail);
        _team.distributor.send(_chain, 1);
        _team.transporter2.pickUp(_chain, 1);
        _team.transporter2.send(_chain, 1);
        _team.retailer.receiveIt(_chain, 1);
        _team.retailer.sell(_chain, 1);
    }
}

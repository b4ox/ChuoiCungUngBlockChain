// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../SupplyChain.sol";

// Dùng địa chỉ riêng cho NPP để giữ vai trò nhận hàng khi bên chở khởi hành.
contract JourneyDistributor {
    function accept(SupplyChain _chain) external {
        _chain.acceptInvitation(1, SupplyChain.Task.Distribute);
    }

    function inviteNextLeg(SupplyChain _chain, address _transporter, address _retailer) external {
        _chain.inviteParticipant(1, SupplyChain.Task.TransportToRetailer, _transporter);
        _chain.inviteParticipant(1, SupplyChain.Task.Retail, _retailer);
    }

    function receiveAtWarehouse(SupplyChain _chain) external {
        _chain.receiveProduct(1, "Nhan tai kho");
    }
}

abstract contract JourneyFixture {
    // Dùng các địa chỉ riêng cho hai đối tác ở chặng đầu.
    function newProduct(bool _pickUp) internal returns (SupplyChain target, JourneyDistributor distributor) {
        target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.createProduct("Lo test", "Dak Lak", "Du lieu test");
        if (!_pickUp) return (target, distributor);

        distributor = new JourneyDistributor();
        target.registerParticipant(address(distributor), "Kho", SupplyChain.Role.Distributor);
        target.inviteParticipant(1, SupplyChain.Task.Distribute, address(distributor));
        distributor.accept(target);
        // Dùng một ví khác khi mời bên chở: nhà sản xuất phải giữ đúng vai lúc mời.
        TestTransporter transporter = new TestTransporter();
        target.registerParticipant(address(transporter), "Van chuyen", SupplyChain.Role.Transporter);
        target.inviteParticipant(1, SupplyChain.Task.TransportToDistributor, address(transporter));
        transporter.pickUpFirstLeg(target);
    }

    // NPP mời bên chở chặng hai và cửa hàng trước khi giao tiếp.
    function finishJourney(SupplyChain _chain, JourneyDistributor _distributor)
        internal returns (address)
    {
        _distributor.receiveAtWarehouse(_chain);
        TestTransporter transporter = new TestTransporter();
        _chain.registerParticipant(address(transporter), "Van chuyen", SupplyChain.Role.Transporter);
        _chain.registerParticipant(address(this), "Cua hang", SupplyChain.Role.Retailer);
        _distributor.inviteNextLeg(_chain, address(transporter), address(this));
        _chain.acceptInvitation(1, SupplyChain.Task.Retail);
        transporter.pickUpSecondLeg(_chain);
        _chain.receiveProduct(1, "Cua hang nhan");
        _chain.markAsSold(1, "Da ban");
        return address(transporter);
    }
}

contract TestTransporter {
    function pickUpFirstLeg(SupplyChain _chain) external {
        _chain.acceptInvitation(1, SupplyChain.Task.TransportToDistributor);
        _chain.pickUpProduct(1, "Lay hang");
    }

    function pickUpSecondLeg(SupplyChain _chain) external {
        _chain.acceptInvitation(1, SupplyChain.Task.TransportToRetailer);
        _chain.pickUpProduct(1, "Chuyen den cua hang");
    }
}

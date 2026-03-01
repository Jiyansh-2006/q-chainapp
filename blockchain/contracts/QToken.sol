// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;  // Changed to ^0.8.19 to match QuantumNFT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";  // Added Ownable

contract QToken is ERC20, Ownable {
    constructor() ERC20("Quantum Token", "QTOK") Ownable() {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());  // Mint 1M tokens
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
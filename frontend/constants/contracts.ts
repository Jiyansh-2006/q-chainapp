
// IMPORTANT: These are placeholder addresses and ABIs for the Polygon Amoy Testnet.
// Replace with your actual deployed contract details.

export const QTOKEN_CONTRACT_ADDRESS = import.meta.env.VITE_QTOKEN_ADDRESS; // Replace with your ERC-20 contract address
export const QUANTUMID_CONTRACT_ADDRESS = '0x...'; // Replace with your ERC-721 contract address

export const QTOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)"
];

export const QUANTUMID_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function safeMint(address to) returns (uint256)",
  "function walletOfOwner(address _owner) view returns (uint256[])"
];

export const QUANTUM_NFT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xYourContractAddressHere";

export const QUANTUM_NFT_ABI = [
    "function mintNFT(string memory name, string memory description, string memory tokenURI, string memory quantumHash, bytes32[] calldata merkleProof) external payable returns (uint256)",
    "function batchMint(string[] memory names, string[] memory descriptions, string[] memory tokenURIs, string[] memory quantumHashes, bytes32[][] calldata merkleProofs) external payable returns (uint256[] memory)",
    "function getNFTDetails(uint256 tokenId) external view returns (string memory, string memory, string memory, string memory, address, uint256, bool)",
    "function verifyQuantumSignature(uint256 tokenId, string memory quantumHash) external view returns (bool)",
    "function mintPrice() external view returns (uint256)",
    "function mintEnabled() external view returns (bool)",
    "function maxPerWallet() external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function setMintPrice(uint256 newPrice) external",
    "function setMintEnabled(bool enabled) external",
    "function withdraw() external",
    "event NFTMinted(uint256 indexed tokenId, address indexed owner, string name, string quantumHash, string ipfsCID)",
    "event QuantumVerificationAdded(uint256 indexed tokenId, bytes32 quantumHash, string algorithm)"
];
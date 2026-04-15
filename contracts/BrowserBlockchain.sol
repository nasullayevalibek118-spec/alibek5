// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BrowserBlockchain {
    struct BlockData {
        uint256 index;
        uint256 timestamp;
        string data;
        bytes32 previousHash;
        bytes32 hash;
        uint256 nonce;
        address miner;
    }

    BlockData[] private chain;
    uint8 public immutable difficulty;

    constructor(uint8 _difficulty) {
        difficulty = _difficulty;

        bytes32 genesisHash = sha256(
            abi.encodePacked(
                uint256(0),
                block.timestamp,
                "Genesis Block",
                bytes32(0),
                uint256(0)
            )
        );

        chain.push(
            BlockData({
                index: 0,
                timestamp: block.timestamp,
                data: "Genesis Block",
                previousHash: bytes32(0),
                hash: genesisHash,
                nonce: 0,
                miner: msg.sender
            })
        );
    }

    function addBlock(
        string calldata data,
        uint256 timestamp,
        uint256 nonce
    ) external {
        BlockData memory previousBlock = chain[chain.length - 1];
        uint256 newIndex = chain.length;

        bytes32 newHash = sha256(
            abi.encodePacked(
                newIndex,
                timestamp,
                data,
                previousBlock.hash,
                nonce
            )
        );

        require(_meetsDifficulty(newHash), "Hash does not satisfy Proof-of-Work");
        require(timestamp >= previousBlock.timestamp, "Timestamp must not go backwards");

        chain.push(
            BlockData({
                index: newIndex,
                timestamp: timestamp,
                data: data,
                previousHash: previousBlock.hash,
                hash: newHash,
                nonce: nonce,
                miner: msg.sender
            })
        );
    }

    function getBlock(uint256 index) external view returns (BlockData memory) {
        require(index < chain.length, "Block does not exist");
        return chain[index];
    }

    function getChainLength() external view returns (uint256) {
        return chain.length;
    }

    function getLatestBlock() external view returns (BlockData memory) {
        return chain[chain.length - 1];
    }

    function isChainValid() external view returns (bool) {
        for (uint256 i = 0; i < chain.length; i++) {
            BlockData memory currentBlock = chain[i];

            bytes32 calculatedHash = sha256(
                abi.encodePacked(
                    currentBlock.index,
                    currentBlock.timestamp,
                    currentBlock.data,
                    currentBlock.previousHash,
                    currentBlock.nonce
                )
            );

            if (currentBlock.hash != calculatedHash) {
                return false;
            }

            if (i == 0) {
                if (currentBlock.previousHash != bytes32(0)) {
                    return false;
                }
            } else {
                BlockData memory previousBlock = chain[i - 1];

                if (currentBlock.previousHash != previousBlock.hash) {
                    return false;
                }

                if (!_meetsDifficulty(currentBlock.hash)) {
                    return false;
                }
            }
        }

        return true;
    }

    function _meetsDifficulty(bytes32 hashValue) internal view returns (bool) {
        uint8 zeroNibblesSeen = 0;

        for (uint256 i = 0; i < 32; i++) {
            uint8 byteValue = uint8(hashValue[i]);

            if (byteValue >> 4 == 0) {
                zeroNibblesSeen += 1;
                if (zeroNibblesSeen >= difficulty) {
                    return true;
                }
            } else {
                return false;
            }

            if ((byteValue & 0x0f) == 0) {
                zeroNibblesSeen += 1;
                if (zeroNibblesSeen >= difficulty) {
                    return true;
                }
            } else {
                return false;
            }
        }

        return zeroNibblesSeen >= difficulty;
    }
}

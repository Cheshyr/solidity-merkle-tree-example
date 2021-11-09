// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// internal debug outputs; logs are type-specific (Bytes32, etc)
import { console } from "hardhat/console.sol";

contract MerkleTree_array_array{

    // merktletreejs returns json pairs, so removed struct; using direct arrays for now.

    function verify(
        bytes memory _leaf,
        bytes32 _root,
        bool[] memory proof_left,   // true == left for leaf location
        bytes32[] memory proof_data // proof steps in sequence
    ) public pure returns (bool) {  // change 'pure' to 'view' if you want to use console.log
        
        bytes32 local_proof = keccak256(_leaf); // hash and save
        
        // walk the proof. proof_left and _proof_data should have equal length (error check maybe?)
        for(uint256 i = 0; i < proof_left.length; i++)
        {
            // determine concat order
            if(proof_left[i] == true)
            {
                local_proof = keccak256(abi.encodePacked(proof_data[i] ,local_proof)); // concat
            }
            else
            {
                local_proof = keccak256(abi.encodePacked(local_proof , proof_data[i])); // concat
            }
        }
    
        // we've executed the entire proof.  if it was valid, should match _root
        return (local_proof == _root);
    }
}

contract MerkleTree_binary_array{

    function verify(

        bytes memory _leaf,
        bytes32 _root,
        uint256 proof_left,
        bytes32[] memory proof_data 

    ) public view returns (bool) {

        bytes32 local_proof = keccak256(_leaf);
        assembly 
        {   
            let proof_length := mload(proof_data)
            let proof_mem_loc := add(proof_data, 0x20)

            for
                { let end := add(proof_mem_loc, mul(proof_length, 0x20)) }
                lt(proof_mem_loc, end)
                { proof_mem_loc := add(proof_mem_loc, 0x20) }
            {
                let proof_node := mload(proof_mem_loc)

                let mem_pos := 0
                let left_flag := 0
                left_flag := and(proof_left, 0x1)
                
                mem_pos := msize()  // find the top of the stack?
                switch left_flag
                case 1 {
                    mstore(mem_pos, proof_node)
                    mstore(add(mem_pos,32), local_proof) 
                }
                default
                {
                    mstore(mem_pos, local_proof)
                    mstore(add(mem_pos,32), proof_node)
                }
                local_proof := keccak256(mem_pos, 64)
                proof_left := shr(1, proof_left)
            }
        }
        return (local_proof == _root);
    }
}
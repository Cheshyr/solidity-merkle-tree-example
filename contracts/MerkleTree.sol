// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

    // internal debug outputs; logs are type-specific (Bytes32, etc)
    import { console } from "hardhat/console.sol";

contract MerkleTree{

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
        if(local_proof == _root)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
}

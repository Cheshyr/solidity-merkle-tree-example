import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { count } from 'console'

chai.use(chaiAsPromised)
chai.use(solidity)

const hashfn = (element: any) => {
  return Buffer.from(ethers.utils.keccak256(element).slice(2), 'hex')
}

const getProofData_array_array = async (leaves: string[], target: number) => {
  const tree = new MerkleTree(leaves, hashfn, { hashLeaves: true })
  const proof = tree.getProof(leaves[target], target) // bugfix, need target index
  const root = tree.getRoot()

  // parse json, convert to discrete arrays
  let proof_left: boolean[] = []
  let proof_data: any[] = []

  proof.forEach(element => {
    if(element.position == 'left')
    {
      proof_left.push(true)
    }
    else
    {
      proof_left.push(false)
    }
    proof_data.push(element.data)
  });

  return {
    proof_left,
    proof_data,
    root,
  }
}

const getProofData_binary_array = async (leaves: string[], target: number) => {
  const tree = new MerkleTree(leaves, hashfn, { hashLeaves: true })
  const proof = tree.getProof(leaves[target], target) // bugfix, need target index
  const root = tree.getRoot()

  // parse json, convert to discrete arrays
  let proof_left: number = 0
  let proof_bit_buffer: number = 0
  let proof_bit_count: number = 0
  let proof_data: any[] = []

  let mask: number = 0

  proof.forEach(element => {
    if(element.position == 'left')
    {
      mask = 0x1;
    }
    else
    {
      mask = 0x0
    }
    proof_bit_buffer = proof_bit_buffer << 1
    proof_bit_buffer = proof_bit_buffer | mask
    proof_bit_count = proof_bit_count + 1
    proof_data.push(element.data)
  });

  // proof_bit_buffer is in reverse order from proof_data
  // reverse for easy right_shft in contract
  for(let i = 0; i < proof_bit_count; i++)
  {
    proof_left = proof_left << 1
    if((proof_bit_buffer & 0x1) == 0x1)
    {
      proof_left = proof_left | 0x1
    }
    proof_bit_buffer = proof_bit_buffer >> 1
  }

  return {
    proof_left,
    proof_data,
    root,
  }
}

// Helper function for when you want to check a valid proof
const makeAndCheckProof = async (tree: Contract, leaves: string[], target: number): Promise<boolean> => {
  const { proof_left, proof_data , root } = await getProofData_binary_array(leaves, target)
  return tree.verify(
    leaves[target],
    root,
    proof_left, 
    proof_data
  )
}

describe('MerkleTree', () => {
  let tree: Contract
  before(async () => {
    const factory = await ethers.getContractFactory('MerkleTree_binary_array')
    tree = await factory.deploy()
  })

  describe('verify', () => {
    it('should return true for a valid proof of a tree with one element', async () => {
      expect(
        await makeAndCheckProof(tree, ['0x1234'], 0)
      ).to.be.true
    })

    it('should return true for a valid proof of a tree with two elements (left node)', async () => {
      expect(
        await makeAndCheckProof(tree, ['0x1234', '0x5678'], 0)
      ).to.be.true
    })

    it('should return true for a valid proof of a tree with two elements (right node)', async () => {
      expect(
        await makeAndCheckProof(tree, ['0x1234', '0x5678'], 1)
      ).to.be.true
    })

    it('should return true for a valid proof of a tree with three elements', async () => {
      expect(
        await makeAndCheckProof(tree, ['0x1234', '0x5678', '0x9abc'], 1)
      ).to.be.true
    })

    it('should return true for a valid proof of a tree with 16 elements', async () => {
      expect(
        await makeAndCheckProof(tree, [ '0x1111', '0x2222', '0x3333', '0x4444', '0x5555', '0x6666', '0x7777',
                                        '0x8888', '0x9999', '0xaaaa', '0xbbbb', '0xcccc', '0xdddd', '0xeeee',
                                        '0xffff', '0x1234'], 13)
      ).to.be.true
    })
  })
})

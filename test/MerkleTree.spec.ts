import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import { MerkleTree } from 'merkletreejs'

chai.use(chaiAsPromised)
chai.use(solidity)

const hashfn = (element: any) => {
  return Buffer.from(ethers.utils.keccak256(element).slice(2), 'hex')
}

const getProofData = (leaves: string[], target: number) => {
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


// Helper function for when you want to check a valid proof
const makeAndCheckProof = async (tree: Contract, leaves: string[], target: number): Promise<boolean> => {
  
  // adjusting to return discrete arrays
  const { proof_left, proof_data , root } = await getProofData(leaves, target)
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
    const factory = await ethers.getContractFactory('MerkleTree')
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
  })
})

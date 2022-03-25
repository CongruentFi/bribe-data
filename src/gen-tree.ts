import { readFileSync, writeFileSync } from "fs";
import { BytesLike } from "ethers";
import { isAddress, keccak256, parseEther, parseUnits, solidityKeccak256 } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";

const ethSha3 = (data: BytesLike) => {
  return keccak256(data).slice(2);
}

async function main() {
  const day = process.argv[2];
  const data: {
    snapshot: string,
    total_vgaas: string, // 18 decimals
    total_bribe: string, // 6 decimals
  } = JSON.parse(readFileSync(`res/${day}.json`).toString());
  const totalBribe = parseUnits(data.total_bribe, "6");
  const totalVGaas = parseEther(data.total_vgaas);

  const bribe: {
    [key: string]: {
      usdc: string,
      node: string,
      index: number,
      proof: string[]
    }
  } = {};
  let index = 0;
  const input: string[] = [];
  readFileSync(`res/${data.snapshot}`).toString().split(/\r\n/g).forEach(l => {
    const [addr, balance] = l.replace(/"/g, "").split(/,/g);
    if (isAddress(addr)) {
      const usdc = totalBribe.mul(parseUnits(balance)).div(totalVGaas).toString();
      const node = solidityKeccak256(["uint", "address", "uint"], [index, addr, usdc]);
      bribe[addr] = {
        usdc,
        node,
        index,
        proof: []
      };
      index++;
      input.push(node);
    }
  });
  const total = Object.keys(bribe).length;
  console.log(`Total Eligible Addresses: ${total}`);
  // writeFileSync(`output/${day}_proof.json`, JSON.stringify(bribe, null, 2));

  const tree = new MerkleTree(input, ethSha3, { sortPairs: true });
  const root = tree.getHexRoot();
  console.log(`Merkle Root: ${root}`);
  writeFileSync(`data/${day}_root.txt`, root);

  process.stdout.write(`Generating Merkle Proof`);
  let sum = 0;
  for (let addr of Object.keys(bribe)) {
    bribe[addr].proof = tree.getHexProof(bribe[addr].node);
    sum++;
    if (sum % 100 == 0) {
      process.stdout.write(`\rGenerating Merkle Proof [${sum}/${total}] ...`);
    }
  }
  console.log();
  writeFileSync(`data/${day}_proof.json`, JSON.stringify(bribe, null, 2));
  console.log(`Done.`);
}

main().catch(e => console.error(e));

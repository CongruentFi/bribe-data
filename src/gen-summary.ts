import { readdir, writeFile, readFile } from "fs/promises";
import { resolve } from 'path';
import { BigNumber } from "ethers";

interface Summary {
  totalReward: string;
  latestProof: string;
}

async function main(): Promise<void> {
  const dataPath = resolve(__dirname, '../data');
  const publicPath = resolve(__dirname, '../public')
  const proofPaths = (await readdir(dataPath))
    .filter(item => /^[0-9]+_proof.json$/.test(item))
    .sort((a, b) => {
      const reg = /^[0-9]+/;
      const aDay = a.match(reg);
      const bDay = b.match(reg);

      if (aDay === null || bDay === null)  {
        return 0;
      }

      return Number(bDay[0]) - Number(aDay[0]);
    });

  let totalReward = BigNumber.from(0);
  const latestProof = proofPaths[0];

  for await (const contents of proofPaths.map(file => readFile(resolve(dataPath, file), 'utf-8'))) {
    const parsed = JSON.parse(contents);
    Object.keys(parsed).forEach(key => {
      totalReward = totalReward.add(BigNumber.from(parsed[key].usdc));
    });
  }

  const summary: Summary = {
    totalReward: totalReward.toString(),
    latestProof: `https://raw.githubusercontent.com/CongruentFi/bribe-data/master/data/${latestProof}`
  }

  await writeFile(resolve(publicPath, './summary.json'), JSON.stringify(summary, null, 2));

  console.log('generate summary is done.');
}

main().catch(e => console.error(e));

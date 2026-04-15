const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const CONTRACT_FILE = path.join(__dirname, '..', 'contracts', 'BrowserBlockchain.sol');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEPLOYMENT_FILE = path.join(PUBLIC_DIR, 'deployment.json');

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8546';
const MNEMONIC =
  process.env.DEPLOYER_MNEMONIC ||
  'test test test test test test test test test test test junk';
const DIFFICULTY = Number(process.env.BLOCK_DIFFICULTY || 4);

function compileContract() {
  const source = fs.readFileSync(CONTRACT_FILE, 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'BrowserBlockchain.sol': {
        content: source,
      },
    },
    settings: {
      evmVersion: 'paris',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErrors = output.errors.filter((error) => error.severity === 'error');
    if (fatalErrors.length > 0) {
      throw new Error(fatalErrors.map((error) => error.formattedMessage).join('\n'));
    }
  }

  const contract = output.contracts['BrowserBlockchain.sol'].BrowserBlockchain;
  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
}

async function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const { abi, bytecode } = compileContract();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = ethers.Wallet.fromPhrase(MNEMONIC).connect(provider);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const network = await provider.getNetwork();

  console.log(`Deploying contract to ${RPC_URL} with difficulty ${DIFFICULTY}...`);
  const contract = await factory.deploy(DIFFICULTY);
  await contract.waitForDeployment();

  const deployment = {
    contractAddress: await contract.getAddress(),
    abi,
    network: {
      rpcUrl: RPC_URL,
      chainId: Number(network.chainId),
      difficulty: DIFFICULTY,
    },
  };

  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2));

  console.log(`Contract deployed at ${deployment.contractAddress}`);
  console.log(`Deployment info saved to ${DEPLOYMENT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

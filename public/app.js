const walletStatus = document.getElementById('walletStatus');
const contractStatus = document.getElementById('contractStatus');
const chainStatus = document.getElementById('chainStatus');
const networkInfo = document.getElementById('networkInfo');
const miningStatus = document.getElementById('miningStatus');
const tamperStatus = document.getElementById('tamperStatus');
const blocksContainer = document.getElementById('blocksContainer');
const blockDataInput = document.getElementById('blockData');
const connectButton = document.getElementById('connectButton');
const mineButton = document.getElementById('mineButton');
const validateButton = document.getElementById('validateButton');
const tamperButton = document.getElementById('tamperButton');

let deployment;
let browserProvider;
let readProvider;
let signer;
let contract;
let readContract;
let currentAccount = '';
let cachedBlocks = [];

function resetWalletState() {
  signer = undefined;
  browserProvider = undefined;
  contract = undefined;
  currentAccount = '';
  walletStatus.textContent = 'Ulanmagan';
  chainStatus.textContent = 'Tekshirilmagan';
  connectButton.textContent = 'MetaMask ulash';
}

function showWalletError(message) {
  resetWalletState();
  walletStatus.textContent = 'Ulanmadi';
  networkInfo.textContent = message;
  miningStatus.textContent = message;
  miningStatus.className = 'error';
}

function normalizeError(error) {
  if (!error) {
    return "Noma'lum xato yuz berdi.";
  }

  if (typeof error === 'string') {
    return error;
  }

  const message = (
    error.shortMessage ||
    error.reason ||
    error.info?.error?.message ||
    error.data?.message ||
    error.error?.message ||
    error.cause?.message ||
    error.message ||
    "Noma'lum xato yuz berdi."
  );

  if (message.includes('could not coalesce error')) {
    return "MetaMask javobida xato bo'ldi. MetaMask oynasida tarmoqni tasdiqlang yoki sahifani yangilab qayta urinib ko'ring.";
  }

  return message;
}

async function loadDeployment() {
  const response = await fetch('./deployment.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('deployment.json topilmadi. Avval contractni deploy qiling.');
  }

  deployment = await response.json();
  readProvider = new ethers.JsonRpcProvider(deployment.network.rpcUrl);
  readContract = new ethers.Contract(deployment.contractAddress, deployment.abi, readProvider);
  contractStatus.textContent = `${deployment.contractAddress.slice(0, 8)}...${deployment.contractAddress.slice(-6)}`;
  networkInfo.textContent = `RPC: ${deployment.network.rpcUrl} | Chain ID: ${deployment.network.chainId} | Difficulty: ${deployment.network.difficulty}`;
}

async function ensureCorrectNetwork() {
  const targetChainId = Number(deployment.network.chainId);
  const currentChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });

  if (Number.parseInt(currentChainIdHex, 16) === targetChainId) {
    return;
  }

  const hexChainId = `0x${targetChainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw new Error(`MetaMask tarmog'ini ${targetChainId} ga o'tkazib bo'lmadi.`);
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexChainId,
          chainName: `Local Ganache ${deployment.network.chainId}`,
          rpcUrls: [deployment.network.rpcUrl],
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          },
        },
      ],
    });

    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  }
}

async function getAuthorizedAccounts() {
  return window.ethereum.request({ method: 'eth_accounts' });
}

async function getContractCode() {
  return readProvider.getCode(deployment.contractAddress);
}

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask topilmadi. Brauzerga MetaMask o'rnating.");
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts.length) {
    throw new Error("MetaMask account tanlanmadi.");
  }

  await ensureCorrectNetwork();
  browserProvider = new ethers.BrowserProvider(window.ethereum);
  await finishWalletConnection(accounts[0]);
}

async function finishWalletConnection(accountAddress) {
  browserProvider = new ethers.BrowserProvider(window.ethereum);
  currentAccount = accountAddress;
  signer = await browserProvider.getSigner(accountAddress);

  const contractCode = await getContractCode();
  if (contractCode === '0x') {
    throw new Error("Contract topilmadi. Ganache qayta ishga tushgan bo'lsa `npm run deploy` ni qayta ishga tushiring.");
  }

  contract = new ethers.Contract(deployment.contractAddress, deployment.abi, signer);
  walletStatus.textContent = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
  connectButton.textContent = 'Ulangan';
  miningStatus.textContent = 'Wallet muvaffaqiyatli ulandi.';
  miningStatus.className = 'success';
  await refreshBlocks();
}

async function restoreWalletConnection() {
  if (!window.ethereum) {
    return;
  }

  await ensureCorrectNetwork();
  const accounts = await getAuthorizedAccounts();
  if (!accounts.length) {
    return;
  }

  await finishWalletConnection(accounts[0]);
  await validateChain();
}

async function handleAccountsChanged(accounts) {
  if (!accounts.length) {
    resetWalletState();
    return;
  }

  try {
    await ensureCorrectNetwork();
    await finishWalletConnection(accounts[0]);
    await validateChain();
  } catch (error) {
    showWalletError(normalizeError(error));
  }
}

async function handleChainChanged() {
  try {
    resetWalletState();
    await restoreWalletConnection();
  } catch (error) {
    showWalletError(normalizeError(error));
  }
}

function blockToPlain(block) {
  return {
    index: Number(block.index),
    timestamp: Number(block.timestamp),
    data: block.data,
    previousHash: block.previousHash,
    hash: block.hash,
    nonce: Number(block.nonce),
    miner: block.miner,
  };
}

function renderBlocks(blocks) {
  if (blocks.length === 0) {
    blocksContainer.innerHTML = "<p>Hali bloklar yo'q.</p>";
    return;
  }

  blocksContainer.innerHTML = blocks
    .map((block) => {
      const readableDate = new Date(block.timestamp * 1000).toLocaleString();
      return `
        <article class="block-card">
          <h3>Block #${block.index}</h3>
          <p><strong>Timestamp:</strong> ${readableDate}</p>
          <p><strong>Data:</strong> ${escapeHtml(block.data)}</p>
          <p class="hash"><strong>Previous Hash:</strong> ${block.previousHash}</p>
          <p class="hash"><strong>Hash:</strong> ${block.hash}</p>
          <p><strong>Nonce:</strong> ${block.nonce}</p>
          <p><strong>Miner:</strong> ${block.miner}</p>
        </article>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildHash(index, timestamp, data, previousHash, nonce) {
  const packed = ethers.solidityPacked(
    ['uint256', 'uint256', 'string', 'bytes32', 'uint256'],
    [index, timestamp, data, previousHash, nonce]
  );
  return ethers.sha256(packed);
}

function meetsDifficulty(hash, difficulty) {
  return hash.slice(2).startsWith('0'.repeat(difficulty));
}

async function mineBlockLocally(data) {
  if (!contract || !readContract) {
    throw new Error('Avval walletni ulang.');
  }

  const latestBlock = blockToPlain(await readContract.getLatestBlock());
  const nextIndex = latestBlock.index + 1;
  const timestamp = Math.max(Math.floor(Date.now() / 1000), latestBlock.timestamp);
  const difficulty = Number(deployment.network.difficulty);

  let nonce = 0;
  let hash = buildHash(nextIndex, timestamp, data, latestBlock.hash, nonce);
  miningStatus.textContent = 'Mining boshlandi...';

  while (!meetsDifficulty(hash, difficulty)) {
    nonce += 1;
    if (nonce % 5000 === 0) {
      miningStatus.textContent = `Mining davom etmoqda... nonce ${nonce}`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    hash = buildHash(nextIndex, timestamp, data, latestBlock.hash, nonce);
  }

  return { timestamp, nonce, hash, nextIndex, previousHash: latestBlock.hash };
}

async function refreshBlocks() {
  if (!readContract) {
    return;
  }

  const length = Number(await readContract.getChainLength());
  const blocks = [];

  for (let i = 0; i < length; i += 1) {
    const block = await readContract.getBlock(i);
    blocks.push(blockToPlain(block));
  }

  cachedBlocks = blocks;
  renderBlocks(blocks);
}

async function validateChain() {
  if (!readContract) {
    throw new Error('Avval walletni ulang.');
  }

  const valid = await readContract.isChainValid();
  chainStatus.textContent = valid ? 'Valid' : 'Buzilgan';
  chainStatus.className = valid ? 'success' : 'error';
}

function validateBlocksLocally(blocks, difficulty) {
  for (let i = 0; i < blocks.length; i += 1) {
    const current = blocks[i];
    const recalculatedHash = buildHash(
      current.index,
      current.timestamp,
      current.data,
      current.previousHash,
      current.nonce
    );

    if (recalculatedHash !== current.hash) {
      return false;
    }

    if (i === 0) {
      if (current.previousHash !== ethers.ZeroHash) {
        return false;
      }
      continue;
    }

    const previous = blocks[i - 1];
    if (current.previousHash !== previous.hash) {
      return false;
    }

    if (!meetsDifficulty(current.hash, difficulty)) {
      return false;
    }
  }

  return true;
}

async function simulateTamper() {
  if (cachedBlocks.length < 2) {
    tamperStatus.textContent = 'Tamper uchun kamida 2 ta blok kerak.';
    tamperStatus.className = 'error';
    return;
  }

  const clonedBlocks = structuredClone(cachedBlocks);
  clonedBlocks[1].data = `${clonedBlocks[1].data} [tampered]`;

  const isStillValid = validateBlocksLocally(clonedBlocks, Number(deployment.network.difficulty));
  tamperStatus.textContent = isStillValid
    ? "Kutilmagan holat: zanjir hali ham valid ko'rindi."
    : "Ma'lumot o'zgartirilganda lokal audit zanjir buzilganini ko'rsatdi.";
  tamperStatus.className = isStillValid ? 'error' : 'success';
}

async function addBlock() {
  const data = blockDataInput.value.trim();
  if (!data) {
    throw new Error("Blok ma'lumotini kiriting.");
  }

  mineButton.disabled = true;

  try {
    const mined = await mineBlockLocally(data);
    miningStatus.textContent = `Hash topildi: ${mined.hash.slice(0, 18)}... nonce ${mined.nonce}`;

    const tx = await contract.addBlock(data, mined.timestamp, mined.nonce);
    miningStatus.textContent = 'Tranzaksiya yuborildi, tasdiq kutilmoqda...';
    await tx.wait();

    miningStatus.textContent = `Block #${mined.nextIndex} muvaffaqiyatli qo'shildi.`;
    blockDataInput.value = '';
    await refreshBlocks();
    await validateChain();
  } finally {
    mineButton.disabled = false;
  }
}

async function bootstrap() {
  try {
    await loadDeployment();
  } catch (error) {
    contractStatus.textContent = "Deploy yo'q";
    networkInfo.textContent = normalizeError(error);
    return;
  }

  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  } else {
    networkInfo.textContent = "MetaMask topilmadi. Extension o'rnatilganini tekshiring.";
  }

  try {
    await restoreWalletConnection();
  } catch (error) {
    showWalletError(normalizeError(error));
  }
}

connectButton.addEventListener('click', async () => {
  try {
    await connectWallet();
    await validateChain();
  } catch (error) {
    if (error && error.code === 4001) {
      showWalletError("MetaMask ruxsati bekor qilindi.");
      return;
    }

    showWalletError(normalizeError(error));
  }
});

mineButton.addEventListener('click', async () => {
  try {
    miningStatus.className = '';
    await addBlock();
  } catch (error) {
    miningStatus.textContent = normalizeError(error);
    miningStatus.className = 'error';
    mineButton.disabled = false;
  }
});

validateButton.addEventListener('click', async () => {
  try {
    await validateChain();
  } catch (error) {
    chainStatus.textContent = normalizeError(error);
    chainStatus.className = 'error';
  }
});

tamperButton.addEventListener('click', async () => {
  await simulateTamper();
});

bootstrap();

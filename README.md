# Web3 Blockchain Demo

Bu loyiha brauzerda ishlaydigan oddiy `Web3` blockchain dApp:

- `Solidity` smart contract ichida bloklar zanjiri saqlanadi
- `SHA-256` hash ishlatiladi
- `Genesis block` avtomatik yaratiladi
- yangi blok `previousHash` bilan ulanadi
- `Proof-of-Work` mining brauzerda bajariladi
- `isChainValid()` orqali on-chain validatsiya qilinadi
- tamper holati frontendda simulyatsiya qilinadi

## Ishga tushirish

1. Lokal blockchain node:

```bash
npm run chain
```

2. Yangi terminalda contract deploy:

```bash
npm run deploy
```

3. Yana yangi terminalda web server:

```bash
npm run web
```

4. Brauzerda oching:

```text
http://localhost:3000
```

## MetaMask

MetaMask'ga quyidagi lokal tarmoqni qo‘shing:

- Network name: `Local Ganache 8546`
- RPC URL: `http://127.0.0.1:8546`
- Chain ID: `1337`
- Currency symbol: `ETH`

Account import qilish uchun mnemonic:

```text
test test test test test test test test test test test junk
```

## Asosiy fayllar

- `contracts/BrowserBlockchain.sol` - smart contract
- `scripts/deploy.js` - compile + deploy + `public/deployment.json` yaratish
- `public/index.html` - brauzer interfeysi
- `public/app.js` - wallet, mining, validation, tamper logic
- `server.js` - static web server

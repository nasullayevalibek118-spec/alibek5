const crypto = require('crypto');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.data) +
          this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);

    while (!this.hash.startsWith(target)) {
      this.nonce += 1;
      this.hash = this.calculateHash();
    }
  }
}

class Blockchain {
  constructor(difficulty = 3) {
    this.difficulty = difficulty;
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    const genesisBlock = new Block(
      0,
      new Date().toISOString(),
      { message: 'Genesis Block' },
      '0'
    );
    genesisBlock.mineBlock(this.difficulty);
    return genesisBlock;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      data,
      previousBlock.hash
    );

    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    return newBlock;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i += 1) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }

  printChain() {
    this.chain.forEach((block) => {
      console.log('------------------------------');
      console.log(`Index        : ${block.index}`);
      console.log(`Timestamp    : ${block.timestamp}`);
      console.log(`Data         : ${JSON.stringify(block.data)}`);
      console.log(`Previous Hash: ${block.previousHash}`);
      console.log(`Hash         : ${block.hash}`);
      console.log(`Nonce        : ${block.nonce}`);
    });
    console.log('------------------------------');
  }
}

const myBlockchain = new Blockchain(4);

console.log('Genesis blok va keyingi bloklar yaratilmoqda...');
myBlockchain.addBlock({ from: 'Ali', to: 'Vali', amount: 10 });
myBlockchain.addBlock({ from: 'Vali', to: 'Sami', amount: 4 });
myBlockchain.addBlock({ from: 'Sami', to: 'Nodir', amount: 2 });

console.log('\nBlockchain ro‘yxati:');
myBlockchain.printChain();

console.log(`Zanjir validmi? ${myBlockchain.isChainValid()}`);

console.log('\nBir blok ma’lumotini o‘zgartirib ko‘ramiz...');
myBlockchain.chain[1].data.amount = 9999;

console.log(`Ma’lumot o‘zgargandan keyin zanjir validmi? ${myBlockchain.isChainValid()}`);

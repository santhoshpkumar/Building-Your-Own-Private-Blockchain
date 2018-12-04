/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
//const levelDBWrapper = require('./levelSandbox')

//Level DB Inline

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// Add data to levelDB with key/value pair
function addLevelDBData(key,value){
  db.put(key, value, function(err) {
    if (err) return console.log('Block ' + key + ' submission failed', err);
  })
}

// Get data from levelDB with key
function getLevelDBData(key){
  db.get(key, function(err, value) {
    if (err) return console.log('Not found!', err);
    console.log('Value = ' + value);
  })
}

// Add data to levelDB with value
function addDataToLevelDB(value) {
    let i = 0;
    db.createReadStream().on('data', function(data) {
          i++;
        }).on('error', function(err) {
            return console.log('Unable to read data stream!', err)
        }).on('close', function() {
          console.log('Block #' + i);
          addLevelDBData(i, value);
        });
}

// Add block to levelDB with key/value pair
function addBlockToDB(key,value){
  return new Promise((resolve, reject) => {
    db.put(key, value, (error) =>  {
      if (error){
        reject(error) }
      console.log(`Block added ${key}`)
      resolve(`Block added ${key}`)
    });
  })
}

// Get block from levelDB with key
function getBlockFromDB(key){
  return new Promise((resolve, reject) => {
    db.get(key,(error, value) => {
      if (error){
        reject(error)
      }
      console.log(`Block requested ${value}`)
      resolve(value)
    });
  })
}

// Get block height
function getBlockHeightFromDB() {
    return new Promise((resolve, reject) => {
      let height = -1

      db.createReadStream().on('data', (data) => {
        height++
      }).on('error', (error) => {
        reject(error)
      }).on('close', () => {
        console.log(`Block Height ${height}`)
        resolve(height)
      })
    })
}


/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    this.chain = [];
    this.addBlock(new Block("First block in the chain - Genesis block"));
  }

  // Add new block
  addBlock(newBlock){
    // Block height
    newBlock.height = this.chain.length;
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(this.chain.length>0){
      newBlock.previousBlockHash = this.chain[this.chain.length-1].hash;
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
  	this.chain.push(newBlock);
  }

  // Get block height
    getBlockHeight(){
      return this.chain.length-1;
    }

    // get block
    getBlock(blockHeight){
      // return object as a single string
      return JSON.parse(JSON.stringify(this.chain[blockHeight]));
    }

    // validate block
    validateBlock(blockHeight){
      // get block object
      let block = this.getBlock(blockHeight);
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = '';
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash===validBlockHash) {
          return true;
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          return false;
        }
    }

   // Validate blockchain
    validateChain(){
      let errorLog = [];
      for (var i = 0; i < this.chain.length-1; i++) {
        // validate block
        if (!this.validateBlock(i))errorLog.push(i);
        // compare blocks hash link
        let blockHash = this.chain[i].hash;
        let previousHash = this.chain[i+1].previousBlockHash;
        if (blockHash!==previousHash) {
          errorLog.push(i);
        }
      }
      if (errorLog.length>0) {
        console.log('Block errors = ' + errorLog.length);
        console.log('Blocks: '+errorLog);
      } else {
        console.log('No errors detected');
      }
    }
}

// Testing

console.log("=====  Blockchain Class =====")
let blockchain = new Blockchain();
console.log( "let blockchain = new Blockchain() --> Done")
for (var i = 0; i <= 10; i++) {
  blockchain.addBlock(new Block("test data "+i));
}
console.log("for (var i = 0; i <= 10; i++) { blockchain.addBlock(new Block('test data '+i));} --> Done ")
console.log("blockchain.validateChain() --> Executing")
blockchain.validateChain();
console.log("blockchain.validateChain() --> Done")

// Induce Error

let inducedErrorBlocks = [2,4,7];
for (var i = 0; i < inducedErrorBlocks.length; i++) {
  blockchain.chain[inducedErrorBlocks[i]].data='induced chain error';
}
console.log("let inducedErrorBlocks = [2,4,7]; --> Done")
console.log("for (var i = 0; i < inducedErrorBlocks.length; i++) {blockchain.chain[inducedErrorBlocks[i]].data='induced chain error';} --> Done")

console.log("blockchain.validateChain(); --> Executing")
blockchain.validateChain();
console.log("blockchain.validateChain(); --> Done")

/* ===== Extended Blockchain Class ==================
|  Extended version which uses indexDB to persist   |
|  the chain and block data 		                    |
|  ================================================*/

console.log("=====  Extended Blockchain Class =====")

class BlockchainEx{
  constructor(){
    this.getBlockHeight().then((height) => {
      if (height === -1){
        this.addBlock(new Block("First block in the chain - Genesis block"))
      }
    })
  }

  // Add new block
  async addBlock(newBlock){
    // Block height
    const height = parseInt(await this.getBlockHeight())
    newBlock.height = height+1
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(newBlock.height>0){
      const previousBlockHeight = newBlock.height - 1 
      const previousBlock = JSON.parse(await this.getBlock(previousBlockHeight))
      newBlock.previousBlockHash = previousBlock.hash 
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
    await addBlockToDB(newBlock.height, JSON.stringify(newBlock));
  }

  // Get block height
  async getBlockHeight(){
    return await getBlockHeightFromDB().catch(e=>console.log("error",e))
  }

  // get block
  async getBlock(blockHeight){
    // return object as a single string
    return await getBlockFromDB(blockHeight);
  }

  // validate block
  async validateBlock(blockHeight){
    // get block object
    let block = JSON.parse(await (this.getBlock(blockHeight)))
    // get block hash
    let blockHash = block.hash;
    // remove block hash to test block integrity
    block.hash = '';
    // generate block hash
    let validBlockHash = SHA256(JSON.stringify(block)).toString();
    // Compare
    if (blockHash===validBlockHash) {
        console.log('Block is valid!')
        return true;

      } else {
        console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
        return false;
      }
  }

  // Validate blockchain
  async validateChain(){
    let errorLog = [];
    for (var i = 0; i < await this.getBlockHeight-1; i++) {
      // validate block
      if (await !this.validateBlock(i))errorLog.push(i);
      // compare blocks hash link
      let blockHash = JSON.parse(await this.getBlock(i)).hash;
      let previousHash = JSON.parse(await this.getBlock(i+1)).previousBlockHash;
      if (blockHash!==previousHash) {
        errorLog.push(i);
      }
    }
    if (errorLog.length>0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: '+errorLog);
    } else {
      console.log('No errors detected');
    }
  }
}


let blockchainEx = new BlockchainEx();

(function theLoop (i) {
  setTimeout(function () {
    var start = Date.now();
    addDataToLevelDB('Testing data ', start.toString());
    blockchainEx.getBlockHeight().then((height) => {
      console.log("Height of chain is: ", height)
  })
    if (i--) theLoop(i);
  }, 100);
})(10);


// node simpleChain.js
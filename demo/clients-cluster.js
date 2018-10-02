const cluster = require('cluster');
const clientSetup = require('../hyperledger-client/index').clientSetup;
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const envvars = require('./envvars');
const nrUsers = envvars.length;

if (cluster.isMaster) {
  masterProcess();
} else {
  childProcess();  
}

function masterProcess() {
  // console.log(`Master ${process.pid} is running`);

  // Launch prosumer clients
  for (let i = 0; i < nrUsers; i++) {
    cluster.fork(envvars[i]);
  }

 // process.exit();
}

function childProcess() {
  // console.log(`Worker ${process.pid} is running`);
  client = clientSetup();
  // process.exit();
}
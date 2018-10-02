const RestClient = require('./rest-client').RestClient;
const logger = require('./logger').logger;
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const startUpTimeout = 10000; // 10 seconds
const registrationWindow = 60*1000; // 1 minute
let currentGameID;

class MarketClock {
  constructor() {
    this.restClient = new RestClient();
    
    logger.info('Created market clock');
   
    setTimeoutPromise(startUpTimeout)
    .then(() => {
        logger.info('Submit PublishGame tx');
        return this.restClient.postPublishGame(registrationWindow);
    })
    .then((response) => {
        currentGameID = response.data;
        logger.info(`${currentGameID} published`);
        return setTimeoutPromise(registrationWindow);
    })
    .then(() => {
        logger.info("Submit StopGameRegistration tx");
        return this.restClient.postStopGameRegistration(currentGameID);
    })
    .then(() => {
        logger.info("Game registration stopped");
    })
    .catch(error => {
        // logger.error(error || error.response || error.response.data);
        logger.error(error.response.data == undefined ? (error.response == undefined ? error : error.response) : error.response.data);
    });
  }
}

let clock = new MarketClock();
module.exports.MarketClock = MarketClock;
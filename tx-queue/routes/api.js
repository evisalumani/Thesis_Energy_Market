// Import dependencies
const express = require('express');
const router = express.Router();
const queue = require('queue');
const logger = require('../logger').logger;
// const logger = require('../logger').logger;
const RestClient = require('../rest-client').RestClient;

let q = queue({concurrency:1});
let restClient = new RestClient();
let results = []; /** Results of transaction submissions */

const PUBLISH_OFFER = 'publishOffer';
const PUBLISH_DEMAND = 'publishDemand';
const PUBLISH_BUY_BID = 'publishBuyBid';
const PUBLISH_METER_READING = 'publishMeterReading';

/**
 * Map of topics to transaction submission functions
 */
let transactionMap = {
    'publishOffer': restClient.postPublishOffer,
    'publishDemand': restClient.postPublishDemand,
    'publishBuyBid': restClient.postPublishBuyBid,
    'publishMeterReading': restClient.postPublishMeterReading
}

q.on('success', function (result, job) {
  logger.info('Job finished processing');
})

/**
 * Error handler for errors returned from Hyperledger
 */
q.on('error', (error, job) => {
    logger.error(error.response.data|| error.response || error);
})

/* GET / */
router.get('/', (req, res) => {
    res.send('Transaction Queue API');
});

/**
 * API endpoint is /queue
 * Topic defines the transaction type to be submitted
 * Prosumer is the identifier of the participant submitting the transaction
 * Data is any transaction details
 * 
 * Request body is structured as e.g. 
 * {
 *  "topic": "publishOffer",
 *  "payload": {
 *      "prosumer": "abc",
 *      "data": "xyz"
 *  }
 * }
 */
router.post('/queue', (req, res) => {
    const topic = req.body.topic;
    const payload = req.body.payload;

    if (!payload || !topic || !payload.data || !payload.prosumer) {
        return res.status(500).json({"message": "Insufficient data to submit a transaction"});
    }
    
    /**
     * Get the handler for this topic
     */
    let handler = transactionMap[topic];
    if (handler == undefined) {
        res.status(500).json({"message": `Topic ${topic} is not handled by the queue`});
    }

    /**
     * Push request to queue
     */
    q.push(function() {
        let promise = handler(payload.data, payload.prosumer);
        return promise;
    })

    /**
     * Begin processing the queue
     */
    q.start(function (error) {
      if (error) throw error;
      logger.info('Processing started ...');
    })
    
    return res.status(200).json({"message": "Transaction pushed to queue"});
});

process.on('unhandledRejection', error => {
    logger.error(`unhandledRejection: ${error}`);
});
  

module.exports = router;
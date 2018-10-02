const axios = require('axios');
const logger = require('./logger').logger;

class RestClient {
    postPublishOffer(data, prosumer) {
        const body = {
            "$class": "org.acme.biznet.PublishOffer",
            "game": data.game,
            "amount": data.amount,
            "price": data.price,
            "initiator": `resource:org.acme.biznet.Prosumer#${prosumer}`
        };

        logger.info('Queue PublishOffer tx');
        return axios.post('http://localhost:3000/api/PublishOffer', body);
    }

    postPublishDemand(data, prosumer) {
        const body = {
            "$class": "org.acme.biznet.PublishDemand",
            "game": data.game,
            "amount": data.amount,
            "initiator": `resource:org.acme.biznet.Prosumer#${prosumer}`
        };

        logger.info('Queue PublishDemand tx');
        return axios.post('http://localhost:3000/api/PublishDemand', body);
    }

    postPublishBuyBid(data, prosumer) {
        const body = {
            "$class": "org.acme.biznet.PublishBuyBid",
            "game": data.game,
            "keepPlaying": data.keepPlaying,
            // bidAmounts is optional
            "bidAmounts": data.bidAmounts,
            "initiator": `resource:org.acme.biznet.Prosumer#${prosumer}`
        };

        logger.info('Queue PublishBuyBid tx');
        return axios.post('http://localhost:3000/api/PublishBuyBid', body);
    }

    postPublishMeterReading(data, prosumer) {
        const body = {
            "$class": "org.acme.biznet.PublishMeterReading",
            "game": data.game,
            "inEnergy": data.inEnergy,
            "outEnergy": data.outEnergy,
            "initiator": `resource:org.acme.biznet.Prosumer#${prosumer}`
        };
        
        logger.info('Queue PublishMeterReading tx');
        return axios.post('http://localhost:3000/api/PublishMeterReading', body);
    }
}

module.exports.RestClient = RestClient;
const axios = require('axios');

class RestClient {
    async postPublishGame(duration) {    
        const body = {
            "$class": "org.acme.biznet.PublishGame",
            "registrationDurationMs": duration
        };

        return axios.post('http://localhost:3000/api/PublishGame', body);
    }

    postStopGameRegistration(gameID) {
        const body = {
            "$class": "org.acme.biznet.StopGameRegistration",
            "game": `resource:org.acme.biznet.Game#${gameID}`
        };
        
        return axios.post('http://localhost:3000/api/StopGameRegistration', body);
    }

    postCloseMarket(gameID) {
        const body = {
            "$class": "org.acme.biznet.CloseMarket",
            "game": `resource:org.acme.biznet.Game#${gameID}`
        };

        return axios.post('http://localhost:3000/api/CloseMarket', body);
    }
}

module.exports.RestClient = RestClient;
const axios = require('axios');

class RestClient {
    getGame(gameId) {
        // Use the filter parameter to resolve the relationships
        return axios.get('http://localhost:3000/api/Game/' + gameId + '?filter={"include":"resolve"}');
    }

    getOptimizedSolution(...requestData) {
        if (requestData.length < 6) throw new Error('Insufficient data');

        const port = 8081;
        const body = {
            "nr_sellers": requestData[0],
            "sellers_price": requestData[1],
            "buyer_demand": requestData[2],
            "sellers_capacity": requestData[3],
            "used_capacities": requestData[4],
            "hop_distrances": requestData[5]
        };

        return axios.post(`http://localhost:${port}/optimalEnergyDecomposition`, body);
    }

    postQueueTx(topic, payloadData, prosumerSubmitting) {
        const port = 3001;
        return axios.post(`http://localhost:${port}/queue`, {
            "topic": topic,
            "payload": {
                "data": payloadData,
                "prosumer": prosumerSubmitting
            }
        });
    }
}

module.exports.RestClient = RestClient;
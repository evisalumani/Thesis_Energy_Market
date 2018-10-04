const WebSocket = require('ws');
const logger = require('./logger').logger;
const RestClient = require('./rest-client').RestClient;

class Client {
	constructor(prosumerID, amount) {
		this.prosumerID = prosumerID;
		this.amount = amount; // offer or demand amount
        this.gameID = null; // current game 
		this.ws = new WebSocket('ws://localhost:3000');
		this.ws.on('message', (data) => this.wsListener(data, this));
		this.restClient = new RestClient();
	}

	defaultEventHandler(event) {
		logger.info(`Received ${event}`);
    }

    toString() {}
    
    wsListener(data, obj) {
		const parsedData = JSON.parse(data);
		
		// Get event type
        const eventTypeFull = parsedData["$class"];
        const idx = eventTypeFull.lastIndexOf('.') + 1;
		const eventType = eventTypeFull.slice(idx);
		
		// Get the gameID which the client is playing in
		// The Game relationship returned from the event is not resolved 
		// The API must be called explicitly to get the resolved Game
		if (obj.gameID == undefined && parsedData["game"] != undefined) {
			const gameRef = parsedData["game"];
			const startIndex = gameRef.indexOf("#") + 1;
			const gameID = gameRef.substring(startIndex);
	
			// Set the game 
			obj.gameID = gameID;
		}
		
		let handler = obj.eventMap[eventType];
		obj.defaultEventHandler(eventType);

		if (handler != undefined) {
			handler(parsedData, obj);
		}
    }
}

class Seller extends Client {
	constructor(prosumerID, amount, price) {
        super(prosumerID, amount);
        this.price = price;

        logger.info(`Created seller with offer ${this.toString()}`);

		this.eventMap = {
			'GameInitEvent': this.publishOffer
		};
	}

	setOfferPrice(price) {
		this.price = price;
    }
    
    toString() {
        return `amount: ${this.amount}, price: ${this.price}`;
    }

	publishOffer(eventData, _this) {
		const payloadData = {
			"game": `resource:org.acme.biznet.Game#${_this.gameID}`,
			"amount": _this.amount,
			"price": _this.price,
		};

        _this.restClient
		.postQueueTx('publishOffer', payloadData, _this.prosumerID)
		.then(() => {
			logger.info('Submitted PublishOffer tx');
		})
		.catch(errorHandling);
	}
}

class Buyer extends Client {
	constructor(prosumerID, amount, tolerance) {
        super(prosumerID, amount);

        logger.info(`Created buyer with demand ${this.toString()}`);

        this.tolerance = tolerance;
		this.bidAmounts = [];
		this.eventMap = {
			'GameInitEvent': this.publishDemand,
			'BuyBidEvent': this.playInGame
		};
    }

    toString() {
        return `amount: ${this.amount}`;
    }
    
	publishDemand(eventData, _this) {
		const payloadData = {
			"game": `resource:org.acme.biznet.Game#${_this.gameID}`,
			"amount": _this.amount
		};

        _this.restClient
		.postQueueTx('publishDemand', payloadData, _this.prosumerID)
		.then(() => {
			logger.info('Submitted PublishDemand tx');
		})
		.catch(errorHandling);
	}

	stopPlaying() {
		const payloadData = {
			"game": `resource:org.acme.biznet.Game#${this.gameID}`,
			"keepPlaying": false
		};

		return this.restClient.postQueueTx('publishBuyBid', payloadData, this.prosumerID);
	}

	publishBuyBid(bidAmounts) {
		const payloadData = {
			"game": `resource:org.acme.biznet.Game#${this.gameID}`,
			"bidAmounts": bidAmounts,
			"keepPlaying": true
		};
	
		return this.restClient.postQueueTx('publishBuyBid', payloadData, this.prosumerID)
	}

    solveLocalOptimization(game, buyerInTurnIndex) {
		const usedCapacities = this.getSellersUsedCapacities(
			game.nrSellers, 
			game.buyBids.map(bid => bid.bidAmounts),
			buyerInTurnIndex);

		const hopDistances = game.hopDistances[buyerInTurnIndex].hops;
		// const hopDistances = JSON.parse("[" + process.env.HOP_DISTANCES + "]");

		logger.silly(`Sellers used capacities: ${usedCapacities}`);
		
		return this.restClient.getOptimizedSolution(
			game.nrSellers,
			game.offersPrices,
			this.amount,
			game.offersAmounts,
			usedCapacities,
			hopDistances
		);
	}

	playInGame(eventData, _this) {
		const buyerInTurn = eventData["buyerInTurn"];
		const buyerInTurnIndex = eventData['buyerInTurnIndex'];
		let game = null;

		if (!buyerInTurn) return;

		// It is not this buyer's turn to play
		if (`resource:org.acme.biznet.Prosumer#${_this.prosumerID}` != buyerInTurn) {
			return;
		}

		logger.info(`Buyer playing in game`);

		_this.restClient.getGame(_this.gameID)
		.then(response => {
			game = response.data;
			return _this.solveLocalOptimization(game, buyerInTurnIndex);
		})
		.then(response => {
			const solution = response.data.solution;
			if (!solution) throw new Error('Undefined optimization solution')
			
			logger.verbose(`Optimized solution for demand of ${_this.amount}: ${solution}`);

			const previousSolution = game.buyBids[buyerInTurnIndex];

			logger.verbose(`Previus solution: ${previousSolution}`);

			if(!previousSolution || _this.allClose(previousSolution, solution, _this.tolerance)) {
				// PublishBuyBid for new bid
				return _this.publishBuyBid(solution);
			} else {
				// PublishBuyBid for not keeping playing
				return _this.stopPlaying();
			}

		})
		.catch(errorHandling);
	}
	
	/**
	 * buyBids has structure [{"bidAmounts": []}, {"bidAmounts": []}]
	 */
	getSellersUsedCapacities(nrSellers, buyBids, excludedBuyerIdx) {
		let usedCapacities = Array.from(Array(nrSellers), () => 0 );

		for (let i=0; i<buyBids.length; i++) {
			// Exclude the current buyer from accumulating used capacities by seller 
			if (i != excludedBuyerIdx) {
				for (let j=0; j<nrSellers; j++) {
					usedCapacities[j] += buyBids[i][j];
				}
			}
		}

		return usedCapacities;
	}

	/**
	* Checks if two arrays are element-wise in a absolute difference within some tolerance
	*/
	allClose(arr1, arr2, tolerance) {
		if ((arr1 == undefined) || (arr2 == undefined) || (arr1.length != arr2.length)) return false;

		for (var i = 0; i < arr1.length; i++) {
			if (Math.abs(arr1[i] - arr2[i]) > tolerance) return false;
		}

		return true;
	}
}

function errorHandling(error) {
	if (!error.response) {
		logger.error(error);
	} else if (!error.response.data) {
		logger.error(error.response);
	} else {
		logger.error(error.response.data);
	}
}

module.exports.SellerClient = Seller;
module.exports.BuyerClient = Buyer;
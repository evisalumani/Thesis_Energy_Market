'use strict';
/**
 * Transction processor functions
 */

const NAMESPACE = 'org.acme.biznet';
const GAME = 'Game';
const PROSUMER = 'Prosumer';
const BUY_BID = 'BuyBid';
const ENERGY_DELIVERY_MONITOR = 'EnergyDeliveryMonitor';
const ENERGY_TRANSFER = 'EnergyTransfer';

const EVENT_GAME_INIT = 'GameInitEvent';
const EVENT_BUY_BID = 'BuyBidEvent';
const EVENT_GAME_STOP = 'GameStopEvent';
const EVENT_TRANSFER_FULFILLED = 'TransferFulfilledEvent';
const GRID_SELL_PRICE = 0.2869;
const GRID_BUY_PRICE = 0.1231;

/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.PublishGame} publishGameTx The sample transaction instance.
 * @transaction
 */
async function onPublishGame(publishGameTx) {  // eslint-disable-line no-unused-vars
	const txTimestamp = publishGameTx.timestamp;
    const registrationDurationMs = publishGameTx.registrationDurationMs;

    if (registrationDurationMs <= 0) {
        return Promise.reject('Registration duration must be non-negative');
    }
    const factory = getFactory();
    const dateString = txTimestamp.toISOString().split('T')[0]; // or (new Date(txTimestamp.getTime())).toISOString().split('T')[0]

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);

    // TODO: choice of game ID

    let game = factory.newResource(NAMESPACE, GAME, `Game-${dateString}`);
    game.registrationStartTimestamp = txTimestamp;
    game.registrationDurationMs = registrationDurationMs;
    game.participants = [];
    game.sellers = [];
  	game.buyersOrdered = [];
  
  
    game.offersAmounts = [];
    game.offersPrices = [];
    game.demands = [];
    game.buyersKeepPlaying = [];
    game.buyersPlayedCurrentRound = [];
    game.buyersKeepPlayingPrevious = [];

    game.buyBids = [];

    await gameRegistry.add(game);

    let event = factory.newEvent(NAMESPACE, EVENT_GAME_INIT);
    event.game = game; // It is published as a relationship, i.e. "resource:org.acme.biznet.Game#Game-2018-09-25"
    event.gameID = game.$identifier;
    emit(event);

    return game.$identifier;
}


// PublishOffer
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.PublishOffer} publishOfferTx The sample transaction instance.
 * @transaction
 */
async function onPublishOffer(publishOfferTx) {
    const txTimestamp = publishOfferTx.timestamp;
    const gameRef = publishOfferTx.game;
    const prosumerRef = publishOfferTx.initiator;
    const amount = publishOfferTx.amount;
    const price = publishOfferTx.price; 

     // Only positive netEnergy (for sellers) or negative (for sellers) allowed
    if (amount <= 0 || price <= 0) {
        return Promise.reject("Amount and price must be non-zero");
    }

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    let game = await gameRegistry.get(gameRef.$identifier); // can throw

    // Check if the submitted tx is within the game registration window
    const gameTimestamp = game.registrationStartTimestamp;
    const txTimestampMs = txTimestamp.getTime();
    const gameTimestampMs = gameTimestamp.getTime();

    if (!game.acceptsRegistrations || (txTimestampMs <= gameTimestampMs || (txTimestampMs - gameTimestampMs) > game.registrationDurationMs)) {
        return Promise.reject("Tx submitted outside of game registration window");
    }

    // Check if prosumer is a participant in the registry
    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);
    const prosumer = await prosumerRegistry.get(prosumerRef.$identifier); // can throw
    
    // Check if a prosumer is already registered in the game
    const prosumerIdx = indexOfResourceInArray(prosumerRef, game.participants);
    if (prosumerIdx != -1) {
        return Promise.reject(`Prosumer ${prosumerRef} is already registered in the game`);
    }

    const sellerIdx = indexOfResourceInArray(prosumerRef, game.sellers);
    if (sellerIdx != -1) {
        return Promise.reject(`Prosumer ${prosumerRef} has already submitted an offer in the game`);
    }

    // Create offer
    // First-come first-served ordering of sellers
    game.offersAmounts.push(amount);
    game.offersPrices.push(price);
    game.participants.push(prosumerRef);
    game.sellers.push(prosumerRef); 
    game.nrSellers = game.nrSellers + 1;

    await gameRegistry.update(game);
}

// PublishDemand
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.PublishDemand} publishDemandTx The sample transaction instance.
 * @transaction
 */
async function onPublishDemand(publishDemandTx) {
    const txTimestamp = publishDemandTx.timestamp;
    const gameRef = publishDemandTx.game;
    const prosumerRef = publishDemandTx.initiator;
    const amount = publishDemandTx.amount;

     // Only positive netEnergy (for sellers) or negative (for sellers) allowed
    if (amount <= 0) {
        return Promise.reject("Amount must be non-negative");
    }

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    let game = await gameRegistry.get(gameRef.$identifier); // can throw

    // Check if the submitted tx is within the game registration window
    const gameTimestamp = game.registrationStartTimestamp;
    const txTimestampMs = txTimestamp.getTime();
    const gameTimestampMs = gameTimestamp.getTime();

    if (!game.acceptsRegistrations || (txTimestampMs <= gameTimestampMs || (txTimestampMs - gameTimestampMs) > game.registrationDurationMs)) {
        return Promise.reject("Tx submitted outside of game registration window");
    }
    
    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);
    const prosumer = await prosumerRegistry.get(prosumerRef.$identifier); // can throw

    // Check if a prosumer is already registered in the game
    const prosumerIdx = indexOfResourceInArray(prosumerRef, game.participants);
    if (prosumerIdx != -1) {
        return Promise.reject(`Prosumer ${prosumerRef} is already registered in the game`);
    }

    const buyerIdx = indexOfResourceInArray(prosumerRef, game.buyersOrdered);
    if (buyerIdx != -1) {
        return Promise.reject(`Prosumer ${prosumerRef} has already submitted a demand in the game`);
    }

    // Create demand
    const nrBuyers = game.nrBuyers;
    let buyerAdded = false;

    // Sort buyers asceding based on their contribution metric
    for (let idx = 0; idx < nrBuyers; idx ++) {
        const currentBuyerRef = game.buyersOrdered[idx];
        const currentBuyer = await prosumerRegistry.get(currentBuyerRef.$identifier);

        let insertAt = -1;
        if (prosumer.contributionMetric > currentBuyer.contributionMetric) {
             // Prepend before this buyer
            insertAt = idx;
        } else if (prosumer.contributionMetric == currentBuyer.contributionMetric && idx != nrBuyers - 1) {
            // Append after this buyer 
            insertAt = idx + 1;
        }

        if (insertAt != -1) {
            game.buyersOrdered.splice(insertAt, 0, prosumerRef);
            game.demands.splice(insertAt, 0, amount);

            // Update boolean variable
            buyerAdded = true;
            break;
        }
    }

    if (!buyerAdded) {
        // Append to the end of list 
        game.buyersOrdered.push(prosumerRef);
        game.demands.push(amount);
        buyerAdded = true;
    }

    game.participants.push(prosumerRef);
    game.nrBuyers = game.nrBuyers + 1;


    // Validation step
    if (game.participants.length != game.nrBuyers + game.nrSellers) {
        return Promise.reject("Mismatch between the number of offers and demands and the number of participants");
    }

    if (game.demands.length != game.nrBuyers ||
        game.buyersOrdered.length != game.nrBuyers) {
        return Promise.reject("Mismatch between the number of buyers in various arrays");
    }
    
    // Update the game
    await gameRegistry.update(game);
}

// StopGameRegistration
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.StopGameRegistration} stopRegistrationTx The sample transaction instance.
 * @transaction
 */
async function onStopGameRegistration(stopRegistrationTx) {
    const gameRef = stopRegistrationTx.game;
    const factory = getFactory();
    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    
    let game = await gameRegistry.get(gameRef.$identifier); // can throw
    game.acceptsRegistrations = false;
    const nrBuyers = game.nrBuyers;

    if (nrBuyers == 0 || game.buyersOrdered == undefined || game.buyersOrdered.length == 0) {
        return Promise.reject("No buyers in this game");
        // TODO: just sell to the grid ?
    }

    game.buyersKeepPlaying = Array.from(Array(nrBuyers), function() { return true; });
    game.buyersKeepPlayingPrevious = Array.from(Array(nrBuyers), function() { return false; });
    game.buyersPlayedCurrentRound = Array.from(Array(nrBuyers), function() { return false; });
  	await gameRegistry.update(game);

  	// Announce 1st BuyBidEvent
    let buyBidEvent = factory.newEvent(NAMESPACE, EVENT_BUY_BID);
    // Even if we use: stopRegistrationTx.game; the game is still unresolved
    buyBidEvent.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
    buyBidEvent.buyerInTurn = game.buyersOrdered[0]; // 1st buyer has the turn to play; the game just started
    buyBidEvent.buyerInTurnIndex = 0;
    emit(buyBidEvent);
}

// PublishBuyBid
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.PublishBuyBid} buyBidTx The sample transaction instance.
 * @transaction
 */
async function onPublishBuyBid(buyBidTx) {
    let gameRef = buyBidTx.game;
    let initiator = buyBidTx.initiator;
    let keepPlaying = buyBidTx.keepPlaying;
    let bidAmounts = buyBidTx.bidAmounts; // optional
    let factory = getFactory();

    let gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    let game = await gameRegistry.get(gameRef.$identifier); // can throw

    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);
    const prosumer = await prosumerRegistry.get(initiator.$identifier); // can throw

    let idx = indexOfResourceInArray(initiator, game.buyersOrdered);

    if (idx == -1) {
        return Promise.reject("Buyer is not registered in the game");
    }

    if (game.buyersPlayedCurrentRound[idx]) {
        return Promise.reject("Buyer has already submitted a bid for this game round");
    }

    let buyerInTurnIdx = game.buyersPlayedCurrentRound.indexOf(false);
    buyerInTurnIdx = buyerInTurnIdx == -1 ? 0 : buyerInTurnIdx;

    if (idx != buyerInTurnIdx) {
        return Promise.reject("It is not this buyer's turn to play");
    }

    if (!keepPlaying) {
        game.buyersKeepPlaying[idx] = false; 
        // Buyer participated in this round (even though just to indicate finish playing)
        game.buyersPlayedCurrentRound[idx] = true; 

        // If the buyer stops playing without having had a previous bid
        // Add a dummy bid, in order for the array lengths to be consistent
        // Otherwise, no need to modify the buyBids
        if (game.buyBids.length == 0 || (game.buyBids.length != 0 && idx >= game.buyBids.length)) {
            const emptyBid = factory.newConcept(NAMESPACE, BUY_BID);
            emptyBid.bidAmounts = Array.from(Array(game.nrSellers), function() { return 0; });
            game.buyBids.push(emptyBid);
        }
    } else {
        if (bidAmounts == undefined) {
            return Promise.reject("Buyer is playing but did not specify a bid");
        }
        if (bidAmounts.length != game.nrSellers) {
            return Promise.reject("Mismatch between number of bid amounts and number of sellers");
        }

        // TODO: Validation if buyer's demand or seller's capacity is exceeded
        // const totalBidAmounts = bidAmounts.reduce((amout1, amount2) => amout1 + amount2, 0);
        // if (totalBidAmounts > game.demands[idx]) {
        //     return Promise.reject("Buyer bid more than the announced demand");
        // }

        if (idx < game.buyBids.length) {
            // Buyer has already submitted a bid from a previous round 
            // Update existing bid amounts
            game.buyBids[idx].bidAmounts = bidAmounts;
        } else {
            // Create bid
            const bid = factory.newConcept(NAMESPACE, BUY_BID);
            bid.bidAmounts = bidAmounts;
            
            // Insert bid in position
            game.buyBids.splice(idx, 0, bid);
        }

        game.buyersKeepPlaying[idx] = true;
        game.buyersPlayedCurrentRound[idx] = true;

    }

    await gameRegistry.update(game);

    // Find next player to play
    let nextBuyerIndex = idx + 1;
    let nrBuyers = game.nrBuyers;
    // If current buyer is the last to play (for any round)
    if (idx + 1 == nrBuyers) {
        // Check if all stopped playing 
        let gameFinishedEvent;
        let transferRegistry = await getAssetRegistry(NAMESPACE + '.' + ENERGY_TRANSFER);
        let monitorRegistry = await getAssetRegistry(NAMESPACE + '.' + ENERGY_DELIVERY_MONITOR);

        // TODO: update game.keepPlaying to all false
        if (allFalse(game.buyersKeepPlaying)) {
            gameFinishedEvent = factory.newEvent(NAMESPACE, EVENT_GAME_STOP);
            gameFinishedEvent.totalNrRounds = game.nrRounds;
            emit(gameFinishedEvent);

            await createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry);
            return;
        } 

        // Check if the game is stuck on a vicious circle between two buyers
        if (isViciousCircle(game.buyersKeepPlaying, game.buyersKeepPlayingPrevious)) { 
            gameFinishedEvent = factory.newEvent(NAMESPACE, EVENT_GAME_STOP);
            gameFinishedEvent.totalNrRounds = game.nrRounds;
            emit(gameFinishedEvent);

            await createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry);
            return;
        }

        // Initiate a new round
        game.nrRounds = game.nrRounds + 1; // Increment the round counter
        game.buyersKeepPlayingPrevious = game.buyersKeepPlaying.slice(); // Copy contents
        game.buyersKeepPlaying = Array.from(Array(nrBuyers), function() { return true; });
        game.buyersPlayedCurrentRound = Array.from(Array(nrBuyers), function() { return false; });


        // Update nextBuyerIndex
        // Start again from the 1st buyer in a new game round
        nextBuyerIndex = 0;
    }

    await gameRegistry.update(game);

    // Emit event to notify next buyer
    var buyBidEvent = factory.newEvent(NAMESPACE, EVENT_BUY_BID);
    buyBidEvent.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
    buyBidEvent.buyerInTurn = game.buyersOrdered[nextBuyerIndex]; 
    buyBidEvent.buyerInTurnIndex = nextBuyerIndex;
    emit(buyBidEvent);

    let testEvent = factory.newEvent(NAMESPACE, 'TestEvent');
    testEvent.message = `Buyer ${idx} played; keepPlaying: ${game.buyersKeepPlaying}`;
    emit(testEvent);
}

// PublishMeterReading
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.PublishMeterReading} meterReadingTx The sample transaction instance.
 * @transaction
 */
async function onPublishMeterReading(meterReadingTx) {
    const inEnergy = meterReadingTx.inEnergy;
    const outEnergy = meterReadingTx.outEnergy;
    const gameRef = meterReadingTx.game;
    const prosumerRef = meterReadingTx.initiator;

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    const game = await gameRegistry.get(gameRef.$identifier);

    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);
    const prosumer = await prosumerRegistry.get(prosumerRef.$identifier);

    // Check if prosumer is a buyer or seller in the game
    const sellerIdx = indexOfResourceInArray(prosumerRef, game.sellers);
    const buyerIdx = indexOfResourceInArray(prosumerRef, game.buyersOrdered);

    if (sellerIdx == -1 && buyerIdx == -1) {
        return Promise.reject("Prosumer is not registered in the game");
    }

    const monitors = await query('selectEnergyDeliveryMonitorByGame', {"game": game});
    if (monitors.length != 1) {
        return Promise.reject("No or more than one EnergyDeliveryMonitor created for this game");
    }

    let monitor = monitors[0];

    // Update total production, consumption and contribution metric for prosumer
    prosumer.totalProduction = prosumer.totalProduction + outEnergy;
    prosumer.totalConsumption = prosumer.totalConsumption + inEnergy;
    prosumer.contributionMetric = prosumer.totalConsumption == 0 ? 0 : prosumer.totalProduction / prosumer.totalConsumption;
    await prosumerRegistry.update(prosumer);
    
    const isSeller = sellerIdx == -1 ? true : false; 

    // Update in and out energy monitored
    if (isSeller) {
        // Prosumer is a seller
        monitor.totalInBySeller[sellerIdx] = monitor.totalInBySeller[sellerIdx] + inEnergy;
        monitor.totalOutBySeller[sellerIdx] = monitor.totalOutBySeller[sellerIdx] + outEnergy;
    } else {
        // Prosumer is a buyer
        monitor.totalInByBuyer[buyerIdx] = monitor.totalInByBuyer[buyerIdx] + inEnergy;
        monitor.totalOutByBuyer[buyerIdx] = monitor.totalOutByBuyer[buyerIdx] + outEnergy;
    }
    
    const nrPending = monitor.pendingEnergyTransfers.length;

    // Check if any pending energy transfer can be cleared
    for (let i = nrPending - 1; i >= 0; i--) {
        let transfer = monitor.pendingEnergyTransfers[i];

        if (transfer.from.$identifier == prosumer.$identifier || transfer.to.$identifier == prosumer.$identifier) {
            const _sellerIdx = indexOfResourceInArray(transfer.from, game.sellers);
            const _buyerIdx = indexOfResourceInArray(transfer.to, game.buyersOrdered);

            if (monitor.totalOutBySeller[_sellerIdx] >= transfer.amount && monitor.totalInByBuyer[_buyerIdx] >= transfer.amount) {
                const seller = await prosumerRegistry.get(transfer.from.$identifier);
                const buyer = await prosumerRegistry.get(transfer.to.$identifier);

                // Handle payment
                buyer.frozenFunds = buyer.frozenFunds - transfer.cost;
                buyer.accountBalance = buyer.accountBalance - transfer.cost;
                seller.accountBalance = seller.accountBalance + transfer.cost;

                // Update registry
                prosumerRegistry.update(seller);
                prosumerRegistry.update(buyer);

                transfer.isFulfilled = true;
                await transferRegistry.update(transfer); // Update registry

                // Update in and out energy monitored
                monitor.totalOutBySeller[_sellerIdx] = monitor.totalOutBySeller[_sellerIdx] - transfer.amount;
                monitor.totalInByBuyer[_buyerIdx] = monitor.totalInByBuyer[_buyerIdx] - transfer.amount;

                // Remove transfer from pending
                monitor.pendingEnergyTransfers.splice(i, 1);
            }
        }
    }

    // Update registry
    await monitorRegistry.update(monitor);    
}


// CloseMarket
/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.CloseMarket} closeMarketTx The sample transaction instance.
 * @transaction
 */
async function onCloseMarket(closeMarketTx) {
    const gameRef = meterReadingTx.game;

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    const game = await gameRegistry.get(gameRef.$identifier);

    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);

    const monitors = await query('selectEnergyDeliveryMonitorByGame', {"game": game});
    if (monitors.length != 1) {
        return Promise.reject("No or more than one EnergyDeliveryMonitor created for this game");
    }

    let monitor = monitors[0];

    // Clear up pending energy transfers from the game
    const nrPending = monitor.pendingEnergyTransfers.length;

    for (let i=0; i < nrPending - 1; i++) {
        // Unfreeze funds 
        let transfer = monitor.pendingEnergyTransfers[i];
        const buyer = await prosumerRegistry.get(transfer.to.$identifier);

        buyer.frozenFunds = buyer.frozenFunds - transfer.cost;
        await prosumerRegistry.update(buyer);

        // Future work: Handle penalties
    }

    // Handle non-game payments (from the prosumer's perspective) at the grid's prices
    for (let buyerIdx=0; buyerIdx<game.nrBuyers; buyerIdx++) {
        // Negative netFund indicates costs; positive netFund indicates revenue
        const netFund = monitor.totalOutByBuyer[buyerIdx] * GRID_BUY_PRICE - monitor.totalInByBuyer[buyerIdx] * GRID_SELL_PRICE;

        const buyer = await prosumerRegistry.get(game.buyersOrdered[buyerIdx].$identifier);
        buyer.accountBalance = buyer.accountBalance + netFund;

        await prosumerRegistry.update(buyer);
    }

    for (let sellerIdx=0; sellerIdx<game.nrSellers; sellerIdx++) {
        // Negative netFund indicates costs; positive netFund indicates revenue
        const netFund = monitor.totalOutBySeller[sellerIdx] * GRID_BUY_PRICE - monitor.totalInBySeller[sellerIdx] * GRID_SELL_PRICE;

        const seller = await prosumerRegistry.get(game.sellers[sellerIdx].$identifier);
        seller.accountBalance = seller.accountBalance + netFund;

        await prosumerRegistry.update(seller);
    }
}


/**
 * Helper functions
 */
function indexOfResourceInArray(resource, array) {
    // Resource identifier
    var id = resource.$identifier;

    for (var i=0; i<array.length; i++) {
        var resourceAtIndex = array[i];
        if (id == resourceAtIndex.$identifier) return i;
    }

    // Not found
    return -1;
}

function allFalse(array) {
    return array.every(function(element) { return element === false; })
}

/*
* A dummy way to check for vicious circles in the game, when two players are dependent on each other's decisions
*/
function isViciousCircle(keepPlaying, keepPlayingPrevious) {
    let nrKeepPlaying = 0;
    if (keepPlaying == undefined || keepPlayingPrevious == undefined) return false;

    if (keepPlaying.length !=  keepPlayingPrevious.length) return false;

    // TODO: 
    for (let i=0; i<keepPlaying.length; i++) {
        if (keepPlaying[i] && keepPlayingPrevious[i]) nrKeepPlaying ++;
        if (nrKeepPlaying > 2) return false;
    }

    return nrKeepPlaying == 2;
}

async function createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry) {
    let monitor = factory.newResource(NAMESPACE, ENERGY_DELIVERY_MONITOR, `Monitor.${game.$identifier}`);
    monitor.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
    monitor.totalInByBuyer = Array.from(Array(game.nrBuyers), () => 0 );
    monitor.totalOutByBuyer = Array.from(Array(game.nrBuyers), () => 0 );
    monitor.totalInBySeller = Array.from(Array(game.nrSellers), () => 0 );
    monitor.totalOutBySeller = Array.from(Array(game.nrSellers), () => 0 );
    monitor.pendingEnergyTransfers = [];

    for (let i=0; i<game.nrBuyers; i++) {
        for (let j=0; j<game.nrSellers; j++) {
            let transfer = factory.newResource(NAMESPACE, ENERGY_TRANSFER, `EnergyTransfer.${game.$identifier}.${uuidv4()}`);
            transfer.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
            const seller = game.sellers[j];
            const buyer = game.buyersOrdered[i];
            transfer.from = factory.newRelationship(NAMESPACE, PROSUMER, seller.$identifier);
            transfer.to = factory.newRelationship(NAMESPACE, PROSUMER, buyer.$identifier);
            transfer.amount = game.buyBids[i].bidAmounts[j];
            // TODO: Update cost

            // TODO: freeze fund
            transfer.cost = 10; 

            await transferRegistry.add(transfer);
            monitor.pendingEnergyTransfers.push(transfer);
        }
    }

    await monitorRegistry.add(monitor);
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
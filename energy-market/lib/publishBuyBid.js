'use strict';

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

            await createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry, prosumerRegistry);
            return;
        } 

        // Check if the game is stuck on a vicious circle between two buyers
        if (isViciousCircle(game.buyersKeepPlaying, game.buyersKeepPlayingPrevious)) { 
            gameFinishedEvent = factory.newEvent(NAMESPACE, EVENT_GAME_STOP);
            gameFinishedEvent.totalNrRounds = game.nrRounds;
            emit(gameFinishedEvent);

            await createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry, prosumerRegistry);
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
* A simple way to check for vicious circles in the game, when two players are dependent on each other's decisions
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

async function createEnergyDeliveryMonitor(game, factory, transferRegistry, monitorRegistry, prosumerRegistry) {
    let monitor = factory.newResource(NAMESPACE, ENERGY_DELIVERY_MONITOR, `Monitor.${game.$identifier}`);
    monitor.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
    monitor.totalInByBuyer = Array.from(Array(game.nrBuyers), () => 0 );
    monitor.totalOutByBuyer = Array.from(Array(game.nrBuyers), () => 0 );
    monitor.totalInBySeller = Array.from(Array(game.nrSellers), () => 0 );
    monitor.totalOutBySeller = Array.from(Array(game.nrSellers), () => 0 );
    monitor.pendingEnergyTransfers = [];

    const sellersLoad = getSellersLoad(game);

    for (let i=0; i<game.nrBuyers; i++) {
        let buyerRef = game.buyersOrdered[i];
        let buyer = await prosumerRegistry.get(buyerRef.$identifier); 

        for (let j=0; j<game.nrSellers; j++) {
            let transfer = factory.newResource(NAMESPACE, ENERGY_TRANSFER, `EnergyTransfer.${game.$identifier}.${uuidv4()}`);
            transfer.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
            const seller = game.sellers[j];
            transfer.from = factory.newRelationship(NAMESPACE, PROSUMER, seller.$identifier);
            transfer.to = factory.newRelationship(NAMESPACE, PROSUMER, buyer.$identifier);
            transfer.amount = game.buyBids[i].bidAmounts[j];
            
            // Calculate cost (based on seller's price, load and transmission cost)
            const cost = transfer.amount * (game.offersPrices[j] * sellersLoad[j] + TRANSMISSION_COST_PER_HOP * game.hopDistances[i].hops[j]); 
            transfer.cost = cost;

            await transferRegistry.add(transfer);
            monitor.pendingEnergyTransfers.push(transfer);

            // Freeze funds on buyer's account
            buyer.frozenFunds = buyer.frozenFunds + cost;
        }

        // Update regsitry for prosumer's frozen funds
        await prosumerRegistry.update(buyer);
    }

    await monitorRegistry.add(monitor);
}

function getSellersUsedCapacities(game) {
    const nrSellers = game.nrSellers;
    const buyBids = game.buyBids;
    
    let usedCapacities = Array.from(Array(nrSellers), () => 0 );

    for (let i=0; i<buyBids.length; i++) {
        // Exclude the current buyer from accumulating used capacities by seller 
        for (let j=0; j<nrSellers; j++) {
            usedCapacities[j] += buyBids[i].bidAmounts[j];
        }
    }

    return usedCapacities;
}

function getSellersLoad(game) {
    const offeredCapacities = game.offersAmounts;
    const usedCapacities = getSellersUsedCapacities(game);

    let sellersLoad = [];
    for (let i=0; i<game.nrSellers; i++) {
        sellersLoad[i] = 1 + usedCapacities[i] / offeredCapacities[i];
    }

    return sellersLoad;
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
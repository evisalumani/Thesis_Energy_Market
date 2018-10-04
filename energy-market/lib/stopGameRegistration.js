'use strict';

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
        return Promise.reject("No buyers in this game"); // Only buy from / sell to grid
    }

    game.buyersKeepPlaying = Array.from(Array(nrBuyers), function() { return true; });
    game.buyersKeepPlayingPrevious = Array.from(Array(nrBuyers), function() { return false; });
    game.buyersPlayedCurrentRound = Array.from(Array(nrBuyers), function() { return false; });

    /**
     * Get the hop distances between buyers and sellers
     * Here random generation, but in a real scenario such information should be added to the blockchain by e.g. a network admin
     */

    for (let i=0; i<game.nrBuyers; i++) {
        const hopDistancesByBuyer = factory.newConcept(NAMESPACE, DISTANCE_VECTOR);
        hopDistancesByBuyer.hops = getHopDistances(game.nrSellers);
        game.hopDistances.push(hopDistancesByBuyer);
    }
    
  	await gameRegistry.update(game);

  	// Announce 1st BuyBidEvent
    let buyBidEvent = factory.newEvent(NAMESPACE, EVENT_BUY_BID);
    // Even if we use: stopRegistrationTx.game; the game is still unresolved
    buyBidEvent.game = factory.newRelationship(NAMESPACE, GAME, game.$identifier);
    buyBidEvent.buyerInTurn = game.buyersOrdered[0]; // 1st buyer has the turn to play; the game just started
    buyBidEvent.buyerInTurnIndex = 0;
    emit(buyBidEvent);
}

/**
 * Generate random hop distances
 */
function getHopDistances(nrSellers) {
    let hops = [];
    for (let i = 0; i < nrSellers; i++) {
        hops.push(randomInRange(1, nrSellers));
    }

    return hops;
}

function randomInRange(lowerIncl, upperIncl) {
    const factor = upperIncl - lowerIncl + 1;
    return Math.floor(Math.random() * factor) + lowerIncl;
}
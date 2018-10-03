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
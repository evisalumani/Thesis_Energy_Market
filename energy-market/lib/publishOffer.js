'use strict';

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
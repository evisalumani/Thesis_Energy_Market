'use strict';

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
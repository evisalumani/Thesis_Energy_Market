'use strict';

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
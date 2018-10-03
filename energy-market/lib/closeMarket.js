'use strict';

/**
 * Sample transaction processor function.
 * @param {org.acme.biznet.CloseMarket} closeMarketTx The sample transaction instance.
 * @transaction
 */
async function onCloseMarket(closeMarketTx) {
    const gameRef = closeMarketTx.game;

    const gameRegistry = await getAssetRegistry(NAMESPACE + '.' + GAME);
    const game = await gameRegistry.get(gameRef.$identifier);

    const prosumerRegistry = await getParticipantRegistry(NAMESPACE + '.' + PROSUMER);

    const monitors = await query('selectEnergyDeliveryMonitorByGame', {game: gameRef.toURI()});
    if (monitors.length != 1) {
        return Promise.reject("No or more than one EnergyDeliveryMonitor created for this game");
    }

    let monitor = monitors[0];

    // Clear up pending energy transfers from the game
    const nrPending = monitor.pendingEnergyTransfers.length;
    let transferRegistry = await getAssetRegistry(NAMESPACE + '.' + ENERGY_TRANSFER);

    for (let i=0; i < nrPending - 1; i++) {
        // Unfreeze funds 
        let transferRef = monitor.pendingEnergyTransfers[i]; // A reference
        let transfer = await transferRegistry.get(transferRef.$identifier); // A resource
        
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
'use strict';

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
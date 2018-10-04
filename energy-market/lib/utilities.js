const NAMESPACE = 'org.acme.biznet';
const GAME = 'Game';
const PROSUMER = 'Prosumer';
const BUY_BID = 'BuyBid';
const DISTANCE_VECTOR = 'DistanceVector';
const ENERGY_DELIVERY_MONITOR = 'EnergyDeliveryMonitor';
const ENERGY_TRANSFER = 'EnergyTransfer';

const EVENT_GAME_INIT = 'GameInitEvent';
const EVENT_BUY_BID = 'BuyBidEvent';
const EVENT_GAME_STOP = 'GameStopEvent';
const EVENT_TRANSFER_FULFILLED = 'TransferFulfilledEvent';
const GRID_SELL_PRICE = 0.2869;
const GRID_BUY_PRICE = 0.1231;
const TRANSMISSION_COST_PER_HOP = 0.02;

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
/*
* S001 to S004 are sellers, S004 being the grid
* P001 to P007 are buyers
*/

// For integers
function randomInRange(lowerIncl, upperIncl) {
    const factor = upperIncl - lowerIncl + 1;
    return Math.floor(Math.random() * factor) + lowerIncl;
}

function randomInRangeDecimal(lowerIncl, upperIncl) {
    const factor = upperIncl - lowerIncl;
    
    /** For rounding up */
    // const nrDecimals = 3;
    // const nrStr = (Math.random() * factor + lowerIncl).toFixed(nrDecimals);
    // return parseFloat(nrStr);
    return Math.random() * factor + lowerIncl;
}

function sellerAmount() {
    return randomInRange(supplyLower, supplyUpper);
}

function buyerDemand() {
    return randomInRange(demandLower, demandHigher);
}

function sellerPrice() {
    return randomInRangeDecimal(priceLow, priceHigh);
}

function hopDistance() {
    let hops = [];
    for (let i = 0; i < nrSellers; i++) {
        hops.push(randomInRange(1, nrSellers));
    }

    return hops;
}

const supplyLower = 10;
const supplyUpper = 100;
const demandLower = 10;
const demandHigher = 50;

const priceLow = 0.05;
const priceHigh = 0.09;
const priceGrid = 0.14;

const nrSellers = 4; // Including grid

demoData = [
    // Sellers
    {
        "PROSUMER_ID": "S001",
        "NET_ENERGY": sellerAmount(),
        "IS_SELLER": true,
        "SUPPLY_PRICE": sellerPrice()
    },
    {
        "PROSUMER_ID": "S002",
        "NET_ENERGY": sellerAmount(),
        "IS_SELLER": true,
        "SUPPLY_PRICE": sellerPrice()
    },
    {
        "PROSUMER_ID": "S003",
        "NET_ENERGY": sellerAmount(),
        "IS_SELLER": true,
        "SUPPLY_PRICE": sellerPrice()
    },
    {
        "PROSUMER_ID": "S004",
        "NET_ENERGY": 7*demandHigher,
        "IS_SELLER": true,
        "SUPPLY_PRICE": priceGrid
    },

    // Buyers
    {
        "PROSUMER_ID": "P001",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P002",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P003",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P004",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P005",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P006",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
    {
        "PROSUMER_ID": "P007",
        "NET_ENERGY": buyerDemand(),
        "IS_SELLER": false,
        "SUPPLY_PRICE": undefined,
        "HOP_DISTANCES": hopDistance()
    },
]

module.exports = demoData;
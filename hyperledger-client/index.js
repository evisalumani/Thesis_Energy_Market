// process.env.HOP_DISTANCES

const SellerClient = require('./client').SellerClient;
const BuyerClient = require('./client').BuyerClient;

function clientSetup() {
    const isSeller = (process.env.IS_SELLER === 'true');
    if (isSeller) {
        client = new SellerClient(process.env.PROSUMER_ID, parseInt(process.env.NET_ENERGY), process.env.SUPPLY_PRICE);
    } else {
        client = new BuyerClient(process.env.PROSUMER_ID, parseInt(process.env.NET_ENERGY), 0.25);
    }
}
module.exports.clientSetup = clientSetup;
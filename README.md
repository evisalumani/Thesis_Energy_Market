#### Decentralized Energy Trading in Microgrids through Blockchain and Smart Contracts

##### Setup

* [Install Hyperledger prerequisites](https://hyperledger.github.io/composer/latest/installing/installing-prereqs)
* [Install Hyperledger dev environment (v0.20.0)](https://hyperledger.github.io/composer/latest/installing/development-tools)
* Install Python numpy and scipy, e.g. via the Anaconda distribution
* In the folders /hyperledger-client, /market-clock and /tx-queue run `npm install`. In the folder /energy-market, run `npm install --python=python2.7`.


##### Run

* [Deploy the chaincode (Step Four)](https://hyperledger.github.io/composer/latest/tutorials/developer-tutorial)
* Start the Hyperledger Composer REST server: `composer-rest-server -c admin@energy-market -n never -w true`
* Start the transaction queue in /tx-queue: `npm start`
* Start the optimization API in /optimization-api: `python app.py`
* (Optional) Start the Hyperledger Playground for visualization: `composer-playgroung`

##### Demo
* Clear any data in the blockchain: `composer network reset -c admin@energy-market`
* Add some dummy data for participanting prosumers (in /demo folder): `node mockData.js`
* Start the market clock (in /market-clock folder): `npm start`
* Start a cluster of Node.js processes representing prosumers' clients (in /demo folder): `npm start`

##### Log Output (Example)

* Terminal of /market-clock
```
MacBook-Pro-4:market-clock evisa$ npm start
[CLOCK] [2018-10-03 00:59:57] info: Created market clock
[CLOCK] [2018-10-03 01:00:07] info: Submit PublishGame tx
[CLOCK] [2018-10-03 01:00:09] info: Game-2018-10-02 published
[CLOCK] [2018-10-03 01:01:09] info: Submit StopGameRegistration tx
[CLOCK] [2018-10-03 01:01:12] info: Game registration stopped
```

* Terminal of /demo
```
MacBook-Pro-4:demo evisa$ npm start 
[S004] [2018-10-03 01:00:07] info: Created seller with offer amount: 350, price: 0.14
[S002] [2018-10-03 01:00:07] info: Created seller with offer amount: 29, price: 0.07842617079456894
[S003] [2018-10-03 01:00:07] info: Created seller with offer amount: 49, price: 0.06658970076544664
[S001] [2018-10-03 01:00:07] info: Created seller with offer amount: 36, price: 0.08376051515357819
[P001] [2018-10-03 01:00:07] info: Created buyer with demand amount: 34
[P002] [2018-10-03 01:00:07] info: Created buyer with demand amount: 47
[P005] [2018-10-03 01:00:07] info: Created buyer with demand amount: 13
[P003] [2018-10-03 01:00:07] info: Created buyer with demand amount: 28
[P006] [2018-10-03 01:00:07] info: Created buyer with demand amount: 31
[P004] [2018-10-03 01:00:07] info: Created buyer with demand amount: 29
[P007] [2018-10-03 01:00:07] info: Created buyer with demand amount: 15
[S004] [2018-10-03 01:00:09] info: Received GameInitEvent
[S003] [2018-10-03 01:00:09] info: Received GameInitEvent
[S002] [2018-10-03 01:00:09] info: Received GameInitEvent
[S001] [2018-10-03 01:00:09] info: Received GameInitEvent
[P002] [2018-10-03 01:00:09] info: Received GameInitEvent
[P001] [2018-10-03 01:00:09] info: Received GameInitEvent
[P005] [2018-10-03 01:00:09] info: Received GameInitEvent
[P003] [2018-10-03 01:00:09] info: Received GameInitEvent
[P004] [2018-10-03 01:00:09] info: Received GameInitEvent
[P006] [2018-10-03 01:00:09] info: Received GameInitEvent
[P007] [2018-10-03 01:00:09] info: Received GameInitEvent
[S004] [2018-10-03 01:00:09] info: Submitted PublishOffer tx
[P003] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P001] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P005] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P004] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P006] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P002] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[P007] [2018-10-03 01:00:09] info: Submitted PublishDemand tx
[S001] [2018-10-03 01:00:09] info: Submitted PublishOffer tx
[S002] [2018-10-03 01:00:09] info: Submitted PublishOffer tx
[S003] [2018-10-03 01:00:09] info: Submitted PublishOffer tx

[P003] [2018-10-03 01:01:12] info: Buyer playing in game
[P003] [2018-10-03 01:01:12] silly: Sellers used capacities: 0,0,0,0
[P003] [2018-10-03 01:01:12] verbose: Optimized solution for demand of 28: 0,10.4618,9.3945,8.1437
[P003] [2018-10-03 01:01:12] verbose: Previus solution: undefined

[P007] [2018-10-03 01:01:14] info: Buyer playing in game
[P007] [2018-10-03 01:01:15] silly: Sellers used capacities: 0,10.4618,9.3945,8.1437
[P007] [2018-10-03 01:01:15] verbose: Optimized solution for demand of 15: 3.9085,3.6502,7.4413,0
[P007] [2018-10-03 01:01:15] verbose: Previus solution: undefined

[P005] [2018-10-03 01:01:17] info: Buyer playing in game
[P005] [2018-10-03 01:01:17] silly: Sellers used capacities: 3.9085,14.112,16.8358,8.1437
[P005] [2018-10-03 01:01:17] verbose: Optimized solution for demand of 13: 3.7738,0,7.3477,1.8785
[P005] [2018-10-03 01:01:17] verbose: Previus solution: undefined

[P002] [2018-10-03 01:01:20] info: Buyer playing in game
[P002] [2018-10-03 01:01:20] silly: Sellers used capacities: 7.6823,14.112,24.1835,10.022200000000002
[P002] [2018-10-03 01:01:20] verbose: Optimized solution for demand of 47: 17.2307,5.799,17.5196,6.4507
[P002] [2018-10-03 01:01:20] verbose: Previus solution: undefined

[P001] [2018-10-03 01:01:22] info: Buyer playing in game
[P001] [2018-10-03 01:01:23] silly: Sellers used capacities: 24.912999999999997,19.911,41.7031,16.472900000000003
[P001] [2018-10-03 01:01:23] verbose: Optimized solution for demand of 34: 25.2765,0.6174,7.2969,0.8092
[P001] [2018-10-03 01:01:23] verbose: Previus solution: undefined

[P006] [2018-10-03 01:01:25] info: Buyer playing in game
[P007] [2018-10-03 01:01:25] info: Received BuyBidEvent
[P006] [2018-10-03 01:01:26] silly: Sellers used capacities: 50.189499999999995,20.5284,49,17.282100000000003
[P006] [2018-10-03 01:01:26] verbose: Optimized solution for demand of 31: 20.7029,0.7158,0,9.5813
[P006] [2018-10-03 01:01:26] verbose: Previus solution: undefined

[P004] [2018-10-03 01:01:28] info: Buyer playing in game
[P004] [2018-10-03 01:01:28] silly: Sellers used capacities: 70.8924,21.244200000000003,49,26.863400000000006
[P004] [2018-10-03 01:01:28] verbose: Optimized solution for demand of 29: 13.4041,13.4593,0,2.1366
[P004] [2018-10-03 01:01:28] verbose: Previus solution: undefined

[P003] [2018-10-03 01:01:31] info: Buyer playing in game
[P003] [2018-10-03 01:01:31] silly: Sellers used capacities: 84.2965,24.2417,39.6055,20.856300000000005
[P003] [2018-10-03 01:01:31] verbose: Optimized solution for demand of 28: 0,10.9076,9.3945,7.6979
[P003] [2018-10-03 01:01:31] verbose: Previus solution: [object Object]

[P007] [2018-10-03 01:01:34] info: Buyer playing in game

[P007] [2018-10-03 01:01:34] silly: Sellers used capacities: 80.388,31.0533,41.5587,29.000000000000007
[P007] [2018-10-03 01:01:34] verbose: Optimized solution for demand of 15: 5.0121,4.9467,5.0412,0
[P007] [2018-10-03 01:01:34] verbose: Previus solution: [object Object]

[P005] [2018-10-03 01:01:36] info: Buyer playing in game
[P005] [2018-10-03 01:01:37] silly: Sellers used capacities: 80.5227,34.703500000000005,41.652300000000004,27.121500000000005
[P005] [2018-10-03 01:01:37] verbose: Optimized solution for demand of 13: 5.653,0,7.347,0
[P005] [2018-10-03 01:01:37] verbose: Previus solution: [object Object]

[P002] [2018-10-03 01:01:39] info: Buyer playing in game
[P002] [2018-10-03 01:01:39] silly: Sellers used capacities: 67.0658,28.9045,31.4804,22.549300000000002
[P002] [2018-10-03 01:01:39] verbose: Optimized solution for demand of 47: 16.7082,7.0955,16.7456,6.4507
[P002] [2018-10-03 01:01:39] verbose: Previus solution: [object Object]

[P001] [2018-10-03 01:01:42] info: Buyer playing in game

[P001] [2018-10-03 01:01:42] silly: Sellers used capacities: 59.019999999999996,34.0861,41.7031,28.190800000000003
[P001] [2018-10-03 01:01:42] verbose: Optimized solution for demand of 34: 23.98,1.9139,7.2969,0.8092
[P001] [2018-10-03 01:01:42] verbose: Previus solution: [object Object]

[P006] [2018-10-03 01:01:44] info: Buyer playing in game

[P006] [2018-10-03 01:01:45] silly: Sellers used capacities: 63.593599999999995,33.987700000000004,49,19.418700000000005
[P006] [2018-10-03 01:01:45] verbose: Optimized solution for demand of 31: 19.4064,2.0123,0,9.5813
[P006] [2018-10-03 01:01:45] verbose: Previus solution: [object Object]

[P004] [2018-10-03 01:01:47] info: Buyer playing in game
[P004] [2018-10-03 01:01:47] silly: Sellers used capacities: 70.8924,21.244200000000003,49,26.863400000000006
[P004] [2018-10-03 01:01:47] verbose: Optimized solution for demand of 29: 13.4041,13.4593,0,2.1366
[P004] [2018-10-03 01:01:47] verbose: Previus solution: [object Object]

[S002] [2018-10-03 01:01:50] info: Received GameStopEvent
[S003] [2018-10-03 01:01:50] info: Received GameStopEvent
[S004] [2018-10-03 01:01:50] info: Received GameStopEvent
[S001] [2018-10-03 01:01:50] info: Received GameStopEvent
[P001] [2018-10-03 01:01:50] info: Received GameStopEvent
[P002] [2018-10-03 01:01:50] info: Received GameStopEvent
[P005] [2018-10-03 01:01:50] info: Received GameStopEvent
[P003] [2018-10-03 01:01:50] info: Received GameStopEvent
[P006] [2018-10-03 01:01:50] info: Received GameStopEvent
[P004] [2018-10-03 01:01:50] info: Received GameStopEvent
[P007] [2018-10-03 01:01:50] info: Received GameStopEvent
```


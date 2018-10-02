'use strict';
const BusinessNetworkConnection = require('../energy-market/node_modules/composer-client').BusinessNetworkConnection;
const NAMESPACE = 'org.acme.biznet';
const PROSUMER = 'Prosumer';

async function handler (argv) {
    try {               
        let bizNetworkConnection = new BusinessNetworkConnection();
        let businessNetworkDefinition = await bizNetworkConnection.connect('admin@energy-market');
        let factory = businessNetworkDefinition.getFactory();
        let prosumerRegistry = await bizNetworkConnection.getParticipantRegistry(NAMESPACE + '.' + PROSUMER);
        await prosumerRegistry.addAll(_getInitialPROSUMERs(factory));
       
        console.log('Mock data inserted');
        process.exit(0);
    } catch(error) {
        console.log(error+ '\nCommand failed.');
        process.exit(1);
    }
};

function _getInitialPROSUMERs(factory) {
    const defaultBalance = 1000;

    // Create sellers
    let s1 = factory.newResource(NAMESPACE, PROSUMER, 'S001');
    s1.accountBalance = defaultBalance,
    s1.contributionMetric = _roundToTwo(Math.random());

    let s2 = factory.newResource(NAMESPACE, PROSUMER, 'S002');
    s2.accountBalance = defaultBalance,
    s2.contributionMetric = _roundToTwo(Math.random());

    let s3 = factory.newResource(NAMESPACE, PROSUMER, 'S003');
    s3.accountBalance = defaultBalance,
    s3.contributionMetric = _roundToTwo(Math.random());

    let s4 = factory.newResource(NAMESPACE, PROSUMER, 'S004');
    s4.accountBalance = defaultBalance,
    s4.contributionMetric = _roundToTwo(Math.random());

    // Create buyer prosumers
    let p1 = factory.newResource(NAMESPACE, PROSUMER, 'P001');
    p1.accountBalance = defaultBalance,
    p1.contributionMetric = _roundToTwo(Math.random());

    let p2 = factory.newResource(NAMESPACE, PROSUMER, 'P002'); 
    p2.accountBalance = defaultBalance,
    p2.contributionMetric = _roundToTwo(Math.random());

    let p3 = factory.newResource(NAMESPACE, PROSUMER, 'P003'); 
    p3.accountBalance = defaultBalance,
    p3.contributionMetric = _roundToTwo(Math.random());

    let p4 = factory.newResource(NAMESPACE, PROSUMER, 'P004'); 
    p4.accountBalance = defaultBalance,
    p4.contributionMetric = _roundToTwo(Math.random());

    let p5 = factory.newResource(NAMESPACE, PROSUMER, 'P005'); 
    p5.accountBalance = defaultBalance,
    p5.contributionMetric = _roundToTwo(Math.random());

    let p6 = factory.newResource(NAMESPACE, PROSUMER, 'P006'); 
    p6.accountBalance = defaultBalance,
    p6.contributionMetric = _roundToTwo(Math.random());

    let p7 = factory.newResource(NAMESPACE, PROSUMER, 'P007'); 
    p7.accountBalance = defaultBalance,
    p7.contributionMetric = _roundToTwo(Math.random());

    return [s1, s2, s3, s4, p1, p2, p3, p4, p5, p6, p7];
}

function _roundToTwo(num) {    
    return +(Math.round(num + "e+2")  + "e-2");
}

handler();
/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);


var path = require('path');
var util = require('util');
var grpc = require('grpc');
var fs = require('fs');
var sleep = require('sleep');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var testUtil = require('./fabric-sdk/test/unit/util.js');
var EventHub = require('fabric-client/lib/EventHub.js');
var _commonProto = grpc.load(path.join(__dirname, './fabric-sdk/fabric-client/lib/protos/common/common.proto')).common;
var e2eUtils = require('./fabric-sdk/test/integration/e2e/e2eUtils.js');


hfc.addConfigFile(path.join(__dirname, './ServiceCredentials.json'));
var ORGS = hfc.getConfigSetting();

var tx_id = null;
var nonce = null;
var the_user = null;
var allEventhubs = [];

// =====================================================================================================================
// 										Install Example 2 Chaincode
// =====================================================================================================================
module.exports.install_chaincode = function (chaincodeId, chaincodeVersion, peerId, cert) {
    var logger = utils.getLogger('install-chaincode');

    testUtil.setupChaincodeDeploy();

    test('\n\n***** chaincode install *****\n\n', function (t) {
        hfc.setConfigSetting('request-timeout', 45000);

        installChaincode(t, chaincodeId, chaincodeVersion, peerId, cert)
            .then(function () {
                    t.pass('Successfully installed chaincode on peer ' + peerId);
                    t.end();
                },
                function (err) {
                    t.fail('Failed to install chaincode on peer' + peerId + err.stack ? err.stack : err);
                    t.end();
                }).catch(function (err) {
            t.fail('Test failed due to unexpected reasons. ' + err.stack ? err.stack : err);
            t.end();
        })
        ;
    })
    ;

    function installChaincode(t, chaincodeId, chaincodeVersion, peerId, cert) {
        var client = new hfc();
        var chain = client.newChain('abc');
        var ordererName, ordererUrl;
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
            }
        }
        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        var orgName = ORGS.network_name;

        var targets = [], peerName;
        for (let i in ORGS.peers) {
            peerName = 'fabric-peer-' + peerId;
            if (ORGS.peers[i].name === peerName) {
                let peer = new Peer(
                    ORGS.peers[i].api_url,
                    {
                        pem: cert
                    });
                targets.push(peer);
                chain.addPeer(peer);
            }
        }

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function (store) {
            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);
        }).then(function (admin) {
                t.pass('Successfully enrolled user \'admin\'');
                the_user = admin;

                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, the_user);

                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodePath: testUtil.CHAINCODE_PATH,
                    chaincodeId: chaincodeId,
                    chaincodeVersion: chaincodeVersion,
                    txId: tx_id,
                    nonce: nonce
                };

                return chain.sendInstallProposal(request);
            }, function (err) {
                t.fail('Failed to enroll user \'admin\'. ' + err);
                throw new Error('Failed to enroll user \'admin\'. ' + err);
            }
        ).then(function (results) {
                var proposalResponses = results[0];

                var proposal = results[1];
                var header = results[2];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('install proposal was good');
                    } else {
                        logger.error('install proposal was bad');
                    }
                    all_good = all_good & one_good;
                }
                if (all_good) {
                    t.pass(util.format('Successfully sent install Proposal and received ProposalResponse: Status - %s', proposalResponses[0].response.status));
                } else {
                    t.fail('Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            },
            function (err) {
                t.fail('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
                throw new Error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
            }
        )
            ;
    }
}
// =====================================================================================================================
// 										Install Marbles Chaincode
// =====================================================================================================================
module.exports.install_marbles_chaincode = function (chaincodeId, chaincodeVersion, peerId, cert) {
    var logger = utils.getLogger('install-chaincode');

    testUtil.setupChaincodeDeploy();

    test('\n\n***** chaincode install *****\n\n', function (t) {
        hfc.setConfigSetting('request-timeout', 45000);

        installChaincode(t, chaincodeId, chaincodeVersion, peerId, cert)
            .then(function () {
                    t.pass('Successfully installed chaincode on peer ' + peerId);
                    t.end();
                },
                function (err) {
                    t.fail('Failed to install chaincode on peer' + peerId + err.stack ? err.stack : err);
                    t.end();
                }).catch(function (err) {
            t.fail('Test failed due to unexpected reasons. ' + err.stack ? err.stack : err);
            t.end();
        })
        ;
    })
    ;

    function installChaincode(t, chaincodeId, chaincodeVersion, peerId, cert) {
        var client = new hfc();
        var chain = client.newChain('abc');
        var ordererName, ordererUrl;
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
            }
        }
        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        var orgName = ORGS.network_name;

        var targets = [], peerName;
        for (let i in ORGS.peers) {
            peerName = 'fabric-peer-' + peerId;
            if (ORGS.peers[i].name === peerName) {
                let peer = new Peer(
                    ORGS.peers[i].api_url,
                    {
                        pem: cert
                    });
                targets.push(peer);
                chain.addPeer(peer);
            }
        }

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function (store) {
            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);
        }).then(function (admin) {
                t.pass('Successfully enrolled user \'admin\'');
                the_user = admin;

                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, the_user);

                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodePath: testUtil.CHAINCODE_MARBLES_PATH,
                    chaincodeId: chaincodeId,
                    chaincodeVersion: chaincodeVersion,
                    txId: tx_id,
                    nonce: nonce
                };

                return chain.sendInstallProposal(request);
            }, function (err) {
                t.fail('Failed to enroll user \'admin\'. ' + err);
                throw new Error('Failed to enroll user \'admin\'. ' + err);
            }
        ).then(function (results) {
                var proposalResponses = results[0];

                var proposal = results[1];
                var header = results[2];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('install proposal was good');
                    } else {
                        logger.error('install proposal was bad');
                    }
                    all_good = all_good & one_good;
                }
                if (all_good) {
                    t.pass(util.format('Successfully sent install Proposal and received ProposalResponse: Status - %s', proposalResponses[0].response.status));
                } else {
                    t.fail('Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            },
            function (err) {
                t.fail('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
                throw new Error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
            }
        )
            ;
    }
}


// =====================================================================================================================
// 										Instantiate Example 2 Chaincode
// =====================================================================================================================
module.exports.instantiate_chaincode = function (channel, chaincodeId, chaincodeVersion, aVal, bVal, peerId, cert) {
    var logger = utils.getLogger('instantiate-chaincode');

    test('\n\n***** instantiate chaincode *****', function(t) {
        // override t.end function so it'll always disconnect the event hub
        t.end = (function(context, ehs, f){
            return function () {
                for (var key in ehs) {
                    var eventhub = ehs[key];
                    if (eventhub && eventhub.isconnected()) {
                        logger.info('Disconnecting the event hub');
                        eventhub.disconnect();
                    }
                }

                f.apply(context, arguments);

            };
        })
        (t, allEventhubs, t.end);

        var client = new hfc();
        var chain = client.newChain(channel);
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        var ordererName, ordererUrl;
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
            }
        }
        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        var orgName = ORGS.network_name;

        var targets = [],
            eventhubs = [];




        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function(store) {

            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);

        }).then(function(admin) {

            t.pass('Successfully enrolled user \'admin\'');
            the_user = admin;
            var peerName;

            for (let i in ORGS.peers){
                peerName = 'fabric-peer-' + peerId;
                if (ORGS.peers[i].name === peerName){
                    let peer = new Peer(
                        ORGS.peers[i].api_url,
                        {
                            pem: cert
                        });
                    chain.addPeer(peer);
                    targets.push(peer);
                    logger.info(' create new eventhub %s', ORGS.peers[i].event_url);
                    let eh = new EventHub(client);
                    eh.setPeerAddr(
                        ORGS.peers[i].event_url,
                        {
                            pem: cert
                        }
                    );
                    eh.connect();
                    eventhubs.push(eh);
                    allEventhubs.push(eh);
                }
            }

// read the config block from the orderer for the chain
// and initialize the verify MSPs based on the participating
// organizations
            return chain.initialize();
        }, function(err) {

            t.fail('Failed to enroll user \'admin\'. ' + err);
            throw new Error('Failed to enroll user \'admin\'. ' + err);

        }).then(function(success) {

            logger.info('prep the instantiation!!');
            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);
            var mspid, peerName;

            for (let i in ORGS.peers){
                peerName = 'fabric-peer-' + peerId;
                if (ORGS.peers[i].name === peerName){
                    mspid = ORGS.peers[i].msp_id;
                }
            }

// send proposal to endorser
            var request = {
                chaincodePath: testUtil.CHAINCODE_PATH,
                chaincodeId: chaincodeId,
                chaincodeVersion: chaincodeVersion,
                fcn: 'init',
                args: ['a', aVal, 'b', bVal],
                chainId: channel,
                txId: tx_id,
                nonce: nonce
            }
            logger.info('instantiate the chaincode!! %j', request);
            logger.info('instantiate the chaincode!! %j', chain.getPeers());

            return chain.sendInstantiateProposal(request);

        }, function(err) {

            t.fail('Failed to initialize the chain');
            throw new Error('Failed to initialize the chain');

        }).then(function(results) {

            logger.info("Results: %j", results);
            var proposalResponses = results[0];

            var proposal = results[1];
            var header = results[2];
            var all_good = true;
            for (var i in proposalResponses) {
                let one_good = false;
                if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                    one_good = true;
                    logger.info('instantiate proposal was good');
                } else {
                    logger.error('instantiate proposal was bad');
                }
                all_good = all_good & one_good;
            }
            if (all_good) {
                t.pass(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal,
                    header: header
                };

                // set the transaction listener and set a timeout of 30sec
                // if the transaction did not get committed within the timeout period,
                // fail the test
                var deployId = tx_id.toString();

                var eventPromises = [];
                eventhubs.forEach(function(eh) {
                    let txPromise = new Promise(function(resolve, reject) {
                            let handle = setTimeout(reject, 30000);

                            eh.registerTxEvent(deployId.toString(), function(tx, code) {
                                t.pass('The chaincode instantiate transaction has been committed on peer ' + eh.ep.addr);
                                clearTimeout(handle);
                                eh.unregisterTxEvent(deployId);

                                if (code !== 'VALID') {
                                    t.fail('The chaincode instantiate transaction was invalid, code = ' + code);
                                    reject();
                                } else {
                                    t.pass('The chaincode instantiate transaction was valid.');
                                    resolve();
                                }
                            })
                            ;
                        })
                        ;

                    eventPromises.push(txPromise);
                })
                ;

                var sendPromise = chain.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then(function(results) {

                        logger.debug('Event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                    }).
                    catch(function(err) {

                        t.fail('Failed to send instantiate transaction and get notifications within the timeout period.');
                        throw new Error('Failed to send instantiate transaction and get notifications within the timeout period.');

                    })
                    ;

            } else {
                t.fail('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
                throw new Error('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
            }
        }, function(err) {

            t.fail('Failed to send instantiate proposal due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send instantiate proposal due to error: ' + err.stack ? err.stack : err);

        }).then(function(response) {

            if (response.status === 'SUCCESS')
            {
                t.pass('Successfully sent transaction to the orderer.');
            }
            else
            {
                t.fail('Failed to order the transaction. Error code: ' + response.status);
                throw new Error('Failed to order the transaction. Error code: ' + response.status);
            }
        }, function(err) {

            t.fail('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);

        })
    });
}

// =====================================================================================================================
// 										Instantiate Marbles Chaincode
// =====================================================================================================================
module.exports.instantiate_marbles_chaincode = function (channel, chaincodeId, chaincodeVersion, peerId, appName, cert) {
    var logger = utils.getLogger('instantiate-chaincode');

    test('\n\n***** instantiate marbles chaincode *****', function(t) {
        // override t.end function so it'll always disconnect the event hub
        t.end = (function(context, ehs, f){
            return function () {
                for (var key in ehs) {
                    var eventhub = ehs[key];
                    if (eventhub && eventhub.isconnected()) {
                        logger.info('Disconnecting the event hub');
                        eventhub.disconnect();
                    }
                }
                var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
                var ordererName, ordererUrl, ordererMspid, caName, enrollSecret, caMspid, caUrl, peerUrl, peerEventUrl, peerMspid;
                for (let i in ORGS.orderers) {
                    ordererName = 'fabric-orderer-0' + peerLpar;
                    if (ORGS.orderers[i].name === ordererName) {
                        ordererUrl = ORGS.orderers[i].api_url;
                        ordererMspid = ORGS.orderers[i].msp_id;
                    }
                }
                for (let j in ORGS.cas){
                    caName = 'fabric-ca-' + peerId;
                    if (ORGS.cas[j].name === caName){
                        enrollSecret = ORGS.cas[j].users_clients[0].enrollSecret;
                        caMspid = ORGS.cas[j].msp_id;
                        caUrl = ORGS.cas[j].api_url;
                    }
                }
                for (let k in ORGS.peers) {
                    peerName = 'fabric-peer-' + peerId;
                    if (ORGS.peers[k].name === peerName) {
                        peerUrl = ORGS.peers[k].api_url;
                        peerEventUrl = ORGS.peers[k].event_url;
                        peerMspid = ORGS.peers[k].msp_id;
                    }
                }

                var appJson = {
                    "credentials": {
                        "network_id": ORGS.network_id,
                        "network_name": ORGS.network_name,
                        "orderers": [
                            {
                                "name": ordererName,
                                "discovery": ordererUrl,
                                "msp_id": ordererMspid,
                                "tls_certificate": "cert_1"
                            }
                        ],
                        "cas": [
                            {
                                "name": caName,
                                "api": caUrl,
                                "msp_id": caMspid,
                                "users": [
                                    {
                                        "enrollId": "admin",
                                        "enrollSecret": enrollSecret
                                    }
                                ],
                                "tls_certificate": "cert_1"
                            }
                        ],
                        "peers": [
                            {
                                "name": peerName,
                                "discovery": peerUrl,
                                "events": peerEventUrl,
                                "msp_id": peerMspid,
                                "tls_certificate": "cert_1"
                            }
                        ],
                        "app": {
                            "channel_id": channel,
                            "chaincode_id": chaincodeId,
                            "chaincode_version": chaincodeVersion,
                            "block_delay": 1000
                        },
                        "tls_certificates": {
                            "cert_1": {
                                "common_name": null,
                                "pem": ORGS.tls_certificates.cert_1.pem
                            }
                        }
                    }
                };

                var manifest = '---\n' +
                    'applications:\n' +
                    '    - disk_quota: 1024M\n' +
                    'name: ' + appName + '\n' +
                    'command: "node app.js"\n' +
                    'path: "."\n' +
                    'instances: 1\n' +
                    'memory: 256M';

                logger.info('Creating blockchain_creds1.json file');
                var wstream = fs.createWriteStream('./marbles/config/blockchain_creds1.json');
                wstream.write(JSON.stringify(appJson));
                wstream.end();

                logger.info('Creating manifest.yml file');
                var wstream = fs.createWriteStream('./marbles/manifest.yml');
                wstream.write(manifest);
                wstream.end();

                f.apply(context, arguments);

            };
        })
        (t, allEventhubs, t.end);

        var client = new hfc();
        var chain = client.newChain(channel);
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        var ordererName, ordererUrl;
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
            }
        }
        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        var orgName = ORGS.network_name;

        var targets = [],
            eventhubs = [],
            peerName;
// set up the chain to use each org's peer for
// both requests and events
        logger.info('Now set the peer');
        for (let i in ORGS.peers){
            peerName = 'fabric-peer-' + peerId;
            if (ORGS.peers[i].name === peerName){
                let peer = new Peer(
                    ORGS.peers[i].api_url,
                    {
                        pem: cert
                    });
                chain.addPeer(peer);

                let eh = new EventHub(client);
                eh.setPeerAddr(
                    ORGS.peers[i].event_url,
                    {
                        pem: cert
                    }
                );
                eh.connect();
                eventhubs.push(eh);
                allEventhubs.push(eh);
            }
        }


        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function(store) {

            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);

        }).then(function(admin) {

            t.pass('Successfully enrolled user \'admin\'');
            the_user = admin;

// read the config block from the orderer for the chain
// and initialize the verify MSPs based on the participating
// organizations
            logger.info('initialize the channel!!');
            return chain.initialize();
        }, function(err) {

            t.fail('Failed to enroll user \'admin\'. ' + err);
            throw new Error('Failed to enroll user \'admin\'. ' + err);

        }).then(function(success) {

            logger.info('prep the instantiation!!');
            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

// send proposal to endorser
            var request = {
                chaincodePath: testUtil.CHAINCODE_MARBLES_PATH,
                chaincodeId: chaincodeId,
                chaincodeVersion: chaincodeVersion,
                fcn: 'init',
                args: ['314'],
                chainId: channel,
                txId: tx_id,
                nonce: nonce
            };
            logger.info('instantiate the chaincode!! %j', request);
            logger.info('instantiate the chaincode!! %j', chain.getPeers());

            return chain.sendInstantiateProposal(request);

        }, function(err) {

            t.fail('Failed to initialize the chain');
            throw new Error('Failed to initialize the chain');

        }).then(function(results) {

            logger.info("Results: %j", results);
            var proposalResponses = results[0];

            var proposal = results[1];
            var header = results[2];
            var all_good = true;
            for (var i in proposalResponses) {
                let one_good = false;
                if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                    one_good = true;
                    logger.info('instantiate proposal was good');
                } else {
                    logger.error('instantiate proposal was bad');
                }
                all_good = all_good & one_good;
            }
            if (all_good) {
                t.pass(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal,
                    header: header
                };

                // set the transaction listener and set a timeout of 30sec
                // if the transaction did not get committed within the timeout period,
                // fail the test
                var deployId = tx_id.toString();

                var eventPromises = [];
                eventhubs.forEach(function(eh) {
                    let txPromise = new Promise(function(resolve, reject) {
                            let handle = setTimeout(reject, 30000);

                            eh.registerTxEvent(deployId.toString(), function(tx, code) {
                                t.pass('The chaincode instantiate transaction has been committed on peer ' + eh.ep.addr);
                                clearTimeout(handle);
                                eh.unregisterTxEvent(deployId);

                                if (code !== 'VALID') {
                                    t.fail('The chaincode instantiate transaction was invalid, code = ' + code);
                                    reject();
                                } else {
                                    t.pass('The chaincode instantiate transaction was valid.');
                                    resolve();
                                }
                            })
                            ;
                        })
                        ;

                    eventPromises.push(txPromise);
                })
                ;

                var sendPromise = chain.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then(function(results) {

                        logger.debug('Event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                    }).
                    catch(function(err) {

                        t.fail('Failed to send instantiate transaction and get notifications within the timeout period.');
                        throw new Error('Failed to send instantiate transaction and get notifications within the timeout period.');

                    })
                    ;

            } else {
                t.fail('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
                throw new Error('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
            }
        }, function(err) {

            t.fail('Failed to send instantiate proposal due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send instantiate proposal due to error: ' + err.stack ? err.stack : err);

        }).then(function(response) {

            if (response.status === 'SUCCESS')
            {
                t.pass('Successfully sent transaction to the orderer.');
            }
            else
            {
                t.fail('Failed to order the transaction. Error code: ' + response.status);
                throw new Error('Failed to order the transaction. Error code: ' + response.status);
            }
        }, function(err) {

            t.fail('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);

        })
    });
}
// =====================================================================================================================
// 										Invoke Transaction
// =====================================================================================================================

module.exports.invoke_transaction = function (channel, chaincodeId, chaincodeVersion, value, peerId, cert) {
    var logger = utils.getLogger('invoke-chaincode');

    test('\n\n***** invoke transaction to move money *****', function (t) {
        // override t.end function so it'll always disconnect the event hub
        t.end = (function (context, ehs, f) {
            return function () {
                for (var key in ehs) {
                    var eventhub = ehs[key];
                    if (eventhub && eventhub.isconnected()) {
                        logger.info('Disconnecting the event hub');
                        eventhub.disconnect();
                        sleep.msleep(3000);
                    }
                }

                f.apply(context, arguments);
            };
        })
        (t, allEventhubs, t.end);

// this is a transaction, will just use org2's identity to
// submit the request. intentionally we are using a different org
// than the one that instantiated the chaincode, although either org
// should work properly
        var client = new hfc();
        var chain = client.newChain(channel);
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        var ordererName, ordererUrl;
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
            }
        }
        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        var orgName = ORGS.network_name;

        var targets = [],
            eventhubs = [],
            peerName;

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function (store) {
            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);

        }).then(function (admin) {

            for (let i in ORGS.peers) {
                peerName = 'fabric-peer-' + peerId;
                if (ORGS.peers[i].name === peerName) {
                    let peer = new Peer(
                        ORGS.peers[i].api_url,
                        {
                            pem: cert
                        });
                    chain.addPeer(peer);
                    let eh = new EventHub(client);
                    eh.setPeerAddr(
                        ORGS.peers[i].event_url,
                        {
                            pem: cert
                        }
                    );
                    eh.connect();
                    eventhubs.push(eh);
                    allEventhubs.push(eh);
                }
            }

            t.pass('Successfully enrolled user \'admin\'');
            the_user = admin;

            return chain.initialize();
        }).then(function (nothing) {
            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);
            utils.setConfigSetting('E2E_TX_ID', tx_id);
            logger.info('setConfigSetting("E2E_TX_ID") = %s', tx_id);
            t.comment(util.format('Sending transaction "%s"', tx_id));

// send proposal to endorser
            var request = {
                chaincodeId: chaincodeId,
                chaincodeVersion: chaincodeVersion,
                fcn: 'invoke',
                args: ['move', 'a', 'b', value],
                chainId: channel,
                txId: tx_id,
                nonce: nonce
            };
            return chain.sendTransactionProposal(request);

        }, function (err) {

            t.fail('Failed to enroll user \'admin\'. ' + err);
            throw new Error('Failed to enroll user \'admin\'. ' + err);

        }).then(function (results) {

            var proposalResponses = results[0];

            var proposal = results[1];
            var header = results[2];
            var all_good = true;
            for (var i in proposalResponses) {
                logger.info("Proposal Response: %j", proposalResponses);
                let one_good = false;
                if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                    one_good = true;
                    logger.info('transaction proposal was good');
                } else {
                    logger.error('transaction proposal was bad');
                }
                all_good = all_good & one_good;
            }
            if (all_good) {
                // check all the read/write sets to see if the same, verify that each peer
                // got the same results on the proposal
                all_good = true;
                t.pass('compareProposalResponseResults exection did not throw an error');
                if (all_good) {
                    t.pass(' All proposals have a matching read/writes sets');
                }
                else {
                    t.fail(' All proposals do not have matching read/write sets');
                }
            }
            if (all_good) {
                // check to see if all the results match
                t.pass(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal,
                    header: header
                };

                // set the transaction listener and set a timeout of 30sec
                // if the transaction did not get committed within the timeout period,
                // fail the test
                var deployId = tx_id.toString();

                var eventPromises = [];
                eventhubs.forEach(function (eh) {
                    let txPromise = new Promise(function (resolve, reject) {
                        let handle = setTimeout(reject, 30000);

                        eh.registerTxEvent(deployId.toString(), function (tx, code) {
                            clearTimeout(handle);
                            eh.unregisterTxEvent(deployId);

                            if (code !== 'VALID') {
                                t.fail('The balance transfer transaction was invalid, code = ' + code);
                                reject();
                            } else {
                                t.pass('The balance transfer transaction has been committed on peer ' + eh.ep._endpoint.addr);
                                resolve();
                            }
                        });
                    });

                    eventPromises.push(txPromise);
                });

                var sendPromise = chain.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then(function (results) {

                        logger.debug(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                    }).catch(function (err) {

                        t.fail('Failed to send transaction and get notifications within the timeout period.');
                        throw new Error('Failed to send transaction and get notifications within the timeout period.');

                    });

            } else {
                t.fail('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            }
        }, function (err) {

            t.fail('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);

        }).then(function (response) {

            if (response.status === 'SUCCESS') {
                t.pass('Successfully sent transaction to the orderer.');
                t.comment('******************************************************************');
                t.comment('To manually run query.js, set the following environment variables:');
                t.comment('export E2E_TX_ID=' + '\'' + tx_id + '\'');
                t.comment('******************************************************************');
            } else {
                t.fail('Failed to order the transaction. Error code: ' + response.status);
                throw new Error('Failed to order the transaction. Error code: ' + response.status);
            }
        }, function (err) {

            t.fail('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);

        });

    })
}

// =====================================================================================================================
// 										Query
// =====================================================================================================================
module.exports.query = function (channel, chaincodeId, chaincodeVersion, peerId, cert) {
    var logger = utils.getLogger('query');

    test('\n\n***** query chaincode *****', function(t) {

        var client = new hfc();
        var chain = client.newChain(channel);

        var orgName = ORGS.network_name;

        var targets = [], peerName;
// set up the chain to use your org's peer for
// both requests and events
        for (let i in ORGS.peers){
            peerName = 'fabric-peer-' + peerId;
            if (ORGS.peers[i].name === peerName){
                let peer = new Peer(
                    ORGS.peers[i].api_url,
                    {
                        pem: cert
                    });
                chain.addPeer(peer);
            }
        }

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function(store) {

            client.setStateStore(store);
            return testUtil.getSubmitter(client, t, peerId);

        }).
        then(function(admin) {
            the_user = admin;

            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            logger.info("About the query...");
// send query
            var request = {
                chaincodeId: chaincodeId,
                chaincodeVersion: chaincodeVersion,
                chainId: channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'invoke',
                args: ['query', 'b']
            };
            return chain.queryByChaincode(request);
        }, function(err) {
            t.comment('Failed to get submitter \'admin\'');
            t.fail('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);
            t.end();
        }).then(function(response_payloads) {
            logger.info("Payloads: %j", response_payloads);
            if (response_payloads) {
                for (let i = 0; i < response_payloads.length; i++) {
                    logger.info('Query Result for B: ' + response_payloads[i].toString('utf8'));
                }
                t.end();
            } else {
                t.fail('response_payloads is null');
                t.end();
            }
        }, function(err){
            t.fail('Failed to send query due to error: ' + err.stack ? err.stack : err);
            t.end();
        }).catch(function(err) {
            t.fail('Failed to end to end test with error:' + err.stack ? err.stack : err);
            t.end();
        });
    });
}

// =====================================================================================================================
// 										Create Channel
// =====================================================================================================================
module.exports.create_channel = function (channel, peerId, cert) {
    var logger = utils.getLogger('create-channel');

    test('\n\n***** Create Channel *****\n\n', function (t) {
        //
        // Create and configure the test chain
        //
        var client = new hfc();
        var chain = client.newChain(channel);
        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        var ordererName, ordererUrl, ordererMspid;
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
                ordererMspid = ORGS.orderers[i].msp_id;
            }
        }

        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );


        var TWO_ORG_MEMBERS_AND_ADMIN = [{
            role: {
                name: 'member',
                mspId: 'Org1MSP'
            }
        }, {
            role: {
                name: 'member',
                mspId: 'Org2MSP'
            }
        }, {
            role: {
                name: 'admin',
                mspId: 'Org1MSP'
            }
        }];

        var ONE_OF_TWO_ORG_MEMBER = {
            identities: TWO_ORG_MEMBERS_AND_ADMIN,
            policy: {
                '1-of': [{'signed-by': 0}, {'signed-by': 1}]
            }
        };

        var ACCEPT_ALL = {
            identities: [],
            policy: {
                '0-of': []
            }
        };

        var peerName, peerMspid, peerUrl;
        for (let i in ORGS.peers) {
            peerName = 'fabric-peer-' + peerId;
            if (ORGS.peers[i].name === peerName) {
                peerMspid =  ORGS.peers[i].msp_id;
                peerUrl = ORGS.peers[i].api_url;
            }
        }

        var test_input = {
            channel: {
                name: channel,
                version: 3,
                settings: {
                    'batch-size': {'max-message-count': 10, 'absolute-max-bytes': '99m', 'preferred-max-bytes': '512k'},
                    'batch-timeout': '10s',
                    'hashing-algorithm': 'SHA256',
                    'consensus-type': 'solo',
                    'creation-policy': 'AcceptAllPolicy'
                },
                policies: {
                    Readers: {threshold: 'ANY'},
                    Writers: {threshold: 'ANY'},
                    Admins: {threshold: 'ANY'},
                    AcceptAllPolicy: {signature: ACCEPT_ALL}
                },
                orderers: {
                    organizations: [{
                        mspid: ordererMspid,
                        policies: {
                            Readers: {signature: ACCEPT_ALL},
                            Writers: {signature: ACCEPT_ALL},
                            Admins: {signature: ACCEPT_ALL}
                        },
                        'end-points': [ordererUrl]
                    }],
                    policies: {
                        Readers: {threshold: 'ANY'},
                        Writers: {threshold: 'ANY'},
                        Admins: {threshold: 'ANY'},
                        AcceptAllPolicy: {signature: ACCEPT_ALL},
                        BlockValidation: {threshold: 'ANY', sub_policy: 'Writers'}
                    }
                },
                peers: {
                    organizations: [{
                        mspid: peerMspid,
                        'anchor-peers': [peerUrl],
                        policies: {
                            Readers: {signature: ACCEPT_ALL},
                            Writers: {signature: ACCEPT_ALL},
                            Admins: {signature: ACCEPT_ALL}
                        }
                    }],
                    policies: {
                        Readers: {threshold: 'ANY'},
                        Writers: {threshold: 'ANY'},
                        Admins: {threshold: 'ANY'}
                    },
                }
            }
        };

        var config = null;
        var signatures = [];

        var orgName = ORGS.network_name;

        utils.setConfigSetting('key-value-store', 'fabric-client/lib/impl/FileKeyValueStore.js');
        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function(store){
            client.setStateStore(store);

            return testUtil.getSubmitter(client, t, peerId);
        }).then(function(admin) {
            t.pass('Successfully enrolled user \'admin\'');
            the_user = admin;

            // have the SDK build the config update object
            //config = client.buildChannelConfig(test_input);
            t.pass('Successfully built config update');

            // sign the config
            // var signature = client.signChannelConfig(config);
            t.pass('Successfully signed config update');

            // collect all signatures
            //signatures.push(signature);

            // build up the create request
            let nonce = utils.getNonce();
            // let tx_id = chain.buildTransactionID(nonce, the_user);
            var request = {
                envelope: fs.readFileSync(path.join(__dirname, './fabric-sdk/test/fixtures/channel/mychannel.tx'))
            };

            // send to create request to orderer
            return chain.createChannel(request);
        }).then(function(result){
            logger.debug(' response ::%j', result);
            t.pass('Successfully created the channel.');
            if (result.status && result.status === 'SUCCESS') {
                return e2eUtils.sleep(5000);
            } else {
                t.fail('Failed to create the channel. ');
                t.end();
            }
        }, function(err){
            t.fail('Failed to create the channel: ' + err.stack ? err.stack : err);
            t.end();
        }).then(function(nothing){
            t.pass('Successfully waited to make sure new channel was created.');
            t.end();
        },function(err){
            t.fail('Failed to sleep due to error: ' + err.stack ? err.stack : err);
            t.end();
        });
    });
};

// =====================================================================================================================
// 										Join Channel
// =====================================================================================================================
module.exports.join_channel = function (channel, peerId, cert) {
    var logger = utils.getLogger('join-channel');

    test('\n\n***** Join Channel *****\n\n', function(t) {
        // override t.end function so it'll always disconnect the event hub
        t.end = (function(context, ehs, f) {
            return function() {
                for(var key in ehs) {
                    var eventhub = ehs[key];
                    if (eventhub && eventhub.isconnected()) {
                        t.comment('Disconnecting the event hub');
                        eventhub.disconnect();
                    }
                }

                f.apply(context, arguments);
            };
        })(t, allEventhubs, t.end);

        joinChannel(t, channel, cert)
            .then(function() {
                t.pass(util.format('Successfully joined peers in organization "%s" to the channel', ORGS.network_name));
            }, function(err) {
                t.fail(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS.network_name, err.stack ? err.stack : err));
                t.end();
            })
            .catch(function(err) {
                t.fail('Failed request. ' + err);
                t.end();
            });
    });

    function joinChannel(t, channel, cert) {
        t.comment(util.format('Calling peers in organization "%s" to join the channel', ORGS.network_name));

        //
        // Create and configure the test chain
        //
        var client = new hfc();
        var chain = client.newChain(channel);

        var orgName = ORGS.network_name;

        var targets = [],
            eventhubs = [];

        var peerLpar = peerId.slice(-1);  //get last character of peer ID to know which orderer to use
        var ordererName, ordererUrl, ordererMspid;
        for (let i in ORGS.orderers) {
            ordererName = 'fabric-orderer-0' + peerLpar;
            if (ORGS.orderers[i].name === ordererName) {
                ordererUrl = ORGS.orderers[i].api_url;
                ordererMspid = ORGS.orderers[i].msp_id;
            }
        }


        chain.addOrderer(
            new Orderer(
                ordererUrl,
                {
                    'pem': cert
                }
            )
        );

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function(store) {
            client.setStateStore(store);
            // get the peer org's admin required to send join channel requests
            return testUtil.getSubmitter(client, t, peerId);
        })
            .then(function(admin) {
                t.pass('Successfully enrolled user \'admin\'');
                the_user = admin;

                var peerName, peerMspid, peerUrl, peerEventUrl;
                for (let i in ORGS.peers){
                    peerName = 'fabric-peer-' + peerId;
                    if (ORGS.peers[i].name === peerName){
                        peerMspid =  ORGS.peers[i].msp_id;
                        peerUrl = ORGS.peers[i].api_url;
                        peerEventUrl = ORGS.peers[i].event_url;
                        targets.push(
                            new Peer(
                                peerUrl,
                                {
                                    pem: cert
                                }
                            )
                        );

                        let eh = new EventHub(client);
                        eh.setPeerAddr(
                            peerEventUrl,
                            {
                                pem: cert
                            }
                        );
                        eh.connect();
                        eventhubs.push(eh);
                        allEventhubs.push(eh);
                    }
                }

                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, the_user);
                var request = {
                    targets : targets,
                    txId : 	tx_id,
                    nonce : nonce
                };

                var eventPromises = [];
                eventhubs.forEach(function(eh) {
                    let txPromise = new Promise(function(resolve, reject) {
                        let handle = setTimeout(reject, 30000);

                        eh.registerBlockEvent(function(block) {
                            clearTimeout(handle);

                            // in real-world situations, a peer may have more than one channels so
                            // we must check that this block came from the channel we asked the peer to join
                            if(block.data.data.length === 1) {
                                // Config block must only contain one transaction
                                var envelope = _commonProto.Envelope.decode(block.data.data[0]);
                                var payload = _commonProto.Payload.decode(envelope.payload);
                                var channel_header = _commonProto.ChannelHeader.decode(payload.header.channel_header);

                                if (channel_header.channel_id === channel) {
                                    t.pass('The new channel has been successfully joined on peer '+ eh.ep._endpoint.addr);
                                    resolve();
                                }
                            }
                        });
                    });

                    eventPromises.push(txPromise);
                });

                let sendPromise = chain.joinChannel(request);
                return Promise.all([sendPromise].concat(eventPromises));
            }, function(err) {
                t.fail('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
                throw new Error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
            })
            .then(function(results) {
                t.comment(util.format('Join Channel R E S P O N S E : %j', results));

                if(results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
                    t.pass(util.format('Successfully joined peers in organization %s to join the channel', orgName));
                } else {
                    t.fail(' Failed to join channel');
                    throw new Error('Failed to join channel');
                }
            }, function(err) {
                t.fail('Failed to join channel due to error: ' + err.stack ? err.stack : err);
            });
    }
}
// =====================================================================================================================
// 										Create Marbles Owner
// =====================================================================================================================
module.exports.create_marbles_owner = function(name, cb) {
    var marbles = require('./marbles.js');
    var logger = utils.getLogger('create-owner');


    marbles.enroll_admin(1, function (e, enrollObj ) {
        if (e) {
            logger.error('Failed to enroll user \'admin\'. ', e);
            //cb(e);
        }
        else {
            marbles.create_owners(1, name, function (err, res) {
                if (err){
                    cb(err)
                }
                else {

                    cb(null,res);
                }
            })
        }
    })

}

// =====================================================================================================================
// 										Create Marbles
// =====================================================================================================================
module.exports.create_marbles = function(name, color, size, cb) {
    var marbles = require('./marbles.js');
    var logger = utils.getLogger('create-marbles');


    marbles.enroll_admin(1, function (e, enrollObj ) {
        if (e) {
            logger.error('Failed to enroll user \'admin\'. ');
            //cb(e);
        }
        else {
            marbles.query(enrollObj, function(err, data){
                if (err){
                    logger.error('Failed to retrieve owner list', err);
                    cb(err);
                }
                else {
                    var owner_obj={};
                    for (var i=0; i<data.owners.length; i++){
                        if (data.owners[i].username == name.toLowerCase()) {
                            owner_obj = { id: data.owners[i].id, username: name };
                        }
                    }
                    marbles.create_marbles(owner_obj.id, owner_obj.username, color, size, function(err, res){
                        if (err){
                            cb(err);
                        }
                        else {
                            cb(null,res);
                        }
                    })
                }

            })


        }
    })

}

// =====================================================================================================================
// 										Transfer Marbles
// =====================================================================================================================
module.exports.transfer_marbles = function(initOwner, newOwner, color, size, cb) {
    var marbles = require('./marbles.js');
    var logger = utils.getLogger('transfer-marbles');


    marbles.enroll_admin(1, function (e, enrollObj) {
        if (e) {
            logger.error('Failed to enroll user \'admin\'. ');
            //cb(e);
        }
        else {
            marbles.query(enrollObj, function (err, data) {
                if (err) {
                    logger.error('Failed to retrieve owner list', err);
                    cb(err);
                }
                else {
                    var owner_id, marble_id;
                    for (var i = 0; i < data.owners.length; i++) {
                        if (data.owners[i].username == newOwner.toLowerCase()) {
                            owner_id = data.owners[i].id;
                        }
                    }
                    for (var j = 0; j < data.marbles.length; j++) {
                        if (data.marbles[j].color == color.toLowerCase() && data.marbles[j].size == size && data.marbles[j].owner.username == initOwner.toLowerCase()) {
                            marble_id = data.marbles[j].id;
                        }
                    }
                    marbles.transfer_marble(owner_id, marble_id, function (err, res) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            cb(null, res);
                        }
                    })
                }
            })
        }
    })
}


// =====================================================================================================================
// 										Delete Marbles
// =====================================================================================================================
module.exports.delete_marbles = function(name, color, size, cb) {
    var marbles = require('./marbles.js');
    var logger = utils.getLogger('delete-marbles');


    marbles.enroll_admin(1, function (e, enrollObj) {
        if (e) {
            logger.error('Failed to enroll user \'admin\'. ');
            //cb(e);
        }
        else {
            marbles.query(enrollObj, function (err, data) {
                if (err) {
                    logger.error('Failed to retrieve owner list', err);
                    cb(err);
                }
                else {
                    var marble_id;
                    for (var i = 0; i < data.marbles.length; i++) {
                        if (data.marbles[i].color == color.toLowerCase() && data.marbles[i].size == size && data.marbles[i].owner.username == name.toLowerCase()) {
                            marble_id = data.marbles[i].id;
                        }
                    }
                    marbles.delete_marble(marble_id, function (err, res) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            cb(null, res);
                        }
                    })
                }
            })
        }
    })
}

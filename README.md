# Hyperledger Fabric Client SDK for Node.js


## Build and Test
To build and test, the following pre-requisites must be installed first:

* node runtime version 6.9.x, note that 7.0 is not supported at this point
* npm tool version 3.10.x

Clone the project and launch the following commands to install the dependencies and perform various tasks.

* In the project v1.0_sdk_tests folder:
    * `npm install` to install dependencies (npm install will also perform a git clone of Marbles to perform marbles transactions later)

* Now you are ready to run the tests:
    * In Bluemix on the Resources panel, click on the Service Credentials button and copy your Service Credentials file.
    * Navigate to the /operations/tests/v1.0_sdk_tests directory and overwrite the current ServiceCredentials.json file.
    * In the same directory perform  `node app.js --help` to see a list of commands that can be executed.
    ```
     latrells-mbp:v1.0_sdk_tests latrellfreeman$ node app.js --help
     info: Returning a new winston logger with default configurations
     Commands:
       installcc      Install Chaincode
       instantiatecc  Instantiate Chaincode
       invoke         Invoke transaction
       query          Query
       createchannel  Create channel
       joinchannel    Join channel

    ```
    * After entering a command you should also perform another --help to see the required flags to be used against each command. `node app.js installcc --help`
    ```
     latrells-mbp:v1.0_sdk_tests latrellfreeman$ node app.js installcc --help
     info: Returning a new winston logger with default configurations
     Options:
       --chaincodeId, -i       Chaincode name                     [string] [required]
       --chaincodeVersion, -v  Chaincode version                  [string] [required]
       --peerId, -p            2 character peer ID to install chaincode (ex. 1a)
                                                                  [string] [required]
       --help                  Show help                                    [boolean]
    ```

    * Install Chaincode example - `node app.js installcc -i mychaincode -v 1 -p 1a`
    * Instantiate Chaincode example - `node app.js instantiatecc -c mychannel -i mychaincode -v 1 -p 1a -a 500 -b 200`
    * Invoke Transaction example - `node app.js invoke -c mychannel -i mychaincode -v 1 -p 1a -n 20 - m 1` (-n flag used to specify the number of invokes to be performed. -m flag used to specify the value to move during the invoke. The default for -n if not specified is 1, and the default for -m is 5)
    * Query - `node app.js query -c mychannel -i mychaincode -v 1 -p 1a`
    * Create Channel - Under Maintenance
    * Join Channel - Under Maintenance

* Running Marbles using Node SDK:
    * Install the Cloud Foundry Command Line Tool [Download](https://github.com/cloudfoundry/cli/releases)
    * Login to CF:
      	- Open a command prompt or terminal window
      	- Type:

      			> cf api https://api.ng.bluemix.net or cf api https://api.stage1.ng.bluemix.net for Staging
      			> cf login
      			(follow the prompts to enter your Bluemix ID and password)
    * Install Marbles Chaincode using the following command `node app.js installmarbles -c CHANNEL_NAME_HERE -i CHAINCODE_NAME_HERE -v CHAINCODE_VERSION_HERE -p PEER_ID_HERE`
    * Instantiate Marbles Chaincode using the following command `node app.js instantiatemarbles -c CHANNEL_NAME_HERE -i CHAINCODE_NAME_HERE -v CHAINCODE_VERSION_HERE -p PEER_ID_HERE -z MARBLES_APP_NAME_HERE`. After the instantiate completes, the App Integration JSON file will be created automatically, and your app name will be placed in the Manifest.yml file.
    * After the instantiation completes, you can either push the app to Bluemix (or run locally) and create/move marbles in the UI, or you can perform marble transactions using the Node SDK.
    * Pushing app to Bluemix:
        * Navigate to the marbles directory  `/tests/v1.0_sdk_tests/marbles`  and perform the following command to push the marbles app to Bluemix `cf push MARBLES_APP_NAME_HERE` (MARBLES_APP_NAME_HERE is the same name you used in the -z flag in the previous step)
        * The app should now be deployed to Bluemix and listed on your Bluemix dashboard. Click the url on the Bluemix dashboard, login as admin, and you're on your way!
    * Performing transactions using the Node SDK:
        * In the current v1.0_sdk_tests directory run `sudo node app.js createmarblesowner -n OWNER_NAME` to create owners
        * Run `sudo node app.js createmarble -n OWNER_NAME -c MARBLE_COLOR -s MARBLE_SIZE` to create a marble for the specified owner
        * Run `sudo node app.js transfermarble -f FROM_OWNER -t TO_OWNER -c MARBLE_COLOR -s MARBLE_SIZE` to transfer marble to a new owner
        * Run `sudo node app.js deletemarble -n OWNER_NAME -c MARBLE_COLOR -s MARBLE_SIZE` to delete marble


Scipts that use Node SDK to perform various actions using exampecc:

* Execute a run of a specified number of invokes with query against expected result, ./examplecc_test.sh "number of executons" "channel name" "chaincode" "expected query result"

* Execute a long run specifying a duration in seconds, ./longrun_duration.sh "seconds to execute" "channel name" "chaincode"

* Execute a long run specifying number of executions, ./longrun_executions.sh "number of executons" "channel name" "chaincode"

Scipts that use Node SDK to perform various actions using marbles:

* Execute an end to end run and verify result, ./marbles_test.sh "channel name" "chaincode"

* Execute a long run specifying a duration in seconds, ./longrun_marbles.sh "channel name" "chaincode" "seconds to execute"

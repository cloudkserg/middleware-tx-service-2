# middleware-tx-service [![Build Status](https://travis-ci.org/ChronoBank/middleware-tx-service.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-tx-service)

Middleware service for sending transactions

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go


#### About
This module is used for sending transactions. This happens through the layer, which on built on express.
This module get hex of tx (hex view of tx object) for selected blockchain and send in order, in which user sernding transactions.


#### How does it work?

Tx send service open endpoint http://localhost:{port}/:blockchain for post requests.

```
blockchain = bitcoin|eth|nem|waves
port = REST_PORT from config
```

Every POST request to this endpoint we need send a tx sign structure
and get response with data for assign order.

Response:
```
{ok: true, order: order}
where order = order in database for this transaction
```

Example for bitcoin request:
```
POST http://localhost:8081/bitcoin
body: {tx: 010000000199363a7e27973843aaae9ea7056417302ec3b9ecabed3ae3e90cdcd1a52326b5000000006a47304402203d3fa1080d8406c98f192d281237e5a3790e88eb8b85fbd6d7220ace25d2f7dc022056f7c6ef50a9c797f79e9e9736db88bb9a2106be4be346d89ec5d5100cd2e6790121033e1b6da9f1d8588d5e320df200bff9890d56829ac3df2b06c4f0cc2c14469208ffffffff0164000000000000001976a914f5d7d6fa4ddbcfa21f85e84d68d6e97b2582937b88ac00000000, address: 0x293433453435345}

where 
tx - hex of signed bitcoin transaction
address - from address  for bitcoin transaction
```

Example for eth request:
```
POST http://localhost:8081/eth
body: {tx: 010000000199363a7e27973843aaae9ea7056417302ec3b9ecabed3ae3e90cdcd1a52326b5000000006a4730440220, address: 0x293433453435345}

where 
tx - hex of signed eth transaction
address - from address  for eth transaction
```

Example for nem request:
```
POST http://localhost:8081/nem
body: {tx: tx, address: 0x293433453435345}

where 
tx - JSON.stringify of object {data, signature}
    where data - hex result from serialization transaction
    signature -signature of transaction
    see nem-sdk method announce[second argument] | nem-sdk method send
address - from address  for nem transaction
```

Example for waves request:
```
POST http://localhost:8081/waves
body: {tx: tx, address: 0x293433453435345}

where 
tx - JSON.stringify of waves transaction [for comments see waves documentation - transfer transaction]
{
    transactionType: null, //'transfer',
    senderPublicKey: tx.senderPublicKey,
    assetId: tx.assetId === 'WAVES' ? null : tx.assetId,
    feeAsset: tx.feeAssetId === 'WAVES' ? null : tx.feeAssetId,
    timestamp: tx.timestamp,
    amount: tx.amount,
    fee: tx.fee || MINIMUM_FEE,
    recipient: removeRecipientPrefix(tx.recipient),
    attachment: tx.attachment,
    signature: tx.signature
}
address - from address  for waves transaction
```

After get response, tx in background send to blockchain.
This may finished with two situations.

1 Success
We get rabbitmq message 
with routing = ```serviceName.blockchain.address.order```  
on exchange ```exchange```
message = ```{ok: true, hash: hash}```

```
    serviceName = from config
    blockchain = bitcoin,eth,nem,waves, as in endpoint variable
    address = address from for this transaction
    order = order as get from response

    exchange = from config, default=internal
    hash = hash transaction in blockchain
```

2 Failure
We get rabbitmq message 
with routing = ```serviceName.blockchain.address.order```  
on exchange ```exchange```
message = ```{ok: false, msg: msg}```

```
    serviceName = from config
    blockchain = bitcoin,eth,nem,waves, as in endpoint variable
    address = address from for this transaction
    order = order as get from response

    exchange = from config, default=internal
    msg = error message from blockchain
```

For every request on this endpoint? we create a delay request to node to sendTransaction.
All requests from user orderBy time sended OR nonce in eth blockchain and send in this sequence;

##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
RABBIT_URI=amqp://localhost:5672
ETH_PROVIDERS=http://localhost:8545
BITCOIN_PROVIDERS=/tmp/bitcoin
REST_PORT=8082
```

The options are presented below:

| name | description|
| ------ | ------ |
| REST_PORT   | http port for work this middleware
| MONGO_URI   | the URI string for mongo connection
| MONGO_COLLECTION_PREFIX   | the default prefix for all mongo collections. The default value is 'tx_service'
| RABBIT_EXCHANGE | rabbitmq exchange name - default = internal
| RABBIT_URI   | rabbitmq URI connection string
| RABBIT_SERVICE_NAME   | namespace for all rabbitmq queues, like 'tx_service'
| ETH_PROVIDERS   | the paths to http/ipc eth interface, written with comma sign
| BITCOIN_PROVIDERS   | the paths to http/ip bitcoin interface, written with comma sign
| NEM_PROVIDERS   | the paths to http/ipc nem interface, written with comma sign
| WAVES_PROVIDERS   | the paths to http waves interface, written with comma sign



License
----
 [GNU AGPLv3](LICENSE)


Copyright
----
LaborX PTY

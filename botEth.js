const bcoin = require('bcoin'),
  ProviderService = require('./services/ProviderService'),
  Network = require('bcoin/lib/protocol/network'),
  constants = require('./config/constants').blockchains,

  _ = require('lodash'),
  Promise = require('bluebird'),
  request = require('request-promise'),
  ethers = require('ethers'),
  config = require('./config');




const main = async () => {

  const providerService = new ProviderService(
    constants.eth, 
    config.node[`${constants.eth}`].providers
  );

  
  const connector = await providerService.get();
  const connection = connector.instance.getConnection();
  const accounts = await Promise.promisify(connection.eth.getAccounts)();
  const address = ethers.utils.getAddress('294f3c4670a56441f3133835a5cbb8baaf010f88');

  const address1 = ethers.utils.getAddress(accounts[1]);
  const privateKey = '6b9027372deb53f4ae973a5614d8a57024adf33126ece6b587d9e08ba901c0d2'

  
  const amqp = require('amqplib');
    const amqpInstance = await amqp.connect(this.url);
    const channel = await amqpInstance.createChannel();

  await Promise.all([
    (async () => {
        await Promise.map(_.range(0, 100), async (r) => {
    let nonce = await Promise.promisify(connection.eth.getTransactionCount)(address);

    /*const tx = await Promise.promisify(connection.eth.signTransaction)({
    from: address,
      nonce: nonce+r,
      to: address1,
      value: 10,
      gas: 1
    }, address);*/
    var Tx = require('ethereumjs-tx');
    var privateKeyHex = new Buffer(privateKey, 'hex')

    var rawTx = {
        nonce: nonce+r,
            from: address,
            gas:100000,
                        to: address1,
                            value: "1",
                                data: ""
    };

    var tx = new Tx(rawTx);
    tx.sign(privateKeyHex);

    var serializedTx = tx.serialize();
    //const a = await Promise.promisify(connection.eth.sendSignedTransaction)(serializedTx).timeout(10000);

    const response = await request('http://localhost:8082/eth', {
      method: 'POST',
      json: {tx: '0x' + serializedTx.toString('hex')}
    });
    console.log(response);

  })
    })(),
  (async () => {
    await new Promise(res => {
    let r = 0;
    channel.assertQueue('test_tx_service_eth_features');
    channel.bindQueue('test_tx_service_eth_features', config.rabbit.exchange, `${config.rabbit.serviceName}.eth.*.*`);
    channel.consume('test_tx_service_eth_features', async (data) => {
        const message = JSON.parse(data.content.toString());
        r++;
        console.log(r, message.ok);
        if (r === 100)
            res();
    }, {noAck: true});
  });
  })()
  ]);
  
};

main();

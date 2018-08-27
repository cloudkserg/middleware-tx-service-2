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
  const address = '294f3c4670a56441f3133835a5cbb8baaf010f88';

  const address1 = accounts[1];
  const privateKey = '6b9027372deb53f4ae973a5614d8a57024adf33126ece6b587d9e08ba901c0d2'
  ///await Promise.map(_.range(1, 1), async () => {
    let nonce = await connection.eth.getTransactionCount(address);
    console.log(address, nonce);

    const tx = await connection.eth.accounts.signTransaction({
      nonce: nonce,
      to: address1,
      value: 10,
      gas: 1
    }, privateKey);
    const a = await Promise.promisify(connection.eth.sendSignedTransaction)(tx.rawTransaction).timeout(10000);
    console.log(a);
return;

    const response = await request('http://localhost:8082/eth', {
      method: 'POST',
      json: {tx: tx.rawTransaction, address: address}
    });
    console.log(response);

  //});
  
};

main();
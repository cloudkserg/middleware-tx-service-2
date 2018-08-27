const bcoin = require('bcoin'),
  ProviderService = require('./services/ProviderService'),
  Network = require('bcoin/lib/protocol/network'),
  constants = require('./config/constants').blockchains,

  _ = require('lodash'),
  Promise = require('bluebird'),
  config = require('./config');




const main = async () => {

  const ctx = {};
  ctx.network = Network.get('regtest');
  ctx.keyPair = bcoin.hd.generate(ctx.network);

  const providerService = new ProviderService(
    constants.bitcoin, 
    config.node[`${constants.bitcoin}`].providers
  );

  
  let keyring = new bcoin.KeyRing(ctx.keyPair, ctx.network);
  const connector = await providerService.get();
  const connection = connector.instance.getConnection();
console.log(0);
const  instance = connection;
    await instance.execute('generatetoaddress', [10, keyring.getAddress().toString()]).catch(console.error);
    await instance.execute('generatetoaddress', [10, keyring.getAddress().toString()]).catch(console.error);
  console.log(3);

  ///await Promise.map(_.range(1, 1), async () => {
    console.log(1);
    let coins = await connection.execute(
      'getcoinsbyaddress', [keyring.getAddress().toString()]);

    let inputCoins = _.chain(coins)
      .take(1)
      .transform((result, coin) => {
        result.coins.push(bcoin.coin.fromJSON(coin));
        result.amount += coin.value;
      }, {amount: 0, coins: []})
      .value();
  
    const mtx = new bcoin.MTX();
      console.log(2);
    mtx.addOutput({
      address: keyring.getAddress(),
      value: Math.round(inputCoins.amount * 0.7)
    });
  
    await mtx.fund(inputCoins.coins, {
      rate: 1,
      changeAddress: keyring.getAddress()
    });
  console.log(3);
    mtx.sign(keyring);
    console.log('SDFSDFSDF', mtx.toString('hex'));
  //});
};

main();
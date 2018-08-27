/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const ProviderService = require('../services/ProviderService'),
  constants = require('../config/constants'),
  config = require('../config'),
  Promise = require('bluebird'),
  providers = config.node[`${constants.blockchains.eth}`].providers;
const providerService = new ProviderService(constants.blockchains.eth, providers);

module.exports = {
  isNodeReadyForOrder: async (address, order) => {
    const connector = await providerService.get();
    const connection = connector.instance.getConnection();
    const curOrder = await Promise.promisify(connection.eth.getTransactionCount)(address).timeout(10000);
    return ((curOrder+1) >= order);
  },
  sendTx: async (txModel) => {
    const connector = await providerService.get();
    const connection = await connector.instance.getConnection();
    txModel.hash = await Promise.promisify(connection.eth.sendSignedTransaction)(txModel.raw).timeout(10000);
    await txModel.save();
    return txModel;
  }
};

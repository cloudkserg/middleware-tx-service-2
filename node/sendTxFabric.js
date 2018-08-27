/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const constants = require('../config/constants'),
  _ = require('lodash'),
  models = require('../models');

const senders = {
  [`${constants.blockchains.bitcoin}`]: require('./sendBitcoinTx'),
  [`${constants.blockchains.eth}`]: require('./sendEthTx'),
  [`${constants.blockchains.nem}`]: require('./sendNemTx'),
  [`${constants.blockchains.waves}`]: require('./sendWavesTx'),
};

const tryAfter = () => false;
const haveEarlierTxs = (txs, order) => _.filter(txs, tx => tx.order < order).length > 0;
const haveThisTx = (txs, order) => _.filter(txs, tx => tx.order === order).length > 0;

module.exports = (blockchain) => {
  if (!senders[blockchain])
    throw new Error('Not found sender for blockchain ' + blockchain);
  const sender = senders[blockchain];

  return {
    sendTx: async (address, order) => {
      const txs = await models.txModel
        .find({address, order: {$lte: order}, blockchain})
        .sort('order');
      //skip if not send earler
      if (haveEarlierTxs(txs, order)) 
        return tryAfter();
      
      //error if not has this tx
      if (!haveThisTx(txs, order))
        throw new Error(`Not found this tx order=${order} type=${blockchain} address=${address} in db`);

      //skip if node not ready for order
      if (!await sender.isNodeReadyForOrder(address, order)) 
        return tryAfter();
      
      return await sender.sendTx(txs[0]);
    }
  };
};

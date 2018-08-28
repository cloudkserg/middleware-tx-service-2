/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const constants = require('../config/constants'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'txService.sendTxFabric'}),
  models = require('../models');

const senders = {
  [`${constants.blockchains.bitcoin}`]: require('./sendBitcoinTx'),
  [`${constants.blockchains.eth}`]: require('./sendEthTx'),
  [`${constants.blockchains.nem}`]: require('./sendNemTx'),
  [`${constants.blockchains.waves}`]: require('./sendWavesTx'),
};

const tryAfter = () => false;
const haveEarlierTxs = (txs, order) => _.filter(txs, tx => tx.order < order).length > 0;
const getThisTx = (txs, order) => _(txs).filter(tx => tx.order === order).first();

module.exports = (blockchain) => {
  if (!senders[blockchain])
    throw new Error('Not found sender for blockchain ' + blockchain);
  const sender = senders[blockchain];

  return {
    sendTx: async (address, order) => {
      const txs = await models.txModel
        .find({address, order: {$lte: order}, blockchain, hash: {$exists: false}})
        .sort('order');
      const thisTx = getThisTx(txs, order);
      //error if not has this tx
      if (!thisTx)
        throw new Error(`Not found this tx order=${order} type=${blockchain} address=${address} in db`);
      
      //skip if not send earler
      if (haveEarlierTxs(txs, order)) { 
        log.error(`Try this transaction order=${order} type=${blockchain} address=${address} later - will have earlier txs in db`);
        return tryAfter();
      }
      

      try {
        //skip if node not ready for order
        if (!await sender.isNodeReadyForOrder(address, order)) { 
            log.error(`Try this transaction order=${order} type=${blockchain} address=${address} later - node nonce not ready`);
            return tryAfter();
        }
        return await sender.sendTx(thisTx);
      } catch (e) {
        thisTx.hash = e.toString();
        await thisTx.save();
        throw e;
      }
    }
  };
};

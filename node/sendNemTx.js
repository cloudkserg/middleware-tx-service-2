/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const nem = require('nem-sdk').default,
  config = require('../config');

module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (txModel) => {
    const sendReply = await nem.com.requests.transaction.announce(
      config.nem.endpoint, txModel.raw
    ).catch(e => {throw new Error(e);});

    if (sendReply.code !== 0 && sendReply.code !== 1)
      throw new Error(sendReply.message);
    
    txModel.hash = sendReply.transactionHash.data;
    await txModel.save();
    
    return txModel;
  }
};

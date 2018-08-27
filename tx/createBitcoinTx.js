/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const models = require('../models'),
  bitcoin = require('bitcoinjs-lib'),
  constants = require('../config/constants')['blockchains'];
module.exports = async (txRaw) => {
  const tx = bitcoin.Transaction.fromHex(txRaw);

  const item = new models.txModel();
  item.blockchain = constants.bitcoin;
  item.order = Date.now();
  item.address = tx.from;
  item.raw = txRaw;
  await item.save();

  return item;
};

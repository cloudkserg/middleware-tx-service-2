/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const models = require('../models'),
  constants = require('../config/constants')['blockchains'];

module.exports = async (txRaw) => {
  const item = new models.txModel();
  item.blockchain = constants.nem;
  item.order = Date.now();
  item.address = txRaw.from;
  item.raw = txRaw;
  await item.save();
  return item;
};

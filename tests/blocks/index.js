/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const amqpTests = require('./services/AmqpServer'),
  authTests = require('./services/AuthService'),
  storeTests = require('./services/BindStore'),
  socketTests = require('./services/SocketServer');

module.exports = (ctx) => {
  describe('services/AmqpServer', () => amqpTests(ctx));
  describe('services/AuthService', () => authTests(ctx));
  describe('services/BindStore', () => storeTests(ctx));
  describe('services/SocketServer', () => socketTests(ctx));
};

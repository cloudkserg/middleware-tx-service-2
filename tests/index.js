/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11gmail.com>
 */

require('dotenv/config');
process.env.LOG_LEVEL = 'error';

const config = require('../config'),
  models = require('../models'),
  spawn = require('child_process').spawn,
  fuzzTests = require('./fuzz'),
  performanceTests = require('./performance'),
  featuresTests = require('./features'),
  blockTests = require('./blocks'),
  Promise = require('bluebird'),
  mongoose = require('mongoose'),
  amqp = require('amqplib'),
  ctx = {};

mongoose.Promise = Promise;
mongoose.connect(config.mongo.url, {useNewUrlParser: true});

describe('core/socketService', function () {

  before(async () => {
    models.init();
    ctx.amqp = {};
    ctx.amqp.instance = await amqp.connect(config.rabbit.url);
    ctx.amqp.channel = await ctx.amqp.instance.createChannel();
    await ctx.amqp.channel.assertExchange(config.rabbit.exchange, 'topic', {durable: false});

    ctx.laborxPid = spawn('node', ['tests/utils/laborxProxy.js'], {
      env: process.env, stdio: 'ignore'
    });
    await Promise.delay(10000);
  });

  after(async () => {
    mongoose.disconnect();
    await ctx.amqp.instance.close();
    ctx.laborxPid.kill();
  });


  describe('block', () => blockTests(ctx));
  describe('features', () => featuresTests(ctx));
  describe('fuzz', () => fuzzTests(ctx));
  describe('performance', () => performanceTests(ctx));

});

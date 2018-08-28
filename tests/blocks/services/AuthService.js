/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const expect = require('chai').expect,
  AuthService = require('../../../services/AuthService'),
  EventEmitter = require('events'),
  Promise = require('bluebird'),
  config = require('../../config');
  module.exports = (ctx) => {

  afterEach(async () => {
    if (ctx.amqp.queue)
      await ctx.amqp.channel.deleteQueue(ctx.amqp.queue.queue);
  });


  it('construct without parameters - errors', async () => {
    expect( function(){ new AuthService(); } ).to.throw();
  });

  it('construct with right parameters', async () => {
    const server = new AuthService(config.laborx);
    expect(server.url).to.equal(config.laborx.url);
    expect(server).instanceOf(AuthService);
    expect(server).instanceOf(EventEmitter);
  });

  it('initAuth - check that get unauth after timeout', async () => {
    const server = new AuthService(config.laborx);

    let isGetUnauth = false;
    server.on(server.UNAUTH, msg => {
      expect(msg.connectionId).to.equal(50);
      isGetUnauth = true;
    });
    server.initAuth(50);
    await Promise.delay(server.TIMEOUT + 500);
    expect(isGetUnauth).to.equal(true);
  });

  it('initAuth, finishAuth - check that get unauth for empty authenticated data', async () => {
    const server = new AuthService(config.laborx);

    let isGetUnauth = false;
    server.on(server.UNAUTH, msg => {
      expect(msg.connectionId).to.equal(50);
      isGetUnauth = true;
    });

    server.initAuth(50);
    await server.finishAuth(50, {});

    await Promise.delay(server.TIMEOUT + 500);
    expect(isGetUnauth).to.equal(true);
  });

  it('initAuth, finishAuth - check that get unauth for wrong authenticated data', async () => {
    const server = new AuthService(config.laborx);

    let isGetUnauth = false;
    server.on(server.UNAUTH, msg => {
      expect(msg.connectionId).to.equal(50);
      isGetUnauth = true;
    });

    server.initAuth(50);
    await server.finishAuth(50, {token: '324234234'});

    await Promise.delay(server.TIMEOUT + 500);
    expect(isGetUnauth).to.equal(true);
  });


  it('initAuth, finishAuth - check that get auth for right authenticated data', async () => {
    const server = new AuthService(config.laborx);

    let isGetUnauth = false;
    server.on(server.UNAUTH, msg => {
      expect(msg.connectionId).to.equal(50);
      isGetUnauth = true;
    });
    let isGetAuth = false;
    server.on(server.AUTH_OK, msg => {
      expect(msg.connectionId).to.equal(50);
      isGetAuth = true;
    });

    server.initAuth(50);
    await server.finishAuth(50, {token: config.dev.laborx.token});

    await Promise.delay(server.TIMEOUT + 500);
    
    expect(isGetUnauth).to.equal(false);
    expect(isGetAuth).to.equal(true);
  });




};

/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config'),
  spawn = require('child_process').spawn,
  _ = require('lodash'),
  W3CWebSocket = require('websocket').w3cwebsocket,
  WebSocketAsPromised = require('websocket-as-promised'),
  expect = require('chai').expect,
  rimraf = require('rimraf'),
  fs = require('fs'),
  Promise = require('bluebird');


const createClient = () => {
  return new WebSocketAsPromised(`ws://localhost:${config.ws.port}/`, {
    createWebSocket: url => new W3CWebSocket(url),
    packMessage: data => JSON.stringify(data),
    unpackMessage: message => JSON.parse(message)
  });
};
  
const startClient = async (routing = 'app_eth.transaction.*') => {
  const client = createClient();
  await client.open();
  await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

  await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
  await Promise.delay(4000);

  return client;
};

const sendMessage = async (ctx, routing = 'app_eth.transaction.123') => {
  await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
    tx: 123
  })));
};

module.exports = (ctx) => {
  it('validate start with clear db', async () => {
    await new Promise(res => rimraf(config.db.file, res));
    fs.mkdirSync(config.db.file);
    fs.writeFileSync(config.db.file + '/CURRENT', 'Hello Node.js');
    ctx.socketPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);

    await Promise.all([
      (async () => {
        const client = await startClient('abba');
        await new Promise(res => {
          client.onUnpackedMessage.addListener(async (getData) => {
            expect(getData.routing).to.equal('abba');
            res();
          });
        });
        await client.close();
      })(),
      (async () => {
        await Promise.delay(5000);
        await sendMessage(ctx, 'abba');
      })()
    ]);

    ctx.socketPid.kill();
  });
};

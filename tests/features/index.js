/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const models = require('../../models'),
  config = require('../config'),
  _ = require('lodash'),
  W3CWebSocket = require('websocket').w3cwebsocket;
  WebSocketAsPromised = require('websocket-as-promised'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  spawn = require('child_process').spawn;


createClient = () => {
  return new WebSocketAsPromised(`ws://localhost:${config.ws.port}/`, {
    createWebSocket: url => new W3CWebSocket(url),
    packMessage: data => JSON.stringify(data),
    unpackMessage: message => JSON.parse(message)
  });
};

module.exports = (ctx) => {

  before(async () => {
    await models.profileModel.remove({});

    ctx.socketPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(5000);
  });


  it('connect to server and after 20 sec close without auth', async () => {
    const client = createClient();
    
    await client.open();
    const result = await new Promise(res => client.onClose.addListener(event => {
      res('close');
    })).timeout(10000);

    expect(result).to.equal('close');
  });




  it('connect to server and close with unright auth', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: 'sdfsdfsdfsdf'});

    const result = await new Promise(res => client.onClose.addListener(event => {
      res('close');
    })).timeout(10000);

    expect(result).to.equal('close');
  });


  it('connect to server and auth with right auth and get ok', async () => {
    const client = createClient();
    await client.open();

    await Promise.all([
      new Promise(res => client.onUnpackedMessage.addListener(data => {
        expect(data.ok).to.equal(true);
        res();
      })),
      (async() => {
        await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});
      })()
    ]).timeout(20000);

    await client.close();
  });


  it('connect to server and get one message app_eth.transaction.123', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    const data = {
      tx: 1213
    };
    const routing = 'app_eth.transaction.123';
    await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
    await Promise.delay(4000);

    await Promise.all([
      new Promise(res => client.onUnpackedMessage.addListener(getData => {
        expect(getData.routing).to.equal(routing);
        expect(getData.data.tx).to.equal(data.tx);
        res();
      })),
      (async() => {
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify(data)));
      })()
    ]).timeout(20000);

    await client.close();
  });
  


  it('connect to server and get two messages from app_eth.transaction.123 and not from another routing', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    const routing = 'app_eth.transaction.123';
    await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
    await Promise.delay(4000);

    await Promise.all([
      new Promise(res => {
        let countMsgs = 0;
        client.onUnpackedMessage.addListener(getData => {
          expect(getData.routing).to.equal(routing);
          countMsgs++;
          if (countMsgs == 2)
            res();
        })
      }),
      (async() => {
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx: 123
        })));
        await ctx.amqp.channel.publish('events', 'abba', new Buffer(JSON.stringify({
          tx:125
        })));
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx:124
        })));
      })()
    ]).timeout(20000);

    await client.close();
  });


  it('connect to server, subscribes to abba, routing; unsubscribe from abba, and get two messages from routing', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    const routing = 'app_eth.transaction.123';
    await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
    await client.sendPacked({type: 'SUBSCRIBE', routing: 'abba'});
    await Promise.delay(4000);

    await Promise.all([
      (async () => {
        const result = await new Promise(res => {
          let countMsgs = 0;
          client.onUnpackedMessage.addListener(getData => {
            countMsgs++;
            if (countMsgs == 2)
              res(getData.routing);
          })
        });
        expect(result).to.equal(routing);
      })(),  
,
      (async() => {
        await client.sendPacked({type: 'UNSUBSCRIBE', routing: 'abba'});
        await Promise.delay(1000);
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx: 123
        })));
        await ctx.amqp.channel.publish('events', 'abba', new Buffer(JSON.stringify({
          tx:routing
        })));
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx:'abba'
        })));
      })()
    ]).timeout(20000);

    await client.close();
  });

  it('connect to server and get three message from app_eth.transaction.123, abba', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    const routing = 'app_eth.transaction.123';
    await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
    await client.sendPacked({type: 'SUBSCRIBE', routing: 'abba'});
    await Promise.delay(4000);

    const result = await Promise.all([
      new Promise(res => {
        let countMsgs = 0;
        client.onUnpackedMessage.addListener(getData => {
          countMsgs++;
          if (countMsgs == 3)
            res(getData.data.tx);
        })
      }),
      (async() => {
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx: 123
        })));
        await Promise.delay(1000);
        await ctx.amqp.channel.publish('events', routing, new Buffer(JSON.stringify({
          tx:routing
        })));
        await ctx.amqp.channel.publish('events', 'abba', new Buffer(JSON.stringify({
          tx:'abba'
        })));
      })()
    ]).timeout(20000);

    await client.close();
  });
  


  it('connect to server and get three message from *', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    await client.sendPacked({type: 'SUBSCRIBE', routing: '*'});
    await Promise.delay(4000);

    const result = await Promise.all([
      new Promise(res => {
        let countMsgs = 0;
        client.onUnpackedMessage.addListener(getData => {
          countMsgs++;
          if (countMsgs == 3)
            res(getData.routing);
        })
      }),
      (async() => {
        await ctx.amqp.channel.publish('events', 'app_eth.transaction.123', new Buffer(JSON.stringify({
          tx: 123
        })));
        await ctx.amqp.channel.publish('events', 'app_eth.transaction.256', new Buffer(JSON.stringify({
          tx:256
        })));
        await ctx.amqp.channel.publish('events', 'abba', new Buffer(JSON.stringify({
          tx:'abba'
        })));
      })()
    ]).timeout(20000);

    await client.close();
  });

  it('connect to server and get two messages from app_eth.transaction.*', async () => {
    const client = createClient();
    await client.open();
    await client.sendPacked({type: 'AUTH', token: config.dev.laborx.token});

    await client.sendPacked({type: 'SUBSCRIBE', routing: 'app_eth.transaction.*'});
    await Promise.delay(4000);

    const result = await Promise.all([
      new Promise(res => {
        let countMsgs = 0;
        client.onUnpackedMessage.addListener(getData => {
          countMsgs++;
          if (countMsgs == 2)
            res(getData.data.tx);
        })
      }),
      (async() => {
        await ctx.amqp.channel.publish('events', 'app_eth.transaction.123', new Buffer(JSON.stringify({
          tx: 123
        })));
        await ctx.amqp.channel.publish('events', 'abba', new Buffer(JSON.stringify({
          tx:'abba'
        })));
        await ctx.amqp.channel.publish('events', 'app_eth.transaction.256', new Buffer(JSON.stringify({
          tx:256
        })));
      })()
    ]).timeout(20000);

    expect(result[0]).to.equal(256);

    await client.close();
  });

  

  after('kill environment', async () => {
    ctx.socketPid.kill();
  });


};

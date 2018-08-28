/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */


const config = require('../config'),
  models = require('../../models'),
  spawn = require('child_process').spawn,
  _ = require('lodash'),
  W3CWebSocket = require('websocket').w3cwebsocket,
  WebSocketAsPromised = require('websocket-as-promised'),
  memwatch = require('memwatch-next'),
  AmqpServer = require('../../services/AmqpServer'),
  SocketServer = require('../../services/SocketServer'),
  BindStore = require('../../services/BindStore'),
  expect = require('chai').expect,
  amqp = require('amqplib'),
  http = require('http'),
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

  before (async () => {
    await models.profileModel.remove({});
  });

  it('validate socket service performance', async () => {

    let hd = new memwatch.HeapDiff();

    const httpServer = http.createServer(function (request, response) {
      response.writeHead(404);
      response.end();
    });
    httpServer.listen(config.ws.port);
    const socketServer = new SocketServer(httpServer);
    await socketServer.start();

    const clients = await Promise.map(_.range(0, 10), async (x) => {
      return await startClient();
    });

    expect(clients.length).to.equal(10);
    expect(_.values(socketServer._connections).length).to.equal(10);

    await Promise.map(_.values(socketServer._connections), async (conn) => {
      return await socketServer.send(conn.id, 'abba', 'message');
    });

    await Promise.delay(6000);


    await Promise.map(clients, async (client) => {
      await client.close();
    })


    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);
    
    await socketServer.shutdown();
    await httpServer.close();
  });


  it('validate bind store performance', async () => {
    let hd = new memwatch.HeapDiff();

    let store = new BindStore(config.db);
    await store.start();

    await Promise.map(_.range(1, 100), async (r) => {
      await store.addBind(r, 'abba');
    });

    await Promise.map(_.range(1, 100), async (r) => {
      await store.delBind(r, 'abba');
    });

    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);
  });


  it('validate tx notification speed', async () => {
    ctx.socketPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);

    let start = Date.now();
    let end;

    await Promise.all([
      (async () => {
        await Promise.map(_.range(1, 10), async (number) => {
          const client = await startClient('routing' + number);
          await new Promise(res => {
            client.onUnpackedMessage.addListener(async (getData) => {
              expect(getData.routing).to.equal('routing' + number);
              res();
            });
          });
          await client.close();
        });
      })(),
      (async () => {
        await Promise.delay(10000);
        await Promise.map(_.range(1, 10), async (number) => {
          await sendMessage(ctx, 'routing' + number);
        });
      })()
    ]);

    end = Date.now();

    expect(end - start).to.be.below(50000);
    ctx.socketPid.kill();
  });


};

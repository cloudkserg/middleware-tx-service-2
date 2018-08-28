/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const expect = require('chai').expect,
  EventEmitter = require('events'),
  SocketServer = require('../../../services/SocketServer'),
  Promise = require('bluebird'),
  W3CWebSocket = require('websocket').w3cwebsocket,
  WebSocketAsPromised = require('websocket-as-promised'),
  http = require('http'),
  config = require('../../config');

const createClient = () => {
  return new WebSocketAsPromised(`ws://localhost:${config.ws.port}/`, {
    createWebSocket: url => new W3CWebSocket(url),
    packMessage: data => JSON.stringify(data),
    unpackMessage: message => JSON.parse(message)
  });
};

module.exports = (ctx) => {

  before(async () => {
    this.httpServer = http.createServer(function (request, response) {
      response.writeHead(404);
      response.end();
    });
    this.httpServer.listen(config.ws.port, function () {
    });
  });

  after(async () => {
    this.httpServer.close();
  });


  it('construct with right parameters', async () => {
    const server = new SocketServer(this.httpServer);
    expect(server).instanceOf(EventEmitter);
    expect(server).instanceOf(SocketServer);
  });


  it('start() and shutdown() - check that up', async () => {
    const server = new SocketServer(this.httpServer);
    await server.start();

    expect(server._connections).deep.equal({});

    await server.shutdown();
  });

  it('send(), OPEN_TYPE event, CLOSE_TYPE event - connect to socketServer, send message from it and close', async()=> {
    const server = new SocketServer(this.httpServer);
    await server.start();

    const routing = 'routinh';
    const data = {bart: 1};
    await Promise.all([
      (async () => {
        const client = await createClient();
        await client.open();
        await new Promise(res => {
          client.onUnpackedMessage.addListener(async (getData) => {
            expect(getData.data).deep.equal(data);
            expect(getData.routing).deep.equal(routing);
            res();
          });
        });
        await client.close();
      })(),
      (async () => {
        let clientId;
        await new Promise(res => server.on(server.OPEN_TYPE, data => {
         clientId =  data.connectionId;
         res(); 
        }));
        await Promise.delay(500);
        await server.send (clientId, routing, data);
        await new Promise(res => server.on(server.CLOSE_TYPE, data => {
          expect(data.connectionId).to.equal(clientId);
          res();
        }));
      })()
    ]);
  });

  it('sendOk(), OPEN_TYPE event, CLOSE_TYPE event - connect to socketServer, send message from it and close', async()=> {
    const server = new SocketServer(this.httpServer);
    await server.start();

    await Promise.all([
      (async () => {
        const client = await createClient();
        await client.open();
        await new Promise(res => {
          client.onUnpackedMessage.addListener(async (getData) => {
            expect(getData.ok).deep.equal(true);
            res();
          });
        });
        await client.close();
      })(),
      (async () => {
        let clientId;
        await new Promise(res => server.on(server.OPEN_TYPE, data => {
          clientId =  data.connectionId;
          res(); 
        }));
        await Promise.delay(500);
        await server.sendOk(clientId);
        await new Promise(res => server.on(server.CLOSE_TYPE, data => {
          expect(data.connectionId).to.equal(clientId);
          res();
        }));
      })()
    ]);

    await server.shutdown();
  });


  it('from client SUBSCRIBE TYPE - get SUBSCRIBE_TYPE', async()=> {
    const server = new SocketServer(this.httpServer);
    await server.start();

    const routing = 'routing';
    await Promise.all([
      (async () => {
        const client = await createClient();
        await client.open();
        await client.sendPacked({type: 'SUBSCRIBE', routing: routing});
        await client.close();
      })(),
      (async () => {
        let clientId;
        await new Promise(res => server.on(server.OPEN_TYPE, data => {
          clientId =  data.connectionId;
          res(); 
        }));
        await new Promise(res => server.on(server.SUBSCRIBE_TYPE, data => {
          expect(data.connectionId).to.equal(clientId);
          expect(data.routing).to.equal(routing);
          res();
        }));
      })()
    ]);
    await server.shutdown();
  });

  it('from client UNSUBSCRIBE TYPE - get SUBSCRIBE_TYPE', async()=> {
    const server = new SocketServer(this.httpServer);
    await server.start();

    const routing = 'routing';
    await Promise.all([
      (async () => {
        const client = await createClient();
        await client.open();
        await client.sendPacked({type: 'UNSUBSCRIBE', routing: routing});
        await client.close();
      })(),
      (async () => {
        let clientId;
        await new Promise(res => server.on(server.OPEN_TYPE, data => {
          clientId =  data.connectionId;
          res(); 
        }));
        await new Promise(res => server.on(server.UNSUBSCRIBE_TYPE, data => {
          expect(data.connectionId).to.equal(clientId);
          expect(data.routing).to.equal(routing);
          res();
        }));
      })()
    ]);
    await server.shutdown();
  });
      
  it('from client AUTH TYPE - get AUTH_TYPE with token', async()=> {
    const server = new SocketServer(this.httpServer);
    await server.start();

    const routing = 'routing';
    const token = 123;
    await Promise.all([
      (async () => {
        const client = await createClient();
        await client.open();
        await client.sendPacked({type: 'AUTH', token});
        await client.close();
      })(),
      (async () => {
        let clientId;
        await new Promise(res => server.on(server.OPEN_TYPE, data => {
          clientId =  data.connectionId;
          res(); 
        }));
        await new Promise(res => server.on(server.AUTH_TYPE, data => {
          expect(data.connectionId).to.equal(clientId);
          expect(data.token).to.equal(token);
          res();
        }));
      })()
    ]);
    await server.shutdown();
  });

};

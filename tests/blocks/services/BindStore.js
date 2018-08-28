/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const expect = require('chai').expect,
  BindStore = require('../../../services/BindStore'),
  EventEmitter = require('events'),
  fs = require('fs'),
  Promise = require('bluebird'),
  rimraf = require('rimraf'),
  config = require('../../config');
  module.exports = (ctx) => {

  afterEach(async () => {
    if (ctx.amqp.queue)
      await ctx.amqp.channel.deleteQueue(ctx.amqp.queue.queue);
  });


  it('construct without parameters - errors', async () => {
    expect( function(){ new BindStore(); } ).to.throw();
  });

  it('construct with right parameters', async () => {
    const server = new BindStore(config.db);
    expect(server._file).to.equal(config.db.file);
    expect(server).instanceOf(BindStore);
    expect(server).instanceOf(EventEmitter);
  });

  it('start - check if file exists, file dropped and all work', async () => {
    await new Promise(res => {
      rimraf(config.db.file, res);
    });
    fs.writeFileSync(config.db.file, 'baobab');
    const server = new BindStore(config.db);
    await server.start();
    await server._set('key', 'val');
    expect(await server._get('key')).to.equal('val');

    await server.close();
  });

  it('start - check if file not exists, file created and all work', async () => {
    await new Promise(res => {
      rimraf(config.db.file, res);
    });

    const server = new BindStore(config.db);
    await server.start();
    await server._set('key', 'val');
    expect(await server._get('key')).to.equal('val');

    await server.close();
  });

  it('getConnections - for empty db - get []', async () => {
    const server = new BindStore(config.db);
    await server.start();

    expect(await server.getConnections('test')).deep.equal([]);

    await server.close();
  });

  it('addBind, getConnections - for full db - get right connections', async () => {
    const server = new BindStore(config.db);
    await server.start();

    await server.addBind(50, 'app_eth.*');
    await server.addBind(51, 'app_eth.transaction.*');
    await server.addBind(52, 'app_waves.transaction.*'); //not
    await server.addBind(53, 'app_eth.transaction.124'); //not
    await server.addBind(54, 'app_eth.transaction.123');

    expect(await server.getConnections('app_eth.transaction.123')).deep.equal([
      54,50,51
    ]);

    await server.close();
  });


  it('delBindAll - for empty db - all empty', async () => {
    const server = new BindStore(config.db);
    await server.start();

    await server.delBindAll(50);

    expect(await server.getConnections('app_eth.transaction.123')).deep.equal([]);

    await server.close();
  });

  it('delBindAll - for full db - all empty', async () => {
    const server = new BindStore(config.db);
    await server.start();

    await server.addBind(50, 'test')
    await server.addBind(51, 'test1')
    await server.delBindAll(50);

    expect(await server.getConnections('test')).deep.equal([]);
    expect(await server.getConnections('test1')).deep.equal([51]);

    await server.close();
  });


  it('delBind - for empty db - all empty', async () => {
    const server = new BindStore(config.db);
    await server.start();
    await server.delBind(50, 'test');
    expect(await server.getConnections('test')).deep.equal([]);
    await server.close();
  });

  it('delBind - for full db - only this del', async () => {
    const server = new BindStore(config.db);
    await server.start();
    await server.addBind(50, 'test');
    await server.addBind(50, 'test2');
    await server.delBind(51, 'test');

    expect(await server.getConnections('test')).deep.equal([50]);
    expect(await server.getConnections('test2')).deep.equal([50]);
    await server.close();
  });


  it('ADD_BIND event - add new bind for app_eth.transaction.* from app_eth.transaction.123', async () => {
    const server = new BindStore(config.db);
    await server.start();
    await Promise.all([
      (async () => {
        await server.addBind(50, 'app_eth.transaction.123');
      })(),
      new Promise(res => {
        server.on(server.ADD_BIND, msg => {
          expect(msg).to.equal('app_eth.transaction.*');
          res();
        });
      })
    ]);

    await server.close();
  });

  it('ADD_BIND event - add new bind for app_eth.transaction from app_eth.transaction', async () => {
    const server = new BindStore(config.db);
    await server.start();
    await Promise.all([
      (async () => {
        await server.addBind(50, 'app_eth.transaction');
      })(),
      new Promise(res => {
        server.on(server.ADD_BIND, msg => {
          expect(msg).to.equal('app_eth.transaction');
          res();
        });
      })
    ]);

    await server.close();
  });

  it('ADD_BIND event - not generate for already created', async () => {
    const server = new BindStore(config.db);
    await server.start();
    await server.addBind(50, 'app_eth.transaction.123');

    await Promise.all([
      (async () => {
        await server.addBind(51, 'app_eth.transaction.124');
      })(),
      (async () => {
        const addOrNot = await new Promise(res => {
          server.on(server.ADD_BIND, msg => {
            res('add');
          });
        }).timeout(500).catch(() => 'timeout');
        expect(addOrNot).to.equal('timeout');
      })()
    ]);

    await server.close();
  });



};

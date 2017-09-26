/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

const JSONDB = require('./index.js');
const db = new JSONDB('sJsonDB_local');
db.init();

function test1() {
  db.createDB('test').then((res) => {
    console.log('test 1 passed with msg: ' + res);
    test2();
  }).catch((err) => {
    console.log('test 1 passed with err: ' + err);
    test2();
  });
}

function test2() {
  db.execute('createTable', 'test', 'test').then((res) => {
    console.log('test 2.1 passed with msg: ' + res);
  }).catch((err) => {
    console.log('test 2.1 failed with err: ' + err);
  });
  console.log('test 2.1 waiting to resolve');

  db.execute('createTable', 'test', 'test').then((res) => {
    console.log('test 2.2 passed with msg: ' + res);
  }).catch((err) => {
    console.log('test 2.2 failed with err: ' + err);
  });
  console.log('test 2.2 waiting to resolve');

  db.execute('insert', 'test', 'test',
             {a: 'Hello', b: 'World',
              equals: (obj, other) => {
                return obj.a == other.a && obj.b == other.b;
              }}).then((res) => {
                console.log('insert 1 resolve: '+res);
              }).catch((err) => {
                console.log('insert 1 reject: '+err);
              });
  console.log('insert 1 waiting for resolve');

  db.execute('insert', 'test', 'test2',
             {a: 'Hello', b: 'World',
              equals: (obj, other) => {
                return obj.a == other.a && obj.b == other.b;
              }}).then((res) => {
                console.log('insert 1 resolve: '+res);
              }).catch((err) => {
                console.log('insert 1 reject: '+err);
              });
  console.log('insert 2 waithing for resolve');

  db.execute('createTable', 'test', 'test2').then((res) => {
    console.log('test 2.3 passed with msg: ' + res);
    test3();
  }).catch((err) => {
    console.log('test 2.3 failed with err: ' + err);
    test3();
  });
  console.log('test 2.3 waiting to resolve');

  db.execute('insert', 'test', 'test2',
             {a: 'Hello', b: 'World',
              equals: (obj, other) => {
                return obj.a == other.a && obj.b == other.b;
              }}).then((res) => {
                console.log('insert 1 resolve: '+res);
              }).catch((err) => {
                console.log('insert 1 reject: '+err);
              });
  console.log('insert 3 waiting for resolve');
}

function test3 () {
  db.execute('insert', 'test', 'test',
             {a: 'Hello', b: 'World',
              equals: (obj, other) => {
                return obj.a == other.a && obj.b == other.b;
              }}).then((res) => {
                console.log(res);
              }).catch((err) => {
                console.log(err);
              });
}

test1();

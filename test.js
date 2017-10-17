/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

class Item {

  constructor (val) {
    this.a = val;
    this.b = val * 2;
    this.c = this.b * val;
  }

}

const db = require('./index.js')('sJsonDB_local');
console.log('init passed\n\n');

let localDB = [];

function testCreateDB () {
  db.createDB('testDB').then((res)=>{
    console.log('Test createDB passed | ', res.humanreadable);
    console.log('\n\n');
    testTableDuplecate();
  }).catch((err)=>{
    console.log('Test createDB failed | ', err.message);
  });
}

function testTableDuplecate () {
  db.execute('createTable', 'testDB', 'testTable', new Item(2)).then((res)=>{
    console.log('Test Duplicate Table 1st table created | ', res.humanreadable);
  }).catch((err)=>{
    console.log('Test Duplicate Table 1st table failed | ', err.message);
  });

  db.execute('createTable', 'testDB', 'testTable').then((res)=>{
    console.log('\n\nTest Duplicate Table failed | ', res.humanreadable);
  }).catch((err)=>{
    console.log('\n\nTest Duplicate Table passed | ', err.message);
    console.log('\n\n');
    testInsert();
  });
}

function testInsert () {
  let newItem = new Item(4);
  localDB.push(newItem);
  db.execute('insert', 'testDB', 'testTable', newItem).then((res) => {
    console.log('Test insert 1.0 passed | ', res.humanreadable);
  }).catch((err) => {
    console.log('Test insert 1.0 failed | ', err.message);
  });

  let nextItem = {a: 3, c:14, d: 0};
  db.execute('insert', 'testDB', 'testTable', nextItem).then((res) => {
    console.log('Test insert 1.1 failed | ', res.humanreadable);
  }).catch((err) => {
    console.log('Test insert 1.1 passed | ', err.message);
    console.log('\n\n');
    testSelect();
  });
}

function testSelect () {
  db.execute('select', 'testDB', 'testTable', {a:4}).then((res) => {
    console.log(JSON.stringify(res.res[0]) + ' | ' + JSON.stringify(localDB[0]));
    if (JSON.stringify(res.res[0]) == JSON.stringify(localDB[0])) {
      console.log('Test select passed | ', res.humanreadable);
    } else {
      console.log('Test select failed | no match');
    }
    console.log('\n\n');
    testDelete();
  }).catch((err) => {
    console.log('Test select failed | ', err.members);
  });
}

function testDelete () {
  console.log('Delete test');
  db.execute('delete', 'testDB', 'testTable', {a: 4}).then((res) => {
    console.log(res);
    console.log(JSON.stringify(res.res[0]), JSON.stringify(localDB[0]));
    if (JSON.stringify(res.res[0]) == JSON.stringify(localDB[0])) {
      console.log('Test delete 1.0 passed | deleted correct object');
    } else {
      console.log("Test delete 1.0 failed | deleted wrong object");
    }
    db.execute('select', 'testDB', 'testTable', {a:4}).then((res) => {
      if (res.res.length == 0) {
        console.log('Test delete 1.1 passed | object no longer in database');
      } else {
        console.log('Test delete 1.1 failed | object still there');
      }
    }).catch((err) => {
      console.log('Test delete failed | select failed');
    });
  }).catch((err) => {
    console.log('Test delete failed | ', err);
  });
}

testCreateDB();

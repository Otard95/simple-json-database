/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

const JSONDB = require('./index.js');
const db = new JSONDB('sJsonDB_local');
db.init();
console.log('init passed');

function testCreateDB () {
  db.createDB('testDB').then((res)=>{
    console.log('Test createDB passed | ' + res);
  }).catch((err)=>{
    console.log('Test createDB failed | ' + err);
  });
}

function testTableDuplecate () {
  db.execute('createTable', 'testDB', 'testTable').then((res)=>{
    console.log('Test Duplicate Table 1st table created');
  }).catch((err)=>{
    console.log('Test Duplicate Table 1st table failed | ' + err);
  });

  db.execute('createTable', 'testDB', 'testTable').then((res)=>{
    console.log('Test Duplicate Table failed | ' + res);
  }).catch((err)=>{
    console.log('Test Duplicate Table passed | ' + err);
  });
}

/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

const fs        = require('fs');
const path      = require('path');
const FileLock  = require('./bin/fileLock.js');
const Table     = require('./bin/table.js');
const util      = require('./bin/util.js');

module.exports = class {

  constructor(dbLocation /* the folder to contain the json databases(relative path) */) {
    this.baseDir = path.resolve(process.cwd(), dbLocation);
    this.fileLock = {};
  }

  init () {
    /*
     *  ### We'd like to store our databases in its own folder so make sure it exists
     */
    var exists = fs.existsSync(this.baseDir);
    if (!exists) { // Create it
      fs.mkdirSync(this.baseDir);

      // make sure that the folder got created
      exists = fs.existsSync(this.baseDir);
      if (!exists) { // Throw error and exit
        throw 'Could not create Database directory -- can\'t continue.';
        // process.exit(1);
      } else {
        console.log('Dir \''+ this.baseDir +'\' created!\n');
      }
    } else {
      console.log('Dir \''+ this.baseDir +'\' exists!\n');
    }
  }

  /*
   *	###	Helper Methods
   */

  // return a bool depending on if the file is locked
  isLocked (db) {
    var isLocked = this.fileLock.hasOwnProperty(db);
    if (isLocked) return true;
    return false;
  }

  // A Synchronous function that locks adatabese(.json)
  lockSync (db) {
    if (!this.isLocked(db)) {
      this.fileLock[db] = new FileLock();
      return true;
    }
    return false;
  }

  // A Synchronous function that unlocks adatabese(.json)
  unlockSync (db) {
    if (this.isLocked(db)) {
      delete this.fileLock[db];
      return true;
    }
    return false;
  }

  /*
   *	###	Main Methods
   */

  // Creates a database(.json) if it doesn't allready exist
  //Synchronous function
  createDB (name) {
    return new Promise((resolve, reject) => {

      // make sure the json doesn't allready exist
      var file = path.resolve(this.baseDir, name + '.json');
      var exists = fs.existsSync(file);
      if (exists) {
        reject('There is already a record of this databases');
        return;
      }

      // set up data and options
      var data = '{\n\n}';
      var options = {};
      options.flag = 'wx';

      // create the new db
      fs.writeFile(file, data, options, (err) => {
        if (err) {reject(err); return;}
        resolve('Created the database \'' + name + '\'');
      });

    });
  }

  // This is the main methud used to execute any action on any database(.json)
  // it hanles the database files and makes sure only one opperation is exequted at any given time
  //
  execute (opperation, db, tabel, obj) {

    var file = path.resolve(this.baseDir, db + '.json'); // db file

    // The job that is the executor of the promise that is to be returned
    var job = (resolve, reject) => {

      setTimeout(()=>{ // We use a timeout just to give the caller
                       // those fractions of a ms to return the promises

        // find and complete opperation
        var ret;
        switch (opperation) {
          case 'createTable':
            ret = this._createTable(db, tabel, obj);
            break;
          case 'insert':
            ret = this._insert(db, tabel, obj);
            break;
          default:
            throw 'There is no opperation \''+ opperation +'\'';
        }

        // resolve or reject
        if (ret.status) {
          resolve(ret.val);
        } else {
          reject(ret.val);
        }

        // remove this job from jobs
        this.fileLock[db].jobs.shift();
        if (this.fileLock[db].canUnlock()) {
          this.unlockSync(db);
        }

      }, 0.1);

    };

    // make sure the database(.json) is locked before doing anything to it
    if (this.isLocked(db)) {
      // the file is allready locked
      // add job to be done on locked file

      var jobsLength = this.fileLock[db].jobs.length;
      var lastJob = this.fileLock[db].jobs[jobsLength-1];

      var p = new Promise((resolve, reject) => {

        lastJob.then((ret) => {

          job(resolve, reject);

        }).catch(() => {

          job(resolve, reject);

        });

      });

      this.fileLock[db].jobs.push(p);
      return p;

    } else {
      // the file is not locked
      // lock the file and add the job

      if (this.lockSync(db)) {

        let p = new Promise(job);
        this.fileLock[db].jobs.push(p);
        return p;

      } else { // The database(.json) could for some reason be locked
        return new Promise((resolve, reject)=>{
          reject('Could not lock db');
        });
      }
    } // END if else
  }

  /*
   *  ###  Private Methuds
   */

  // Synchronous opperation on locked database(.json)
  // this will atempt to crate a new table in a database
  _createTable (db, tableName, template) {
    //                 all ok   error    resolve  reject
    //                     V      V           V    V
    // returns {status: [true | false], val: msg/reson}

    var file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    var exists = fs.existsSync(file);
    if (!exists) {
      return {status: false, val: 'There is no database with that name.'};
    }

    // get the database
    var dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe doesn't allready exist
    var table = dbContent[tableName];
    if (table) {
      return {status: false, val: 'Tabe allready exists.'};
    }

    // create the table
    dbContent[tableName] = new Table(template);

    // save to file
    var data = JSON.stringify(dbContent);

    fs.writeFileSync(file, data);

    return {status: true, val: 'Table \''+ tableName +'\' created.'};
  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to insert an object into the database
  _insert (db, tableName, obj) {
    //                 all ok   error    resolve  reject
    //                     V      V           V    V
    // returns {status: [true | false], val: msg/reson}

    var file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    var exists = fs.existsSync(file);
    if (!exists) {
      return {status: false, val: 'There is no database with that name.'};
    }

    // get the database
    var dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe doesn't allready exist
    var table = dbContent[tableName];
    if (!table) {
      return {status: false, val: 'Tabe doesn\'t exists.'};
    }

    // if there is a specified template make sure obj confoms
    if (table.template) {
      // clone template as it will be destroyed
      var clone = JSON.parse(JSON.stringify(table.template));
      if (util.matchTemplate(obj, clone)) {
        return {status: false, val: 'Object doesn\'t confom to the template'};
      }
    }

    // if obj has equals check to make sure its not equal to any other of the objects
    if (obj.hasOwnProperty('equals')) {
      for (var i = 0; i < table.rows.length; i++) {
        if (obj.equals(obj, table.rows[i])) {
          return {status: false, val: 'Duplicate of existing row.'};
        }
      }
    }

    table.rows.push(obj);

    // save to file
    var data = JSON.stringify(dbContent);

    fs.writeFileSync(file, data);

    return {status: true, val: 'Inserted into table \''+ tableName +'\'.'};
  }

};

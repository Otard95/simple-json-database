/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

const fs        = require('fs');
const path      = require('path');
const FileLock  = require('./bin/fileLock.js');
const Table     = require('./bin/table.js');
const util      = require('./bin/util.js');
const Response  = require('./bin/response.js');

class simple_json_database {

  constructor(dbLocation /* the folder to contain the json databases(relative path) */,
              saveFormated /* default = false */) {
    if (saveFormated == undefined) saveFormated = false;
    this.baseDir = path.resolve(process.cwd(), dbLocation);
    this.fileLock = {};
    this.codes = require('./bin/status_codes.js');
    this.saveFormated = saveFormated;
  }

  init () {
    /*
     *  ### We'd like to store our databases in its own folder so make sure it exists
     */
    let exists = fs.existsSync(this.baseDir);
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
    let isLocked = this.fileLock.hasOwnProperty(db);
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
      let file = path.resolve(this.baseDir, name + '.json');
      let exists = fs.existsSync(file);
      if (exists) {
        reject(new Response(this.codes.U_DATABASE_ALLREADY_EXISTS,
                            'The database you are trying to create allready exists\n'+new Error().stack,
                            'The database allready exits.'));
        return;
      }

      // set up data and options
      let data = '{\n\n}';
      let options = {};
      options.flag = 'wx';

      // create the new db
      fs.writeFile(file, data, options, (err) => {
        if (err) {
          reject(new Response(this.codes.DB_WRITEFILE_ERR,
                              'Encountered an error whiles\'t trying to create the new database.\n'+err,
                              'An error occurred when trying to create the database.'));
          return;
        }
        resolve(new Response(this.codes.OK,
                             'Database, \''+name+'\' successfully created.',
                             'Database Created.'));
      });
    });
  }

  // This is the main methud used to execute any action on any database(.json)
  // it hanles the database files and makes sure only one opperation is exequted at any given time
  //
  execute (opperation, db, tabel, sel, obj) {

    let file = path.resolve(this.baseDir, db + '.json'); // db file

    // The job that is the executor of the promise that is to be returned
    let job = (resolve, reject) => {

      setTimeout(()=>{ // We use a timeout just to give the caller
                       // those fractions of a ms to return the promises

        // find and complete opperation
        let ret;
        switch (opperation) {
          case 'createTable':
            ret = this._createTable(db, tabel, sel);
            break;
          case 'dropTable':
            ret = this._dropTable(db, tabel, sel);
            break;
          case 'insert':
            ret = this._insert(db, tabel, sel);
            break;
          case 'select':
            ret = this._select(db, tabel, sel);
            break;
          case 'delete':
            ret = this._delete(db, tabel, sel);
            break;
          case 'update':
            ret = this._update(db, tabel, sel, obj);
            break;
          default:
            throw 'There is no opperation \''+ opperation +'\'.';
        }

        // resolve or reject
        if (ret.statusCode < 100) {
          resolve(ret);
        } else {
          reject(ret);
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

      let jobsLength = this.fileLock[db].jobs.length;
      let lastJob = this.fileLock[db].jobs[jobsLength-1];

      let p = new Promise((resolve, reject) => {

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
          reject(new Response(this.codes.DB_LOCKFILE_ERR, '', 'Unable to lock database. Could not continue'));
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
    ///  return a Response object

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists) {
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+ file +'" doesn\'t exits.\n'+new Error().stack,
                          'No database with that name.');
    }

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe doesn't allready exist
    let table = dbContent[tableName];
    if (table) {
      return new Response(this.codes.U_TABLE_ALLREADY_EXISTS,
                          'Table \''+tableName+'\' allready exits.\n'+new Error().stack,
                          'Table allready exists');
    }

    // create the table
    dbContent[tableName] = new Table(template);

    // save to file
    let data = JSON.stringify(dbContent, null, (this.saveFormated ? undefined : '\t'));

    fs.writeFileSync(file, data);

    return new Response(this.codes.OK,
                        'New table \''+tableName+'\' created in \''+db+'\'("'+file+'")',
                        'Table created.');
  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to remove the entire table
  _dropTable(db, tableName) {

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists)
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+file+'" doesn\'t exist.\n'+new Error().stack,
                          'No database with that name.');

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe exist
    let table = dbContent[tableName];
    if (!table)
      return new Response(this.codes.U_TABLE_NOT_FOUND,
                          'Table \''+tableName+'\' doesn\'t exits.\n'+new Error().stack,
                          'No table with that name found');

    //console.log(dbContent);
    delete dbContent[tableName];
    //console.log(dbContent);

    // save to file
    let data = JSON.stringify(dbContent, null, (this.saveFormated ? undefined : '\t'));

    fs.writeFileSync(file, data);

    return new Response(this.codes.OK,
                        'Table \''+tableName+'\' removed from "'+file+'"',
                        'Table dropped');

  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to insert an object into the database
  _insert (db, tableName, obj) {
    //  return a Response object

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists) {
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+file+'" doesn\'t exist.\n'+new Error().stack,
                          'No database with that name.');
    }

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe exist
    let table = dbContent[tableName];
    if (!table) {
      return new Response(this.codes.U_TABLE_NOT_FOUND,
                          'Table \''+tableName+'\' doesn\'t exits.\n'+new Error().stack,
                          'No table with that name found');
    }

    // if there is a specified template make sure obj confoms
    if (table.template) {
      // clone template as it will be destroyed
      let clone = JSON.parse(JSON.stringify(table.template));
      if (!util.matchTemplate(obj, clone)) {
        return new Response(this.codes.U_TAEMPLATE_MISMATCH,
                            'Template mismatch.\n'+new Error().stack,
                            'The object you want to insert does not match '+
                            'the template specified for this table');
      }
    }

    // if obj has equals check to make sure its not equal to any other of the objects
    if (obj.hasOwnProperty('equals')) {
      for (let i = 0; i < table.rows.length; i++) {
        try {

          if (obj.equals(obj, table.rows[i])) {
            return new Response(this.codes.U_ROW_DUPLICATE,
                                'The input value is a duplicate of an existing row.\n'+new Error().stack,
                                'An identical row allready exists.');
          }

        } catch (e) {
          return new Response(this.codes.U_EQUALS_METHUD_ERR,
                              'Error in obj.equals().\n'+e,
                              'There seems to be somthing worong with your equals methud.');
        }
      }
    }

    table.rows.push(obj);

    // save to file
    let data = JSON.stringify(dbContent, null, (this.saveFormated ? undefined : '\t'));

    fs.writeFileSync(file, data);

    return new Response(this.codes.OK,
                        'New row inserted into table \''+tableName+'\' in the database "'+file+'"',
                        'New row inserted into table.');
  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to retrieve an object from a table in the database
  _select (db, tableName, selector) {
    //  return a Response object

    // Check that selector is of valid type.
    if (!(typeof selector == 'object' ||
          typeof selector == 'function' ||
          selector == undefined)) {
      return new Response(this.codes.U_INVALID_SELECTOR,
                          'The selector was type: ' + Array.isArray(selector) ? 'array' : typeof selector +
                          ', but expected: [<object> | <function> | <undefined>]\n' + new Error().stack,
                          'Selector was wrong type.');
    }

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists) {
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+file+'" doesn\'t exist.\n'+new Error().stack,
                          'No database with that name.');
    }

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe exist
    let table = dbContent[tableName];
    if (!table) {
      return new Response(this.codes.U_TABLE_NOT_FOUND,
                          'Table \''+tableName+'\' doesn\'t exits.\n'+new Error().stack,
                          'No table with that name found');
    }

    // if table is emty return emty array
    if (table.rows.length == 0) {
      return new Response(this.codes.NONE_FOUND,
                          'Table empty, nothing to retrieve.',
                          'Table empty, nothing to retrieve.',
                          []);
    }

    // Select and return appropriate array
    if (selector == undefined) { // no selector, return all rows
      return new Response(this.codes.OK,
                          'Returned all rows in table \''+tableName+'\'',
                          'Returned all rows.',
                          table.rows);
    } else if (typeof selector == 'object') { //
      let resource = table.rows.filter((el) => {
        for (let key in selector) {
          if (!el.hasOwnProperty(key)) return false;
          if (el[key] != selector[key]) return false;
        }
        return true;
      });
      return new Response(this.codes.OK,
                          'Returned rows matching the key-value set given.',
                          'Returned matching rows.',
                          resource);
    } else {
      let resource;
      try {
        resource = table.rows.filter(selector);
        return new Response(this.codes.OK,
                            'Returned rows matching the key-value set given.',
                            'Returned matching rows.',
                            resource);
      } catch (e) {
        return new Response(this.codes.U_INVALID_SELECTOR,
                            'Error in selector function.\n'+e,
                            'There seems to be somthing worong with your selector methud.');
      }
    }

  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to delete one or more rows from a table, matching the provided selector
  _delete (db, tableName, selector) {

    // Check that selector is of valid type.
    if (!(typeof selector == 'object' ||
          typeof selector == 'function') ) {
      return new Response(this.codes.U_INVALID_SELECTOR,
                          'The selector was type: ' + Array.isArray(selector) ? 'array' : typeof selector +
                          ', but expected: [<object> | <function>]\n' + new Error().stack,
                          'Selector was wrong type.');
    }

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists) {
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+file+'" doesn\'t exist.\n'+new Error().stack,
                          'No database with that name.');
    }

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe exist
    let table = dbContent[tableName];
    if (!table) {
      return new Response(this.codes.U_TABLE_NOT_FOUND,
                          'Table \''+tableName+'\' doesn\'t exits.\n'+new Error().stack,
                          'No table with that name found');
    }

    // if table is emty return emty array
    if (table.rows.length == 0) {
      return new Response(this.codes.NONE_FOUND,
                          'Table empty, nothing to delete.',
                          'Table empty, nothing to delete.',
                          []);
    }

    // Find and delete appropriate rows
    let res;
    if (typeof selector == 'object') { // remove elements matching selector object
      let deleted = [];
      table.rows.forEach((item, i, arr) => { // for each item in rows

        let del = true;
        for (let key in selector) {
          if (!item.hasOwnProperty(key)) {del = false; break;}
          if (item[key] != selector[key]) {del = false; break;}
        }

        if (del) deleted = deleted.concat(table.rows.splice(i,1));

      });
      res = new Response(this.codes.OK,
                          'Deleted elements matching provided object.',
                          'Deleted matching rows.',
                          deleted);
    } else {
      try {
        let deleted = [];
        table.rows.forEach((item, i, arr) => {
          if (selector(item, i, table.rows)) deleted = deleted.concat(table.rows.splice(i,1));
        });
        res = new Response(this.codes.OK,
                            'Deleted elements matching provided function.',
                            'Deleted matching rows.',
                            deleted);
      } catch (e) {
        res = new Response(this.codes.U_INVALID_SELECTOR,
                            'Error in selector function.\n'+e,
                            'There seems to be somthing worong with your selector methud.');
      }
    }

    // save table
    let data = JSON.stringify(dbContent, null, (this.saveFormated ? undefined : '\t'));

    fs.writeFileSync(file, data);

    return res;

  }

  // Synchronous opperation on locked database(.json)
  // this will atempt to find and update one or more rows in a table using selector and update params
  _update (db, tableName, selector, update) {

    // Check that selector is of valid type.
    if (typeof selector == 'function') {
      return new Response(this.codes.U_INVALID_SELECTOR,
                          'The selector was type: ' + Array.isArray(selector) ? 'array' : typeof selector +
                          ', but expected: [<object> | <function>]\n' + new Error().stack,
                          'Selector was wrong type.');
    }

    let file = path.resolve(this.baseDir, db + '.json');

    // make sure database(.json) exists
    let exists = fs.existsSync(file);
    if (!exists) {
      return new Response(this.codes.U_DATABASE_NOT_FOUND,
                          '"'+file+'" doesn\'t exist.\n'+new Error().stack,
                          'No database with that name.');
    }

    // get the database
    let dbContent = JSON.parse(fs.readFileSync(file, 'utf8'));

    // make sure tabe exist
    let table = dbContent[tableName];
    if (!table) {
      return new Response(this.codes.U_TABLE_NOT_FOUND,
                          'Table \''+tableName+'\' doesn\'t exits.\n'+new Error().stack,
                          'No table with that name found');
    }

    // if table is emty return emty array
    if (table.rows.length == 0) {
      return new Response(this.codes.NONE_FOUND,
                          'Table empty, nothing to delete.',
                          'Table empty, nothing to delete.',
                          []);
    }

    let res;
    if (typeof selector == 'object') { // remove elements matching selector object
      let edited = [];
      table.rows.forEach((item, i, arr) => { // for each item in rows

        let match = true;
        for (let key in selector) {
          if (!item.hasOwnProperty(key)) { match  = false; break;}
          if (item[key] != selector[key]) { match = false; break;}
        }

        if (match) {
          for (let key in update) {
            item[key] = update[key];
          }
          edited.push(item);
        }

      });
      res = new Response(this.codes.OK,
                          'Deleted elements matching provided object.',
                          'Deleted matching rows.',
                          edited);
    } else {
      try {
        let edited = [];
        table.rows.forEach((item, i, arr) => {
          if (selector(item, i, table.rows)){
            update(item);
            edited.push(item);
          }
        });
        res = new Response(this.codes.OK,
                            'Deleted elements matching provided function.',
                            'Deleted matching rows.',
                            edited);
      } catch (e) {
        res = new Response(this.codes.U_INVALID_SELECTOR,
                            'Error in selector function.\n'+e,
                            'There seems to be somthing worong with your selector methud.');
      }
    }

    // save table
    let data = JSON.stringify(dbContent, null, (this.saveFormated ? undefined : '\t'));

    fs.writeFileSync(file, data);

    return res;

  }

}

module.exports = function(dbLocation,
                          saveFormated /* optional */) {
  let r = new simple_json_database(dbLocation, saveFormated);
  r.init();
  return r;
};

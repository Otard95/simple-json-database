/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

module.exports = class {

  constructor () {

    this.jobs = [];

  }

  canUnlock () {
    return (this.jobs.length == 0);
  }

};

/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

var util = {

  // Comapres two objects to see if they are equal in structure
  // it doesn't care what the values of the keys are only that they are the same type
  // THIS IS A DESTUCTIVE FUNCTION CLONE 'tem' IT GETS DESTROYED
  matchTemplate: (obj, tem) => {

    for (var key in obj) { // for every key on obj

      if (key != 'equals') { // this is a methud to check if a identical element
                             // is allready in the table, its not a value to be saved
                             // and so it will not be in the tem(plate) object either

        var temKey = key;
        // if tem/obj is array default key = 0
        if (Array.isArray(tem)) {
          temKey = 0;
        }

        if (tem[temKey] == undefined) return false; // key is not in tem

        if (typeof obj[key] !== typeof tem[temKey]) return false; // val of key is not same type

        if (typeof obj[key] == 'object') { // if type is object use thes function recursively
          if (!util.matchTemplate(obj[key], tem[temKey])) return false;
        }

        if ( Array.isArray(tem) ) {
          tem.shift();
        } else {
          delete tem[key];
        }

      }

    }

    // if array check length
    if (Array.isArray(tem)) {
      return !(tem.length > 0);
    } else {
      return !(Object.keys(tem).length > 0);
    }

  }

};

module.exports = util;

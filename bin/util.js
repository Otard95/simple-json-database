/*jshint esversion: 6 */
/*jshint node: true */
/*jshint strict: true */

'use strict';

var util = {

  // Comapres two objects to see if they are equal in structure
  // it doesn't care what the values of the keys are only that they are the same type
  // THIS IS A DESTUCTIVE FUNCTION CLONE 'tem' IT GETS DESTROYED
  // Returns false on mismatch and true on match
  matchTemplate: (obj, tem) => {

    if (typeof obj !== typeof tem ||
        Array.isArray(obj) !== Array.isArray(tem)) {
          return false;
        }

    if (Array.isArray(tem)) {
      /*
       * ## Since arrays might have different lengths and there's not one
       * ## right way to use them we don't check this.
       */
      return true;

    } else {

      for (var key in obj) { // for every key in obj

        if (key != 'equals') { // this is a methud to check if a identical element
                               // is allready in the table, its not a value to be saved
                               // and so it will not be in the tem(plate) object either

          if (tem[key] == undefined) return false; // key is not in tem
          //console.log('not undef');
          if (typeof obj[key] !== typeof tem[key]) return false; // val of key is not same type
          //console.log('type match');
          if (typeof obj[key] == 'object') { // if type is object use thes function recursively
            if (!util.matchTemplate(obj[key], tem[key])) return false;
            //console.log('inner match');
          }

          delete tem[key];

        }

      }

      return (Object.keys(tem).length == 0);

    }

  }

};

module.exports = util;

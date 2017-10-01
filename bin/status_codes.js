/*jshint esversion: 6 */
/*jshint node: true */

module.exports = {

  // Positive response
  OK:         0,
  NONE_FOUND: 1,

  // Negative response, User error
  U_DATABASE_NOT_FOUND:       101,
  U_DATABASE_ALLREADY_EXISTS: 102,
  U_TABLE_NOT_FOUND:          103,
  U_TABLE_ALLREADY_EXISTS:    104,
  U_TAEMPLATE_MISMATCH:       105,
  U_EQUALS_METHUD_ERR:        106,
  U_ROW_DUPLICATE:            107,
  U_INVALID_SELECTOR:         108,

  // Negative response, database error
  DB_READFILE_ERR:  201,
  DB_WRITEFILE_ERR: 202,
  DB_LOCKFILE_ERR:  203

};

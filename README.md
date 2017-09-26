# simple_json_database
A simple node.js database using json to store you data.

## Installation
```
npm install github:Otard95/simple_json_database
```

## How to use
**Simple setup**
```javascript
const db = require('simple_json_database')('<database_folder>');
```
Where `<database_folder>` is the relative path to the containing folder for your databases.  
**Examples:**
* `'JsonDB'` -- Will create(if not allready existing) a folder `JsonDB` in your projects directory.
* `'./'` -- Will save you databases directly in your projects directory.

**Create a database**
```javascript
db.createDB('myDatabase').then( (res) => {
  console.log(res); // This line is optional
  // Your code if you need it
}).catch( (err) => {
  console.log(err); // This line is optional
  // Your code if you need it
});
```
This will atempt to crate a new database, or the file `myDatabase.json`, in the folder specified when you initialized `db`.

**Create a table**
```javascript
db.execute('createTable', 'myDatabase', 'myTable'[, <obj>]).then( (res) => {
  console.log(res); // This line is optional
  // Your code if you need it
}).catch( (err) => {
  console.log(err); // This line is optional
  // Your code if you need it
});
```
Creates a new table in `myDatabase` called `myTable`.  
If `<obj>` is specified, any elements added to this tabel will need to have the same structure.  
**Example:**
```javascript
let template = {
    first_name: 'Bob',
    last_name: 'Brown',
    age: 23
};
db.execute('createTable', 'myDatabase', 'myTable', template).then[...] // We assume this works

let newObject = {
    first_name: 'Alice',
    last_name: 'Williams',
    age: 31
};
db.execute('insert', 'myDatabase', 'myTable', newObject).then[...] // Will work

let nextObject = {
    f_name: 'Eve',
    l_name: 'Taylor',
    age: 28
};
db.execute('insert', 'myDatabase', 'myTable', nextObject).then[...] /* Will NOT work since the property
                                                                        names are incorrect */
```
Notice that the values don't need to be the same, just the same type.

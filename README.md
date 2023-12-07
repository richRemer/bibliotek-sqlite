The **@bibliotek/sqlite** library is a light async/await wrapper around the
**sqlite3** library.

@bibliotek/sqlite
=================
For more detailed information, check the unit tests in the **./test**
directory.

Examples
--------
```js
import {Database, Statement} from "@bibliotek/sqlite";

let result = null;
let stmt = null;

const db = Database.memory();       // in-memory DB
        // new Database("./my.db"); // ...or load from file

// use .run to execute DML statements
await db.run(`create table thing (id integer primary key autoincrement, value text)`);
result = await db.run(`insert into thing (value) values ('foo')`);
result = await db.run(`insert into thing (value) values ('bar')`);
console.log("insert id", result.lastID);
console.log("inserted", result.changes, "rows");

// use .each to iterate over results
for await (const row of db.each(`select * from thing`)) {
    console.log(row);
}

// use .get to fetch a single row
console.log(await db.get("select * from thing where id = 1"));

// use .prepare for prepared statements
stmt = db.prepare("select * from thing where id = ?");

// pass params to statement methods to bind data to statement
result = await stmt.get(1);     // bind 1 to id in prepared statement
```

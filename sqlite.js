import Sqlite3 from "sqlite3";
import synch from "@bibliotek/synch";

export class Database {
  constructor(db) {
    if (typeof db === "string") {
      db = new Sqlite3.Database(db);
    }

    this.db = db;
  }

  static memory() {
    return new Database(":memory:");
  }

  static disk() {
    return new Database("");
  }

  static get Statement() {
    return Statement;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async *each(sql) {
    const buffer = [];
    let done = false;
    let sync = synch();

    this.db.each(sql, record, complete);

    while (!done) {
      await sync;
      if (done instanceof Error) throw done;
      while (buffer.length) yield buffer.shift();
      sync.reset();
    };

    function record(err, row) {
      if (err) done = err; else buffer.push(row);
      sync();
    }

    function complete() {
      done = true;
      sync();
    }
  }

  async exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async get(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, ...params, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  prepare(sql) {
    return new Statement(this.db.prepare(sql));
  }

  async run(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, function(err) {
        if (err) {
          reject(err);
        } else {
          const {lastID, changes} = this || {};
          resolve({lastID, changes});
        }
      });
    });
  }
}

export class Statement {
  constructor(stmt) {
    this.stmt = stmt;
  }

  async *each(...params) {
    const buffer = [];
    let done = false;
    let sync = synch();

    this.stmt.each(...params, record, complete);

    while (!done) {
      await sync;
      if (done instanceof Error) throw done;
      while (buffer.length) yield buffer.shift();
      sync.reset();
    }

    function record(err, row) {
      if (err) done = err; else buffer.push(row);
      sync();
    }

    function complete() {
      done = true;
      sync();
    }
  }

  async finalize() {
    return new Promise((resolve, reject) => {
      this.stmt.finalize(() => resolve());
    });
  }

  async get(...params) {
    return new Promise((resolve, reject) => {
      this.stmt.get(...params, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  async reset() {
    return new Promise((resolve, reject) => {
      this.stmt.reset(err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async run(...params) {
    return new Promise((resolve, reject) => {
      this.stmt.run(...params, err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  get lastID() { return this.stmt.lastID; }
  get changes() { return this.stmt.changes; }
}

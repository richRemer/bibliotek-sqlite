import expect from "expect.js";
import sinon from "sinon";
import Sqlite3 from "sqlite3";
import {Sqlite} from "@bibliotek/sqlite";

describe("Sqlite", () => {
  describe("constructor(db)", () => {
    it("should initialize db from file path", async () => {
      const db = new Sqlite(":memory:");
      expect(db).to.be.a(Sqlite);
      expect(db.db).to.be.a(Sqlite3.Database);
      expect(db.db.filename).to.be(":memory:");
      await db.close();
    });

    it("should use database if provided", async () => {
      const sqlite = {};
      const db = new Sqlite(sqlite);
      expect(db.db).to.be(sqlite);
    });
  });

  describe("Sqlite.memory()", () => {
    it("should return in-memory DB", async () => {
      const db = Sqlite.memory();
      expect(db.db.filename).to.be(":memory:");
      await db.close();
    });
  });

  describe("Sqlite.disk()", () => {
    it("should return on-disk temp DB", async () => {
      const db = Sqlite.disk();
      expect(db.db.filename).to.be("");
      await db.close();
    });
  });

  describe(".close()", () => {
    it("should close the DB", async () => {
      const db = {close: sinon.spy(fn => fn())};
      const sqlite = new Sqlite(db);

      await sqlite.close();
      expect(db.close.calledOnce).to.be(true);
    });
  });

  describe(".run(sql)", () => {
    it("should run query on the DB", async () => {
      const db = {run: sinon.spy((_, fn) => fn())};
      const sqlite = new Sqlite(db);
      const sql = "select 1";

      await sqlite.run(sql);
      expect(db.run.calledOnce).to.be(true);
      expect(db.run.calledWith(sql)).to.be(true);
    });
  });

  describe(".each(sql)", () => {
    let sqlite;

    beforeEach(async () => {
      sqlite = Sqlite.memory();
      await sqlite.run("create table t (id int, key text)");
      await sqlite.run("insert into t values (1, 'foo')");
      await sqlite.run("insert into t values (2, 'bar')");
    });

    it("should iterate over results", async () => {
      const rows = [];

      for await (const row of sqlite.each("select * from t order by id")) {
        rows.push(row);
      }

      expect(rows.length).to.be(2);
      expect(rows[0]).to.be.an("object");
      expect(rows[0].id).to.be(1);
      expect(rows[0].key).to.be("foo");
      expect(rows[1]).to.be.an("object");
      expect(rows[1].id).to.be(2);
      expect(rows[1].key).to.be("bar");
    });
  });

  describe(".get(sql)", () => {
    let sqlite;

    beforeEach(async () => {
      sqlite = Sqlite.memory();
      await sqlite.run("create table t (id int, key text)");
      await sqlite.run("insert into t values (1, 'foo')");
      await sqlite.run("insert into t values (2, 'bar')");
    });

    it("should return first row", async () => {
      const row = await sqlite.get("select * from t order by id");

      expect(row).to.be.an("object");
      expect(row.id).to.be(1);
      expect(row.key).to.be("foo");
    });
  });

  describe(".prepare(sql)", () => {
    it("should return a prepared statment", async () => {
      const sqlite = Sqlite.memory();
      await sqlite.run("create table t (i int, f text)");

      const stmt = sqlite.prepare("select f from t where i = ?");

      expect(stmt).to.be.a(Sqlite.Statement);
    });
  });
});

describe("Sqlite.Statement", () => {
  let sqlite, insert, select;

  beforeEach(async () => {
    sqlite = Sqlite.memory();
    await sqlite.run("create table t (id int, key text)");
    insert = sqlite.prepare("insert into t values (?, ?)");
    select = sqlite.prepare("select key from t where id between ? and ? order by id");
  });

  describe(".run(...params)", () => {
    it("should execute statement using params", async () => {
      await insert.run(1, "foo");
      await insert.run(2, "bar");

      const row = await sqlite.get("select count(*) c from t");
      expect(row.c).to.be(2);
    });
  });

  describe(".each(...params)", () => {
    let sqlite;

    beforeEach(async () => {
      await insert.run(1, "foo");
      await insert.run(2, "bar");
    });

    it("should execute statement and iterate over results", async () => {
      const rows = [];

      for await (const row of select.each(0, 5)) {
        rows.push(row);
      }

      expect(rows.length).to.be(2);
      expect(rows[0]).to.be.an("object");
      expect(rows[0].key).to.be("foo");
      expect(rows[1]).to.be.an("object");
      expect(rows[1].key).to.be("bar");
    });
  });

  describe(".finalize()", () => {
    it("should finalize the statement", async () => {
      insert.stmt = {finalize: sinon.spy(fn => fn())};
      await insert.finalize();
      expect(insert.stmt.finalize.calledOnce).to.be(true);
    });
  });

  describe(".get(...params)", () => {
    beforeEach(async () => {
      await insert.run(1, "foo");
      await insert.run(2, "bar");
    });

    it("should execute statement and return first row", async () => {
      const row = await select.get(1, 5);

      expect(row).to.be.an("object");
      expect(row.key).to.be("foo");
    });
  });

  describe(".reset()", () => {
    it("should reset the statment", async () => {
      insert.stmt = {reset: sinon.spy(fn => fn())};
      await insert.reset();
      expect(insert.stmt.reset.calledOnce).to.be(true);
    });
  });
});

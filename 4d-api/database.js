const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./4d.sqlite");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      draw_date TEXT NOT NULL,
      prize TEXT NOT NULL,
      position INTEGER,
      number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

module.exports = db;

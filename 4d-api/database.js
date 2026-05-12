const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./4d.sqlite");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      operator TEXT NOT NULL,        -- Magnum / Toto / Damacai
      draw_date TEXT NOT NULL,       -- YYYY-MM-DD (IMPORTANT)
      
      prize TEXT NOT NULL,           -- 1st / 2nd / 3rd / Special / Consolation
      position INTEGER,              -- 1 / 2 / 3 (ONLY for top 3 prizes)

      number TEXT NOT NULL,          -- 4-digit number

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

});

module.exports = db;

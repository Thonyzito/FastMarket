const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('ventas.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT)");
});

app.use(express.static(__dirname));

app.post('/comprar', (req, res) => {
  db.run("INSERT INTO ventas DEFAULT VALUES");
  res.sendStatus(200);
});

app.get('/total', (req, res) => {
  db.get("SELECT COUNT(*) as total FROM ventas", (err, row) => {
    if (err) return res.status(500).send("Error");
    res.json({ total: row.total });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

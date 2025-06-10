const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('ventas.db');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT)");
});

app.use(express.static(__dirname));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.post('/subir', upload.single('foto'), (req, res) => {
  res.send({ url: '/uploads/' + req.file.filename });
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

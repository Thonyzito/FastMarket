const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const fs = require('fs');

// Crear carpeta 'uploads' si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const db = new sqlite3.Database('ventas.db');
db.run(`CREATE TABLE IF NOT EXISTS imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT
)`);

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/subir', upload.single('foto'), (req, res) => {
  const filename = req.file.filename;
  db.run('INSERT INTO imagenes(nombre) VALUES (?)', [filename], function(err) {
    if (err) return res.status(500).send('Error al guardar en BD');
    res.send({ url: '/uploads/' + filename });
  });
});

app.get('/admin', (req, res) => {
  db.all('SELECT * FROM imagenes ORDER BY id DESC', (err, rows) => {
    if (err) return res.send('Error al cargar imágenes');
    let html = '<h1>Imágenes subidas</h1>';
    rows.forEach(img => {
      html += `<img src="/uploads/${img.nombre}" style="max-width:200px;margin:10px">`;
    });
    res.send(html);
  });
});

app.listen(PORT, () => console.log("Servidor funcionando en puerto " + PORT));

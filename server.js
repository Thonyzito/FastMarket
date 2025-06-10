const sharp = require('sharp');
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

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max por imagen
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg'].includes(file.mimetype)) {
      return cb(new Error('Solo PNG/JPG permitidos'));
    }
    cb(null, true);
  }
});

db.run(`
CREATE TABLE IF NOT EXISTS pedidos_personalizados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  direccion TEXT,
  correo TEXT,
  telefono TEXT,
  tarjeta TEXT,
  cvc TEXT,
  vencimiento TEXT,
  fecha TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS imagenes_personalizados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER,
  filename TEXT,
  FOREIGN KEY(pedido_id) REFERENCES pedidos_personalizados(id)
)
`);


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

app.post('/comprar-personalizado', upload.array('imagenes', 4), async (req, res) => {
  try {
    const {
      nombre, direccion, correo, telefono,
      tarjeta, cvc, vencimiento
    } = req.body;

    const fecha = new Date().toISOString();

    // Insertar pedido
    const result = await new Promise((resolve, reject) => {
      db.run(`INSERT INTO pedidos_personalizados 
        (nombre,direccion,correo,telefono,tarjeta,cvc,vencimiento,fecha) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, direccion, correo, telefono, tarjeta, cvc, vencimiento, fecha],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
    });

    // Procesar y guardar imágenes con sharp, nombre único
    for (const file of req.files) {
      const filename = Date.now() + '-' + file.originalname;
      await sharp(file.buffer)
        .resize({ width: 800, height: 800, fit: 'inside' })
        .toFile(path.join(__dirname, 'uploads', filename));

      // Guardar registro imagen
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO imagenes_personalizados (pedido_id, filename) VALUES (?, ?)`,
          [result, filename], err => err ? reject(err) : resolve());
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
});


app.listen(PORT, () => console.log("Servidor funcionando en puerto " + PORT));

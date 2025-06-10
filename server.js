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
  db.all('SELECT * FROM ventas ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error al obtener los datos');
    }

    let html = `
    <html><head>
    <meta charset="UTF-8"><title>Panel Admin</title>
    <style>
      body { background: #111; color: #0f0; font-family: sans-serif; }
      .compra { border: 1px solid #0f0; margin: 1em; padding: 1em; border-radius: 10px; }
      img { max-width: 150px; margin: 5px; border-radius: 8px; }
    </style></head><body><h1>🛠️ Admin Panel</h1>
    `;

    rows.forEach(row => {
      const imagenes = JSON.parse(row.imagenes).map(img =>
        `<img src="/uploads/${img}" alt="Imagen subida">`).join('');
      html += `
        <div class="compra">
          <p><strong>Nombre:</strong> ${row.nombre}</p>
          <p><strong>Correo:</strong> ${row.correo}</p>
          <p><strong>Teléfono:</strong> ${row.telefono}</p>
          <p><strong>Dirección:</strong> ${row.direccion}</p>
          <p><strong>Precio:</strong> ${row.precio}</p>
          <div>${imagenes}</div>
        </div>`;
    });

    html += `</body></html>`;
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

app.get('/api/pedidos-personalizados', (req, res) => {
  db.all('SELECT * FROM pedidos_personalizados ORDER BY id DESC', (err, pedidos) => {
    if (err) return res.status(500).json({ error: err.message });

    const pedidosConImgs = [];

    let count = 0;
    pedidos.forEach(pedido => {
      db.all('SELECT * FROM imagenes_personalizados WHERE pedido_id = ?', [pedido.id], (err, imgs) => {
        if (err) return res.status(500).json({ error: err.message });

        pedidosConImgs.push({
          ...pedido,
          imagenes: imgs
        });

        count++;
        if (count === pedidos.length) {
          res.json(pedidosConImgs);
        }
      });
    });

    if (pedidos.length === 0) res.json([]);
  });
});


app.listen(PORT, () => console.log("Servidor funcionando en puerto " + PORT));

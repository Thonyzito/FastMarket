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
  db.all(`SELECT * FROM pedidos_personalizados ORDER BY id DESC`, [], (err, pedidos) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al obtener los pedidos');
    }

    // Traer imágenes asociadas
    db.all(`SELECT * FROM imagenes_personalizados`, [], (err2, imagenes) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send('Error al obtener las imágenes');
      }

      // Asociar imágenes a pedidos
      const pedidosConImagenes = pedidos.map(pedido => {
        const imgs = imagenes.filter(img => img.pedido_id === pedido.id);
        return {
          ...pedido,
          imagenes: imgs
        };
      });

      // Construir HTML de la vista admin
      const html = `
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Panel Admin</title>
        <style>
          body { background-color: #111; color: #fff; font-family: sans-serif; padding: 20px; }
          .pedido { background: #222; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
          .imagenes { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
          .imagenes img { width: 150px; height: auto; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>🧾 Pedidos Personalizados</h1>
        ${pedidosConImagenes.map(pedido => `
          <div class="pedido">
            <p><strong>Nombre:</strong> ${pedido.nombre}</p>
            <p><strong>Dirección:</strong> ${pedido.direccion}</p>
            <p><strong>Correo:</strong> ${pedido.correo}</p>
            <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
            <p><strong>Fecha:</strong> ${pedido.fecha}</p>
            <div class="imagenes">
              ${pedido.imagenes.map(img => `<img src="/uploads/${img.filename}" alt="Imagen">`).join('')}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
      `;
      res.send(html);
    });
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
      // Redimensiona de forma que el **alto (height)** sea máximo 800px,
      // manteniendo la proporción.
      const image = sharp(file.buffer);
      const meta = await image.metadata();
      if (meta.height > 800) {
        await image.resize({ height: 800 }).toFile(path.join(__dirname, 'uploads', filename));
      } else {
        await image.toFile(path.join(__dirname, 'uploads', filename));
      }


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

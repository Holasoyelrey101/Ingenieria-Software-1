const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const productoRoutes = require('./routes/productoRoutes');

const app = express();
app.use(express.json());

// Habilitar CORS para Angular (puerto 4200)
app.use(cors({
  origin: 'http://localhost:4200'
}));
console.log("🌐 CORS habilitado para http://localhost:4200");
// Rutas
app.use('/api/productos', productoRoutes);

// Conectar a BD y sincronizar modelos
sequelize.sync().then(() => {
  console.log("✅ Conectado a MySQL y modelos sincronizados");
  app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));
}).catch(err => console.log("❌ Error al conectar a BD:", err));

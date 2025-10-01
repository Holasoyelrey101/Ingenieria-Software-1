const Producto = require('../models/Producto');

// Obtener todos los productos
exports.getProductos = async (req, res) => {
  const productos = await Producto.findAll();
  res.json(productos);
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
  const { nombre, stock } = req.body;
  const nuevo = await Producto.create({ nombre, stock });
  res.json(nuevo);
};

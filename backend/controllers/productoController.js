const Producto = require('../models/Producto');

//  Obtener todos los productos
exports.getProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll();

    const resultado = productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      stock: p.stock,
      alerta: p.stock < 10,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};



//  Crear un nuevo producto
exports.createProducto = async (req, res) => {
  try {
    const { nombre, stock } = req.body;

    if (!nombre || stock === undefined) {
      return res.status(400).json({ error: "Faltan datos: nombre y stock son requeridos" });
    }

    const nuevo = await Producto.create({ nombre, stock });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error("❌ Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
};

// Actualizar producto por ID
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, stock } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    producto.nombre = nombre ?? producto.nombre;
    producto.stock = stock ?? producto.stock;
    await producto.save();

    res.json(producto);
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
};

// Eliminar producto por ID
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await producto.destroy();
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
};

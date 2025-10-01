const express = require('express');
const router = express.Router();
const { getProductos, createProducto } = require('../controllers/productoController');

router.get('/', getProductos);
router.post('/', createProducto);

module.exports = router;

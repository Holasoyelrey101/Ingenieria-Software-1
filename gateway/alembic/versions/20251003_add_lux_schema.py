"""Add full LUX schema and seed data

Revision ID: 20251003_add_lux_schema
Revises: 07df451a2a01
Create Date: 2025-10-03
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251003_add_lux_schema'
down_revision = '07df451a2a01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Execute the provided SQL to create schema and seed data.
    sql = r"""
-- =========================================================
-- ESQUEMA BASE LUXCHILE (PostgreSQL) - 100% LIMPIO Y AMPLIADO
-- SCRIPT DE CREACIÓN Y CARGA DE DATOS SEGURO (Anti-caracteres invisibles)
-- =========================================================

-- 1) Limpieza segura
---------------------------------------------------------

DO $$
BEGIN
    -- Elimina todas las tablas en orden inverso a dependencias
    DROP TABLE IF EXISTS asistencia, turno, manipulacion, incidente, retiro,
      envio, carga, inventario, camara, ruta, mantenimiento,
      vehiculo, trabajador, bodega, productos CASCADE;
END$$;

-- 2) Tablas maestras
---------------------------------------------------------

CREATE TABLE productos (
    producto_id     SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(50),
    valor_unitario  NUMERIC(12,2),
    fecha_ingreso   DATE DEFAULT CURRENT_DATE,
    estado          VARCHAR(20) DEFAULT 'activo'
);

CREATE TABLE bodega (
    bodega_id   SERIAL PRIMARY KEY,
    nombre      VARCHAR(80) NOT NULL,
    region      VARCHAR(60),
    direccion   VARCHAR(120),
    capacidad   INT
);

CREATE TABLE trabajador (
    trabajador_id   SERIAL PRIMARY KEY,
    nombre          VARCHAR(80) NOT NULL,
    apellido        VARCHAR(80),
    rut             VARCHAR(20) UNIQUE,
    telefono        VARCHAR(30),
    direccion       VARCHAR(120),
    rol             VARCHAR(40)
);

CREATE TABLE vehiculo (
    vehiculo_id             SERIAL PRIMARY KEY,
    patente                 VARCHAR(15) UNIQUE NOT NULL,
    tipo                    VARCHAR(30),
    estado                  VARCHAR(20) DEFAULT 'operativo',
    proximo_mantenimiento   DATE
);

CREATE TABLE ruta (
    ruta_id         SERIAL PRIMARY KEY,
    origen          VARCHAR(120),
    destino         VARCHAR(120),
    fecha_programada DATE,
    costo_estimado  NUMERIC(12,2),
    tiempo_estimado INTERVAL
);

CREATE TABLE camara (
    camara_id   SERIAL PRIMARY KEY,
    bodega_id   INT REFERENCES bodega(bodega_id) ON DELETE SET NULL,
    ubicacion   VARCHAR(120),
    estado      VARCHAR(20) DEFAULT 'operativa'
);

-- 3) Inventario y movimientos
---------------------------------------------------------

CREATE TABLE inventario (
    inventario_id       SERIAL PRIMARY KEY,
    producto_id         INT NOT NULL REFERENCES productos(producto_id) ON DELETE RESTRICT,
    bodega_id           INT NOT NULL REFERENCES bodega(bodega_id) ON DELETE RESTRICT,
    cantidad            INT NOT NULL CHECK (cantidad>=0),
    ubicacion_detalle   VARCHAR(120)
);
CREATE INDEX idx_inventario_prod_bod ON inventario(producto_id,bodega_id);

CREATE TABLE carga (
    carga_id    SERIAL PRIMARY KEY,
    envio_id    INT,
    producto_id INT NOT NULL REFERENCES productos(producto_id) ON DELETE RESTRICT,
    cantidad    INT NOT NULL CHECK (cantidad>0),
    estado      VARCHAR(20) DEFAULT 'pendiente'
);

CREATE TABLE retiro (
    retiro_id       SERIAL PRIMARY KEY,
    inventario_id   INT NOT NULL REFERENCES inventario(inventario_id) ON DELETE RESTRICT,
    fecha_retiro    DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo          VARCHAR(120),
    estado          VARCHAR(20) DEFAULT 'confirmado'
);

CREATE TABLE manipulacion (
    manipulacion_id SERIAL PRIMARY KEY,
    inventario_id   INT NOT NULL REFERENCES inventario(inventario_id) ON DELETE CASCADE,
    trabajador_id   INT REFERENCES trabajador(trabajador_id) ON DELETE SET NULL,
    fecha_hora      TIMESTAMP NOT NULL DEFAULT now(),
    accion          VARCHAR(80)
);

-- 4) Envíos y ruteo
---------------------------------------------------------

CREATE TABLE envio (
    envio_id        SERIAL PRIMARY KEY,
    ruta_id         INT REFERENCES ruta(ruta_id) ON DELETE SET NULL,
    vehiculo_id     INT REFERENCES vehiculo(vehiculo_id) ON DELETE SET NULL,
    trabajador_id   INT REFERENCES trabajador(trabajador_id) ON DELETE SET NULL,
    fecha_salida    TIMESTAMP,
    fecha_llegada   TIMESTAMP,
    estado          VARCHAR(20) DEFAULT 'programado'
);

-- Conectamos carga → envio
ALTER TABLE carga
    ADD CONSTRAINT fk_carga_envio
    FOREIGN KEY (envio_id) REFERENCES envio(envio_id) ON DELETE CASCADE;

CREATE INDEX idx_carga_envio ON carga(envio_id);

CREATE TABLE incidente (
    incidente_id    SERIAL PRIMARY KEY,
    camara_id       INT REFERENCES camara(camara_id) ON DELETE SET NULL,
    carga_id        INT REFERENCES carga(carga_id) ON DELETE SET NULL,
    trabajador_id   INT REFERENCES trabajador(trabajador_id) ON DELETE SET NULL,
    fecha_hora      TIMESTAMP NOT NULL DEFAULT now(),
    tipo            VARCHAR(50),
    descripcion     TEXT
);

-- 5) RR.HH.
---------------------------------------------------------

CREATE TABLE turno (
    turno_id        SERIAL PRIMARY KEY,
    trabajador_id   INT NOT NULL REFERENCES trabajador(trabajador_id) ON DELETE CASCADE,
    fecha_inicio    TIMESTAMP NOT NULL,
    fecha_fin       TIMESTAMP,
    tipo            VARCHAR(30)
);

CREATE TABLE asistencia (
    asistencia_id   SERIAL PRIMARY KEY,
    trabajador_id   INT NOT NULL REFERENCES trabajador(trabajador_id) ON DELETE CASCADE,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    estado          VARCHAR(20) NOT NULL
);

-- 6) Mantenimiento de vehículos
---------------------------------------------------------

CREATE TABLE mantenimiento (
    mantenimiento_id SERIAL PRIMARY KEY,
    vehiculo_id      INT NOT NULL REFERENCES vehiculo(vehiculo_id) ON DELETE CASCADE,
    fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo             VARCHAR(50),
    observaciones    TEXT
);

-- =========================================================
-- 7) INSERCIÓN DE DATOS DE EJEMPLO (SEEDING AMPLIADO)
-- =========================================================

-- SEED: Bodegas
---------------------------------------------------------
INSERT INTO bodega (nombre, region, direccion, capacidad) VALUES
('Bodega Central RM', 'RM', 'Av. Siempreviva 123, Santiago', 5000), -- ID 1
('Bodega Norte', 'Antofagasta', 'Calle Minera 404', 3000), -- ID 2
('Bodega Sur', 'Biobío', 'Ruta 5 Sur, km 501', 4500); -- ID 3

-- SEED: Cámaras de Seguridad
---------------------------------------------------------
INSERT INTO camara (bodega_id, ubicacion, estado) VALUES
(1, 'Acceso Principal', 'operativa'),
(1, 'Vitrina Premium', 'operativa'),
(2, 'Zona de Carga/Descarga', 'operativa'),
(3, 'Bodega Fría', 'mantenimiento');

-- SEED: Trabajadores
---------------------------------------------------------
INSERT INTO trabajador (nombre, apellido, rut, telefono, direccion, rol) VALUES
('Vale', 'Álvarez', '17.000.111-1', '+56 9 1111 1111', 'Calle Falsa 1', 'bodega'), -- ID 1
('David', 'Vásquez', '15.000.222-2', '+56 9 2222 2222', 'Pasaje Real 2', 'chofer'), -- ID 2
('Sofía', 'Contreras', '18.123.456-K', '+56 9 3333 3333', 'Av. Los Pinos 3', 'bodega'), -- ID 3
('Carlos', 'Muñoz', '15.987.654-2', '+56 9 4444 4444', 'La Cañada 4', 'seguridad'), -- ID 4
('Elena', 'Rojas', '20.555.777-1', '+56 9 5555 5555', 'Volcán Osorno 5', 'chofer'), -- ID 5
('Javier', 'Silva', '17.333.111-9', '+56 9 6666 6666', 'El Arrayán 6', 'bodega'), -- ID 6
('Andrea', 'Gómez', '19.456.789-0', '+56 9 7777 7777', 'Las Condes 7', 'gerencia'); -- ID 7

-- SEED: Vehículos
---------------------------------------------------------
INSERT INTO vehiculo (patente, tipo, estado, proximo_mantenimiento) VALUES
('KJ-PP11', 'Camioneta', 'operativo', '2025-11-01'), -- ID 1
('XX-YZ01', 'Camión', 'operativo', '2025-11-15'), -- ID 2
('AB-C234', 'Camioneta', 'mantenimiento', '2025-10-05'), -- ID 3
('R3-T8G9', 'Moto', 'operativo', '2025-12-01'); -- ID 4

-- SEED: Productos de lujo (Extendido y LIMPIO)
---------------------------------------------------------
INSERT INTO productos (nombre, descripcion, tipo, valor_unitario, estado) VALUES
-- RELOJES (25 PRODUCTOS)
('Rolex Sky-Dweller Oro', 'Bisel estriado, calendario anual', 'Relojes', 38000000, 'activo'),
('Patek Calatrava', 'Caja de oro rosa, clásico', 'Relojes', 45000000, 'activo'),
('Omega Seamaster 300', 'Buceo profesional, esfera azul', 'Relojes', 7200000, 'activo'),
('Tag Heuer Carrera', 'Cronógrafo automático, deportivo', 'Relojes', 5800000, 'activo'),
('Hublot Big Bang Integral', 'Cerámica negra, esqueletizado', 'Relojes', 18500000, 'activo'),
('Jaeger-LeCoultre Reverso', 'Doble cara, clásico rectangular', 'Relojes', 14000000, 'activo'),
('IWC Portugieser Chronograph', 'Diseño náutico, elegancia', 'Relojes', 9500000, 'activo'),
('Cartier Tank Must', 'Acero, diseño atemporal', 'Relojes', 4100000, 'activo'),
('Breitling Navitimer', 'Regla de cálculo de aviación', 'Relojes', 6800000, 'activo'),
('Vacheron Constantin Overseas', 'Acero, versátil, correa intercambiable', 'Relojes', 25000000, 'activo'),
('Rolex GMT Master II Pepsi', 'Bisel bicolor azul y rojo', 'Relojes', 21000000, 'activo'),
('Audemars Piguet Code 11.59', 'Oro blanco, moderno', 'Relojes', 32000000, 'activo'),
('Blancpain Fifty Fathoms', 'Reloj de buceo histórico', 'Relojes', 10500000, 'activo'),
('Zenith El Primero Chronomaster', 'Alta frecuencia, preciso', 'Relojes', 8800000, 'activo'),
('Grand Seiko Spring Drive', 'Movimiento híbrido único', 'Relojes', 6400000, 'activo'),
('Breguet Classique', 'Esfera guilloché, tradicional', 'Relojes', 28000000, 'activo'),
('Chopard Alpine Eagle', 'Acero, esfera texturizada', 'Relojes', 7500000, 'activo'),
('Panerai Luminor Base Logo', 'Diseño robusto, legible', 'Relojes', 5500000, 'activo'),
('Richard Mille RM 011 Flyback', 'Edición especial, alto rendimiento', 'Relojes', 150000000, 'activo'),
('Rolex Submariner Verde (Hulk)', 'Acero, edición coleccionable', 'Relojes', 23000000, 'activo'),
('Cartier Santos Dumont', 'Caja cuadrada, clásico de aviación', 'Relojes', 7900000, 'activo'),
('Longines Spirit Zulu Time', 'GMT, diseño vintage', 'Relojes', 3200000, 'activo'),
('Tudor Black Bay 58', 'Buceo vintage, compacto', 'Relojes', 3500000, 'activo'),
('Seiko Prospex LX Line Diver', 'Titanio, alta calidad', 'Relojes', 2800000, 'activo'),
('Rolex Datejust 41 Fluted', 'Bisel estriado, dial plateado', 'Relojes', 17500000, 'activo'),

-- JOYERÍA Y ACCESORIOS (25 PRODUCTOS)
('Collar Tiffany T Smile', 'Oro rosa con diamantes', 'Joyería', 5100000, 'activo'),
('Pendientes Bvlgari B.zero1', 'Oro blanco y cerámica', 'Joyería', 4200000, 'activo'),
('Brazalete Van Cleef Alhambra', '5 motivos en oro y ágata', 'Joyería', 11000000, 'activo'),
('Anillo Piaget Possession', 'Doble anillo giratorio', 'Joyería', 8500000, 'activo'),
('Gafas Gucci Aviator', 'Montura dorada, lentes polarizadas', 'Accesorios', 450000, 'activo'),
('Pluma Montblanc Heritage', 'Edición limitada, plata', 'Accesorios', 1500000, 'activo'),
('Anillo De Beers Aura', 'Solitario de 2 quilates', 'Joyería', 95000000, 'activo'),
('Collar Chopard Happy Diamonds', 'Corazón de oro, diamantes flotantes', 'Joyería', 13000000, 'activo'),
('Gemelos Cartier Double C', 'Acero y laca, diseño clásico', 'Accesorios', 900000, 'activo'),
('Reloj de Pared Hermès', 'Piel y acero, diseño exclusivo', 'Accesorios', 5500000, 'activo'),
('Anillo Pomellato Nudo', 'Cuarzo limón y diamantes', 'Joyería', 6700000, 'activo'),
('Pulsera David Yurman Cable', 'Plata y oro, diseño trenzado', 'Joyería', 2100000, 'activo'),
('Collar Mikimoto Akoya', 'Perlas cultivadas japonesas', 'Joyería', 19000000, 'activo'),
('Broche Chanel Cometa', 'Oro blanco y pavé de diamantes', 'Joyería', 28000000, 'activo'),
('Cinturón Louis Vuitton LV Initiales', 'Piel exótica', 'Accesorios', 1100000, 'activo'),
('Cufflinks Patek Philippe Calatrava', 'Oro blanco, logo grabado', 'Accesorios', 4800000, 'activo'),
('Gafas Tom Ford FT0672', 'Montura gruesa, lentes oscuras', 'Accesorios', 400000, 'activo'),
('Colgante Messika Move', 'Tres diamantes móviles', 'Joyería', 7500000, 'activo'),
('Anillo Bague Dior Rose Dior', 'Oro y una rosa tallada', 'Joyería', 16000000, 'activo'),
('Llavero Ferrari Cavallino', 'Piel y metal pulido', 'Accesorios', 350000, 'activo'),
('Brazalete Hermès Collier de Chien', 'Piel de cocodrilo', 'Joyería', 18000000, 'activo'),
('Anillo Graff Fascination', 'Diamante talla pera 3 quilates', 'Joyería', 120000000, 'activo'),
('Gafas de Sol Prada Linea Rossa', 'Deportivas, alta protección', 'Accesorios', 380000, 'activo'),
('Pendientes Cartier Love', 'Oro amarillo con tornillos', 'Joyería', 6500000, 'activo'),
('Correa Apple Watch Hermès', 'Piel doble tour', 'Accesorios', 600000, 'activo'),

-- MODA Y CALZADO (30 PRODUCTOS)
('Zapatos Christian Louboutin', 'Punta roja, charol negro', 'Calzado', 850000, 'activo'),
('Cartera Dior Lady Dior', 'Cannage de piel de cordero', 'Moda', 5200000, 'activo'),
('Abrigo de Cashmere Loro Piana', 'Corte clásico, color camel', 'Moda', 14000000, 'activo'),
('Zapatillas Golden Goose Superstar', 'Efecto desgastado, piel', 'Calzado', 420000, 'activo'),
('Bufanda Hermès Silk Twill', 'Diseño ecuestre, seda', 'Moda', 650000, 'activo'),
('Mocasines Tod''s Gommino', 'Piel, suela de goma', 'Calzado', 700000, 'activo'),
('Cartera Céline Triomphe', 'Lona y cuero, logo metálico', 'Moda', 4800000, 'activo'),
('Zapatillas Off-White Out of Office', 'Diseño urbano, exclusivas', 'Calzado', 1200000, 'activo'),
('Traje Sastre Brioni', 'Lana Super 150s, hecho a medida', 'Moda', 25000000, 'activo'),
('Chaqueta Balmain Tweed', 'Botonadura dorada, corta', 'Moda', 9500000, 'activo'),
('Bolso Fendi Baguette', 'Lona Zucca, icónico', 'Moda', 3900000, 'activo'),
('Zapatillas Alexander McQueen', 'Suela oversized, piel blanca', 'Calzado', 900000, 'activo'),
('Vestido Valentino Garavani', 'Gasa de seda, corte largo', 'Moda', 18000000, 'activo'),
('Bota Gucci Horsebit', 'Piel negra, caña alta', 'Calzado', 1500000, 'activo'),
('Cartera Bottega Veneta Cassette', 'Piel intrecciato, acolchada', 'Moda', 3800000, 'activo'),
('Zapatillas Prada Cloudbust Thunder', 'Diseño técnico, chunky', 'Calzado', 1350000, 'activo'),
('Chaqueta Moncler Maya', 'Plumón, acabado brillante', 'Moda', 2500000, 'activo'),
('Mochila Saint Laurent City', 'Nylon y cuero, urbana', 'Moda', 1900000, 'activo'),
('Zapatos Berluti Alessandro', 'Piel patinada Venecia', 'Calzado', 1700000, 'activo'),
('Falda Pleated Skirt Balenciaga', 'Estampado gráfico, largo midi', 'Moda', 1500000, 'activo'),
('Zapatillas Nike x Sacai Waffle', 'Colaboración, doble suela', 'Calzado', 1800000, 'activo'),
('Bolso Loewe Puzzle Bag', 'Piel de ternera, multifunción', 'Moda', 4500000, 'activo'),
('Parka Canada Goose Expedition', 'Máximo aislamiento térmico', 'Moda', 2300000, 'activo'),
('Zapatos Derby Church''s Consul', 'Piel patinada Venecia', 'Calzado', 950000, 'activo'),
('Vestido Chanel Tweed', 'Colección Resort, corto', 'Moda', 11000000, 'activo'),
('Bolso Dior Saddle Bag', 'Lona Oblique, forma de silla', 'Moda', 4900000, 'activo'),
('Zapatillas Common Projects Achilles', 'Piel minimalista, blanca', 'Calzado', 400000, 'activo'),
('Gabardina Burberry Heritage', 'Algodón, corte Kensington', 'Moda', 2800000, 'activo'),
('Sandalias Birkenstock x Dior', 'Edición limitada, ante', 'Calzado', 900000, 'activo'),
('Cartera Goyard Saint Louis GM', 'Lona Goyardine, gran capacidad', 'Moda', 3300000, 'activo'),

-- BEBIDAS Y PERFUMES/OTROS (20 PRODUCTOS)
('Perfume Tom Ford Tuscan Leather', 'EDP 100ml, cuero intenso', 'Perfumes', 3500000, 'activo'),
('Champagne Cristal Roederer 2014', 'Brut vintage, prestigio', 'Bebidas', 450000, 'activo'),
('Whisky Macallan 25 Años', 'Single Malt, madera de Jerez', 'Bebidas', 1800000, 'activo'),
('Perfume Roja Dove Elysium', 'Cologne, cítrico y fresco', 'Perfumes', 580000, 'activo'),
('Vodka Belvedere Pure', 'Edición limitada, 1.75L', 'Bebidas', 90000, 'activo'),
('Perfume Chanel No. 5 Parfum', 'Extracto, clásico atemporal', 'Perfumes', 480000, 'activo'),
('Ron Zacapa XO Centenario', 'Mezcla de rones añejos', 'Bebidas', 250000, 'activo'),
('Perfume Byredo Gypsy Water', 'EDP 50ml, amaderado', 'Perfumes', 220000, 'activo'),
('Champagne Veuve Clicquot La Grande Dame', 'Vintage, cuvée de prestigio', 'Bebidas', 320000, 'activo'),
('Tequila Clase Azul Reposado', 'Cerámica pintada a mano', 'Bebidas', 280000, 'activo'),
('Perfume Dior Sauvage Elixir', 'Concentrado, especiado', 'Perfumes', 190000, 'activo'),
('Vino Sassicaia 2020', 'Bolgheri DOC, Supertuscan', 'Bebidas', 600000, 'activo'),
('Perfume Frederic Malle Portrait of a Lady', 'Concentrado de rosas', 'Perfumes', 650000, 'activo'),
('Whisky Yamazaki 18 Años', 'Single Malt Japonés', 'Bebidas', 3500000, 'activo'),
('Perfume Le Labo Santal 33', 'EDP 100ml, sándalo', 'Perfumes', 290000, 'activo'),
('Cigarrillos Cohiba Behike 54', 'Caja de 10, alta gama', 'Otros', 1500000, 'activo'),
('Set de Maletas Rimowa Original Check-In', 'Aluminio, 3 piezas', 'Otros', 3500000, 'activo'),
('Tocadiscos McIntosh MT10', 'High-end, plato magnético', 'Electrónica', 15000000, 'activo'),
('Cápsulas de Café Nespresso Pro', 'Edición limitada, 500 uds', 'Otros', 80000, 'activo'),
('Bañera Villeroy & Boch Squaro Edge 12', 'Diseño minimalista', 'Otros', 4000000, 'activo');

-- =========================================================
-- SEED: Inventario inicial (LIMPIO y AMPLIADO)
-- El ID de producto empieza en 1 (originales) y se extiende hasta 121 (con los nuevos 100).
-- =========================================================

-- Inventario para Bodega Central RM (ID 1)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(1, 1, 5, 'Pasillo A-01'),         -- Rolex Submariner (Original ID 1)
(7, 1, 10, 'Pasillo B-02'),         -- Cartera LV (Original ID 7)
(8, 1, 2, 'Vitrina Premium'),      -- Zapatillas Jordan Dior (Original ID 8)
(2, 1, 3, 'Caja fuerte'),          -- Anillo Cartier (Original ID 2)
(3, 1, 1, 'Caja fuerte'),          -- Rolex Daytona (Original ID 3)
(9, 1, 15, 'Pasillo D-04'),         -- LV Neverfull (Original ID 9)
(15, 1, 30, 'Estantería Perfumes'),  -- Creed Aventus (Original ID 15)
(18, 1, 4, 'Zona Segura Electronica'),-- iPhone 15 Pro Max (Original ID 18)
(11, 1, 2, 'Caja fuerte');         -- Chanel Flap (Original ID 11)

-- Inventario para Bodega Norte (ID 2)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(4, 2, 1, 'Bóveda Principal'),    -- Patek Philippe (Original ID 4)
(12, 2, 6, 'Área de Calzado Rápido'), -- Jordan 1 OG (Original ID 12)
(13, 2, 8, 'Área de Calzado Rápido'), -- Balenciaga Triple S (Original ID 13)
(16, 2, 3, 'Bodega Fría Licores'), -- Louis XIII Cognac (Original ID 16)
(20, 2, 5, 'Zona Segura Electronica'); -- Sony A7 IV (Original ID 20)

-- Inventario para Bodega Sur (ID 3)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(6, 3, 2, 'Zona Segura 1'),         -- Tiffany & Co. T Wire (Original ID 6)
(10, 3, 1, 'Consignación Especial'),  -- Hermès Kelly (Original ID 10)
(5, 3, 4, 'Vitrina Joyas Sur'),     -- Cartier Love Bracelet (Original ID 5)
(17, 3, 12, 'Bodega Fría Champagne'); -- Dom Pérignon Vintage (Original ID 17)

-- =========================================================
-- INVENTARIO ADICIONAL PARA LOS 100 PRODUCTOS NUEVOS (IDs 22 al 121)
-- =========================================================

-- Inventario para Bodega Central RM (ID 1)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(22, 1, 3, 'Caja Fuerte 2'),      -- Rolex Sky-Dweller Oro
(27, 1, 12, 'Accesorios D-01'),    -- Gafas Gucci Aviator
(33, 1, 5, 'Pasillo E-05'),        -- Zapatos Christian Louboutin
(50, 1, 2, 'Caja Fuerte 3'),      -- Gemelos Cartier
(70, 1, 10, 'Perfumes Zona 1');    -- Perfume Tom Ford

-- Inventario para Bodega Norte (ID 2)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(25, 2, 1, 'Bóveda Principal'),    -- Hublot Big Bang
(30, 2, 8, 'Accesorios D-02'),    -- Collar Tiffany
(40, 2, 4, 'Calzado Rápido 2'),    -- Zapatillas Golden Goose
(58, 2, 6, 'Pasillo H-10'),        -- Bolso Fendi Baguette
(75, 2, 2, 'Bebidas Premium'),     -- Whisky Macallan 25 Años
(80, 2, 1, 'Electrónica Principal'),  -- Tocadiscos McIntosh MT10
(41, 2, 1, 'Bóveda Principal');    -- Zapatillas Off-White

-- Inventario para Bodega Sur (ID 3)
INSERT INTO inventario (producto_id, bodega_id, cantidad, ubicacion_detalle) VALUES
(23, 3, 2, 'Vitrina Joyas Sur'),  -- Patek Calatrava
(29, 3, 5, 'Moda B-03'),          -- Cartera Dior Lady Dior
(35, 3, 1, 'Consignación Especial'), -- Abrigo Cashmere
(45, 3, 3, 'Calzado Rápido 3'),    -- Mocasines Tod's
(55, 3, 15, 'Perfumes Zona 2'),    -- Perfume Roja Dove
(65, 3, 2, 'Bebidas Premium'),     -- Champagne Cristal Roederer
(78, 3, 1, 'Bóveda Licores');      -- Whisky Yamazaki

-- =========================================================
-- VALIDACIÓN FINAL: Ahora deberías ver 121 productos
-- =========================================================
SELECT 'Productos (Total)' AS tabla, COUNT(*) FROM productos
UNION ALL
SELECT 'Inventario (Total)' AS tabla, COUNT(*) FROM inventario;

-- Rutas, Envíos y Operaciones
-- ---------------------------------------------------------

-- SEED: Rutas
---------------------------------------------------------
INSERT INTO ruta (origen, destino, fecha_programada, costo_estimado, tiempo_estimado) VALUES
('Bodega Central RM', 'Cliente VIP, Vitacura', CURRENT_DATE, 50000, '01:10'), -- ID 1
('Bodega Central RM', 'Santiago Centro', CURRENT_DATE + 1, 35000, '00:45'), -- ID 2
('Bodega Norte', 'Calama Retail', CURRENT_DATE + 2, 150000, '03:30'), -- ID 3
('Bodega Sur', 'Concepción Mall', CURRENT_DATE + 2, 60000, '01:20'); -- ID 4

-- SEED: Envíos
---------------------------------------------------------
INSERT INTO envio (ruta_id, vehiculo_id, trabajador_id, fecha_salida, estado) VALUES
(1, 1, 2, NOW(), 'entregado'),
(2, 4, 5, NOW() + INTERVAL '1 hour', 'en_ruta'),
(3, 2, 5, NULL, 'programado'),
(4, 1, 2, NULL, 'cancelado');

-- SEED: Cargas
---------------------------------------------------------
-- Envio 1 (Entregado)
INSERT INTO carga (envio_id, producto_id, cantidad, estado)
VALUES
(1, 1, 1, 'entregado'), -- Rolex Submariner (ID 1)
(1, 7, 2, 'entregado'); -- Cartera LV (ID 7)

-- Envio 2 (En Ruta)
INSERT INTO carga (envio_id, producto_id, cantidad, estado)
VALUES
(2, 9, 3, 'en_ruta'), -- LV Neverfull (ID 9)
(2, 5, 1, 'en_ruta'); -- Cartier Love Bracelet (ID 5)

-- Envio 3 (Programado)
INSERT INTO carga (envio_id, producto_id, cantidad, estado)
VALUES
(3, 4, 1, 'pendiente'), -- Patek Philippe (ID 4)
(3, 12, 2, 'pendiente'); -- Jordan 1 OG (Original ID 12)

-- SEED: Retiro de Inventario (Ajustes de Stock)
---------------------------------------------------------
-- inventario_id 3 (Jordan Dior, producto ID 8)
INSERT INTO retiro (inventario_id, fecha_retiro, motivo, estado) VALUES
(3, CURRENT_DATE, 'Venta Premium Cliente Final', 'confirmado');
-- inventario_id 8 (LV Neverfull, producto ID 9)
INSERT INTO retiro (inventario_id, fecha_retiro, motivo, estado) VALUES
(8, CURRENT_DATE - INTERVAL '1 day', 'Ajuste de stock por reconteo', 'confirmado');

-- SEED: Manipulación de Inventario
---------------------------------------------------------
-- inventario_id 4 (Anillo Cartier, producto ID 2) por Vale (1)
INSERT INTO manipulacion (inventario_id, trabajador_id, fecha_hora, accion) VALUES
(4, 1, NOW() - INTERVAL '1 hour', 'reubicado');
-- inventario_id 10 (Hermes Kelly, producto ID 10) por Sofía (3)
INSERT INTO manipulacion (inventario_id, trabajador_id, fecha_hora, accion) VALUES
(10, 3, NOW() - INTERVAL '2 hours', 'reconteo');

-- SEED: Asistencia y Turnos
---------------------------------------------------------
INSERT INTO asistencia (trabajador_id, fecha, estado) VALUES
(1, CURRENT_DATE, 'presente'),
(2, CURRENT_DATE, 'presente'),
(3, CURRENT_DATE, 'ausente'),
(4, CURRENT_DATE, 'presente'),
(5, CURRENT_DATE, 'presente'),
(6, CURRENT_DATE, 'licencia'),
(7, CURRENT_DATE, 'presente');

INSERT INTO turno (trabajador_id, fecha_inicio, fecha_fin, tipo) VALUES
(1, NOW() - INTERVAL '4 hours', NULL, 'mañana'),
(2, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '1 hour', 'noche'),
(4, NOW() - INTERVAL '2 hours', NULL, 'seguridad_mañana'),
(7, NOW() - INTERVAL '1 hour', NULL, 'gerencia');

-- SEED: Mantenimiento
---------------------------------------------------------
INSERT INTO mantenimiento (vehiculo_id, fecha, tipo, observaciones) VALUES
(3, CURRENT_DATE - INTERVAL '10 days', 'correctivo', 'Reparación de motor por falla. Ya está en bodega.'),
(2, CURRENT_DATE - INTERVAL '5 days', 'preventivo', 'Inspección de frenos y neumáticos. Ok.');

-- SEED: Incidente (ejemplo)
---------------------------------------------------------
-- Incidente en bodega 1 (cámara 2 - Vitrina Premium), trabajador 4 (Seguridad) lo reporta
INSERT INTO incidente (camara_id, trabajador_id, fecha_hora, tipo, descripcion) VALUES
(2, 4, NOW() - INTERVAL '30 minutes', 'Intento de hurto', 'Alarma disparada por proximidad, sin pérdida de producto.');

-- Incidente en carga (ejemplo de daño en producto en envío 1, carga 2)
INSERT INTO incidente (carga_id, trabajador_id, fecha_hora, tipo, descripcion) VALUES
(2, 2, NOW() - INTERVAL '1 day', 'Daño leve', 'La Cartera LV sufrió una pequeña raya en el embalaje durante el transporte.');


-- =========================================================
-- VALIDACIÓN RÁPIDA DE DATOS
-- =========================================================
SELECT 'Productos' AS tabla, COUNT(*) FROM productos
UNION ALL
SELECT 'Inventario' AS tabla, COUNT(*) FROM inventario
UNION ALL
SELECT 'Trabajadores' AS tabla, COUNT(*) FROM trabajador
UNION ALL
SELECT 'Envíos' AS tabla, COUNT(*) FROM envio
UNION ALL
SELECT 'Cargas' AS tabla, COUNT(*) FROM carga;
"""
    op.execute(sql)


def downgrade() -> None:
    # For downgrade we drop the tables created by this migration
    op.execute("DROP TABLE IF EXISTS carga, retiro, manipulacion, incidente, envio, inventario, camara, ruta, mantenimiento, vehiculo, trabajador, bodega, productos CASCADE;")

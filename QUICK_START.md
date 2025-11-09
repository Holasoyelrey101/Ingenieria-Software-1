# 🚀 QUICK START: Sistema UTF-8 con Nombres Acentuados

## ✅ Estado Actual

El sistema está **COMPLETAMENTE OPERATIVO** con soporte completo para nombres con tildes españoles.

---

## 🎯 Comandos Rápidos

### 1. Verificar que el sistema está corriendo

```bash
docker ps -a --filter "name=postgres"
# Debe mostrar: infra-postgres-1 → Up X minutes (healthy)
```

### 2. Consultar empleados con tildes

```bash
# Opción A: PowerShell (Windows)
Invoke-WebRequest -Uri "http://localhost:8003/employees" -Method Get | 
  Select-Object -ExpandProperty Content | 
  ConvertFrom-Json | 
  Select-Object -First 3 | 
  Format-Table nombre, email

# Opción B: Si tienes curl (WSL o Git Bash)
curl -s http://localhost:8003/employees | jq '.[] | {nombre, email}' | head -20

# Opción C: Browser
http://localhost:8003/employees
```

**Salida esperada:**
```
Juan Pérez García          juan.perez@luxlogistics.cl
María José López Rodríguez maria.lopez@luxlogistics.cl
Carlos Andrés Martínez Flores carlos.martinez@luxlogistics.cl
```

### 3. Ver frontend web

```bash
# Abrir en navegador
http://localhost:8080
```

---

## 📊 Estructura de Servicios

| Servicio | Puerto | Status | URL |
|----------|--------|--------|-----|
| Frontend | 8080 | ✅ Running | http://localhost:8080 |
| Gateway | 8000 | ✅ Healthy | http://localhost:8000 |
| ms-rrhh | 8003 | ✅ Running | http://localhost:8003 |
| ms-logistica | 8001 | ✅ Healthy | http://localhost:8001 |
| ms-inventario | 8002 | ✅ Healthy | http://localhost:8002 |
| PostgreSQL | 5432 | ✅ Healthy | localhost:5432 |

---

## 📁 Documentación Disponible

| Archivo | Propósito |
|---------|----------|
| `RESUMEN_EJECUTIVO.md` | Overview de la solución |
| `UTF8_FIX_AUDIT.md` | Auditoría técnica detallada |
| `CAMBIOS_TECNICOS.md` | Registro de cambios específicos |

---

## 🔧 Agregar Nuevos Empleados con Tildes

### En PostgreSQL directamente:

```sql
INSERT INTO employees (rut, nombre, email, activo, role_id, contract_type_id, shift_profile_id)
VALUES (
    '20123456-9',
    'Sofía Martínez Gómez',
    'sofia.martinez@luxlogistics.cl',
    TRUE,
    (SELECT id FROM roles WHERE nombre = 'Conductor' LIMIT 1),
    (SELECT id FROM contract_types WHERE nombre = 'Tiempo Indefinido' LIMIT 1),
    (SELECT id FROM shift_profiles WHERE nombre = 'Turno Diurno Estándar' LIMIT 1)
);
```

**Garantizado:** Nombre se guardará con tildes correctas (Sofía ✓)

---

## 🐛 Troubleshooting

### Problema: PostgreSQL no está healthy

```bash
# Ver logs
docker logs infra-postgres-1 | tail -50

# Reiniciar
docker-compose -f infra/docker-compose.yaml down -v
docker-compose -f infra/docker-compose.yaml up -d --build
```

### Problema: API retorna error

```bash
# Ver logs del servicio
docker logs infra-ms-rrhh-1 | tail -30

# Verificar conectividad a DB
docker exec infra-ms-rrhh-1 python -c "import db; print('OK')"
```

### Problema: Nombres aún salen con corrupted encoding

```bash
# Verificar header de respuesta
curl -i http://localhost:8003/employees | grep Content-Type
# Debe incluir: charset=utf-8

# Verificar datos en DB
docker exec -it infra-postgres-1 psql -U lux -d erp -c "SELECT nombre FROM employees LIMIT 3;"
```

---

## 📈 Performance Tips

### Ver indices creados

```bash
docker exec -it infra-postgres-1 psql -U lux -d erp -c "\d employees"
# Debe mostrar 3 índices:
# - ix_employees_role_id
# - ix_employees_contract_type_id
# - ix_employees_activo
```

### Query performance

```sql
-- Rápida (con índice)
SELECT * FROM employees WHERE role_id = 1;

-- Más lenta (sin índice)
SELECT * FROM employees WHERE nombre LIKE '%María%';
```

---

## 🔐 Validaciones Implementadas

✅ **Database Level**
- C.UTF-8 locale
- client_encoding=UTF8
- Stored procedures with UTF-8 support

✅ **API Level**
- FastAPI UTF8Middleware
- Content-Type headers with charset
- Response validation

✅ **HTTP Level**
- Accept-Charset support
- Transfer-Encoding handling
- Browser render optimization

✅ **Error Handling**
- Try-catch in all SQL operations
- Graceful degradation
- Error logging

---

## 📝 API Endpoints

### GET /employees
**Retorna:** Todos los empleados activos con nombres acentuados

```bash
Invoke-WebRequest http://localhost:8003/employees
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Juan Pérez García",
    "email": "juan.perez@luxlogistics.cl",
    "rut": "12345678-K",
    "activo": true
  },
  ...
]
```

### GET /employees/{id}
**Retorna:** Empleado específico

```bash
Invoke-WebRequest http://localhost:8003/employees/1
```

### POST /employees (si está implementado)
**Crea:** Nuevo empleado

```json
{
  "nombre": "Nuevo Empleado",
  "email": "nuevo@example.com",
  "rut": "20123456-7"
}
```

---

## 🎓 Arquitectura UTF-8

```
Capa 1: Database
├─ PostgreSQL C.UTF-8 locale
├─ client_encoding=UTF8
└─ SET client_encoding='UTF8' per connection

Capa 2: ORM
├─ SQLAlchemy event listeners
└─ Encoding verification on connect

Capa 3: Application
├─ FastAPI + UTF8Middleware
└─ Content-Type: application/json; charset=utf-8

Capa 4: HTTP Transport
├─ UTF-8 encoded JSON
└─ Proper character escaping

Capa 5: Browser
├─ <meta charset="utf-8">
└─ Render with correct glyphs
```

---

## 📞 Support

Si encuentras problemas con encoding:

1. **Verificar logs:**
   ```bash
   docker logs infra-postgres-1 | grep -i utf
   docker logs infra-ms-rrhh-1 | grep -i encod
   ```

2. **Revisar documentación:**
   - `UTF8_FIX_AUDIT.md` - Detalles técnicos
   - `CAMBIOS_TECNICOS.md` - Cambios específicos

3. **Consultar base de datos:**
   ```bash
   docker exec -it infra-postgres-1 psql -U lux -d erp -c "SHOW client_encoding;"
   # Debe retornar: UTF8
   ```

---

## ✨ Beneficios Implementados

✅ Nombres con tildes se muestran correctamente en toda la aplicación  
✅ Base de datos robusta con manejo automático de errores  
✅ APIs escalables con performance indices  
✅ Arquitectura profesional de múltiples capas  
✅ Sistema resiliente que continúa funcionando ante errores  

---

**¡Sistema completamente operativo!** 🎉

Todos los empleados con nombres acentuados se visualizan correctamente.

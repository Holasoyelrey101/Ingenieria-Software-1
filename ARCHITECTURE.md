# ERP LuxChile — Arquitectura MVP (actualizada)

Fecha: 2025-10-10

Resumen
-------
Este documento describe la arquitectura efectiva del MVP del ERP LuxChile. El sistema está diseñado con una topología mínima y funcional: microservicios en FastAPI (Python), PostgreSQL como base de datos, y frontend en React + Vite. Se elimina del alcance del MVP cualquier dependencia de mensajería (Kafka/RabbitMQ), reverse proxy (Traefik) y stack de observabilidad avanzada (Prometheus/Grafana/Loki). Se mantiene la integración con Google Maps (Maps JS + Directions + Places) para visualización y ruteo.

Componentes principales
----------------------
- API Gateway / BFF (FastAPI): capa de orquestación y agregación simple; seguridad básica (skeleton). Expone endpoints consolidados al frontend.
- Microservicios (FastAPI):
  - ms-inventario: consultas de stock, movimientos, alertas.
  - ms-logistica: geocodificación, cálculo de rutas, optimización sencilla y creación de incidentes.
- Base de datos: PostgreSQL 15 (única instancia). Migraciones aplicadas mediante scripts SQL ordenados en `infra/sql` (001, 002, 003…).
- Observabilidad básica: healthchecks (`/health`) y opción de métricas simples; logs a stdout.
- Infra local/dev: docker-compose con Postgres, pgAdmin (opcional), gateway, ms-inventario, ms-logistica y web.
- Frontend: React + Vite + TypeScript. Integración con Google Maps JS API y Places API.

Diagrama lógico (C4 - resumen)
-----------------------------
- Nivel 1 (Sistema): ERP LuxChile expone UI web y APIs internas.
- Nivel 2 (Contenedores): Frontend (Vite/React), Gateway (FastAPI), ms-inventario (FastAPI), ms-logistica (FastAPI), PostgreSQL.
- Nivel 3 (Componentes claves): en ms-logistica: MapClient, RouteOptimizer (heurística simple), DirectionsProxy.

Requisitos funcionales (síntesis)
--------------------------------
- Inventario: consultar stock por bodega, movimientos de entrada/salida, alertas básicas.
- Logística: geocodificar, calcular rutas, crear incidentes asociados a rutas/paradas/vehículos/conductores.
 - Logística: geocodificar, calcular rutas, crear incidentes asociados a rutas/paradas/vehículos/conductores. Todo incidente DEBE estar vinculado a un `delivery_request` para asegurar trazabilidad.

Requisitos no funcionales (síntesis)
-----------------------------------
- Objetivo MVP: simplicidad operativa y reproducibilidad local vía Docker.
- Latencia: P99 consultas inventario < 5s (objetivo de referencia).
- Seguridad: JWT (skeleton) y manejo de variables `.env`; TLS y 2FA quedan fuera del MVP.
- Cumplimiento: buenas prácticas de datos; formalización posterior.

Integración con Google Maps — detalles
-------------------------------------
Arquitectura de integración:
- Llaves separadas: una llave de navegador para el frontend (VITE_GOOGLE_MAPS_API_KEY). La llave de servidor puede omitirse en MVP si las llamadas a Maps se realizan cliente-side o via ms-logistica con configuración simple.
- ms-logistica expone endpoints internos:
  - POST /maps/geocode — body: {"address": "..."} → Geocoding API.
  - POST /maps/directions — body: {"origin":..., "destination":..., "waypoints": [...], "optimize": true} → Directions API.
- Frontend usa @react-google-maps/api para mapa y Autocomplete (Places API) y solicita rutas al Gateway/BFF.

Variables de entorno clave
--------------------------
- POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- JWT_SECRET, JWT_ALGORITHM (skeleton)
- VITE_GOOGLE_MAPS_API_KEY (frontend)

Seguridad y autenticación
-------------------------
- Autenticación: JWT básico (skeleton) en Gateway. OAuth2/2FA quedan fuera del MVP.
- Protección de secretos: no embebidos, usar variables de entorno.

Mensajería y sincronización (fuera de alcance MVP)
-------------------------------------------------
Sin Kafka/RabbitMQ en el MVP. Flujos asíncronos pueden considerarse en iteraciones futuras.

Persistencia y migraciones
--------------------------
- PostgreSQL 15 único. Esquemas y tablas definidos mediante scripts SQL en `infra/sql` numerados:
  - 001_init_schema.sql (inventario)
  - 002_logistica_base.sql (logística)
  - 003_incidents_add_vehicle_driver.sql (HU5)
  - seed_clean.sql (datos de ejemplo)
- Recomendación: mantener scripts idempotentes (IF NOT EXISTS) y documentar orden de aplicación.

Observabilidad (básica)
----------------------
- Healthchecks (`/health`) y logs a stdout. Métricas opcionales fuera de alcance del MVP.

Estructura de repositorios (MVP)
-------------------------------
- /gateway
- /ms-inventario
- /ms-logistica
- /web
- /infra (docker-compose y sql)
- /docs (opcional)

Notas sobre ruteo optimizado (algoritmo inicial)
-----------------------------------------------
- Para el MVP implementar un algoritmo heurístico: primera versión: Nearest Neighbor (NN) para construir ruta inicial + 2-opt para mejorar iterativamente.
- Este algoritmo funciona bien para decenas de puntos y es sencillo de ejecutar en ms-logistica. Para grandes volúmenes considerar integración con OR-Tools (Google) o servicios de ruteo comerciales.

Contrato API (ejemplos)
----------------------
- POST /maps/geocode
  - request: {"address": string}
  - response: {"lat": float, "lng": float, "formatted_address": string}

- POST /maps/directions
  - request: {"origin": {lat,lng}|{address}, "destination": {...}, "waypoints": [...], "optimize": bool}
  - response: {"polyline": string, "legs": [...], "distance_m": int, "duration_s": int, "steps": [...]} 

- POST /maps/incidents
  - request: {"delivery_request_id": int, "type": string, "description": string}
  - behavior: la "severity" se deriva del "type" (por ejemplo: theft/accident → high; breakdown/smoke/lost_contact → medium; delay → low). Campos de vehículo/conductor no los establece el guardia desde este panel.

Checklist MVP
-------------
1. Documentación (este archivo y README).
2. `docker-compose.yaml` con Postgres, pgAdmin (opcional), gateway, ms-logistica, ms-inventario, web.
3. ms-logistica con /maps/geocode, /maps/directions e incidentes.
4. Frontend React con mapa, autocomplete y rutas.
5. Scripts SQL en `infra/sql` aplicados (001, 002, 003, seed).

Referencias y cumplimiento
-------------------------
- Ley 19.628: almacenar logs de consentimiento, permitir export/rectificación/borrado.
- Google Maps Platform usage limits: monitorizar consumo y configurar restricciones de llave.

Siguientes pasos (tareas inmediatas)
-----------------------------------
1. Crear `requirements.txt` raíz y por servicio. (seguir con la lista de dependencias propuesta).
2. Añadir `.env.sample` y `docker-compose.yaml` en `/infra`.
3. Implementar `ms-logistica` y `gateway` minimal para pruebas locales.

---
Fin del documento.

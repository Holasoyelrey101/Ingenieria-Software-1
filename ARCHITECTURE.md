# ERP LuxChile — Arquitectura MVP

Fecha: 2025-10-02

Resumen
-------
Este documento describe la arquitectura propuesta para un MVP productivo del ERP LuxChile. El sistema está diseñado como una arquitectura de microservicios con FastAPI (Python) en backend, PostgreSQL como almacenamiento relacional, React + Vite en frontend y mensajería asíncrona para eventos de dominio (Kafka/RabbitMQ). Incluye integración con Google Maps (Maps JS + Directions + Places) para visualización y ruteo.

Componentes principales
----------------------
- API Gateway / BFF (FastAPI): autenticación (OAuth2/JWT), 2FA (TOTP), RBAC por rol. Expone endpoints consolidados al frontend.
- Microservicios (FastAPI):
  - ms-inventario: consultas de stock, movimientos, alertas stock_bajo_detectado.
  - ms-logistica: geocodificación, cálculo de rutas, optimizador de rutas, asignación vehículo/conductor.
  - ms-seguridad: registro de incidentes, evidencia (enlaces a cámaras), integración con mensajería.
  - ms-activos: CRUD de activos, mantenciones, recordatorios y calendario.
  - ms-rrhh: turnos, asistencias y APIs para control horario.
  - ms-reportes: ETL, generación/exportación a PDF y Excel, jobs batch (Celery).
- Base de datos: PostgreSQL 15+ (un esquema por servicio; migraciones via Alembic por servicio o repositorio centralizado de migraciones).
- Mensajería/Eventos: Kafka (preferido para at-least-once, particionado) o RabbitMQ (si se prefiere simplicidad). Topicos/events: stock_bajo_detectado, incidente_registrado, mantencion_programada, movimiento_registrado.
- Observabilidad: Prometheus (metria), Grafana (dashboards), Loki (logs JSON), tracing (opentelemetry opcional).
- Infra local/dev: docker-compose con Traefik (TLS dev), pgAdmin, Mailhog, pg (Postgres), Kafka/RabbitMQ.
- Frontend: React + Vite + TypeScript. Integración con Google Maps JS API y Places API mediante llave restringida de navegador.

Diagrama lógico (C4 - resumen)
-----------------------------
- Nivel 1 (Sistema): ERP LuxChile expone UI web y APIs públicas internas.
- Nivel 2 (Contenedores): Frontend (Vite/React), Gateway (FastAPI), múltiples microservicios (FastAPI), PostgreSQL, Kafka/RabbitMQ, Observabilidad (Prometheus/Grafana/Loki).
- Nivel 3 (Componentes claves): en ms-logistica: MapClient, RouteOptimizer, DirectionsProxy, JobWorker.

Requisitos funcionales (síntesis)
--------------------------------
- Inventario: consultar stock por bodega, movimientos de entrada/salida, alertas configurables (stock_bajo_detectado).
- Logística: planificar rutas optimizadas, asignar vehículo y conductor, ver y seguir la ruta en mapa (Google Maps), confirmar entregas.
- Seguridad: registrar incidentes con metadatos, vincular evidencia de cámaras, alertas y escalamiento.
- Activos: CRUD de activos y gestión de mantenciones, recordatorios y generación de órdenes de trabajo.
- RR.HH.: administrar turnos, registrar asistencias, calcular horas trabajadas.
- Reportes/ETL: extracción y transformación periódica, reportes consolidados exportables a PDF/Excel.

Requisitos no funcionales (síntesis)
-----------------------------------
- Disponibilidad objetivo >= 99.5% (plan de alta disponibilidad en producción: múltiples réplicas, réplica DB, backup, monitorización).
- Latencia: P99 consultas inventario < 5s.
- Frescura de stock: actualizaciones visibles en UI <= 60s (eventos + cache invalidation).
- Usabilidad: flujos clave en <= 3 pasos.
- Seguridad: 2FA (TOTP), JWT con rotación, TLS (en tránsito), cifrado en reposo para datos sensibles.
- Accesibilidad: WCAG 2.1 AA para la interfaz pública.
- Cumplimiento legal: Ley 19.628 (Chile) para protección de datos personales — almacenar consentimiento, derecho a acceso/rectificación/borrado.

Integración con Google Maps — detalles
-------------------------------------
Arquitectura de integración:
- Claves separadas: una llave de navegador para el frontend (VITE_GOOGLE_MAPS_API_KEY, restricted by HTTP referrer) y una llave de servidor para backend (GOOGLE_MAPS_SERVER_KEY, restricted by IP).
- ms-logistica expone endpoints internos seguros:
  - POST /maps/geocode — body: {"address": "..."} → server-side Geocoding API call, devuelve {lat, lng, formatted_address}.
  - POST /maps/directions — body: {"origin":..., "destination":..., "waypoints": [...], "optimize": true} → llama a Directions API (server key) y devuelve ruta, polyline, distancia, duración.
- Frontend usa @react-google-maps/api para renderizar el mapa, Autocomplete (Places API) para origen/destino y solicita rutas al Gateway/BFF.
- El Gateway valida permisos (RBAC) y reenvía las peticiones a ms-logistica.

Variables de entorno clave
--------------------------
- POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- JWT_SECRET, JWT_ALGORITHM
- GOOGLE_MAPS_SERVER_KEY (server-side, no exponer)
- VITE_GOOGLE_MAPS_API_KEY (frontend)
- KAFKA_BOOTSTRAP_SERVERS / RABBITMQ_URL
- PROMETHEUS multiprocess env (si aplica)

Seguridad y autenticación
-------------------------
- Autenticación: OAuth2 Password + JWT (access/refresh). 2FA con TOTP (pyotp) en el Gateway.
- Autorización: RBAC por rol con scopes mínimos (admin, auditor, logística, bodega, seguridad, rrhh).
- Protección de secretos: nunca embebidos en imágenes; usar env vars y vault en producción.

Mensajería y sincronización
---------------------------
- Uso de Kafka para eventos de dominio. Cada microservicio publica/consume los eventos relevantes.
- Ejemplo: ms-inventario publica stock_bajo_detectado → ms-logistica y ms-reportes consumen.
- Para tareas programadas y ETL usar Celery con backend Redis o la cola Kafka/RabbitMQ.

Persistencia y migraciones
--------------------------
- Cada microservicio tiene su propio esquema en PostgreSQL (naming conventions y prefijo schema por servicio opcional).
- Migraciones con Alembic (por servicio). Mantener versionamiento en repo.

Observabilidad
--------------
- Métricas: exponer /metrics (prometheus_client) por cada servicio.
- Logs: JSON structured logs con structlog enviados a stdout; Loki recogerá dichos logs.
- Dashboards: Grafana con dashboards por servicio, alertas (Prometheus Alertmanager en producción).

Estructura de repositorios sugerida
----------------------------------
- /gateway
- /ms-inventario
- /ms-logistica
- /ms-seguridad
- /ms-activos
- /ms-rrhh
- /ms-reportes
- /web
- /infra (docker-compose, Traefik, prometheus, grafana)
- /docs

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

Checklist de entrega MVP (mínimo para productivo)
-------------------------------------------------
1. Documentación (este archivo).
2. `requirements.txt` para backend(s).
3. `docker-compose.yaml` con Postgres, Kafka/RabbitMQ, Mailhog, Prometheus, Grafana, Traefik, gateway, ms-logistica, ms-inventario, web.
4. ms-logistica implementado con endpoints /maps/geocode y /maps/directions y algoritmo NN+2opt.
5. Frontend react con mapa, autocomplete y dibujado de rutas.
6. Observabilidad básica: /metrics endpoints y logs JSON.

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

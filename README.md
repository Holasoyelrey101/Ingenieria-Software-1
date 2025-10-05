# LuxChile ERP — MVP

Breve: arquitectura microservicios (FastAPI), Postgres, React + Vite con Google Maps, mensajería (Kafka/RabbitMQ), ETL/reportes, observabilidad (Prometheus/Grafana/Loki). Este repo contiene artefactos mínimos del MVP.

Quick start (desarrollo):

1. Copia `./.env.sample` a `./.env` y completa las claves (Google Maps server + front key).
2. Desde `c:/Users/david/Desktop/lux_page/infra`:

```powershell
docker compose up -d postgres kafka rabbitmq mailhog prometheus grafana loki traefik
docker compose up -d --build gateway ms-logistica web
```

3. Abrir:
- Frontend: http://localhost:5173
- Gateway: http://localhost:8000/health
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

Checklist de requerimientos (estado):

- Arquitectura general: microservicios (documentado en `ARCHITECTURE.md`) — Done
- Google Maps integración (ms-logistica + frontend skeleton) — Done (skeleton + endpoints)
- requirements.txt (backend) — Done
- docker-compose (infra) — Created (basic stack) — Needs credential/service tuning
- Gateway (OAuth2/JWT + TOTP skeleton) — Done (skeleton)
- ms-logistica (geocode/directions + optimizer + metrics) — Done
- Frontend (React + Vite + Map skeleton) — Done (skeleton)
- Observability (Prometheus + Grafana + /metrics endpoints) — Partially done (services expose /metrics; Grafana dashboards not provisioned)

Próximos pasos sugeridos:
- Implementar RBAC persisting users in DB and full OAuth2 flows (refresh tokens, password reset).
- Flesh out frontend: decode polyline, render route, show distance/duration, Autocomplete binding.
- Add Alembic migrations per service and initial schemas.
- Add Prometheus scrape_configs and Grafana dashboard provisioning.

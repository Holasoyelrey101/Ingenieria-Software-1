# Gateway (BFF)

FastAPI-based API Gateway / BFF. Responsibilities:

- Authentication: OAuth2 / JWT (access + refresh), TOTP 2FA (pyotp).
- Authorization: RBAC by roles.
- BFF: proxy and aggregate requests to microservices (e.g. /maps/* -> ms-logistica).

Configure via `.env` (see `.env.sample`).

Database configuration
----------------------

This service reads DB configuration from `config.env` (or environment variables). The following variables are used:

- DB_HOST (default: localhost)
- DB_PORT (default: 5432)
- DB_NAME (default: luxchile_db)
- DB_USER (default: postgres)
- DB_PASSWORD (default: welcome13)
- DATABASE_URL (optional; overrides DB_* vars)

To run migrations using alembic from the `gateway` folder:

1. Ensure the environment variables are set or `config.env` is present in the repository root.
2. From the repo root run (example):

```bash
cd gateway
alembic upgrade head
```

If Postgres is not available during development, the app will fall back to a local SQLite DB (`dev_gateway.db`).

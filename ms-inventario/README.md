ms-inventario (FastAPI)
=======================
Minimal inventory microservice skeleton for Sprint 1.

Endpoints:
 - GET /health
 - GET /productos
 - GET /inventory/{bodega_id}
 - POST /movements
 - GET /alerts
 - PATCH /alerts/{id}/ack

Run (developer):
  python -m venv .venv
  source .venv/bin/activate  # (Linux/macOS) or .\.venv\Scripts\activate (Windows)
  pip install -r requirements.txt
  cp .env.sample .env
  # set DATABASE_URL in .env as needed
  uvicorn app.main:app --reload --port 8000

Docker (build via compose):
  docker build -t ms-inventario:local .

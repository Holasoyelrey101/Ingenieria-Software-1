ms-rrhh — RR.HH. microservice (local skeleton)

Quick start (dev):

- Build and run with Docker Compose after adding the service to `infra/docker-compose.yaml`.
- Or run locally:

```powershell
cd ms-rrhh
python -m pip install -r requirements.txt
uvicorn ms-rrhh.app.main:app --reload --port 8000
```

Endpoints:
- `GET /health`
- `GET /` (info)
- `POST /employees`, `GET /employees`, `GET /employees/{id}`
- `POST /shifts`, `GET /shifts`, `GET /shifts/{id}`
- `POST /assignments`, `GET /assignments?employee_id&from&to`

Notes: This is a minimal scaffold created to start HU9. Add migrations, tests and README details when implementing further.

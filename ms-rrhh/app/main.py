from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import employees, shifts, assignments, trainings, employee_trainings, dynamic_shifts

app = FastAPI(title='ms-rrhh')

# CORS configuration - allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(employees.router, prefix='/employees', tags=['employees'])
app.include_router(shifts.router, prefix='/shifts', tags=['shifts'])
app.include_router(assignments.router, prefix='/assignments', tags=['assignments'])
app.include_router(dynamic_shifts.router, prefix='/dynamic-shifts', tags=['dynamic-shifts'])
app.include_router(trainings.router, prefix='/trainings', tags=['trainings'])
app.include_router(employee_trainings.router, tags=['employee-trainings'])


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/')
def root():
    return {'service': 'ms-rrhh', 'status': 'ok'}

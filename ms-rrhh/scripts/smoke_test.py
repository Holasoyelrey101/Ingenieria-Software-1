"""Simple smoke test for ms-rrhh endpoints (requires service running on localhost:8000)
"""
import requests

BASE = 'http://localhost:8000'

def run():
    print('Health ->', requests.get(BASE + '/health').status_code)
    # create employee
    r = requests.post(BASE + '/employees', json={'nombre':'Test User','email':'test@example.com'})
    print('Create employee ->', r.status_code, r.json() if r.ok else r.text)
    # create shift
    r2 = requests.post(BASE + '/shifts', json={'name':'Mañana','start_time':'08:00:00','end_time':'16:00:00'})
    print('Create shift ->', r2.status_code, r2.json() if r2.ok else r2.text)
    if r.ok and r2.ok:
        emp = r.json()
        shift = r2.json()
        r3 = requests.post(BASE + '/assignments', json={'employee_id': emp['id'], 'shift_id': shift['id'], 'date':'2025-10-24'})
        print('Create assignment ->', r3.status_code, r3.json() if r3.ok else r3.text)

if __name__ == '__main__':
    run()

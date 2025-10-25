"""Smoke test for ms-rrhh when run via Docker Compose (expects service on port 8003)
"""
import requests
import time

BASE = 'http://localhost:8003'

def run():
    # wait for health
    for _ in range(30):
        try:
            r = requests.get(BASE + '/health', timeout=1)
            if r.status_code == 200:
                print('Health OK')
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        print('Health did not become available')
        return

    print('Health ->', requests.get(BASE + '/health').status_code)
    
    # create employee
    r = requests.post(BASE + '/employees', json={'nombre':'Test User','email':'test@example.com','rut':'11111111-1'})
    print('Create employee ->', r.status_code, r.json() if r.ok else r.text)
    
    # create shift
    r2 = requests.post(BASE + '/shifts', json={'name':'Mañana','start_time':'08:00:00','end_time':'16:00:00'})
    print('Create shift ->', r2.status_code, r2.json() if r2.ok else r2.text)
    
    # create assignment
    if r.ok and r2.ok:
        emp = r.json()
        shift = r2.json()
        r3 = requests.post(BASE + '/assignments', json={'employee_id': emp['id'], 'shift_id': shift['id'], 'date':'2025-10-26'})
        print('Create assignment ->', r3.status_code, r3.json() if r3.ok else r3.text)
    
    # create training
    r4 = requests.post(BASE + '/trainings', json={'title':'Python Basics','topic':'Programming','required':True})
    print('Create training ->', r4.status_code, r4.json() if r4.ok else r4.text)
    
    # create employee training
    if r.ok and r4.ok:
        emp = r.json()
        training = r4.json()
        r5 = requests.post(BASE + '/employee-trainings', json={
            'employee_id': emp['id'],
            'training_id': training['id'],
            'date': '2025-10-25',
            'instructor': 'John Doe',
            'status': 'COMPLETED'
        })
        print('Assign training ->', r5.status_code, r5.json() if r5.ok else r5.text)
        
        # list employee trainings
        r6 = requests.get(BASE + f'/employees/{emp["id"]}/trainings')
        print('List employee trainings ->', r6.status_code, r6.json() if r6.ok else r6.text)

if __name__ == '__main__':
    run()


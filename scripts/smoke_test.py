"""Simple smoke-test script to probe local services and capture responses.
Run from repo root: python scripts/smoke_test.py
"""
import requests
import json

services = {
    'ms-logistica': 'http://127.0.0.1:18001',
    'gateway': 'http://127.0.0.1:18000',
    'frontend': 'http://127.0.0.1:5173',
}

def probe(name, url):
    try:
        r = requests.get(url + '/health', timeout=3)
        print(name, 'health', r.status_code, r.text)
    except Exception as e:
        print(name, 'health error:', e)

def directions_test():
    url = services['gateway'] + '/maps/directions'
    payload = {
        'origin': {'lat': -33.45, 'lng': -70.66},
        'destination': {'lat': -33.437, 'lng': -70.65},
        'waypoints': [],
        'optimize': True
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        print('/maps/directions', r.status_code)
        try:
            print(json.dumps(r.json(), indent=2, ensure_ascii=False))
        except Exception:
            print('non-json response:', r.text[:1000])
    except Exception as e:
        print('directions call failed:', e)

if __name__ == '__main__':
    for n,u in services.items():
        probe(n,u)
    directions_test()

import requests
import os

BASE = os.environ.get('MS_LOGISTICA_URL', 'http://127.0.0.1:18001')

def test_create_and_list():
    payload = {
        "origin": {"lat": -33.45, "lng": -70.66},
        "destination": {"lat": -33.44, "lng": -70.65},
        "vehicle_id": "VEH123",
        "payload": {"order_id": 999, "items": ["Rolex"]}
    }
    r = requests.post(f"{BASE}/maps/directions", json={"origin": payload['origin'], "destination": payload['destination'], "waypoints": [], "optimize": False})
    print('directions status', r.status_code)

    r = requests.post(f"{BASE}/deliveries", json=payload)
    print('create delivery', r.status_code, r.json())

    r = requests.get(f"{BASE}/deliveries")
    print('list deliveries', r.status_code, r.json())


if __name__ == '__main__':
    test_create_and_list()

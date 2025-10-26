from typing import List, Tuple

def haversine(a: Tuple[float,float], b: Tuple[float,float]) -> float:
    from math import radians, sin, cos, asin, sqrt
    lat1, lon1 = a
    lat2, lon2 = b
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    lat1 = radians(lat1)
    lat2 = radians(lat2)
    x = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2 * 6371000 * asin(sqrt(x))

def nearest_neighbor(points: List[Tuple[float,float]]) -> List[int]:
    if not points:
        return []
    n = len(points)
    visited = [False]*n
    tour = [0]
    visited[0] = True
    for _ in range(n-1):
        last = tour[-1]
        nearest = None
        bestd = float('inf')
        for i in range(n):
            if not visited[i]:
                d = haversine(points[last], points[i])
                if d < bestd:
                    bestd = d
                    nearest = i
        tour.append(nearest)
        visited[nearest] = True
    return tour

def two_opt(points: List[Tuple[float,float]], tour: List[int]) -> List[int]:
    improved = True
    n = len(tour)
    while improved:
        improved = False
        for i in range(1, n-2):
            for j in range(i+1, n):
                if j - i == 1:
                    continue
                a, b = tour[i-1], tour[i]
                c, d = tour[j-1], tour[j % n]
                before = haversine(points[a], points[b]) + haversine(points[c], points[d])
                after = haversine(points[a], points[c]) + haversine(points[b], points[d])
                if after < before:
                    tour[i:j] = reversed(tour[i:j])
                    improved = True
        if improved:
            continue
    return tour

def optimize_route(points: List[Tuple[float,float]]) -> List[int]:
    if not points:
        return []
    tour = nearest_neighbor(points)
    tour = two_opt(points, tour)
    return tour

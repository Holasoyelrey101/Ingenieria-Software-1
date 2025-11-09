from typing import List, Tuple
import numpy as np
from math import radians, sin, cos, asin, sqrt

# VERSIÓN OPTIMIZADA CON SCIPY Y NUMPY
try:
    from scipy.spatial import cKDTree
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


def haversine(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Haversine distance en metros (lat, lon)"""
    lat1, lon1 = a
    lat2, lon2 = b
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    x = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2) ** 2
    return 2 * 6371000 * asin(sqrt(x))


def nearest_neighbor_fast(points: List[Tuple[float, float]]) -> List[int]:
    """K-NN rápido con O(n²) pero vectorizado con NumPy"""
    if not points:
        return []
    n = len(points)
    if n == 1:
        return [0]
    
    points_arr = np.array(points, dtype=np.float32)
    visited = np.zeros(n, dtype=bool)
    tour = [0]
    visited[0] = True
    
    for _ in range(n - 1):
        last_idx = tour[-1]
        last_point = points_arr[last_idx]
        
        # Calcular distancias vectorizadas
        diff = points_arr - last_point
        dlat = np.radians(diff[:, 0])
        dlon = np.radians(diff[:, 1])
        
        lat1 = np.radians(points_arr[:, 0])
        lat2_rad = np.radians(points_arr[:, 0] + diff[:, 0])
        
        sin_dlat2 = np.sin(dlat / 2) ** 2
        sin_dlon2 = np.sin(dlon / 2) ** 2
        
        a = sin_dlat2 + np.cos(lat1) * np.cos(lat2_rad) * sin_dlon2
        distances = 2 * 6371000 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
        
        distances[visited] = np.inf
        nearest = int(np.argmin(distances))
        tour.append(nearest)
        visited[nearest] = True
    
    return tour


def nearest_neighbor_kdtree(points: List[Tuple[float, float]]) -> List[int]:
    """K-NN con k-d tree: O(n log n) - OPCIÓN RÁPIDA SI SCIPY DISPONIBLE"""
    if not points or not HAS_SCIPY:
        return nearest_neighbor_fast(points)
    
    n = len(points)
    if n == 1:
        return [0]
    
    points_arr = np.array(points, dtype=np.float32)
    
    # Construir k-d tree para búsquedas O(log n)
    tree = cKDTree(points_arr)
    
    tour = [0]
    visited = {0}
    
    for _ in range(n - 1):
        last_idx = tour[-1]
        last_point = points_arr[last_idx]
        
        # Consultar k puntos más cercanos sin visitar
        distances, indices = tree.query(last_point, k=n)
        
        for idx in indices:
            if idx not in visited:
                tour.append(idx)
                visited.add(idx)
                break
    
    return tour


def two_opt_fast(points: List[Tuple[float, float]], tour: List[int], max_iterations: int = 100) -> List[int]:
    """2-opt optimizado: limitar a max_iterations para no bloquear"""
    if len(tour) <= 3:
        return tour
    
    improved = True
    iterations = 0
    n = len(tour)
    
    while improved and iterations < max_iterations:
        improved = False
        iterations += 1
        
        for i in range(1, n - 2):
            for j in range(i + 1, min(i + 15, n)):  # Ventana limitada
                if j - i == 1:
                    continue
                
                a_idx, b_idx = tour[i - 1], tour[i]
                c_idx, d_idx = tour[j - 1], tour[j % n]
                
                before = haversine(points[a_idx], points[b_idx]) + haversine(
                    points[c_idx], points[d_idx]
                )
                after = haversine(points[a_idx], points[c_idx]) + haversine(
                    points[b_idx], points[d_idx]
                )
                
                if after < before - 1:  # Tolerancia de 1m
                    tour[i:j] = reversed(tour[i:j])
                    improved = True
                    break
            if improved:
                break
    
    return tour


def optimize_route(points: List[Tuple[float, float]]) -> List[int]:
    """
    Optimizar ruta con K-NN + 2-opt
    RÁPIDO: O(n log n) o O(n²) con numpy vectorizado
    """
    if not points:
        return []
    if len(points) <= 1:
        return list(range(len(points)))
    
    # Usar k-d tree si scipy disponible, sino numpy vectorizado
    tour = nearest_neighbor_kdtree(points)
    
    # Mejorar con 2-opt (limitado a 100 iteraciones)
    tour = two_opt_fast(points, tour, max_iterations=100)
    
    return tour

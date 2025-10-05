from app.optimizer import optimize_route


def test_optimize_empty():
    assert optimize_route([]) == []


def test_optimize_small():
    # 3 points roughly forming a triangle
    points = [(-33.45, -70.66), (-33.46, -70.65), (-33.47, -70.67)]
    tour = optimize_route(points)
    assert isinstance(tour, list)
    assert set(tour) == set(range(len(points)))

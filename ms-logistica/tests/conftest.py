import os
import sys


def pytest_configure():
    # Ensure the ms-logistica package root is importable as a module path
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if root not in sys.path:
        sys.path.insert(0, root)

import os
import sys

# This package is a small wrapper that allows importing the code located in
# the folder named `ms-logistica` (dash) using a valid Python package name
# `ms_logistica` used by tests and other modules.
ROOT = os.path.dirname(os.path.dirname(__file__))
ALT = os.path.join(ROOT, "ms-logistica")
if os.path.isdir(ALT):
    # Prepend so imports resolve to the real package files
    if ALT not in sys.path:
        sys.path.insert(0, ALT)

__all__ = ["app"]

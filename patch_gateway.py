import re

p = "/app/app/main.py"
src = open(p, encoding="utf-8").read()

# 1) import del router
if "from app.routers import camaras" not in src:
    src = re.sub(
        r"(^from\s+fastapi\s+import\s+FastAPI\s*$)",
        r"\g<0>\nfrom app.routers import camaras",
        src,
        flags=re.M
    )

# 2) include_router
if "include_router(camaras.router)" not in src:
    src = re.sub(
        r"(app\s*=\s*FastAPI\([^\)]*\))",
        r"\1\napp.include_router(camaras.router)",
        src,
        count=1
    )

open(p, "w", encoding="utf-8").write(src)
print("main.py parchado OK")

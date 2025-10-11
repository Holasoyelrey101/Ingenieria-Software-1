import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Cargar variables de entorno desde un posible config.env sin asumir profundidad fija
try:
	p = Path(__file__).resolve()
	# Walk up to 5 levels to find a config.env
	env_path = None
	for _ in range(5):
		candidate = p.parent / 'config.env'
		if candidate.exists():
			env_path = candidate
			break
		p = p.parent
	if env_path:
		load_dotenv(dotenv_path=env_path)
except Exception:
	# No bloquear el arranque si falla la búsqueda de config.env
	pass

# Prefer DB_* variables (coherente con DatabaseConfig)
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_USER = os.environ.get('DB_USER', 'lux')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'luxpass')
DB_NAME = os.environ.get('DB_NAME', 'erp')

# Compose DATABASE_URL from env or use provided value
DATABASE_URL = os.environ.get('DATABASE_URL') or f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

engine = None
SessionLocal = None
Base = declarative_base()


def _create_engine(url: str):
	# Helper that creates an engine with some safe defaults
	try:
		# For psycopg2, force client encoding to utf8 where possible to avoid
		# Windows client encoding errors in some environments.
		connect_args = {}
		# If the URL indicates a postgres driver (psycopg2), set client_encoding
		if url.startswith("postgresql:") or url.startswith("postgres://"):
			# psycopg2 accepts client_encoding via connect_args
			connect_args.setdefault('client_encoding', 'utf8')
		# For sqlite, disable check_same_thread when using file-based DB
		if url.startswith("sqlite:"):
			connect_args.setdefault('check_same_thread', False)
		# Use future flag for SQLAlchemy 2.0 style
		return create_engine(url, echo=False, future=True, connect_args=connect_args)
	except Exception as e:
		logging.exception("create_engine failed for %s: %s", url, str(e))
		raise


try:
	engine = _create_engine(DATABASE_URL)
	# quick test connect
	with engine.connect() as conn:
		pass
	# sessionmaker kwargs: modern SQLAlchemy doesn't use autocommit kwarg
	SessionLocal = sessionmaker(bind=engine, autoflush=False)
except Exception:
	# If Postgres isn't available or throws encoding errors, fall back to a
	# local SQLite file DB for development so the app can run.
	logging.exception("Postgres unavailable, falling back to SQLite for dev")
	fallback_url = os.environ.get('FALLBACK_SQLITE', 'sqlite:///./dev_gateway.db')
	engine = _create_engine(fallback_url)
	SessionLocal = sessionmaker(bind=engine, autoflush=False)

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

# Load config.env from repo root if present
env_path = Path(__file__).resolve().parents[2] / 'config.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'welcome13')
DB_NAME = os.getenv('DB_NAME', 'luxchile_db')
DATABASE_URL = os.getenv('DATABASE_URL') or f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

engine = None
SessionLocal = None
Base = declarative_base()


def _create_engine(url: str):
    connect_args = {}
    if url.startswith('sqlite:'):
        connect_args.setdefault('check_same_thread', False)
    if url.startswith('postgresql:') or url.startswith('postgres://'):
        connect_args.setdefault('client_encoding', 'utf8')
    return create_engine(url, future=True, connect_args=connect_args)


try:
    engine = _create_engine(DATABASE_URL)
    
    # Event listener para garantizar encoding en cada conexión PostgreSQL
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        try:
            if DATABASE_URL.startswith('postgresql') or DATABASE_URL.startswith('postgres'):
                cursor = dbapi_conn.cursor()
                cursor.execute("SET client_encoding to UTF8")
                cursor.close()
        except Exception:
            # La opción de conexión ya debería garantizar UTF8
            pass
    
    SessionLocal = sessionmaker(bind=engine, autoflush=False)
except Exception:
    # fallback to sqlite development DB in ms-logistica folder
    fallback = os.getenv('FALLBACK_SQLITE', 'sqlite:///./dev_ms_logistica.db')
    engine = _create_engine(fallback)
    SessionLocal = sessionmaker(bind=engine, autoflush=False)


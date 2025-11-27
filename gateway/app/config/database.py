import os
from dotenv import load_dotenv
from pathlib import Path


class DatabaseConfig:
    def __init__(self):
        # Intentar cargar config.env desde la raíz del repositorio
        # (../../.. from this file: config -> app -> gateway -> repo root)
        env_path = Path(__file__).resolve().parents[3] / 'config.env'
        if not env_path.exists():
            # Fallback a una posible ubicación en gateway/config.env
            env_path = Path(__file__).resolve().parents[2] / 'config.env'
        load_dotenv(dotenv_path=env_path)

        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', '5432'))
        self.database = os.getenv('DB_NAME', 'luxchile_db')
        self.user = os.getenv('DB_USER', 'postgres')
        self.password = os.getenv('DB_PASSWORD', 'welcome13')
        self.pool_size = int(os.getenv('DB_POOL_SIZE', '10'))
        self.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '20'))
        self.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))

    @property
    def connection_string(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

    def get_engine_args(self) -> dict:
        return {
            'pool_size': self.pool_size,
            'max_overflow': self.max_overflow,
            'pool_timeout': self.pool_timeout
        }
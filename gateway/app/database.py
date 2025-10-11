from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
from typing import Generator
import logging

from .config.database import DatabaseConfig

logger = logging.getLogger(__name__)
Base = declarative_base()

class Database:
    def __init__(self):
        self.config = DatabaseConfig()
        self._engine = None
        self._session_factory = None

    def init_db(self):
        if not self._engine:
            try:
                self._engine = create_engine(
                    self.config.connection_string,
                    **self.config.get_engine_args()
                )
                self._session_factory = scoped_session(
                    sessionmaker(
                        autocommit=False,
                        autoflush=False,
                        bind=self._engine
                    )
                )
                # Crear todas las tablas definidas
                Base.metadata.create_all(bind=self._engine)
                logger.info("Base de datos inicializada correctamente")
            except Exception as e:
                logger.error(f"Error al inicializar la base de datos: {str(e)}")
                raise

    @contextmanager
    def session(self) -> Generator:
        if not self._session_factory:
            self.init_db()
        
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Error en la transacción: {str(e)}")
            raise
        finally:
            session.close()

    def dispose(self):
        """Liberar recursos de la base de datos"""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None
            logger.info("Recursos de la base de datos liberados")
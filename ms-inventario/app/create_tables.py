#!/usr/bin/env python3
"""
Script para crear las tablas de mantenimiento directamente
"""
from app.db import engine, Base
from app import models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_maintenance_tables():
    """Crear todas las tablas de mantenimiento"""
    try:
        logger.info("Creando tablas de mantenimiento...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")
        return False

if __name__ == "__main__":
    create_maintenance_tables()
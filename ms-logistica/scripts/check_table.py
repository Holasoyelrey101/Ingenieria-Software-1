from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session
import os

DATABASE_URL = 'postgresql://postgres:welcome13@localhost:5432/luxchile_db'
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print("\nTable Information for delivery_requests:")
columns = inspector.get_columns('delivery_requests')
for col in columns:
    print(f"Column: {col['name']}")
    print(f"Type: {col['type']}")
    print(f"Nullable: {col['nullable']}")
    print("---")
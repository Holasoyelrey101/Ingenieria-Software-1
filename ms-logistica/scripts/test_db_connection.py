from app.db import SessionLocal, Base, engine
from app.models import DeliveryRequest
from sqlalchemy.orm import Session

def test_database_connection():
    try:
        # Create a test delivery request
        db = SessionLocal()
        test_request = DeliveryRequest(
            origin={"lat": -33.4489, "lng": -70.6693},
            destination={"lat": -33.4980, "lng": -70.6150},
            vehicle_id="TEST001",
            status="pending"
        )
        
        # Add and commit
        db.add(test_request)
        db.commit()
        
        # Query to verify
        result = db.query(DeliveryRequest).filter_by(vehicle_id="TEST001").first()
        print("\nTest Results:")
        print(f"Created request with ID: {result.id}")
        print(f"Status: {result.status}")
        print(f"Vehicle ID: {result.vehicle_id}")
        print(f"Origin: {result.origin}")
        print(f"Destination: {result.destination}")
        
        # Clean up
        db.delete(result)
        db.commit()
        print("\nTest completed successfully!")
        
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_database_connection()
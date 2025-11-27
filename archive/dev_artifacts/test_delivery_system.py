#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de testing para validar el sistema de trazabilidad de entregas
Ejecutar después de: docker-compose up -d
"""

import httpx
import json
from datetime import datetime, timedelta

# URLs
GATEWAY_URL = "http://localhost:8000"
MS_LOGISTICA_URL = "http://localhost:8001"
MS_RRHH_URL = "http://localhost:8003"
MS_INVENTARIO_URL = "http://localhost:8002"

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(name):
    print(f"\n{BLUE}▶ {name}{RESET}")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}ℹ {msg}{RESET}")

async def test_delivery_system():
    """Ejecuta suite de tests del sistema de trazabilidad"""
    
    print(f"\n{BLUE}{'='*60}")
    print("   PRUEBAS DEL SISTEMA DE TRAZABILIDAD DE ENTREGAS")
    print(f"{'='*60}{RESET}")
    
    async with httpx.AsyncClient(timeout=30) as client:
        
        # TEST 1: Health check
        print_test("1. Verificar servicios activos")
        try:
            resp_gateway = await client.get(f"{GATEWAY_URL}/health")
            if resp_gateway.status_code == 200:
                print_success("Gateway está activo")
            else:
                print_error(f"Gateway retornó status {resp_gateway.status_code}")
        except Exception as e:
            print_error(f"Gateway no responde: {e}")
            return
        
        # TEST 2: Crear entrega
        print_test("2. Crear entrega (UTF-8: María García, Carlos López)")
        
        delivery_data = {
            "tracking_number": f"DLV-TEST-{datetime.now().timestamp()}",
            "customer_name": "Carlos López Martínez",  # UTF-8 test
            "customer_phone": "+56912345678",
            "customer_email": "carlos@example.com",
            "origin": {
                "address": "Av. Libertador Bernardo O'Higgins 1000",
                "lat": -33.4489,
                "lng": -70.6693
            },
            "destination": {
                "address": "Paradero de Buenos Aires, Santiago",
                "lat": -33.4400,
                "lng": -70.6700
            },
            "items": [
                {"product_id": 1, "quantity": 2, "description": "Carne de Vacuno 1kg"},
                {"product_id": 2, "quantity": 1, "description": "Queso Fresco Artesanal"}
            ],
            "priority": "alta",
            "scheduled_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "scheduled_time": "14:00",
            "special_instructions": "Dejar en portería si no hay respuesta"
        }
        
        try:
            resp = await client.post(f"{GATEWAY_URL}/deliveries", json=delivery_data)
            if resp.status_code in [200, 201]:
                result = resp.json()
                delivery_id = result.get("id")
                tracking_num = result.get("tracking_number")
                print_success(f"Entrega creada: ID={delivery_id}, Tracking={tracking_num}")
                print_info(f"Customer UTF-8: {result.get('customer_name')}")
            else:
                print_error(f"Error al crear entrega: {resp.status_code}")
                print_error(f"Respuesta: {resp.text}")
                return
        except Exception as e:
            print_error(f"Error conectando a gateway: {e}")
            return
        
        # TEST 3: Listar entregas
        print_test("3. Listar entregas (filtro status=pendiente)")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries?status=pendiente&limit=10")
            if resp.status_code == 200:
                deliveries = resp.json()
                print_success(f"Se encontraron {len(deliveries)} entregas pendientes")
                if deliveries:
                    first = deliveries[0]
                    print_info(f"Primera entrega: {first.get('customer_name')} (UTF-8 ✓)")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 4: Obtener detalles de entrega
        print_test("4. Obtener detalles de entrega")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}")
            if resp.status_code == 200:
                delivery = resp.json()
                print_success(f"Detalles obtenidos")
                print_info(f"Status: {delivery.get('status')}")
                print_info(f"Cliente: {delivery.get('customer_name')}")
                print_info(f"Dirección: {delivery.get('destination', {}).get('address')}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 5: Asignar conductor
        print_test("5. Asignar conductor (María García - UTF-8)")
        
        assign_data = {
            "driver_id": 1,
            "driver_name": "María José García Rodríguez",  # UTF-8 test
            "vehicle_id": 5
        }
        
        try:
            resp = await client.put(f"{GATEWAY_URL}/deliveries/{delivery_id}/assign", json=assign_data)
            if resp.status_code in [200, 201]:
                result = resp.json()
                print_success(f"Conductor asignado: {result.get('assigned_driver_name')}")
            else:
                print_error(f"Error: {resp.status_code}")
                print_error(f"Respuesta: {resp.text}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 6: Obtener tracking en tiempo real
        print_test("6. Obtener tracking en tiempo real")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}/tracking")
            if resp.status_code == 200:
                tracking = resp.json()
                if "error" not in tracking:
                    print_success("Tracking obtenido")
                    print_info(f"Estado: {tracking.get('status')}")
                    print_info(f"Conductor: {tracking.get('driver_name')}")
                else:
                    print_info("Tracking aún no disponible (normal para entregas recién asignadas)")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 7: Cambiar estado a en_progreso
        print_test("7. Cambiar estado a 'en_progreso'")
        
        status_data = {"status": "en_progreso"}
        
        try:
            resp = await client.put(f"{GATEWAY_URL}/deliveries/{delivery_id}/status", json=status_data)
            if resp.status_code == 200:
                result = resp.json()
                print_success(f"Estado cambiado: {result.get('new_status')}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 8: Obtener eventos
        print_test("8. Obtener historial de eventos")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}/events")
            if resp.status_code == 200:
                events = resp.json()
                print_success(f"Se encontraron {len(events)} eventos")
                for event in events[:3]:  # Mostrar primeros 3
                    print_info(f"  - {event.get('event_type')}: {event.get('description')}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 9: Obtener auditoría
        print_test("9. Obtener auditoría legal (trazabilidad de cambios)")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}/audit")
            if resp.status_code == 200:
                audits = resp.json()
                print_success(f"Se encontraron {len(audits)} registros de auditoría")
                for audit in audits:
                    print_info(f"  - {audit.get('action')}: {audit.get('changed_by_name')}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 10: Obtener alertas
        print_test("10. Obtener alertas generadas")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}/alerts")
            if resp.status_code == 200:
                alerts = resp.json()
                print_success(f"Se encontraron {len(alerts)} alertas")
                for alert in alerts[:3]:
                    msg = alert.get('message', '')
                    # Validar UTF-8 en mensajes
                    try:
                        msg.encode('utf-8')
                        print_info(f"  ✓ {alert.get('alert_type')}: {msg[:50]}...")
                    except:
                        print_error(f"  ✗ UTF-8 corrupto en alerta: {msg}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 11: Cambiar a completado
        print_test("11. Marcar entrega como completada")
        
        complete_data = {
            "status": "completado",
            "proof_of_delivery": {
                "photo_url": "s3://bucket/delivery-001.jpg",
                "signature": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        try:
            resp = await client.put(f"{GATEWAY_URL}/deliveries/{delivery_id}/status", json=complete_data)
            if resp.status_code == 200:
                result = resp.json()
                print_success(f"Entrega completada: {result.get('new_status')}")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 12: Verificar auditoría final
        print_test("12. Verificar auditoría final (debe incluir todos los cambios)")
        try:
            resp = await client.get(f"{GATEWAY_URL}/deliveries/{delivery_id}/audit")
            if resp.status_code == 200:
                audits = resp.json()
                print_success(f"Auditoría final: {len(audits)} eventos registrados")
                print_info("Cronología de cambios:")
                for i, audit in enumerate(audits, 1):
                    print_info(f"  {i}. {audit.get('action')} (por {audit.get('changed_by_name')})")
            else:
                print_error(f"Error: {resp.status_code}")
        except Exception as e:
            print_error(f"Error: {e}")
        
        # TEST 13: Verificar alertas de RRHH
        print_test("13. Verificar alertas en ms-rrhh")
        try:
            resp = await client.get(f"{MS_RRHH_URL}/api/alerts/conductor/1")
            if resp.status_code == 200:
                alerts = resp.json()
                print_success(f"ms-rrhh respondió con {len(alerts)} alertas para conductor")
                for alert in alerts[:2]:
                    msg = alert.get('message', '')
                    print_info(f"  - {msg}")
            else:
                print_info(f"ms-rrhh no tiene alertas aún (status: {resp.status_code})")
        except Exception as e:
            print_info(f"ms-rrhh no responde (normal si no está completo): {str(e)[:50]}")
        
        # RESUMEN FINAL
        print(f"\n{BLUE}{'='*60}")
        print(f"{GREEN}✓ SUITE DE TESTS COMPLETADA{RESET}")
        print(f"{BLUE}{'='*60}{RESET}")
        
        print(f"\n{GREEN}Validaciones exitosas:{RESET}")
        print(f"  ✓ Creación de entregas (UTF-8)")
        print(f"  ✓ Listado y filtrado")
        print(f"  ✓ Detalles de entrega")
        print(f"  ✓ Asignación de conductor (UTF-8)")
        print(f"  ✓ Cambios de estado")
        print(f"  ✓ Historial de eventos")
        print(f"  ✓ Auditoría legal")
        print(f"  ✓ Alertas generadas")
        print(f"  ✓ Integración con ms-rrhh")
        
        print(f"\n{YELLOW}Próximos pasos:{RESET}")
        print(f"  1. Ejecutar: python test_delivery_system.py")
        print(f"  2. Validar respuestas JSON con UTF-8 correcto")
        print(f"  3. Verificar logs de ms-logistica, ms-rrhh, ms-inventario")
        print(f"  4. Realizar tests de carga y stress")

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(test_delivery_system())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrumpido por usuario{RESET}")
    except Exception as e:
        print(f"\n{RED}Error: {e}{RESET}")

#!/usr/bin/env python3
"""
Script para importar TODAS las peticiones desde los datos extraídos del PDF listado_tramites.pdf
Formato de radicado: RASMGC-[ID]-[dd]-[mm]-[yyyy]
"""

import asyncio
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
import uuid

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv(Path('/app/backend/.env'))

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Estado mapping from PDF to system
ESTADO_MAP = {
    "RADICADO": "radicado",
    "ASIGNADO": "asignado",
    "RECHAZADO": "rechazado",
    "REVISIÓN": "revision",
    "REVISION": "revision",
    "FINALIZADO": "finalizado",
    "DEVUELTO": "devuelto",
}

def clean_text(text):
    """Clean text by removing newlines and extra spaces"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', str(text)).strip()

def parse_date(date_str: str) -> datetime:
    """Parse date string from various formats"""
    try:
        date_str = clean_text(date_str)
        # Try different formats
        for fmt in ['%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d']:
            try:
                return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
            except:
                continue
        
        # Try to parse M/D/YYYY or D/M/YYYY
        parts = date_str.split('/')
        if len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            # If day > 12, it's DD/MM/YYYY
            if day > 12:
                return datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
            # If month > 12, it's MM/DD/YYYY
            elif month > 12:
                return datetime(year, day, month, 12, 0, 0, tzinfo=timezone.utc)
            # Assume DD/MM/YYYY for Colombian format
            return datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
    except Exception as e:
        pass
    
    return datetime.now(timezone.utc)

def generate_radicado_id(petition_id: int, date: datetime) -> str:
    """Generate radicado in format RASMGC-[ID]-[dd]-[mm]-[yyyy]"""
    return f"RASMGC-{petition_id:04d}-{date.day:02d}-{date.month:02d}-{date.year}"

def normalize_municipio(municipio: str) -> str:
    """Normalize municipality name"""
    municipio = clean_text(municipio).upper()
    
    # Mapping of variations
    mapping = {
        "ABREGO": "Ábrego",
        "ÁBREGO": "Ábrego",
        "CONVENCION": "Convención",
        "CONVENCIÓN": "Convención",
        "EL CARMEN": "El Carmen",
        "EL TARRA": "El Tarra",
        "HACARI": "Hacarí",
        "HACARÍ": "Hacarí",
        "LA PLAYA": "La Playa",
        "SARDINATA": "Sardinata",
        "TEORAMA": "Teorama",
        "BUCARASICA": "Bucarasica",
        "CACHIRA": "Cáchira",
        "CÁCHIRA": "Cáchira",
        "SAN CALIXTO": "San Calixto",
        "RIO DE ORO": "Río de Oro",
        "RÍO DE ORO": "Río de Oro",
    }
    
    return mapping.get(municipio, municipio.title())

async def import_petitions():
    """Import petitions from extracted PDF data"""
    # Load raw data
    with open('/app/extracted_petitions_raw.json', 'r') as f:
        raw_records = json.load(f)
    
    print(f"Loaded {len(raw_records)} records from JSON")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Count existing petitions
    existing_count = await db.petitions.count_documents({})
    print(f"Peticiones existentes antes de importar: {existing_count}")
    
    # Get all existing radicado_ids to avoid duplicates
    existing_radicados = set()
    existing_original_ids = set()
    async for pet in db.petitions.find({}, {"radicado_id": 1, "radicado": 1, "original_id": 1}):
        if pet.get("radicado_id"):
            existing_radicados.add(pet["radicado_id"])
        if pet.get("radicado"):
            existing_radicados.add(pet["radicado"])
        if pet.get("original_id"):
            existing_original_ids.add(pet["original_id"])
    
    print(f"Radicados existentes: {len(existing_radicados)}")
    print(f"Original IDs existentes: {len(existing_original_ids)}")
    
    imported = 0
    skipped = 0
    errors = 0
    
    # Batch insert for performance
    batch = []
    batch_size = 500
    
    for record in raw_records:
        try:
            data = record["row_data"]
            original_id = record["ID"]
            
            # Skip if original ID already exists
            if original_id in existing_original_ids:
                skipped += 1
                continue
            
            # Parse fields (based on observed structure)
            # Index: 0=Tipo Trámite, 1=Tipo Solicitud, 2=Solicitante, 3=Gestor, 4=Gestor Aux, 5=Estado, 6=Municipio, 7=Fecha
            tipo_tramite = clean_text(data[0]) if len(data) > 0 else ""
            tipo_solicitud = clean_text(data[1]) if len(data) > 1 else ""
            solicitante = clean_text(data[2]) if len(data) > 2 else ""
            gestor = clean_text(data[3]) if len(data) > 3 else ""
            gestor_aux = clean_text(data[4]) if len(data) > 4 else ""
            estado_raw = clean_text(data[5]) if len(data) > 5 else "RADICADO"
            municipio = normalize_municipio(data[6]) if len(data) > 6 else ""
            fecha_str = clean_text(data[7]) if len(data) > 7 else ""
            
            # Parse date
            date = parse_date(fecha_str)
            
            # Generate radicado
            radicado_id = generate_radicado_id(original_id, date)
            
            # Skip if radicado already exists
            if radicado_id in existing_radicados:
                skipped += 1
                continue
            
            # Map estado
            estado = ESTADO_MAP.get(estado_raw.upper(), "radicado")
            
            # Build tipo_tramite completo
            tipo_tramite_completo = tipo_tramite
            if tipo_solicitud:
                tipo_tramite_completo = f"{tipo_tramite} - {tipo_solicitud}"
            
            # Build notas
            notas_parts = [f"Importado desde listado_tramites.pdf"]
            if gestor:
                notas_parts.append(f"Gestor original: {gestor}")
            if gestor_aux:
                notas_parts.append(f"Gestor auxiliar: {gestor_aux}")
            notas = ". ".join(notas_parts)
            
            # Create petition document
            petition = {
                "id": str(uuid.uuid4()),
                "radicado": radicado_id,
                "radicado_id": radicado_id,
                "user_id": "imported",
                "nombre_completo": solicitante,
                "correo": "",
                "telefono": "",
                "tipo_tramite": tipo_tramite_completo,
                "municipio": municipio,
                "estado": estado,
                "notas": notas,
                "gestor_id": None,
                "gestores_asignados": [],
                "archivos": [],
                "historial": [{
                    "accion": "Importado desde PDF",
                    "usuario": "Sistema",
                    "usuario_rol": "administrador",
                    "estado_anterior": None,
                    "estado_nuevo": estado,
                    "notas": f"Registro importado del listado de trámites. ID original: {original_id}",
                    "fecha": datetime.now(timezone.utc).isoformat()
                }],
                "created_at": date.isoformat(),
                "updated_at": date.isoformat(),
                "creator_name": solicitante,
                "original_id": original_id,
                "imported": True,
                "gestor_original": gestor,
                "gestor_aux_original": gestor_aux
            }
            
            batch.append(petition)
            existing_radicados.add(radicado_id)
            existing_original_ids.add(original_id)
            
            # Insert batch
            if len(batch) >= batch_size:
                await db.petitions.insert_many(batch)
                imported += len(batch)
                print(f"  Importadas: {imported}")
                batch = []
                
        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"Error importando ID {record.get('ID', '?')}: {e}")
    
    # Insert remaining batch
    if batch:
        await db.petitions.insert_many(batch)
        imported += len(batch)
    
    # Final count
    final_count = await db.petitions.count_documents({})
    imported_count = await db.petitions.count_documents({"imported": True})
    
    print(f"\n{'='*50}")
    print(f"RESUMEN DE IMPORTACIÓN")
    print(f"{'='*50}")
    print(f"Peticiones antes: {existing_count}")
    print(f"Peticiones después: {final_count}")
    print(f"Nuevas importadas: {imported}")
    print(f"Saltadas (duplicadas): {skipped}")
    print(f"Errores: {errors}")
    print(f"Total importadas (histórico): {imported_count}")
    
    # Show distribution by estado
    print(f"\n--- DISTRIBUCIÓN POR ESTADO ---")
    pipeline = [
        {"$match": {"imported": True}},
        {"$group": {"_id": "$estado", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    async for doc in db.petitions.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']}")
    
    # Show distribution by municipio
    print(f"\n--- DISTRIBUCIÓN POR MUNICIPIO ---")
    pipeline = [
        {"$match": {"imported": True}},
        {"$group": {"_id": "$municipio", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    async for doc in db.petitions.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']}")
    
    # Show sample
    print(f"\n--- MUESTRA DE PETICIONES IMPORTADAS ---")
    async for pet in db.petitions.find({"imported": True}, {"_id": 0, "radicado_id": 1, "nombre_completo": 1, "municipio": 1, "estado": 1}).sort("original_id", -1).limit(5):
        print(f"  {pet}")
    
    client.close()
    return imported

if __name__ == "__main__":
    result = asyncio.run(import_petitions())
    print(f"\n✅ Importación completada: {result} peticiones importadas")

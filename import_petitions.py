#!/usr/bin/env python3
"""
Script para importar peticiones desde los datos extraídos del PDF listado_tramites.pdf
Formato de radicado: RASMGC-[ID]-[dd]-[mm]-[yyyy]
"""

import asyncio
import json
import os
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

# Data extracted from PDF (IDs 4571 to 5511)
PETITION_DATA = [
    {"ID": 5511, "Tipo Trámite": "Rectificaciones", "Tipo Solicitud": "Rectificación área de Terreno", "Solicitante": "Zaray Villan Buendia", "Gestor": "Yacid Pino Carrascal", "Estado": "RECHAZADO", "Municipio": "CONVENCIÓN", "Fecha": "01/02/2026"},
    {"ID": 5510, "Tipo Trámite": "Rectificaciones", "Tipo Solicitud": "Rectificación área de Terreno", "Solicitante": "Zaray Villan Buendia", "Gestor": "Liceht Cristina Diaz Muñoz", "Estado": "RECHAZADO", "Municipio": "ÁBREGO", "Fecha": "01/02/2026"},
    {"ID": 5509, "Tipo Trámite": "Mutación de Segunda", "Tipo Solicitud": "Desenglobe o Desagregación de un predio", "Solicitante": "Zaray Villan Buendia", "Gestor": "Liceht Cristina Diaz Muñoz", "Estado": "RECHAZADO", "Municipio": "ÁBREGO", "Fecha": "01/02/2026"},
    {"ID": 5508, "Tipo Trámite": "Rectificaciones", "Tipo Solicitud": "Rectificación área de Terreno", "Solicitante": "Zaray Villan Buendia", "Gestor": "Liceht Cristina Diaz Muñoz", "Estado": "FINALIZADO", "Municipio": "ÁBREGO", "Fecha": "01/02/2026"},
    {"ID": 5507, "Tipo Trámite": "Rectificaciones", "Tipo Solicitud": "Rectificación área de Terreno", "Solicitante": "Zaray Villan Buendia", "Gestor": "Yacid Pino Carrascal", "Estado": "RECHAZADO", "Municipio": "TEORAMA", "Fecha": "01/02/2026"},
    {"ID": 5506, "Tipo Trámite": "Rectificaciones", "Tipo Solicitud": "Rectificación área de Terreno", "Solicitante": "Zaray Villan Buendia", "Gestor": "Yacid Pino Carrascal", "Estado": "RECHAZADO", "Municipio": "TEORAMA", "Fecha": "01/02/2026"},
    {"ID": 5505, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "ASIGNADO", "Municipio": "ÁBREGO", "Fecha": "30/12/2025"},
    {"ID": 5504, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "Matilde Sepúlveda Vega", "Gestor": "Armando José Cardenas Ramirez", "Estado": "ASIGNADO", "Municipio": "CÁCHIRA", "Fecha": "22/12/2025"},
    {"ID": 5503, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "Matilde Sepúlveda Vega", "Gestor": "Armando José Cardenas Ramirez", "Estado": "ASIGNADO", "Municipio": "CÁCHIRA", "Fecha": "22/12/2025"},
    {"ID": 5502, "Tipo Trámite": "Mutación de Segunda", "Tipo Solicitud": "Desenglobe o Desagregación de un predio", "Solicitante": "Leonardo Obregon Sanjuan", "Gestor": "Marcelino Contreras Atuesta", "Estado": "ASIGNADO", "Municipio": "SARDINATA", "Fecha": "18/12/2025"},
    {"ID": 5501, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Complementación de Información Catastral", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "BUCARASICA", "Fecha": "16/12/2025"},
    {"ID": 5500, "Tipo Trámite": "Mutación de Segunda", "Tipo Solicitud": "Desenglobe o Desagregación de un predio", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Marcelino Contreras Atuesta", "Estado": "ASIGNADO", "Municipio": "SARDINATA", "Fecha": "12/12/2025"},
    {"ID": 5499, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "EL TARRA", "Fecha": "15/12/2025"},
    {"ID": 5498, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Solicitud Certificado Catastral", "Solicitante": "Yacid Pino Carrascal", "Gestor": "Yacid Pino Carrascal", "Estado": "FINALIZADO", "Municipio": "HACARÍ", "Fecha": "15/12/2025"},
    {"ID": 5497, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "EL TARRA", "Fecha": "15/12/2025"},
    {"ID": 5496, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Solicitud Certificado Catastral", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "BUCARASICA", "Fecha": "12/12/2025"},
    {"ID": 5495, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Solicitud Certificado Catastral", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "RECHAZADO", "Municipio": "ÁBREGO", "Fecha": "12/12/2025"},
    {"ID": 5494, "Tipo Trámite": "Mutación de Primera", "Tipo Solicitud": "Cambio de propietario o poseedor", "Solicitante": "María Divi Mora Becerra", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "TEORAMA", "Fecha": "12/12/2025"},
    {"ID": 5493, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Solicitud Certificado Catastral", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "EL CARMEN", "Fecha": "12/12/2025"},
    {"ID": 5492, "Tipo Trámite": "Solicitudes / Certificados", "Tipo Solicitud": "Solicitud Certificado Catastral", "Solicitante": "Armando José Cardenas Ramirez", "Gestor": "Armando José Cardenas Ramirez", "Estado": "FINALIZADO", "Municipio": "LA PLAYA", "Fecha": "12/12/2025"},
]

# Estado mapping from PDF to system
ESTADO_MAP = {
    "RADICADO": "radicado",
    "ASIGNADO": "asignado",
    "RECHAZADO": "rechazado",
    "REVISIÓN": "revision",
    "FINALIZADO": "finalizado",
    "DEVUELTO": "devuelto",
}

def parse_date(date_str: str) -> datetime:
    """Parse date string from DD/MM/YYYY format"""
    try:
        day, month, year = date_str.split('/')
        return datetime(int(year), int(month), int(day), 12, 0, 0, tzinfo=timezone.utc)
    except:
        return datetime.now(timezone.utc)

def generate_radicado_id(petition_id: int, date: datetime) -> str:
    """Generate radicado in format RASMGC-[ID]-[dd]-[mm]-[yyyy]"""
    return f"RASMGC-{petition_id:04d}-{date.day:02d}-{date.month:02d}-{date.year}"

async def import_petitions():
    """Import petitions from extracted PDF data"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Count existing petitions
    existing_count = await db.petitions.count_documents({})
    print(f"Peticiones existentes antes de importar: {existing_count}")
    
    # Get all existing radicado_ids to avoid duplicates
    existing_radicados = set()
    async for pet in db.petitions.find({}, {"radicado_id": 1}):
        if pet.get("radicado_id"):
            existing_radicados.add(pet["radicado_id"])
    
    print(f"Radicados existentes: {len(existing_radicados)}")
    
    imported = 0
    skipped = 0
    errors = 0
    
    for data in PETITION_DATA:
        try:
            date = parse_date(data["Fecha"])
            radicado_id = generate_radicado_id(data["ID"], date)
            
            # Skip if already exists
            if radicado_id in existing_radicados:
                skipped += 1
                continue
            
            # Map estado
            estado = ESTADO_MAP.get(data["Estado"].upper(), "radicado")
            
            # Create petition document
            petition = {
                "id": str(uuid.uuid4()),
                "radicado": radicado_id,  # Legacy field
                "radicado_id": radicado_id,  # New format
                "user_id": "imported",  # Placeholder for imported records
                "nombre_completo": data["Solicitante"],
                "correo": "",  # Not available in PDF
                "telefono": "",  # Not available in PDF
                "tipo_tramite": f"{data['Tipo Trámite']} - {data.get('Tipo Solicitud', '')}".strip(" -"),
                "municipio": data["Municipio"],
                "estado": estado,
                "notas": f"Importado desde listado_tramites.pdf. Gestor original: {data.get('Gestor', 'N/A')}",
                "gestor_id": None,
                "gestores_asignados": [],
                "archivos": [],
                "historial": [{
                    "accion": "Importado desde PDF",
                    "usuario": "Sistema",
                    "usuario_rol": "administrador",
                    "estado_anterior": None,
                    "estado_nuevo": estado,
                    "notas": f"Registro importado del listado de trámites. ID original: {data['ID']}",
                    "fecha": datetime.now(timezone.utc).isoformat()
                }],
                "created_at": date.isoformat(),
                "updated_at": date.isoformat(),
                "creator_name": data["Solicitante"],
                "original_id": data["ID"],  # Keep track of original ID from PDF
                "imported": True
            }
            
            await db.petitions.insert_one(petition)
            imported += 1
            existing_radicados.add(radicado_id)
            
            if imported % 100 == 0:
                print(f"  Importadas: {imported}")
                
        except Exception as e:
            errors += 1
            print(f"Error importando ID {data.get('ID', '?')}: {e}")
    
    # Final count
    final_count = await db.petitions.count_documents({})
    print(f"\n--- RESUMEN DE IMPORTACIÓN ---")
    print(f"Peticiones antes: {existing_count}")
    print(f"Peticiones después: {final_count}")
    print(f"Importadas: {imported}")
    print(f"Saltadas (duplicadas): {skipped}")
    print(f"Errores: {errors}")
    
    # Show sample
    print(f"\n--- MUESTRA DE PETICIONES IMPORTADAS ---")
    async for pet in db.petitions.find({"imported": True}, {"_id": 0, "radicado_id": 1, "nombre_completo": 1, "municipio": 1, "estado": 1}).limit(5):
        print(f"  {pet}")
    
    client.close()
    return imported

if __name__ == "__main__":
    asyncio.run(import_petitions())

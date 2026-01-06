from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== MODELS =====

class UserRole:
    CIUDADANO = "ciudadano"
    ATENCION_USUARIO = "atencion_usuario"
    COORDINADOR = "coordinador"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = UserRole.CIUDADANO

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PetitionStatus:
    PENDIENTE = "pendiente"
    EN_REVISION = "en_revision"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"

class PetitionCreate(BaseModel):
    nombre_completo: str
    correo: EmailStr
    telefono: str
    tipo_tramite: str
    municipio: str

class PetitionUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    tipo_tramite: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    notas: Optional[str] = None

class Petition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    nombre_completo: str
    correo: str
    telefono: str
    tipo_tramite: str
    municipio: str
    estado: str = PetitionStatus.PENDIENTE
    notas: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ===== UTILITY FUNCTIONS =====

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


# ===== AUTH ROUTES =====

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya está registrado")
    
    # Validate role
    valid_roles = [UserRole.CIUDADANO, UserRole.ATENCION_USUARIO, UserRole.COORDINADOR]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido")
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email, user.role)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    
    token = create_token(user['id'], user['email'], user['role'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user['full_name'],
        "role": current_user['role']
    }


# ===== PETITION ROUTES =====

@api_router.post("/petitions", response_model=Petition)
async def create_petition(petition_data: PetitionCreate, current_user: dict = Depends(get_current_user)):
    petition = Petition(
        user_id=current_user['id'],
        nombre_completo=petition_data.nombre_completo,
        correo=petition_data.correo,
        telefono=petition_data.telefono,
        tipo_tramite=petition_data.tipo_tramite,
        municipio=petition_data.municipio
    )
    
    doc = petition.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.petitions.insert_one(doc)
    return petition

@api_router.get("/petitions", response_model=List[Petition])
async def get_petitions(current_user: dict = Depends(get_current_user)):
    # Citizens only see their own petitions
    if current_user['role'] == UserRole.CIUDADANO:
        query = {"user_id": current_user['id']}
    else:
        # Staff can see all petitions
        query = {}
    
    petitions = await db.petitions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Convert ISO strings back to datetime
    for petition in petitions:
        if isinstance(petition['created_at'], str):
            petition['created_at'] = datetime.fromisoformat(petition['created_at'])
        if isinstance(petition['updated_at'], str):
            petition['updated_at'] = datetime.fromisoformat(petition['updated_at'])
    
    return petitions

@api_router.get("/petitions/{petition_id}", response_model=Petition)
async def get_petition(petition_id: str, current_user: dict = Depends(get_current_user)):
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Citizens can only see their own petitions
    if current_user['role'] == UserRole.CIUDADANO and petition['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para ver esta petición")
    
    # Convert ISO strings back to datetime
    if isinstance(petition['created_at'], str):
        petition['created_at'] = datetime.fromisoformat(petition['created_at'])
    if isinstance(petition['updated_at'], str):
        petition['updated_at'] = datetime.fromisoformat(petition['updated_at'])
    
    return petition

@api_router.patch("/petitions/{petition_id}")
async def update_petition(petition_id: str, update_data: PetitionUpdate, current_user: dict = Depends(get_current_user)):
    # Only staff can update petitions
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para actualizar peticiones")
    
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Only coordinators can modify all fields
    update_dict = {}
    if current_user['role'] == UserRole.COORDINADOR:
        update_dict = update_data.model_dump(exclude_none=True)
    else:
        # Atención al usuario can only update status and notes
        if update_data.estado:
            update_dict['estado'] = update_data.estado
        if update_data.notas:
            update_dict['notas'] = update_data.notas
    
    if update_dict:
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.petitions.update_one({"id": petition_id}, {"$set": update_dict})
    
    updated_petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    
    # Convert ISO strings back to datetime
    if isinstance(updated_petition['created_at'], str):
        updated_petition['created_at'] = datetime.fromisoformat(updated_petition['created_at'])
    if isinstance(updated_petition['updated_at'], str):
        updated_petition['updated_at'] = datetime.fromisoformat(updated_petition['updated_at'])
    
    return updated_petition

@api_router.get("/petitions/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.CIUDADANO:
        query = {"user_id": current_user['id']}
    else:
        query = {}
    
    total = await db.petitions.count_documents(query)
    pendientes = await db.petitions.count_documents({**query, "estado": PetitionStatus.PENDIENTE})
    en_revision = await db.petitions.count_documents({**query, "estado": PetitionStatus.EN_REVISION})
    aprobadas = await db.petitions.count_documents({**query, "estado": PetitionStatus.APROBADA})
    rechazadas = await db.petitions.count_documents({**query, "estado": PetitionStatus.RECHAZADA})
    
    return {
        "total": total,
        "pendientes": pendientes,
        "en_revision": en_revision,
        "aprobadas": aprobadas,
        "rechazadas": rechazadas
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

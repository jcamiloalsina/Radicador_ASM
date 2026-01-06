from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

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

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.office365.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)

# File upload configuration
UPLOAD_DIR = Path('/app/uploads')
UPLOAD_DIR.mkdir(exist_ok=True)

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== MODELS =====

class UserRole:
    CIUDADANO = "ciudadano"
    ATENCION_USUARIO = "atencion_usuario"
    GESTOR = "gestor"
    GESTOR_AUXILIAR = "gestor_auxiliar"
    COORDINADOR = "coordinador"
    ADMINISTRADOR = "administrador"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

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

class UserRoleUpdate(BaseModel):
    user_id: str
    new_role: str

class PetitionStatus:
    RADICADO = "radicado"
    ASIGNADO = "asignado"
    RECHAZADO = "rechazado"
    REVISION = "revision"
    DEVUELTO = "devuelto"
    FINALIZADO = "finalizado"

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
    gestor_id: Optional[str] = None

class GestorAssignment(BaseModel):
    petition_id: str
    gestor_id: str
    is_auxiliar: bool = False

class Petition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    radicado: str
    user_id: str
    nombre_completo: str
    correo: str
    telefono: str
    tipo_tramite: str
    municipio: str
    estado: str = PetitionStatus.RADICADO
    notas: str = ""
    gestor_id: Optional[str] = None
    gestores_asignados: List[str] = []
    archivos: List[dict] = []
    historial: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ===== PREDIO MODELS (Codigo Nacional Catastral) =====

# Catalogo de municipios con codigo catastral nacional
MUNICIPIOS_DIVIPOLA = {
    "Ábrego": {"departamento": "54", "municipio": "003"},
    "Bucarasica": {"departamento": "54", "municipio": "109"},
    "Cáchira": {"departamento": "54", "municipio": "128"},
    "Convención": {"departamento": "54", "municipio": "206"},
    "El Carmen": {"departamento": "54", "municipio": "245"},
    "El Tarra": {"departamento": "54", "municipio": "250"},
    "Hacarí": {"departamento": "54", "municipio": "344"},
    "La Playa": {"departamento": "54", "municipio": "398"},
    "Río de Oro": {"departamento": "47", "municipio": "545"},  # Cesar
    "San Calixto": {"departamento": "54", "municipio": "670"},
    "Sardinata": {"departamento": "54", "municipio": "720"},
    "Teorama": {"departamento": "54", "municipio": "800"}
}

# Catálogo de destino económico
DESTINO_ECONOMICO = {
    "A": "Habitacional",
    "B": "Industrial",
    "C": "Comercial",
    "D": "Agropecuario",
    "E": "Minero",
    "F": "Recreacional",
    "G": "Salubridad",
    "H": "Institucional",
    "I": "Educativo",
    "J": "Religioso",
    "K": "Cultural",
    "L": "Lote",
    "M": "Pecuario",
    "N": "Agrícola",
    "O": "Uso Público",
    "P": "Forestal",
    "Q": "Mixto Comercial-Habitacional",
    "R": "Servicios Especiales",
    "S": "Institucional Público",
    "0": "Sin clasificar"
}

# Catálogo de tipo de documento
TIPO_DOCUMENTO_PREDIO = {
    "C": "Cédula de Ciudadanía",
    "E": "Cédula de Extranjería",
    "N": "NIT",
    "T": "Tarjeta de Identidad",
    "P": "Pasaporte",
    "X": "Sin documento / Entidad"
}

# Catálogo de estado civil
ESTADO_CIVIL_PREDIO = {
    "S": "Soltero/a",
    "E": "Casado/a con sociedad conyugal",
    "D": "Casado/a sin sociedad conyugal",
    "V": "Separación de bienes",
    "U": "Unión marital de hecho"
}

class PredioR1Create(BaseModel):
    """Registro R1 - Información Jurídica del Predio"""
    municipio: str
    zona: str = "00"  # 00=Rural, 01+=Urbano
    sector: str = "01"
    manzana_vereda: str = "0000"
    terreno: str = "0001"
    condicion_predio: str = "0000"
    predio_horizontal: str = "0000"
    
    # Propietario
    nombre_propietario: str
    tipo_documento: str
    numero_documento: str
    estado_civil: Optional[str] = None
    
    # Ubicación y características
    direccion: str
    comuna: str = "0"
    destino_economico: str
    area_terreno: float
    area_construida: float = 0
    avaluo: float
    
    # Mutación
    tipo_mutacion: Optional[str] = None
    numero_resolucion: Optional[str] = None
    fecha_resolucion: Optional[str] = None

class PredioR2Create(BaseModel):
    """Registro R2 - Información Física del Predio"""
    matricula_inmobiliaria: Optional[str] = None
    
    # Zona 1
    zona_fisica_1: float = 0
    zona_economica_1: float = 0
    area_terreno_1: float = 0
    
    # Zona 2
    zona_fisica_2: float = 0
    zona_economica_2: float = 0
    area_terreno_2: float = 0
    
    # Construcción 1
    habitaciones_1: int = 0
    banos_1: int = 0
    locales_1: int = 0
    pisos_1: int = 1
    tipificacion_1: float = 0
    uso_1: int = 0
    puntaje_1: float = 0
    area_construida_1: float = 0
    
    # Construcción 2
    habitaciones_2: int = 0
    banos_2: int = 0
    locales_2: int = 0
    pisos_2: int = 0
    tipificacion_2: float = 0
    uso_2: int = 0
    puntaje_2: float = 0
    area_construida_2: float = 0

class PredioCreate(BaseModel):
    r1: PredioR1Create
    r2: Optional[PredioR2Create] = None

class PredioUpdate(BaseModel):
    # R1 fields
    nombre_propietario: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    estado_civil: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    destino_economico: Optional[str] = None
    area_terreno: Optional[float] = None
    area_construida: Optional[float] = None
    avaluo: Optional[float] = None
    tipo_mutacion: Optional[str] = None
    numero_resolucion: Optional[str] = None
    fecha_resolucion: Optional[str] = None
    
    # R2 fields
    matricula_inmobiliaria: Optional[str] = None
    zona_fisica_1: Optional[float] = None
    zona_economica_1: Optional[float] = None
    area_terreno_1: Optional[float] = None
    habitaciones_1: Optional[int] = None
    banos_1: Optional[int] = None
    locales_1: Optional[int] = None
    pisos_1: Optional[int] = None
    puntaje_1: Optional[float] = None
    area_construida_1: Optional[float] = None


# ===== SISTEMA DE APROBACIÓN DE PREDIOS =====

class PredioEstadoAprobacion:
    """Estados de aprobación para cambios en predios"""
    APROBADO = "aprobado"  # Cambios aplicados y firmes
    PENDIENTE_CREACION = "pendiente_creacion"  # Nuevo predio esperando aprobación
    PENDIENTE_MODIFICACION = "pendiente_modificacion"  # Modificación esperando aprobación
    PENDIENTE_ELIMINACION = "pendiente_eliminacion"  # Eliminación esperando aprobación
    RECHAZADO = "rechazado"  # Cambio rechazado por coordinador

class CambioPendienteCreate(BaseModel):
    """Modelo para crear un cambio pendiente"""
    predio_id: Optional[str] = None  # None para nuevos predios
    tipo_cambio: str  # creacion, modificacion, eliminacion
    datos_propuestos: dict  # Datos del predio (nuevo o modificado)
    justificacion: Optional[str] = None

class CambioAprobacionRequest(BaseModel):
    """Modelo para aprobar/rechazar un cambio"""
    cambio_id: str
    aprobado: bool
    comentario: Optional[str] = None


# ===== UTILITY FUNCTIONS =====

import re

def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password requirements:
    - Minimum 6 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - Special characters are allowed: !@#$%^&*()_+-=[]{}|;':\",./<>?
    Returns: (is_valid, error_message)
    """
    if len(password) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres"
    
    if not re.search(r'[A-Z]', password):
        return False, "La contraseña debe contener al menos una letra mayúscula"
    
    if not re.search(r'[a-z]', password):
        return False, "La contraseña debe contener al menos una letra minúscula"
    
    if not re.search(r'\d', password):
        return False, "La contraseña debe contener al menos un número"
    
    # Allow special characters - password is valid if it passes above checks
    return True, ""

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

async def generate_radicado() -> str:
    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")
    
    # Get count for today
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    count = await db.petitions.count_documents({
        "created_at": {"$gte": start_of_day.isoformat()}
    })
    
    sequence = str(count + 1).zfill(4)
    return f"RASMCG-{sequence}-{date_str}"

async def send_email(to_email: str, subject: str, body: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("SMTP credentials not configured, skipping email")
        return
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logging.info(f"Email sent to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")


# ===== AUTH ROUTES =====

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya está registrado")
    
    # Validate password
    is_valid, error_msg = validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    
    # Always assign ciudadano role on self-registration
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=UserRole.CIUDADANO
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
    # Get additional user data from database
    user_db = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user['full_name'],
        "role": current_user['role'],
        "puede_actualizar_gdb": user_db.get('puede_actualizar_gdb', False) if user_db else False
    }


# ===== PASSWORD RECOVERY =====

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No existe una cuenta con ese correo")
    
    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="El servicio de correo no está configurado")
    
    # Generate reset token (valid for 1 hour)
    reset_token = str(uuid.uuid4())
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token in database
    await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "email": request.email,
        "token": reset_token,
        "expires_at": expiration.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get frontend URL from environment or use default
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Send email
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #047857; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">ASOMUNICIPIOS</h1>
            <p style="color: #d1fae5; margin: 5px 0 0 0;">Sistema de Gestión Catastral</p>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">Recuperación de Contraseña</h2>
            <p style="color: #475569;">Hola <strong>{user['full_name']}</strong>,</p>
            <p style="color: #475569;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p style="color: #475569;">Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #047857; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer Contraseña</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Este enlace expirará en 1 hora.</p>
            <p style="color: #64748b; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Este es un mensaje automático, por favor no responda a este correo.</p>
        </div>
    </body>
    </html>
    """
    
    try:
        await send_email(request.email, "Recuperación de Contraseña - ASOMUNICIPIOS", email_body)
    except Exception as e:
        logging.error(f"Failed to send reset email: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al enviar el correo")
    
    return {"message": "Se ha enviado un enlace de recuperación a tu correo"}

@api_router.get("/auth/validate-reset-token")
async def validate_reset_token(token: str):
    """Validate password reset token"""
    reset_record = await db.password_resets.find_one({"token": token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token inválido")
    
    expires_at = datetime.fromisoformat(reset_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": token})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token ha expirado")
    
    return {"valid": True}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    reset_record = await db.password_resets.find_one({"token": request.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token inválido")
    
    expires_at = datetime.fromisoformat(reset_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": request.token})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token ha expirado")
    
    # Validate new password
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    
    # Update password
    new_hashed_password = hash_password(request.new_password)
    await db.users.update_one(
        {"email": reset_record['email']},
        {"$set": {"password": new_hashed_password}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": request.token})
    
    return {"message": "Contraseña actualizada exitosamente"}


# ===== USER MANAGEMENT ROUTES =====

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    # Only admin, coordinador, and atencion can view users
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.patch("/users/role")
async def update_user_role(role_update: UserRoleUpdate, current_user: dict = Depends(get_current_user)):
    # Only admin, coordinador, and atencion can change roles
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para cambiar roles")
    
    # Validate new role
    valid_roles = [UserRole.CIUDADANO, UserRole.ATENCION_USUARIO, UserRole.GESTOR, UserRole.GESTOR_AUXILIAR, UserRole.COORDINADOR, UserRole.ADMINISTRADOR]
    if role_update.new_role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido")
    
    user = await db.users.find_one({"id": role_update.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    await db.users.update_one(
        {"id": role_update.user_id},
        {"$set": {"role": role_update.new_role}}
    )
    
    return {"message": "Rol actualizado exitosamente", "new_role": role_update.new_role}


# ===== PETITION ROUTES =====

@api_router.post("/petitions")
async def create_petition(
    nombre_completo: str = Form(...),
    correo: str = Form(...),
    telefono: str = Form(...),
    tipo_tramite: str = Form(...),
    municipio: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user)
):
    radicado = await generate_radicado()
    
    # Save files
    saved_files = []
    for file in files:
        if file.filename:
            file_id = str(uuid.uuid4())
            file_ext = Path(file.filename).suffix
            file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
            
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append({
                "id": file_id,
                "original_name": file.filename,
                "path": str(file_path)
            })
    
    # Initialize historial
    historial = [{
        "accion": "Radicado creado",
        "usuario": current_user['full_name'],
        "usuario_rol": current_user['role'],
        "estado_anterior": None,
        "estado_nuevo": PetitionStatus.RADICADO,
        "notas": "Petición radicada en el sistema",
        "fecha": datetime.now(timezone.utc).isoformat()
    }]
    
    petition = Petition(
        radicado=radicado,
        user_id=current_user['id'],
        nombre_completo=nombre_completo,
        correo=correo,
        telefono=telefono,
        tipo_tramite=tipo_tramite,
        municipio=municipio,
        archivos=saved_files,
        historial=historial
    )
    
    doc = petition.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.petitions.insert_one(doc)
    
    # Send email notification to atencion usuarios only if created by citizen
    if current_user['role'] == UserRole.CIUDADANO:
        atencion_users = await db.users.find({"role": UserRole.ATENCION_USUARIO}, {"_id": 0}).to_list(100)
        for user in atencion_users:
            await send_email(
                user['email'],
                f"Nueva Petición - {radicado}",
                f"<h3>Nueva petición radicada</h3><p>Radicado: {radicado}</p><p>Solicitante: {nombre_completo}</p><p>Tipo: {tipo_tramite}</p>"
            )
    
    return petition

@api_router.get("/petitions")
async def get_petitions(current_user: dict = Depends(get_current_user)):
    # Citizens only see their own petitions
    if current_user['role'] == UserRole.CIUDADANO:
        query = {"user_id": current_user['id']}
    # Gestores see assigned petitions
    elif current_user['role'] in [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]:
        query = {"gestores_asignados": current_user['id']}
    else:
        # Staff can see all petitions
        query = {}
    
    petitions = await db.petitions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for petition in petitions:
        if isinstance(petition['created_at'], str):
            petition['created_at'] = datetime.fromisoformat(petition['created_at'])
        if isinstance(petition['updated_at'], str):
            petition['updated_at'] = datetime.fromisoformat(petition['updated_at'])
    
    return petitions

@api_router.get("/petitions/{petition_id}")
async def get_petition(petition_id: str, current_user: dict = Depends(get_current_user)):
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Citizens can only see their own petitions
    if current_user['role'] == UserRole.CIUDADANO and petition['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para ver esta petición")
    
    # Gestores can only see assigned petitions
    if current_user['role'] in [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]:
        if current_user['id'] not in petition.get('gestores_asignados', []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para ver esta petición")
    
    if isinstance(petition['created_at'], str):
        petition['created_at'] = datetime.fromisoformat(petition['created_at'])
    if isinstance(petition['updated_at'], str):
        petition['updated_at'] = datetime.fromisoformat(petition['updated_at'])
    
    return petition

@api_router.post("/petitions/{petition_id}/upload")
async def upload_petition_files(
    petition_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Citizens and staff can upload files
    # Citizens: only to their own petitions
    # Staff: to any petition they have access to
    if current_user['role'] == UserRole.CIUDADANO and petition['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    saved_files = []
    for file in files:
        if file.filename:
            file_id = str(uuid.uuid4())
            file_ext = Path(file.filename).suffix
            file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
            
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append({
                "id": file_id,
                "original_name": file.filename,
                "path": str(file_path),
                "uploaded_by": current_user['id'],
                "uploaded_by_name": current_user['full_name'],
                "uploaded_by_role": current_user['role'],
                "upload_date": datetime.now(timezone.utc).isoformat()
            })
    
    current_files = petition.get('archivos', [])
    updated_files = current_files + saved_files
    
    # Add to historial
    uploader_role = "Ciudadano" if current_user['role'] == UserRole.CIUDADANO else current_user['role'].replace('_', ' ').title()
    historial_entry = {
        "accion": f"Archivos cargados por {uploader_role} ({len(saved_files)} archivo(s))",
        "usuario": current_user['full_name'],
        "usuario_rol": current_user['role'],
        "estado_anterior": petition['estado'],
        "estado_nuevo": petition['estado'],
        "notas": f"Se cargaron {len(saved_files)} archivo(s) adicional(es)",
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    
    current_historial = petition.get('historial', [])
    current_historial.append(historial_entry)
    
    await db.petitions.update_one(
        {"id": petition_id},
        {"$set": {
            "archivos": updated_files,
            "historial": current_historial,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify based on who uploaded
    if current_user['role'] == UserRole.CIUDADANO:
        # Notify assigned gestores or atencion usuario
        if petition.get('gestores_asignados'):
            for gestor_id in petition['gestores_asignados']:
                gestor = await db.users.find_one({"id": gestor_id}, {"_id": 0})
                if gestor:
                    await send_email(
                        gestor['email'],
                        f"Nuevos archivos - {petition['radicado']}",
                        f"<h3>El ciudadano ha cargado nuevos archivos</h3><p>Radicado: {petition['radicado']}</p>"
                    )
        else:
            atencion_users = await db.users.find({"role": UserRole.ATENCION_USUARIO}, {"_id": 0}).to_list(100)
            for user in atencion_users:
                await send_email(
                    user['email'],
                    f"Nuevos archivos - {petition['radicado']}",
                    f"<h3>El ciudadano ha cargado nuevos archivos</h3><p>Radicado: {petition['radicado']}</p>"
                )
    else:
        # Notify citizen if staff uploaded
        citizen = await db.users.find_one({"id": petition['user_id']}, {"_id": 0})
        if citizen:
            await send_email(
                citizen['email'],
                f"Nuevos documentos disponibles - {petition['radicado']}",
                f"<h3>Se han agregado nuevos documentos a su trámite</h3><p>Radicado: {petition['radicado']}</p><p>Puede descargarlos desde el sistema.</p>"
            )
    
    return {"message": "Archivos subidos exitosamente", "files": saved_files}


@api_router.get("/petitions/{petition_id}/download-zip")
async def download_citizen_files_as_zip(petition_id: str, current_user: dict = Depends(get_current_user)):
    """Download all files uploaded by citizen as a ZIP file"""
    # Only staff can download citizen files
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Filter files uploaded by citizen
    citizen_files = []
    for archivo in petition.get('archivos', []):
        uploaded_by_role = archivo.get('uploaded_by_role', 'ciudadano')
        if uploaded_by_role == UserRole.CIUDADANO or not archivo.get('uploaded_by_role'):
            # If no uploaded_by_role, assume it's from citizen (backward compatibility)
            citizen_files.append(archivo)
    
    if not citizen_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay archivos del ciudadano para descargar")
    
    import zipfile
    
    # Create ZIP file
    zip_filename = f"{petition['radicado']}_archivos_ciudadano.zip"
    zip_path = UPLOAD_DIR / zip_filename
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for archivo in citizen_files:
            file_path = Path(archivo['path'])
            if file_path.exists():
                # Add file to ZIP with original name
                zipf.write(file_path, archivo['original_name'])
    
    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type='application/zip'
    )

@api_router.post("/petitions/{petition_id}/assign-gestor")
async def assign_gestor(
    petition_id: str,
    assignment: GestorAssignment,
    current_user: dict = Depends(get_current_user)
):
    # Only atencion usuario, gestor, coordinador, and admin can assign
    if current_user['role'] not in [UserRole.ATENCION_USUARIO, UserRole.GESTOR, UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    gestor = await db.users.find_one({"id": assignment.gestor_id}, {"_id": 0})
    if not gestor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gestor no encontrado")
    
    # Add gestor to assigned list
    gestores_asignados = petition.get('gestores_asignados', [])
    if assignment.gestor_id not in gestores_asignados:
        gestores_asignados.append(assignment.gestor_id)
    
    update_data = {
        "gestores_asignados": gestores_asignados,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If first assignment, change status to ASIGNADO
    estado_cambio = False
    if petition['estado'] == PetitionStatus.RADICADO:
        update_data['estado'] = PetitionStatus.ASIGNADO
        estado_cambio = True
    
    # Add to historial
    gestor_rol = "Gestor" if gestor['role'] == UserRole.GESTOR else "Gestor Auxiliar"
    historial_entry = {
        "accion": f"{gestor_rol} asignado: {gestor['full_name']}",
        "usuario": current_user['full_name'],
        "usuario_rol": current_user['role'],
        "estado_anterior": petition['estado'],
        "estado_nuevo": update_data.get('estado', petition['estado']),
        "notas": f"Asignado a {gestor['full_name']} ({gestor_rol})",
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    
    current_historial = petition.get('historial', [])
    current_historial.append(historial_entry)
    update_data['historial'] = current_historial
    
    await db.petitions.update_one({"id": petition_id}, {"$set": update_data})
    
    # Send email to assigned gestor
    await send_email(
        gestor['email'],
        f"Trámite Asignado - {petition['radicado']}",
        f"<h3>Se te ha asignado un trámite</h3><p>Radicado: {petition['radicado']}</p><p>Tipo: {petition['tipo_tramite']}</p>"
    )
    
    return {"message": "Gestor asignado exitosamente"}

@api_router.patch("/petitions/{petition_id}")
async def update_petition(petition_id: str, update_data: PetitionUpdate, current_user: dict = Depends(get_current_user)):
    # Citizens cannot update petitions
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para actualizar peticiones")
    
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Determine what fields can be updated based on role
    update_dict = {}
    historial_entry = None
    
    if current_user['role'] in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        # Coordinador and Admin can update all fields
        update_dict = update_data.model_dump(exclude_none=True)
    elif current_user['role'] == UserRole.ATENCION_USUARIO:
        # Atención al usuario can update status, notes, and can finalize/reject
        if update_data.estado:
            update_dict['estado'] = update_data.estado
        if update_data.notas:
            update_dict['notas'] = update_data.notas
    elif current_user['role'] in [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]:
        # Gestores can only update notes and send to revision
        if update_data.notas:
            update_dict['notas'] = update_data.notas
        if update_data.estado in [PetitionStatus.REVISION, PetitionStatus.RECHAZADO]:
            update_dict['estado'] = update_data.estado
    
    if update_dict:
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Create historial entry if status changed
        if 'estado' in update_dict:
            estado_anterior = petition.get('estado')
            estado_nuevo = update_dict['estado']
            
            status_names = {
                PetitionStatus.RADICADO: "Radicado",
                PetitionStatus.ASIGNADO: "Asignado",
                PetitionStatus.RECHAZADO: "Rechazado",
                PetitionStatus.REVISION: "En Revisión",
                PetitionStatus.DEVUELTO: "Devuelto",
                PetitionStatus.FINALIZADO: "Finalizado"
            }
            
            historial_entry = {
                "accion": f"Estado cambiado de {status_names.get(estado_anterior, estado_anterior)} a {status_names.get(estado_nuevo, estado_nuevo)}",
                "usuario": current_user['full_name'],
                "usuario_rol": current_user['role'],
                "estado_anterior": estado_anterior,
                "estado_nuevo": estado_nuevo,
                "notas": update_dict.get('notas', ''),
                "fecha": datetime.now(timezone.utc).isoformat()
            }
            
            # Add to historial
            current_historial = petition.get('historial', [])
            current_historial.append(historial_entry)
            update_dict['historial'] = current_historial
        
        await db.petitions.update_one({"id": petition_id}, {"$set": update_dict})
        
        # Send email notification to citizen if status changed
        if 'estado' in update_dict:
            citizen = await db.users.find_one({"id": petition['user_id']}, {"_id": 0})
            if citizen:
                status_names = {
                    PetitionStatus.RADICADO: "Radicado",
                    PetitionStatus.ASIGNADO: "Asignado",
                    PetitionStatus.RECHAZADO: "Rechazado",
                    PetitionStatus.REVISION: "En Revisión",
                    PetitionStatus.DEVUELTO: "Devuelto",
                    PetitionStatus.FINALIZADO: "Finalizado"
                }
                await send_email(
                    citizen['email'],
                    f"Actualización de Trámite - {petition['radicado']}",
                    f"<h3>Su trámite ha sido actualizado</h3><p>Radicado: {petition['radicado']}</p><p>Nuevo estado: {status_names.get(update_dict['estado'])}</p>"
                )
    
    updated_petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    
    if isinstance(updated_petition['created_at'], str):
        updated_petition['created_at'] = datetime.fromisoformat(updated_petition['created_at'])
    if isinstance(updated_petition['updated_at'], str):
        updated_petition['updated_at'] = datetime.fromisoformat(updated_petition['updated_at'])
    
    return updated_petition

@api_router.get("/petitions/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.CIUDADANO:
        query = {"user_id": current_user['id']}
    elif current_user['role'] in [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]:
        query = {"gestores_asignados": current_user['id']}
    else:
        query = {}
    
    total = await db.petitions.count_documents(query)
    radicado = await db.petitions.count_documents({**query, "estado": PetitionStatus.RADICADO})
    asignado = await db.petitions.count_documents({**query, "estado": PetitionStatus.ASIGNADO})
    rechazado = await db.petitions.count_documents({**query, "estado": PetitionStatus.RECHAZADO})
    revision = await db.petitions.count_documents({**query, "estado": PetitionStatus.REVISION})
    devuelto = await db.petitions.count_documents({**query, "estado": PetitionStatus.DEVUELTO})
    finalizado = await db.petitions.count_documents({**query, "estado": PetitionStatus.FINALIZADO})
    
    return {
        "total": total,
        "radicado": radicado,
        "asignado": asignado,
        "rechazado": rechazado,
        "revision": revision,
        "devuelto": devuelto,
        "finalizado": finalizado
    }

@api_router.get("/gestores")
async def get_gestores(current_user: dict = Depends(get_current_user)):
    # Get all gestores and auxiliares
    gestores = await db.users.find(
        {"role": {"$in": [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]}},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return gestores


# ===== PDF EXPORT AND DIGITAL SIGNATURE =====

def generate_petition_pdf(petition_data: dict, user_data: dict, signed_by: str = None) -> bytes:
    """Generate PDF report for a petition with optional digital signature"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#047857'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#064E3B'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=12
    )
    
    # Title
    story.append(Paragraph("ASOCIACIÓN DE MUNICIPIOS DEL CATATUMBO", title_style))
    story.append(Paragraph("Provincia de Ocaña y Sur del Cesar - ASOMUNICIPIOS", normal_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Radicado
    story.append(Paragraph(f"<b>Radicado:</b> {petition_data.get('radicado', 'N/A')}", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Status
    status_names = {
        'radicado': 'Radicado',
        'asignado': 'Asignado',
        'rechazado': 'Rechazado',
        'revision': 'En Revisión',
        'devuelto': 'Devuelto',
        'finalizado': 'Finalizado'
    }
    status_label = status_names.get(petition_data.get('estado', ''), petition_data.get('estado', 'N/A'))
    story.append(Paragraph(f"<b>Estado:</b> {status_label}", normal_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Petition details table
    story.append(Paragraph("DATOS DEL SOLICITANTE", heading_style))
    
    data = [
        ['Campo', 'Información'],
        ['Nombre Completo', petition_data.get('nombre_completo', 'N/A')],
        ['Correo Electrónico', petition_data.get('correo', 'N/A')],
        ['Teléfono', petition_data.get('telefono', 'N/A')],
        ['Municipio', petition_data.get('municipio', 'N/A')],
        ['Tipo de Trámite', petition_data.get('tipo_tramite', 'N/A')],
    ]
    
    table = Table(data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#047857')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    # Notes if any
    if petition_data.get('notas'):
        story.append(Paragraph("NOTAS", heading_style))
        story.append(Paragraph(petition_data.get('notas', ''), normal_style))
        story.append(Spacer(1, 0.3*inch))
    
    # Dates
    story.append(Paragraph("INFORMACIÓN DE FECHAS", heading_style))
    created_date = petition_data.get('created_at', '')
    updated_date = petition_data.get('updated_at', '')
    
    if isinstance(created_date, str):
        created_date = datetime.fromisoformat(created_date).strftime('%d/%m/%Y %H:%M')
    else:
        created_date = created_date.strftime('%d/%m/%Y %H:%M') if created_date else 'N/A'
    
    if isinstance(updated_date, str):
        updated_date = datetime.fromisoformat(updated_date).strftime('%d/%m/%Y %H:%M')
    else:
        updated_date = updated_date.strftime('%d/%m/%Y %H:%M') if updated_date else 'N/A'
    
    story.append(Paragraph(f"<b>Fecha de Radicación:</b> {created_date}", normal_style))
    story.append(Paragraph(f"<b>Última Actualización:</b> {updated_date}", normal_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Digital signature section
    if signed_by:
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("___________________________", normal_style))
        story.append(Paragraph("<b>Firmado digitalmente por:</b>", normal_style))
        story.append(Paragraph(f"{signed_by}", normal_style))
        story.append(Paragraph(f"Fecha: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}", normal_style))
    
    # Footer
    story.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    story.append(Paragraph(
        "Este documento ha sido generado por el Sistema de Gestión Catastral de ASOMUNICIPIOS",
        footer_style
    ))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


@api_router.get("/petitions/{petition_id}/export-pdf")
async def export_petition_pdf(petition_id: str, current_user: dict = Depends(get_current_user)):
    """Export single petition as PDF"""
    petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
    
    if not petition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petición no encontrada")
    
    # Check permissions
    if current_user['role'] == UserRole.CIUDADANO and petition['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    # Get user data
    user = await db.users.find_one({"id": petition['user_id']}, {"_id": 0, "password": 0})
    
    # Generate PDF with digital signature if coordinator or admin
    signed_by = None
    if current_user['role'] in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        signed_by = f"{current_user['full_name']} - {current_user['role'].replace('_', ' ').title()}"
    
    pdf_bytes = generate_petition_pdf(petition, user, signed_by)
    
    # Save to temp file
    temp_pdf_path = UPLOAD_DIR / f"petition_{petition_id}_{uuid.uuid4()}.pdf"
    with open(temp_pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    
    return FileResponse(
        path=temp_pdf_path,
        filename=f"{petition['radicado']}.pdf",
        media_type='application/pdf'
    )


@api_router.post("/petitions/export-multiple")
async def export_multiple_petitions(
    petition_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Export multiple petitions as PDF"""
    # Only staff can export multiple
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    from reportlab.platypus import PageBreak
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    for idx, petition_id in enumerate(petition_ids):
        petition = await db.petitions.find_one({"id": petition_id}, {"_id": 0})
        if petition:
            # Generate petition content
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=16,
                textColor=colors.HexColor('#047857'),
                spaceAfter=20,
                alignment=TA_CENTER
            )
            
            story.append(Paragraph(f"Petición {idx + 1} de {len(petition_ids)}", title_style))
            story.append(Paragraph(f"Radicado: {petition.get('radicado', 'N/A')}", styles['Heading2']))
            story.append(Spacer(1, 0.2*inch))
            
            # Add basic info
            info = [
                ['Solicitante', petition.get('nombre_completo', 'N/A')],
                ['Tipo de Trámite', petition.get('tipo_tramite', 'N/A')],
                ['Estado', petition.get('estado', 'N/A')],
                ['Municipio', petition.get('municipio', 'N/A')],
            ]
            
            table = Table(info, colWidths=[2*inch, 4*inch])
            table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ]))
            story.append(table)
            
            # Add page break between petitions except for the last one
            if idx < len(petition_ids) - 1:
                story.append(PageBreak())
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    # Save to temp file
    temp_pdf_path = UPLOAD_DIR / f"petitions_report_{uuid.uuid4()}.pdf"
    with open(temp_pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    
    return FileResponse(
        path=temp_pdf_path,
        filename=f"reporte_peticiones_{datetime.now().strftime('%Y%m%d')}.pdf",
        media_type='application/pdf'
    )


# ===== PRODUCTIVITY REPORTS =====

@api_router.get("/reports/gestor-productivity")
async def get_gestor_productivity(current_user: dict = Depends(get_current_user)):
    """Get productivity report for all gestores"""
    # Only admin, coordinador, and atencion_usuario can view reports
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    # Get all gestores and auxiliares
    gestores = await db.users.find(
        {"role": {"$in": [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]}},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    productivity_data = []
    
    for gestor in gestores:
        gestor_id = gestor['id']
        
        # Total petitions assigned
        total_assigned = await db.petitions.count_documents({
            "gestores_asignados": gestor_id
        })
        
        # Completed petitions
        completed = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": PetitionStatus.FINALIZADO
        })
        
        # In process
        in_process = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": {"$in": [PetitionStatus.ASIGNADO, PetitionStatus.REVISION, PetitionStatus.DEVUELTO]}
        })
        
        # Rejected
        rejected = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": PetitionStatus.RECHAZADO
        })
        
        # Calculate average time to complete (for completed petitions)
        completed_petitions = await db.petitions.find({
            "gestores_asignados": gestor_id,
            "estado": PetitionStatus.FINALIZADO
        }, {"_id": 0, "created_at": 1, "updated_at": 1}).to_list(1000)
        
        avg_days = 0
        if completed_petitions:
            total_days = 0
            for petition in completed_petitions:
                created = petition['created_at']
                updated = petition['updated_at']
                
                if isinstance(created, str):
                    created = datetime.fromisoformat(created)
                if isinstance(updated, str):
                    updated = datetime.fromisoformat(updated)
                
                delta = (updated - created).days
                total_days += delta
            
            avg_days = round(total_days / len(completed_petitions), 1) if completed_petitions else 0
        
        # Calculate completion rate
        completion_rate = round((completed / total_assigned * 100), 1) if total_assigned > 0 else 0
        
        productivity_data.append({
            "gestor_id": gestor_id,
            "gestor_name": gestor['full_name'],
            "gestor_email": gestor['email'],
            "gestor_role": gestor['role'],
            "total_assigned": total_assigned,
            "completed": completed,
            "in_process": in_process,
            "rejected": rejected,
            "avg_completion_days": avg_days,
            "completion_rate": completion_rate
        })
    
    # Sort by completion rate descending
    productivity_data.sort(key=lambda x: x['completion_rate'], reverse=True)
    
    return productivity_data


@api_router.get("/reports/gestor-productivity/export-pdf")
async def export_gestor_productivity_pdf(current_user: dict = Depends(get_current_user)):
    """Export gestor productivity report as PDF"""
    # Only admin, coordinador, and atencion_usuario can export reports
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    # Get productivity data
    gestores = await db.users.find(
        {"role": {"$in": [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]}},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    productivity_data = []
    
    for gestor in gestores:
        gestor_id = gestor['id']
        
        total_assigned = await db.petitions.count_documents({"gestores_asignados": gestor_id})
        completed = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": PetitionStatus.FINALIZADO
        })
        in_process = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": {"$in": [PetitionStatus.ASIGNADO, PetitionStatus.REVISION, PetitionStatus.DEVUELTO]}
        })
        rejected = await db.petitions.count_documents({
            "gestores_asignados": gestor_id,
            "estado": PetitionStatus.RECHAZADO
        })
        
        completion_rate = round((completed / total_assigned * 100), 1) if total_assigned > 0 else 0
        
        productivity_data.append({
            "name": gestor['full_name'],
            "role": "Gestor" if gestor['role'] == UserRole.GESTOR else "Gestor Auxiliar",
            "total": total_assigned,
            "completed": completed,
            "in_process": in_process,
            "rejected": rejected,
            "rate": completion_rate
        })
    
    productivity_data.sort(key=lambda x: x['rate'], reverse=True)
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#047857'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    story.append(Paragraph("ASOCIACIÓN DE MUNICIPIOS DEL CATATUMBO", title_style))
    story.append(Paragraph("Reporte de Productividad de Gestores", styles['Heading2']))
    story.append(Paragraph(f"Fecha: {datetime.now().strftime('%d/%m/%Y')}", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    
    # Table data
    table_data = [
        ['Gestor', 'Rol', 'Total', 'Finalizados', 'En Proceso', 'Rechazados', 'Tasa (%)']
    ]
    
    for data in productivity_data:
        table_data.append([
            data['name'],
            data['role'],
            str(data['total']),
            str(data['completed']),
            str(data['in_process']),
            str(data['rejected']),
            f"{data['rate']}%"
        ])
    
    # Create table
    col_widths = [1.8*inch, 1*inch, 0.6*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.7*inch]
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#047857')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.5*inch))
    
    # Summary
    story.append(Paragraph("Resumen General", styles['Heading3']))
    total_gestores = len(productivity_data)
    total_tramites = sum(d['total'] for d in productivity_data)
    total_finalizados = sum(d['completed'] for d in productivity_data)
    avg_rate = round(sum(d['rate'] for d in productivity_data) / total_gestores, 1) if total_gestores > 0 else 0
    
    summary_text = f"""
    <b>Total de Gestores:</b> {total_gestores}<br/>
    <b>Total de Trámites Asignados:</b> {total_tramites}<br/>
    <b>Total Finalizados:</b> {total_finalizados}<br/>
    <b>Tasa Promedio de Finalización:</b> {avg_rate}%
    """
    story.append(Paragraph(summary_text, styles['Normal']))
    
    # Footer
    story.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    story.append(Paragraph(
        "Reporte generado por el Sistema de Gestión Catastral de ASOMUNICIPIOS",
        footer_style
    ))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    # Save to temp file
    temp_pdf_path = UPLOAD_DIR / f"productivity_report_{uuid.uuid4()}.pdf"
    with open(temp_pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    
    return FileResponse(
        path=temp_pdf_path,
        filename=f"reporte_productividad_{datetime.now().strftime('%Y%m%d')}.pdf",
        media_type='application/pdf'
    )


# ===== ADVANCED STATISTICS =====

@api_router.get("/stats/by-municipality")
async def get_stats_by_municipality(current_user: dict = Depends(get_current_user)):
    """Get petition statistics grouped by municipality"""
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    pipeline = [
        {"$group": {
            "_id": "$municipio",
            "total": {"$sum": 1},
            "radicado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.RADICADO]}, 1, 0]}},
            "asignado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.ASIGNADO]}, 1, 0]}},
            "revision": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.REVISION]}, 1, 0]}},
            "finalizado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.FINALIZADO]}, 1, 0]}},
            "rechazado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.RECHAZADO]}, 1, 0]}},
            "devuelto": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.DEVUELTO]}, 1, 0]}}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.petitions.aggregate(pipeline).to_list(100)
    
    return [
        {
            "municipio": r["_id"] or "Sin especificar",
            "total": r["total"],
            "radicado": r["radicado"],
            "asignado": r["asignado"],
            "revision": r["revision"],
            "finalizado": r["finalizado"],
            "rechazado": r["rechazado"],
            "devuelto": r["devuelto"]
        }
        for r in results
    ]

@api_router.get("/stats/by-tramite")
async def get_stats_by_tramite(current_user: dict = Depends(get_current_user)):
    """Get petition statistics grouped by tramite type"""
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    pipeline = [
        {"$group": {
            "_id": "$tipo_tramite",
            "total": {"$sum": 1},
            "radicado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.RADICADO]}, 1, 0]}},
            "asignado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.ASIGNADO]}, 1, 0]}},
            "revision": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.REVISION]}, 1, 0]}},
            "finalizado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.FINALIZADO]}, 1, 0]}},
            "rechazado": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.RECHAZADO]}, 1, 0]}},
            "devuelto": {"$sum": {"$cond": [{"$eq": ["$estado", PetitionStatus.DEVUELTO]}, 1, 0]}}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.petitions.aggregate(pipeline).to_list(100)
    
    return [
        {
            "tipo_tramite": r["_id"] or "Sin especificar",
            "total": r["total"],
            "radicado": r["radicado"],
            "asignado": r["asignado"],
            "revision": r["revision"],
            "finalizado": r["finalizado"],
            "rechazado": r["rechazado"],
            "devuelto": r["devuelto"]
        }
        for r in results
    ]

@api_router.get("/stats/by-gestor")
async def get_stats_by_gestor(current_user: dict = Depends(get_current_user)):
    """Get petition statistics grouped by assigned gestor"""
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    # Get all gestores
    gestores = await db.users.find(
        {"role": {"$in": [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]}},
        {"_id": 0, "id": 1, "full_name": 1, "role": 1}
    ).to_list(100)
    
    gestor_stats = []
    
    for gestor in gestores:
        gestor_id = gestor['id']
        
        # Count by status for this gestor
        total = await db.petitions.count_documents({"gestores_asignados": gestor_id})
        radicado = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.RADICADO})
        asignado = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.ASIGNADO})
        revision = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.REVISION})
        finalizado = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.FINALIZADO})
        rechazado = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.RECHAZADO})
        devuelto = await db.petitions.count_documents({"gestores_asignados": gestor_id, "estado": PetitionStatus.DEVUELTO})
        
        completion_rate = round((finalizado / total * 100), 1) if total > 0 else 0
        
        gestor_stats.append({
            "gestor_id": gestor_id,
            "gestor_name": gestor['full_name'],
            "gestor_role": "Gestor" if gestor['role'] == UserRole.GESTOR else "Gestor Auxiliar",
            "total": total,
            "radicado": radicado,
            "asignado": asignado,
            "revision": revision,
            "finalizado": finalizado,
            "rechazado": rechazado,
            "devuelto": devuelto,
            "completion_rate": completion_rate
        })
    
    # Sort by total descending
    gestor_stats.sort(key=lambda x: x['total'], reverse=True)
    
    return gestor_stats

@api_router.get("/stats/summary")
async def get_stats_summary(current_user: dict = Depends(get_current_user)):
    """Get overall statistics summary"""
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    # Total counts
    total_petitions = await db.petitions.count_documents({})
    total_users = await db.users.count_documents({})
    total_gestores = await db.users.count_documents({"role": {"$in": [UserRole.GESTOR, UserRole.GESTOR_AUXILIAR]}})
    
    # Staff counts by role
    staff_counts = {
        "coordinadores": await db.users.count_documents({"role": UserRole.COORDINADOR}),
        "gestores": await db.users.count_documents({"role": UserRole.GESTOR}),
        "gestores_auxiliares": await db.users.count_documents({"role": UserRole.GESTOR_AUXILIAR}),
        "atencion_usuario": await db.users.count_documents({"role": UserRole.ATENCION_USUARIO}),
        "administradores": await db.users.count_documents({"role": UserRole.ADMINISTRADOR}),
        "ciudadanos": await db.users.count_documents({"role": UserRole.CIUDADANO})
    }
    
    # Status counts
    status_counts = {
        "radicado": await db.petitions.count_documents({"estado": PetitionStatus.RADICADO}),
        "asignado": await db.petitions.count_documents({"estado": PetitionStatus.ASIGNADO}),
        "revision": await db.petitions.count_documents({"estado": PetitionStatus.REVISION}),
        "finalizado": await db.petitions.count_documents({"estado": PetitionStatus.FINALIZADO}),
        "rechazado": await db.petitions.count_documents({"estado": PetitionStatus.RECHAZADO}),
        "devuelto": await db.petitions.count_documents({"estado": PetitionStatus.DEVUELTO})
    }
    
    # Completion rate
    completion_rate = round((status_counts["finalizado"] / total_petitions * 100), 1) if total_petitions > 0 else 0
    
    # Recent petitions (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_petitions = await db.petitions.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "total_petitions": total_petitions,
        "total_users": total_users,
        "total_gestores": total_gestores,
        "staff_counts": staff_counts,
        "status_counts": status_counts,
        "completion_rate": completion_rate,
        "recent_petitions_30_days": recent_petitions
    }


# ===== PREDIOS ROUTES (Código Nacional Catastral) =====

async def generate_codigo_predial(municipio: str, zona: str, sector: str, manzana_vereda: str, 
                                   terreno: str, condicion: str, ph: str) -> str:
    """Genera el código predial nacional de 30 dígitos"""
    if municipio not in MUNICIPIOS_DIVIPOLA:
        raise HTTPException(status_code=400, detail=f"Municipio '{municipio}' no válido")
    
    divipola = MUNICIPIOS_DIVIPOLA[municipio]
    
    # Construir código de 30 dígitos
    codigo = (
        divipola["departamento"].zfill(2) +  # 2 dígitos
        divipola["municipio"].zfill(3) +     # 3 dígitos
        zona.zfill(2) +                       # 2 dígitos
        sector.zfill(2) +                     # 2 dígitos
        manzana_vereda.zfill(4) +            # 4 dígitos
        terreno.zfill(4) +                    # 4 dígitos
        condicion.zfill(4) +                  # 4 dígitos
        ph.zfill(4) +                         # 4 dígitos
        "00000"                               # 5 dígitos (unidad predial)
    )
    
    return codigo

async def generate_codigo_homologado(municipio: str) -> str:
    """Genera un código homologado único de 11 caracteres"""
    import string
    import random
    
    # Obtener último código para este municipio
    last_predio = await db.predios.find_one(
        {"municipio": municipio, "deleted": {"$ne": True}},
        sort=[("numero_predio", -1)]
    )
    
    if last_predio:
        next_num = last_predio.get("numero_predio", 0) + 1
    else:
        next_num = 1
    
    # Generar código: BPP + número + letras aleatorias
    letters = ''.join(random.choices(string.ascii_uppercase, k=4))
    codigo = f"BPP{str(next_num).zfill(4)}{letters}"
    
    return codigo, next_num

async def get_next_terreno_number(municipio: str, zona: str, sector: str, manzana_vereda: str) -> str:
    """Obtiene el siguiente número de terreno disponible (incluyendo eliminados)"""
    # Buscar el máximo terreno usado (incluyendo eliminados para no reutilizar)
    pipeline = [
        {"$match": {
            "municipio": municipio,
            "zona": zona,
            "sector": sector,
            "manzana_vereda": manzana_vereda
        }},
        {"$group": {
            "_id": None,
            "max_terreno": {"$max": "$terreno_num"}
        }}
    ]
    
    result = await db.predios.aggregate(pipeline).to_list(1)
    
    if result and result[0].get("max_terreno"):
        next_num = result[0]["max_terreno"] + 1
    else:
        next_num = 1
    
    return str(next_num).zfill(4), next_num

@api_router.get("/predios/catalogos")
async def get_predios_catalogos(current_user: dict = Depends(get_current_user)):
    """Obtiene los catálogos para el formulario de predios"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    return {
        "municipios": list(MUNICIPIOS_DIVIPOLA.keys()),
        "destino_economico": DESTINO_ECONOMICO,
        "tipo_documento": TIPO_DOCUMENTO_PREDIO,
        "estado_civil": ESTADO_CIVIL_PREDIO,
        "divipola": MUNICIPIOS_DIVIPOLA
    }

@api_router.get("/predios")
async def get_predios(
    municipio: Optional[str] = None,
    destino_economico: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lista todos los predios (solo staff)"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    query = {"deleted": {"$ne": True}}
    
    if municipio:
        query["municipio"] = municipio
    if destino_economico:
        query["destino_economico"] = destino_economico
    if search:
        query["$or"] = [
            {"codigo_predial_nacional": {"$regex": search, "$options": "i"}},
            {"codigo_homologado": {"$regex": search, "$options": "i"}},
            {"propietarios.nombre_propietario": {"$regex": search, "$options": "i"}},
            {"propietarios.numero_documento": {"$regex": search, "$options": "i"}},
            {"direccion": {"$regex": search, "$options": "i"}},
            {"matriculas": {"$regex": search, "$options": "i"}}  # Búsqueda por matrícula
        ]
    
    total = await db.predios.count_documents(query)
    predios = await db.predios.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "predios": predios
    }

@api_router.get("/predios/stats/summary")
async def get_predios_stats(current_user: dict = Depends(get_current_user)):
    """Obtiene estadísticas de predios"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    total = await db.predios.count_documents({"deleted": {"$ne": True}})
    
    # Por municipio
    pipeline_municipio = [
        {"$match": {"deleted": {"$ne": True}}},
        {"$group": {"_id": "$municipio", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_municipio = await db.predios.aggregate(pipeline_municipio).to_list(20)
    
    # Por destino económico
    pipeline_destino = [
        {"$match": {"deleted": {"$ne": True}}},
        {"$group": {"_id": "$destino_economico", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_destino = await db.predios.aggregate(pipeline_destino).to_list(20)
    
    # Total avalúo
    pipeline_avaluo = [
        {"$match": {"deleted": {"$ne": True}}},
        {"$group": {"_id": None, "total_avaluo": {"$sum": "$avaluo"}, "total_area": {"$sum": "$area_terreno"}}}
    ]
    totals = await db.predios.aggregate(pipeline_avaluo).to_list(1)
    
    return {
        "total_predios": total,
        "total_avaluo": totals[0]["total_avaluo"] if totals else 0,
        "total_area_terreno": totals[0]["total_area"] if totals else 0,
        "by_municipio": [{"municipio": r["_id"], "count": r["count"]} for r in by_municipio],
        "by_destino": [{"destino": r["_id"], "nombre": DESTINO_ECONOMICO.get(r["_id"], "Desconocido"), "count": r["count"]} for r in by_destino]
    }

@api_router.get("/predios/eliminados")
async def get_predios_eliminados(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lista todos los predios eliminados (staff only)"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    query = {"deleted": True}
    
    total = await db.predios.count_documents(query)
    predios = await db.predios.find(query, {"_id": 0}).sort("deleted_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "predios": predios
    }

@api_router.get("/predios/export-excel")
async def export_predios_excel(
    municipio: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Exporta predios a Excel en formato EXACTO al archivo original R1-R2"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    # Query
    query = {"deleted": {"$ne": True}}
    if municipio:
        query["municipio"] = municipio
    
    predios = await db.predios.find(query, {"_id": 0}).to_list(50000)
    
    # Crear workbook
    wb = Workbook()
    
    # Estilos
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="047857", end_color="047857", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # === HOJA REGISTRO_R1 (Propietarios) ===
    ws_r1 = wb.active
    ws_r1.title = "REGISTRO_R1"
    
    # Headers R1 - EXACTO al original
    headers_r1 = [
        "DEPARTAMENTO", "MUNICIPIO", "NUMERO_DEL_PREDIO", "CODIGO_PREDIAL_NACIONAL", 
        "CODIGO_HOMOLOGADO", "TIPO_DE_REGISTRO", "NUMERO_DE_ORDEN", "TOTAL_REGISTROS",
        "NOMBRE", "ESTADO_CIVIL", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "DIRECCION",
        "COMUNA", "DESTINO_ECONOMICO", "AREA_TERRENO", "AREA_CONSTRUIDA", "AVALUO",
        "VIGENCIA", "TIPO_MUTACIÓN", "NO. RESOLUCIÓN", "FECHA_RESOLUCIÓN"
    ]
    
    for col, header in enumerate(headers_r1, 1):
        cell = ws_r1.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Escribir datos R1
    row = 2
    for predio in predios:
        propietarios = predio.get('propietarios', [])
        if not propietarios:
            propietarios = [{'nombre_propietario': predio.get('nombre_propietario', ''),
                           'tipo_documento': predio.get('tipo_documento', ''),
                           'numero_documento': predio.get('numero_documento', ''),
                           'estado_civil': predio.get('estado_civil', '')}]
        
        total_props = len(propietarios)
        for idx, prop in enumerate(propietarios, 1):
            ws_r1.cell(row=row, column=1, value=predio.get('departamento', ''))
            ws_r1.cell(row=row, column=2, value=predio.get('municipio', ''))
            ws_r1.cell(row=row, column=3, value=predio.get('numero_predio', ''))
            ws_r1.cell(row=row, column=4, value=predio.get('codigo_predial_nacional', ''))
            ws_r1.cell(row=row, column=5, value=predio.get('codigo_homologado', ''))
            ws_r1.cell(row=row, column=6, value='1')
            ws_r1.cell(row=row, column=7, value=str(idx).zfill(2))
            ws_r1.cell(row=row, column=8, value=str(total_props).zfill(2))
            ws_r1.cell(row=row, column=9, value=prop.get('nombre_propietario', ''))
            ws_r1.cell(row=row, column=10, value=prop.get('estado_civil', ''))
            ws_r1.cell(row=row, column=11, value=prop.get('tipo_documento', ''))
            ws_r1.cell(row=row, column=12, value=prop.get('numero_documento', ''))
            ws_r1.cell(row=row, column=13, value=predio.get('direccion', ''))
            ws_r1.cell(row=row, column=14, value=predio.get('comuna', ''))
            ws_r1.cell(row=row, column=15, value=predio.get('destino_economico', ''))
            ws_r1.cell(row=row, column=16, value=predio.get('area_terreno', 0))
            ws_r1.cell(row=row, column=17, value=predio.get('area_construida', 0))
            ws_r1.cell(row=row, column=18, value=predio.get('avaluo', 0))
            ws_r1.cell(row=row, column=19, value=predio.get('vigencia', datetime.now().year))
            ws_r1.cell(row=row, column=20, value=predio.get('tipo_mutacion', ''))
            ws_r1.cell(row=row, column=21, value=predio.get('numero_resolucion', ''))
            ws_r1.cell(row=row, column=22, value=predio.get('fecha_resolucion', ''))
            row += 1
    
    # === HOJA REGISTRO_R2 (Físico - con zonas en columnas horizontales) ===
    ws_r2 = wb.create_sheet(title="REGISTRO_R2")
    
    # Headers R2 - EXACTO al original con zonas en columnas horizontales
    headers_r2 = [
        "DEPARTAMENTO", "MUNICIPIO", "NUMERO_DEL_PREDIO", "CODIGO_PREDIAL_NACIONAL",
        "TIPO_DE_REGISTRO", "NUMERO_DE_ORDEN", "TOTAL_REGISTROS", "MATRICULA_INMOBILIARIA",
        # Zona 1
        "ZONA_FISICA_1", "ZONA_ECONOMICA_1", "AREA_TERRENO_1",
        # Zona 2
        "ZONA_FISICA_2", "ZONA_ECONOMICA_2", "AREA_TERRENO_2",
        # Construcción 1
        "HABITACIONES_1", "BANOS_1", "LOCALES_1", "PISOS_1", "TIPIFICACION_1", "USO_1", "PUNTAJE_1", "AREA_CONSTRUIDA_1",
        # Construcción 2
        "HABITACIONES_2", "BANOS_2", "LOCALES_2", "PISOS_2", "TIPIFICACION_2", "USO_2", "PUNTAJE_2", "AREA_CONSTRUIDA_2",
        # Construcción 3
        "HABITACIONES_3", "BANOS_3", "LOCALES_3", "PISOS_3", "TIPIFICACION_3", "USO_3", "PUNTAJE_3", "AREA_CONSTRUIDA_3",
        "VIGENCIA"
    ]
    
    for col, header in enumerate(headers_r2, 1):
        cell = ws_r2.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Escribir datos R2 - Una fila por registro R2 con zonas en columnas
    row = 2
    for predio in predios:
        r2_registros = predio.get('r2_registros', [])
        total_r2 = len(r2_registros) if r2_registros else 0
        
        for r2_idx, r2 in enumerate(r2_registros, 1):
            ws_r2.cell(row=row, column=1, value=predio.get('departamento', ''))
            ws_r2.cell(row=row, column=2, value=predio.get('municipio', ''))
            ws_r2.cell(row=row, column=3, value=predio.get('numero_predio', ''))
            ws_r2.cell(row=row, column=4, value=predio.get('codigo_predial_nacional', ''))
            ws_r2.cell(row=row, column=5, value='2')
            ws_r2.cell(row=row, column=6, value=str(r2_idx).zfill(2))
            ws_r2.cell(row=row, column=7, value=str(total_r2).zfill(2))
            ws_r2.cell(row=row, column=8, value=r2.get('matricula_inmobiliaria', ''))
            
            zonas = r2.get('zonas', [])
            
            # Zona 1 (columnas 9-11)
            if len(zonas) >= 1:
                ws_r2.cell(row=row, column=9, value=zonas[0].get('zona_fisica', ''))
                ws_r2.cell(row=row, column=10, value=zonas[0].get('zona_economica', ''))
                ws_r2.cell(row=row, column=11, value=zonas[0].get('area_terreno', 0))
            
            # Zona 2 (columnas 12-14)
            if len(zonas) >= 2:
                ws_r2.cell(row=row, column=12, value=zonas[1].get('zona_fisica', ''))
                ws_r2.cell(row=row, column=13, value=zonas[1].get('zona_economica', ''))
                ws_r2.cell(row=row, column=14, value=zonas[1].get('area_terreno', 0))
            
            # Construcción 1 (columnas 15-22)
            if len(zonas) >= 1:
                ws_r2.cell(row=row, column=15, value=zonas[0].get('habitaciones', 0))
                ws_r2.cell(row=row, column=16, value=zonas[0].get('banos', 0))
                ws_r2.cell(row=row, column=17, value=zonas[0].get('locales', 0))
                ws_r2.cell(row=row, column=18, value=zonas[0].get('pisos', 0))
                ws_r2.cell(row=row, column=19, value=zonas[0].get('tipificacion', ''))
                ws_r2.cell(row=row, column=20, value=zonas[0].get('uso', ''))
                ws_r2.cell(row=row, column=21, value=zonas[0].get('puntaje', 0))
                ws_r2.cell(row=row, column=22, value=zonas[0].get('area_construida', 0))
            
            # Construcción 2 (columnas 23-30)
            if len(zonas) >= 2:
                ws_r2.cell(row=row, column=23, value=zonas[1].get('habitaciones', 0))
                ws_r2.cell(row=row, column=24, value=zonas[1].get('banos', 0))
                ws_r2.cell(row=row, column=25, value=zonas[1].get('locales', 0))
                ws_r2.cell(row=row, column=26, value=zonas[1].get('pisos', 0))
                ws_r2.cell(row=row, column=27, value=zonas[1].get('tipificacion', ''))
                ws_r2.cell(row=row, column=28, value=zonas[1].get('uso', ''))
                ws_r2.cell(row=row, column=29, value=zonas[1].get('puntaje', 0))
                ws_r2.cell(row=row, column=30, value=zonas[1].get('area_construida', 0))
            
            # Construcción 3 (columnas 31-38)
            if len(zonas) >= 3:
                ws_r2.cell(row=row, column=31, value=zonas[2].get('habitaciones', 0))
                ws_r2.cell(row=row, column=32, value=zonas[2].get('banos', 0))
                ws_r2.cell(row=row, column=33, value=zonas[2].get('locales', 0))
                ws_r2.cell(row=row, column=34, value=zonas[2].get('pisos', 0))
                ws_r2.cell(row=row, column=35, value=zonas[2].get('tipificacion', ''))
                ws_r2.cell(row=row, column=36, value=zonas[2].get('uso', ''))
                ws_r2.cell(row=row, column=37, value=zonas[2].get('puntaje', 0))
                ws_r2.cell(row=row, column=38, value=zonas[2].get('area_construida', 0))
            
            # Vigencia
            ws_r2.cell(row=row, column=39, value=predio.get('vigencia', datetime.now().year))
            row += 1
    
    # Ajustar anchos de columna
    for ws in [ws_r1, ws_r2]:
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
    
    # Guardar en buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    # Generar nombre de archivo
    fecha = datetime.now().strftime('%Y%m%d')
    filename = f"Predios_{municipio or 'Todos'}_{fecha}.xlsx"
    
    return StreamingResponse(
        buffer,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


# ===== CERTIFICADO CATASTRAL =====

def generate_certificado_catastral(predio: dict, firmante: dict, proyectado_por: str) -> bytes:
    """Genera un certificado catastral en PDF con diseño institucional de Asomunicipios"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import simpleSplit
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Colores institucionales
    verde_asomunicipios = colors.HexColor('#047857')
    verde_claro = colors.HexColor('#10b981')
    
    # Márgenes
    left_margin = 2.5 * cm
    right_margin = width - 2.5 * cm
    content_width = right_margin - left_margin
    
    # === ENCABEZADO CON LOGO ===
    logo_path = Path("/app/backend/logo_asomunicipios.png")
    if logo_path.exists():
        # Logo centrado en la parte superior
        logo_width = 18 * cm
        logo_height = 3.5 * cm
        logo_x = (width - logo_width) / 2
        c.drawImage(str(logo_path), logo_x, height - 4.5 * cm, width=logo_width, height=logo_height, preserveAspectRatio=True, mask='auto')
    
    y = height - 5.5 * cm
    
    # Línea separadora verde
    c.setStrokeColor(verde_asomunicipios)
    c.setLineWidth(2)
    c.line(left_margin, y, right_margin, y)
    y -= 15
    
    # Fecha y número de certificado
    fecha_actual = datetime.now()
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    fecha_str = f"Ocaña, {fecha_actual.day} de {meses[fecha_actual.month-1]} del {fecha_actual.year}"
    
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    c.drawString(left_margin, y, fecha_str)
    
    # Campo editable para número de certificado
    c.drawString(right_margin - 150, y, "CERTIFICADO No.:")
    c.acroForm.textfield(
        name='numero_certificado',
        tooltip='Ingrese el número de certificado',
        x=right_margin - 60,
        y=y - 4,
        width=60,
        height=14,
        borderWidth=1,
        borderColor=verde_asomunicipios,
        fillColor=colors.white,
        textColor=colors.black,
        fontSize=9,
    )
    y -= 35
    
    # === TÍTULO PRINCIPAL ===
    c.setFillColor(verde_asomunicipios)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, y, "CERTIFICADO CATASTRAL")
    y -= 18
    
    # Subtítulo legal
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 7)
    texto_legal = "Válido según Ley 527/1999, Directiva Presidencial 02/2000, Ley 962/2005 Art. 6 Parágrafo 3"
    c.drawCentredString(width/2, y, texto_legal)
    y -= 25
    
    # === CUERPO DEL CERTIFICADO ===
    c.setFont("Helvetica", 9)
    
    # Texto introductorio
    intro = f"LA ASOCIACIÓN DE MUNICIPIOS DEL CATATUMBO PROVINCIA DE OCAÑA Y SUR DEL CESAR – ASOMUNICIPIOS, en su calidad de Gestor Catastral habilitado, certifica que el siguiente predio se encuentra inscrito en la base de datos catastral:"
    lines = simpleSplit(intro, "Helvetica", 9, content_width)
    for line in lines:
        c.drawString(left_margin, y, line)
        y -= 12
    y -= 10
    
    # Función para dibujar sección
    def draw_section(title, items, y_pos):
        # Título de sección
        c.setFillColor(verde_asomunicipios)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(left_margin, y_pos, title)
        y_pos -= 5
        c.setStrokeColor(verde_claro)
        c.setLineWidth(0.5)
        c.line(left_margin, y_pos, right_margin, y_pos)
        y_pos -= 12
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 9)
        
        for label, value in items:
            # Label en bold, value normal
            c.setFont("Helvetica-Bold", 9)
            c.drawString(left_margin + 10, y_pos, f"{label}:")
            c.setFont("Helvetica", 9)
            # Calcular posición del valor
            label_width = c.stringWidth(f"{label}:", "Helvetica-Bold", 9)
            c.drawString(left_margin + 15 + label_width, y_pos, str(value))
            y_pos -= 13
        
        return y_pos - 5
    
    # INFORMACIÓN CATASTRAL
    items_catastral = [
        ("Código Predial Nacional", predio.get('codigo_predial_nacional', '')),
        ("Código Anterior (Homologado)", predio.get('codigo_homologado', '')),
        ("Número de Predio", predio.get('numero_predio', '01')),
    ]
    y = draw_section("INFORMACIÓN CATASTRAL", items_catastral, y)
    
    # INFORMACIÓN JURÍDICA
    propietarios = predio.get('propietarios', [])
    items_juridicos = []
    if propietarios:
        for i, prop in enumerate(propietarios, 1):
            prefix = f"Propietario {i}" if len(propietarios) > 1 else "Propietario"
            items_juridicos.append((prefix, prop.get('nombre_propietario', '')))
            items_juridicos.append(("   Documento", f"{prop.get('tipo_documento', '')} {prop.get('numero_documento', '')}"))
    else:
        items_juridicos.append(("Propietario", predio.get('nombre_propietario', 'N/A')))
    
    # Matrícula
    matricula = ''
    r2_registros = predio.get('r2_registros', [])
    if r2_registros:
        matricula = r2_registros[0].get('matricula_inmobiliaria', '')
    items_juridicos.append(("Matrícula Inmobiliaria", matricula or 'N/A'))
    
    y = draw_section("INFORMACIÓN JURÍDICA", items_juridicos, y)
    
    # INFORMACIÓN FÍSICA
    area_terreno = predio.get('area_terreno', 0)
    if area_terreno >= 10000:
        ha = int(area_terreno // 10000)
        m2 = int(area_terreno % 10000)
        area_str = f"{ha} Ha {m2} m²"
    else:
        area_str = f"{area_terreno} m²"
    
    items_fisicos = [
        ("Departamento", predio.get('departamento', 'Norte de Santander')),
        ("Municipio", predio.get('municipio', '')),
        ("Dirección", predio.get('direccion', '')),
        ("Destino Económico", predio.get('destino_economico', '')),
        ("Área del Terreno", area_str),
        ("Área Construida", f"{predio.get('area_construida', 0)} m²"),
    ]
    y = draw_section("INFORMACIÓN FÍSICA", items_fisicos, y)
    
    # INFORMACIÓN ECONÓMICA
    avaluo = predio.get('avaluo', 0)
    avaluo_str = f"${avaluo:,.0f} COP".replace(',', '.')
    
    items_economicos = [
        ("Avalúo Catastral", avaluo_str),
        ("Vigencia", str(predio.get('vigencia', datetime.now().year))),
    ]
    y = draw_section("INFORMACIÓN ECONÓMICA", items_economicos, y)
    
    y -= 10
    
    # Texto de expedición
    c.setFont("Helvetica", 9)
    texto_exp = f"El presente certificado se expide a solicitud del interesado en Ocaña, Norte de Santander, a los {fecha_actual.day} días del mes de {meses[fecha_actual.month-1]} del año {fecha_actual.year}."
    lines = simpleSplit(texto_exp, "Helvetica", 9, content_width)
    for line in lines:
        c.drawString(left_margin, y, line)
        y -= 12
    
    y -= 30
    
    # === FIRMA ===
    # Línea de firma
    firma_x = width/2 - 80
    c.line(firma_x, y, firma_x + 160, y)
    y -= 12
    
    # Nombre del firmante (siempre Dalgie Esperanza Torrado Rizo)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, y, "DALGIE ESPERANZA TORRADO RIZO")
    y -= 12
    c.setFont("Helvetica", 9)
    c.drawCentredString(width/2, y, "Subdirectora Financiera y Administrativa")
    y -= 10
    c.drawCentredString(width/2, y, "ASOMUNICIPIOS")
    y -= 20
    
    # Proyectó
    c.setFont("Helvetica", 8)
    c.drawString(left_margin, y, f"Proyectó: {proyectado_por}")
    y -= 25
    
    # === NOTAS LEGALES ===
    c.setFillColor(colors.HexColor('#666666'))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(left_margin, y, "NOTAS LEGALES:")
    y -= 10
    
    c.setFont("Helvetica", 6)
    notas = [
        "• La presente información no sirve como prueba para establecer actos constitutivos de posesión.",
        "• Según Art. 2.2.2.2.8 del Decreto 148/2020, la información catastral se inscribe con fecha del acto administrativo que lo ordena.",
        "• Según Art. 29 Res. 1149/2021 IGAC: La inscripción catastral no constituye título de dominio ni sanea vicios de titulación.",
        "• Asomunicipios gestiona información catastral de: Ábrego, Bucarasica, Convención, Cáchira, El Carmen, El Tarra, Hacarí,",
        "  La Playa de Belén, San Calixto, Sardinata, Teorama (Norte de Santander) y Río de Oro (Cesar).",
    ]
    
    for nota in notas:
        c.drawString(left_margin, y, nota)
        y -= 8
    
    y -= 10
    c.setFillColor(verde_asomunicipios)
    c.setFont("Helvetica", 7)
    c.drawString(left_margin, y, "Contacto: comunicaciones@asomunicipios.gov.co | Calle 12 # 11-76, Ocaña | +57 310 232 7647")
    
    # Línea inferior
    c.setStrokeColor(verde_asomunicipios)
    c.setLineWidth(2)
    c.line(left_margin, y - 10, right_margin, y - 10)
    
    c.save()
    return buffer.getvalue()


@api_router.get("/predios/{predio_id}/certificado")
async def generar_certificado_catastral_endpoint(predio_id: str, current_user: dict = Depends(get_current_user)):
    """Genera un certificado catastral PDF para un predio específico con consecutivo en blanco para llenado manual"""
    # Solo coordinador, administrador y atencion_usuario pueden generar certificados
    if current_user['role'] not in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR, UserRole.ATENCION_USUARIO]:
        raise HTTPException(status_code=403, detail="No tiene permiso para generar certificados")
    
    # Obtener predio
    predio = await db.predios.find_one({"id": predio_id}, {"_id": 0})
    if not predio:
        raise HTTPException(status_code=404, detail="Predio no encontrado")
    
    # Registrar certificado en la base de datos (sin número, se llena manualmente)
    certificado_record = {
        "id": str(uuid.uuid4()),
        "numero": "(Por asignar)",
        "predio_id": predio_id,
        "codigo_predial": predio.get('codigo_predial_nacional', ''),
        "generado_por": current_user['id'],
        "generado_por_nombre": current_user['full_name'],
        "generado_por_rol": current_user['role'],
        "fecha_generacion": datetime.now(timezone.utc).isoformat()
    }
    await db.certificados.insert_one(certificado_record)
    
    # Firmante siempre es Dalgie Esperanza Torrado Rizo
    firmante = {
        "full_name": "DALGIE ESPERANZA TORRADO RIZO",
        "cargo": "Subdirectora Financiera y Administrativa"
    }
    
    # Quien proyecta es el usuario actual
    proyectado_por = current_user['full_name']
    
    # Generar PDF con campo editable para número
    pdf_bytes = generate_certificado_catastral(predio, firmante, proyectado_por)
    
    # Guardar temporalmente
    temp_path = UPLOAD_DIR / f"certificado_{predio_id}_{uuid.uuid4()}.pdf"
    with open(temp_path, 'wb') as f:
        f.write(pdf_bytes)
    
    # Nombre del archivo
    codigo = predio.get('codigo_predial_nacional', predio_id)
    filename = f"Certificado_Catastral_{codigo}.pdf"
    
    return FileResponse(
        path=temp_path,
        filename=filename,
        media_type='application/pdf'
    )


@api_router.get("/certificados/historial")
async def get_certificados_historial(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el historial de certificados generados"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    certificados = await db.certificados.find({}, {"_id": 0}).sort("fecha_generacion", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.certificados.count_documents({})
    
    return {
        "certificados": certificados,
        "total": total
    }


@api_router.get("/predios/terreno-info/{municipio}")
async def get_terreno_info(
    municipio: str,
    zona: str = "00",
    sector: str = "01", 
    manzana_vereda: str = "0000",
    current_user: dict = Depends(get_current_user)
):
    """Obtiene información sobre el siguiente terreno disponible en una manzana"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    # Buscar todos los terrenos en esta manzana (incluyendo eliminados)
    query = {
        "municipio": municipio,
        "zona": zona,
        "sector": sector,
        "manzana_vereda": manzana_vereda
    }
    
    predios = await db.predios.find(query, {"_id": 0, "terreno": 1, "terreno_num": 1, "deleted": 1, "codigo_homologado": 1}).to_list(10000)
    
    # Clasificar terrenos
    terrenos_activos = []
    terrenos_eliminados = []
    
    for p in predios:
        terreno_num = p.get('terreno_num', 0)
        if p.get('deleted'):
            terrenos_eliminados.append({
                "numero": p.get('terreno'),
                "codigo": p.get('codigo_homologado')
            })
        else:
            terrenos_activos.append(terreno_num)
    
    # Encontrar el máximo terreno usado
    max_terreno = max(terrenos_activos + [t.get('terreno_num', 0) for t in predios], default=0)
    siguiente_terreno = max_terreno + 1
    
    return {
        "municipio": municipio,
        "zona": zona,
        "sector": sector,
        "manzana_vereda": manzana_vereda,
        "total_activos": len(terrenos_activos),
        "ultimo_terreno": str(max_terreno).zfill(4) if max_terreno > 0 else "N/A",
        "siguiente_terreno": str(siguiente_terreno).zfill(4),
        "terrenos_eliminados": terrenos_eliminados,
        "terrenos_no_reutilizables": len(terrenos_eliminados)
    }

@api_router.get("/predios/{predio_id}")
async def get_predio(predio_id: str, current_user: dict = Depends(get_current_user)):
    """Obtiene un predio por ID"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    predio = await db.predios.find_one({"id": predio_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not predio:
        raise HTTPException(status_code=404, detail="Predio no encontrado")
    
    return predio

@api_router.post("/predios")
async def create_predio(predio_data: PredioCreate, current_user: dict = Depends(get_current_user)):
    """Crea un nuevo predio"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    r1 = predio_data.r1
    r2 = predio_data.r2
    
    # Obtener siguiente número de terreno
    terreno, terreno_num = await get_next_terreno_number(
        r1.municipio, r1.zona, r1.sector, r1.manzana_vereda
    )
    
    # Generar código predial nacional
    codigo_predial = await generate_codigo_predial(
        r1.municipio, r1.zona, r1.sector, r1.manzana_vereda,
        terreno, r1.condicion_predio, r1.predio_horizontal
    )
    
    # Verificar que no exista (incluyendo eliminados)
    existing = await db.predios.find_one({"codigo_predial_nacional": codigo_predial})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un predio con este código predial")
    
    # Generar código homologado
    codigo_homologado, numero_predio = await generate_codigo_homologado(r1.municipio)
    
    # Obtener código Código Nacional Catastral
    divipola = MUNICIPIOS_DIVIPOLA[r1.municipio]
    
    # Crear el predio
    predio = {
        "id": str(uuid.uuid4()),
        "departamento": divipola["departamento"],
        "municipio": r1.municipio,
        "municipio_codigo": divipola["municipio"],
        "numero_predio": numero_predio,
        "codigo_predial_nacional": codigo_predial,
        "codigo_homologado": codigo_homologado,
        "zona": r1.zona,
        "sector": r1.sector,
        "manzana_vereda": r1.manzana_vereda,
        "terreno": terreno,
        "terreno_num": terreno_num,
        "condicion_predio": r1.condicion_predio,
        "predio_horizontal": r1.predio_horizontal,
        
        # R1 - Información jurídica
        "tipo_registro": 1,
        "nombre_propietario": r1.nombre_propietario,
        "tipo_documento": r1.tipo_documento,
        "numero_documento": r1.numero_documento,
        "estado_civil": r1.estado_civil,
        "direccion": r1.direccion,
        "comuna": r1.comuna,
        "destino_economico": r1.destino_economico,
        "area_terreno": r1.area_terreno,
        "area_construida": r1.area_construida,
        "avaluo": r1.avaluo,
        "tipo_mutacion": r1.tipo_mutacion,
        "numero_resolucion": r1.numero_resolucion,
        "fecha_resolucion": r1.fecha_resolucion,
        
        # R2 - Información física (si se proporciona)
        "r2": r2.model_dump() if r2 else None,
        
        # Metadata
        "vigencia": datetime.now().strftime("%m%d%Y"),
        "created_by": current_user['id'],
        "created_by_name": current_user['full_name'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted": False,
        
        # Historial
        "historial": [{
            "accion": "Predio creado",
            "usuario": current_user['full_name'],
            "usuario_id": current_user['id'],
            "fecha": datetime.now(timezone.utc).isoformat()
        }]
    }
    
    await db.predios.insert_one(predio)
    
    # Remover _id antes de retornar
    predio.pop("_id", None)
    
    return predio

@api_router.patch("/predios/{predio_id}")
async def update_predio(predio_id: str, update_data: PredioUpdate, current_user: dict = Depends(get_current_user)):
    """Actualiza un predio existente"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    predio = await db.predios.find_one({"id": predio_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not predio:
        raise HTTPException(status_code=404, detail="Predio no encontrado")
    
    # Filtrar campos no nulos
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        return predio
    
    # Agregar metadata de actualización
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Agregar al historial
    historial_entry = {
        "accion": "Predio modificado",
        "usuario": current_user['full_name'],
        "usuario_id": current_user['id'],
        "campos_modificados": list(update_dict.keys()),
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    
    await db.predios.update_one(
        {"id": predio_id},
        {
            "$set": update_dict,
            "$push": {"historial": historial_entry}
        }
    )
    
    # Retornar predio actualizado
    updated_predio = await db.predios.find_one({"id": predio_id}, {"_id": 0})
    return updated_predio

@api_router.delete("/predios/{predio_id}")
async def delete_predio(predio_id: str, current_user: dict = Depends(get_current_user)):
    """Elimina un predio (soft delete)"""
    if current_user['role'] not in [UserRole.ADMINISTRADOR, UserRole.COORDINADOR]:
        raise HTTPException(status_code=403, detail="Solo coordinadores y administradores pueden eliminar predios")
    
    predio = await db.predios.find_one({"id": predio_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not predio:
        raise HTTPException(status_code=404, detail="Predio no encontrado")
    
    # Soft delete - NO eliminamos físicamente para evitar reutilizar códigos
    historial_entry = {
        "accion": "Predio eliminado",
        "usuario": current_user['full_name'],
        "usuario_id": current_user['id'],
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    
    await db.predios.update_one(
        {"id": predio_id},
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "deleted_by": current_user['id'],
                "deleted_by_name": current_user['full_name']
            },
            "$push": {"historial": historial_entry}
        }
    )
    
    return {"message": "Predio eliminado exitosamente"}


# ===== SISTEMA DE APROBACIÓN DE PREDIOS =====

@api_router.post("/predios/cambios/proponer")
async def proponer_cambio_predio(
    cambio: CambioPendienteCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Propone un cambio en un predio (crear, modificar, eliminar).
    Solo gestores y atención pueden proponer. Coordinadores aprueban directamente.
    """
    # Verificar permisos
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    # Coordinadores y administradores aprueban directamente
    aprueba_directo = current_user['role'] in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]
    
    cambio_doc = {
        "id": str(uuid.uuid4()),
        "predio_id": cambio.predio_id,
        "tipo_cambio": cambio.tipo_cambio,
        "datos_propuestos": cambio.datos_propuestos,
        "justificacion": cambio.justificacion,
        "estado": PredioEstadoAprobacion.APROBADO if aprueba_directo else f"pendiente_{cambio.tipo_cambio}",
        "propuesto_por": current_user['id'],
        "propuesto_por_nombre": current_user['full_name'],
        "propuesto_por_rol": current_user['role'],
        "fecha_propuesta": datetime.now(timezone.utc).isoformat(),
        "aprobado_por": current_user['id'] if aprueba_directo else None,
        "aprobado_por_nombre": current_user['full_name'] if aprueba_directo else None,
        "fecha_aprobacion": datetime.now(timezone.utc).isoformat() if aprueba_directo else None,
        "comentario_aprobacion": "Aprobación directa por coordinador/administrador" if aprueba_directo else None
    }
    
    # Si aprueba directo, aplicar el cambio inmediatamente
    if aprueba_directo:
        resultado = await aplicar_cambio_predio(cambio_doc, current_user)
        cambio_doc["resultado"] = resultado
    
    # Guardar el cambio en la colección de cambios
    await db.predios_cambios.insert_one(cambio_doc)
    
    return {
        "id": cambio_doc["id"],
        "estado": cambio_doc["estado"],
        "mensaje": "Cambio aplicado directamente" if aprueba_directo else "Cambio propuesto, pendiente de aprobación",
        "requiere_aprobacion": not aprueba_directo
    }


@api_router.get("/predios/cambios/pendientes")
async def get_cambios_pendientes(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lista todos los cambios pendientes de aprobación (solo coordinadores/admin)"""
    if current_user['role'] not in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Solo coordinadores pueden ver cambios pendientes")
    
    query = {
        "estado": {"$in": [
            PredioEstadoAprobacion.PENDIENTE_CREACION,
            PredioEstadoAprobacion.PENDIENTE_MODIFICACION,
            PredioEstadoAprobacion.PENDIENTE_ELIMINACION
        ]}
    }
    
    total = await db.predios_cambios.count_documents(query)
    cambios = await db.predios_cambios.find(query, {"_id": 0}).sort("fecha_propuesta", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enriquecer con datos del predio actual si existe
    for cambio in cambios:
        if cambio.get("predio_id"):
            predio = await db.predios.find_one({"id": cambio["predio_id"]}, {"_id": 0, "codigo_homologado": 1, "nombre_propietario": 1, "municipio": 1})
            cambio["predio_actual"] = predio
    
    return {
        "total": total,
        "cambios": cambios
    }


@api_router.get("/predios/cambios/historial")
async def get_historial_cambios(
    predio_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el historial de cambios (aprobados y rechazados)"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    query = {}
    if predio_id:
        query["predio_id"] = predio_id
    
    total = await db.predios_cambios.count_documents(query)
    cambios = await db.predios_cambios.find(query, {"_id": 0}).sort("fecha_propuesta", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "cambios": cambios
    }


@api_router.post("/predios/cambios/aprobar")
async def aprobar_rechazar_cambio(
    request: CambioAprobacionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Aprueba o rechaza un cambio pendiente (solo coordinadores/admin)"""
    if current_user['role'] not in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Solo coordinadores pueden aprobar cambios")
    
    # Buscar el cambio
    cambio = await db.predios_cambios.find_one({"id": request.cambio_id}, {"_id": 0})
    
    if not cambio:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    
    if cambio["estado"] not in [
        PredioEstadoAprobacion.PENDIENTE_CREACION,
        PredioEstadoAprobacion.PENDIENTE_MODIFICACION,
        PredioEstadoAprobacion.PENDIENTE_ELIMINACION
    ]:
        raise HTTPException(status_code=400, detail="Este cambio ya fue procesado")
    
    nuevo_estado = PredioEstadoAprobacion.APROBADO if request.aprobado else PredioEstadoAprobacion.RECHAZADO
    
    update_data = {
        "estado": nuevo_estado,
        "aprobado_por": current_user['id'],
        "aprobado_por_nombre": current_user['full_name'],
        "fecha_aprobacion": datetime.now(timezone.utc).isoformat(),
        "comentario_aprobacion": request.comentario
    }
    
    # Si se aprueba, aplicar el cambio
    if request.aprobado:
        resultado = await aplicar_cambio_predio(cambio, current_user)
        update_data["resultado"] = resultado
    
    await db.predios_cambios.update_one(
        {"id": request.cambio_id},
        {"$set": update_data}
    )
    
    return {
        "mensaje": "Cambio aprobado y aplicado" if request.aprobado else "Cambio rechazado",
        "estado": nuevo_estado
    }


async def aplicar_cambio_predio(cambio: dict, aprobador: dict) -> dict:
    """Aplica un cambio aprobado al predio"""
    tipo = cambio["tipo_cambio"]
    datos = cambio["datos_propuestos"]
    
    historial_entry = {
        "accion": f"Cambio {tipo} aprobado",
        "usuario": aprobador['full_name'],
        "usuario_rol": aprobador['role'],
        "propuesto_por": cambio.get("propuesto_por_nombre"),
        "fecha": datetime.now(timezone.utc).isoformat(),
        "comentario": cambio.get("comentario_aprobacion")
    }
    
    if tipo == "creacion":
        # Crear nuevo predio
        predio_doc = datos.copy()
        predio_doc["id"] = str(uuid.uuid4())
        predio_doc["estado_aprobacion"] = PredioEstadoAprobacion.APROBADO
        predio_doc["deleted"] = False
        predio_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        predio_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        predio_doc["historial"] = [historial_entry]
        
        await db.predios.insert_one(predio_doc)
        return {"predio_id": predio_doc["id"], "accion": "creado"}
    
    elif tipo == "modificacion":
        predio_id = cambio["predio_id"]
        
        # Actualizar predio
        datos["updated_at"] = datetime.now(timezone.utc).isoformat()
        datos["estado_aprobacion"] = PredioEstadoAprobacion.APROBADO
        
        await db.predios.update_one(
            {"id": predio_id},
            {
                "$set": datos,
                "$push": {"historial": historial_entry}
            }
        )
        return {"predio_id": predio_id, "accion": "modificado"}
    
    elif tipo == "eliminacion":
        predio_id = cambio["predio_id"]
        
        # Soft delete
        await db.predios.update_one(
            {"id": predio_id},
            {
                "$set": {
                    "deleted": True,
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_by": aprobador['id'],
                    "deleted_by_name": aprobador['full_name'],
                    "estado_aprobacion": PredioEstadoAprobacion.APROBADO
                },
                "$push": {"historial": historial_entry}
            }
        )
        return {"predio_id": predio_id, "accion": "eliminado"}
    
    return {"error": "Tipo de cambio no reconocido"}


@api_router.get("/predios/cambios/mis-propuestas")
async def get_mis_propuestas(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lista las propuestas de cambio del usuario actual"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    query = {"propuesto_por": current_user['id']}
    
    total = await db.predios_cambios.count_documents(query)
    cambios = await db.predios_cambios.find(query, {"_id": 0}).sort("fecha_propuesta", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "cambios": cambios
    }


@api_router.get("/predios/cambios/stats")
async def get_cambios_stats(current_user: dict = Depends(get_current_user)):
    """Obtiene estadísticas de cambios pendientes"""
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    pendientes_creacion = await db.predios_cambios.count_documents({"estado": PredioEstadoAprobacion.PENDIENTE_CREACION})
    pendientes_modificacion = await db.predios_cambios.count_documents({"estado": PredioEstadoAprobacion.PENDIENTE_MODIFICACION})
    pendientes_eliminacion = await db.predios_cambios.count_documents({"estado": PredioEstadoAprobacion.PENDIENTE_ELIMINACION})
    
    return {
        "pendientes_creacion": pendientes_creacion,
        "pendientes_modificacion": pendientes_modificacion,
        "pendientes_eliminacion": pendientes_eliminacion,
        "total_pendientes": pendientes_creacion + pendientes_modificacion + pendientes_eliminacion
    }


# ===== GEOGRAPHIC DATABASE (GDB) INTEGRATION =====

GDB_PATH = Path("/app/gdb_data/54003.gdb")

def get_gdb_geometry(codigo_predial: str) -> Optional[dict]:
    """Get geometry for a property from GDB file, transformed to WGS84 for web mapping"""
    import geopandas as gpd
    from shapely.geometry import mapping
    
    if not GDB_PATH.exists():
        return None
    
    # Determine if rural (R) or urban (U) based on code structure
    # Code format: 540030008000000010027000000000
    # Position 6-8 (sector): 000 = rural, 001+ = urban
    try:
        sector = codigo_predial[5:8]
        is_urban = sector != "000"
        layer = "U_TERRENO_1" if is_urban else "R_TERRENO_1"
        
        # Read the layer and filter by code
        gdf = gpd.read_file(str(GDB_PATH), layer=layer)
        match = gdf[gdf['codigo'] == codigo_predial]
        
        if len(match) == 0:
            return None
        
        # Get original area and perimeter before transformation
        area_m2 = float(match.iloc[0]['shape_Area']) if 'shape_Area' in match.columns else None
        perimetro_m = float(match.iloc[0]['shape_Length']) if 'shape_Length' in match.columns else None
        
        # Transform from EPSG:3116 (Colombia Bogotá Zone) to WGS84 (EPSG:4326) for Leaflet
        match_wgs84 = match.to_crs(epsg=4326)
        
        geom = match_wgs84.iloc[0]['geometry']
        if geom is None:
            return None
            
        geojson = mapping(geom)
        
        return {
            "type": "Feature",
            "geometry": geojson,
            "properties": {
                "codigo": codigo_predial,
                "area_m2": area_m2,
                "perimetro_m": perimetro_m,
                "tipo": "Urbano" if is_urban else "Rural"
            }
        }
    except Exception as e:
        logger.error(f"Error reading GDB geometry: {e}")
        return None


@api_router.get("/predios/{predio_id}/geometria")
async def get_predio_geometry(predio_id: str, current_user: dict = Depends(get_current_user)):
    """Get geographic geometry for a property"""
    # Only staff can access geometry
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    # Get predio from database
    predio = await db.predios.find_one({"id": predio_id}, {"_id": 0})
    if not predio:
        raise HTTPException(status_code=404, detail="Predio no encontrado")
    
    codigo = predio.get("codigo_predial_nacional")
    if not codigo:
        raise HTTPException(status_code=404, detail="Predio sin código catastral")
    
    geometry = get_gdb_geometry(codigo)
    if not geometry:
        raise HTTPException(status_code=404, detail="Geometría no disponible para este predio")
    
    return geometry


@api_router.get("/predios/codigo/{codigo_predial}/geometria")
async def get_geometry_by_code(codigo_predial: str, current_user: dict = Depends(get_current_user)):
    """Get geographic geometry directly by cadastral code"""
    # Only staff can access geometry
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    geometry = get_gdb_geometry(codigo_predial)
    if not geometry:
        raise HTTPException(status_code=404, detail="Geometría no disponible para este código")
    
    return geometry


@api_router.get("/gdb/stats")
async def get_gdb_stats(current_user: dict = Depends(get_current_user)):
    """Get statistics about available geographic data"""
    import geopandas as gpd
    
    # Only staff can access stats
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    if not GDB_PATH.exists():
        raise HTTPException(status_code=404, detail="Base de datos geográfica no disponible")
    
    try:
        # Count records in each layer
        r_terreno = gpd.read_file(str(GDB_PATH), layer='R_TERRENO_1')
        u_terreno = gpd.read_file(str(GDB_PATH), layer='U_TERRENO_1')
        
        return {
            "gdb_disponible": True,
            "predios_rurales": len(r_terreno),
            "predios_urbanos": len(u_terreno),
            "total_geometrias": len(r_terreno) + len(u_terreno),
            "capas": ["R_TERRENO_1", "U_TERRENO_1"]
        }
    except Exception as e:
        logger.error(f"Error reading GDB stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error leyendo base de datos geográfica: {str(e)}")


@api_router.get("/gdb/capas")
async def get_gdb_layers(current_user: dict = Depends(get_current_user)):
    """List all available layers in the GDB"""
    import pyogrio
    
    # Only staff can access
    if current_user['role'] == UserRole.CIUDADANO:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    if not GDB_PATH.exists():
        raise HTTPException(status_code=404, detail="Base de datos geográfica no disponible")
    
    try:
        layers = pyogrio.list_layers(str(GDB_PATH))
        return {
            "capas": [{"nombre": layer[0], "tipo_geometria": layer[1]} for layer in layers],
            "total": len(layers)
        }
    except Exception as e:
        logger.error(f"Error listing GDB layers: {e}")
        raise HTTPException(status_code=500, detail=f"Error listando capas: {str(e)}")


@api_router.post("/gdb/upload")
async def upload_gdb_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new GDB file to update the geographic database. Only authorized gestors can do this."""
    # Check if user is an authorized gestor
    user_db = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Only gestors with puede_actualizar_gdb permission or coordinador/admin can upload
    if current_user['role'] not in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        if current_user['role'] != UserRole.GESTOR or not user_db.get('puede_actualizar_gdb', False):
            raise HTTPException(
                status_code=403, 
                detail="No tiene permiso para actualizar la base gráfica. Contacte al coordinador."
            )
    
    # Validate file
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .zip que contenga el .gdb")
    
    try:
        import zipfile
        import shutil
        
        # Save uploaded file temporarily
        temp_zip = UPLOAD_DIR / f"temp_gdb_{uuid.uuid4()}.zip"
        with open(temp_zip, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Backup current GDB if exists
        if GDB_PATH.exists():
            backup_path = Path(f"/app/gdb_data/backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            shutil.move(str(GDB_PATH), str(backup_path))
            logger.info(f"GDB backup created at {backup_path}")
        
        # Extract new GDB
        gdb_data_dir = Path("/app/gdb_data")
        gdb_data_dir.mkdir(exist_ok=True)
        
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            zip_ref.extractall(gdb_data_dir)
        
        # Find the .gdb directory in extracted content
        gdb_found = None
        for item in gdb_data_dir.iterdir():
            if item.suffix == '.gdb' and item.is_dir():
                gdb_found = item
                break
        
        if not gdb_found:
            # Check nested directories
            for item in gdb_data_dir.iterdir():
                if item.is_dir():
                    for subitem in item.iterdir():
                        if subitem.suffix == '.gdb' and subitem.is_dir():
                            gdb_found = subitem
                            break
        
        if not gdb_found:
            raise HTTPException(status_code=400, detail="No se encontró un archivo .gdb válido en el zip")
        
        # Rename to standard path if needed
        if gdb_found != GDB_PATH:
            if GDB_PATH.exists():
                shutil.rmtree(str(GDB_PATH))
            shutil.move(str(gdb_found), str(GDB_PATH))
        
        # Clean up
        temp_zip.unlink()
        
        # Log the action
        await db.gdb_updates.insert_one({
            "id": str(uuid.uuid4()),
            "uploaded_by": current_user['id'],
            "uploaded_by_name": current_user['full_name'],
            "filename": file.filename,
            "fecha": datetime.now(timezone.utc).isoformat()
        })
        
        # Get new stats
        import geopandas as gpd
        r_terreno = gpd.read_file(str(GDB_PATH), layer='R_TERRENO_1')
        u_terreno = gpd.read_file(str(GDB_PATH), layer='U_TERRENO_1')
        
        return {
            "message": "Base gráfica actualizada exitosamente",
            "predios_rurales": len(r_terreno),
            "predios_urbanos": len(u_terreno),
            "total_geometrias": len(r_terreno) + len(u_terreno)
        }
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo no es un ZIP válido")
    except Exception as e:
        logger.error(f"Error uploading GDB: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")


@api_router.patch("/users/{user_id}/gdb-permission")
async def update_user_gdb_permission(
    user_id: str,
    puede_actualizar: bool,
    current_user: dict = Depends(get_current_user)
):
    """Allow coordinador to grant/revoke GDB update permission to a gestor"""
    # Only coordinador or admin can grant this permission
    if current_user['role'] not in [UserRole.COORDINADOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Solo coordinadores pueden asignar este permiso")
    
    # Find user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Only gestors can have this permission
    if user['role'] != UserRole.GESTOR:
        raise HTTPException(status_code=400, detail="Este permiso solo aplica para gestores")
    
    # Update permission
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"puede_actualizar_gdb": puede_actualizar}}
    )
    
    return {
        "message": f"Permiso {'otorgado' if puede_actualizar else 'revocado'} exitosamente",
        "user_id": user_id,
        "puede_actualizar_gdb": puede_actualizar
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

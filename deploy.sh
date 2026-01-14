#!/bin/bash

# ===========================================
# SCRIPT DE DEPLOYMENT - ASOMUNICIPIOS
# Digital Ocean Droplet (Ubuntu 22.04+)
# ===========================================

set -e

echo "🚀 Iniciando deployment de Asomunicipios..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ===== 1. ACTUALIZAR SISTEMA =====
echo -e "${YELLOW}[1/6] Actualizando sistema...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# ===== 2. INSTALAR DOCKER =====
echo -e "${YELLOW}[2/6] Instalando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Instalar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓ Docker instalado: $(docker --version)${NC}"

# ===== 3. CREAR DIRECTORIO DE APLICACIÓN =====
echo -e "${YELLOW}[3/6] Configurando directorio de aplicación...${NC}"
APP_DIR=/opt/asomunicipios
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# ===== 4. CONFIGURAR VARIABLES DE ENTORNO =====
echo -e "${YELLOW}[4/6] Configurando variables de entorno...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚠️  Archivo .env no encontrado. Creando plantilla..."
    cat > $APP_DIR/.env << 'EOF'
# ASOMUNICIPIOS - Configuración de Producción
# ⚠️ IMPORTANTE: Cambiar todos los valores antes de ejecutar

JWT_SECRET=CAMBIAR_ESTO_POR_CLAVE_SEGURA
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=catastro@asomunicipios.gov.co
SMTP_PASSWORD=TU_APP_PASSWORD
SMTP_FROM=Asomunicipios Catastro <catastro@asomunicipios.gov.co>
FRONTEND_URL=https://tu-dominio.com
REACT_APP_BACKEND_URL=https://tu-dominio.com
CORS_ORIGINS=https://tu-dominio.com
EOF
    echo -e "${YELLOW}⚠️  Edita el archivo $APP_DIR/.env antes de continuar${NC}"
    echo "   Ejecuta: nano $APP_DIR/.env"
    exit 1
fi

# ===== 5. CONSTRUIR Y EJECUTAR =====
echo -e "${YELLOW}[5/6] Construyendo contenedores Docker...${NC}"
cd $APP_DIR
docker-compose build --no-cache

echo -e "${YELLOW}[6/6] Iniciando servicios...${NC}"
docker-compose up -d

# ===== VERIFICAR =====
echo ""
echo -e "${GREEN}✅ Deployment completado!${NC}"
echo ""
echo "Servicios activos:"
docker-compose ps
echo ""
echo "Para ver logs: docker-compose logs -f"
echo "Para detener: docker-compose down"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. Configurar DNS apuntando a la IP de este servidor"
echo "2. Configurar SSL con Let's Encrypt (certbot)"
echo "3. Importar datos de MongoDB si tienes backup"

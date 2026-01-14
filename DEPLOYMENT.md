# 🚀 Guía de Deployment - Asomunicipios
## Digital Ocean con Docker

---

## 📋 Requisitos Previos

- Droplet de Digital Ocean (Ubuntu 22.04 LTS recomendado)
- Mínimo 2GB RAM, 2 vCPUs, 50GB SSD
- Dominio configurado (opcional pero recomendado)

---

## 🔧 Paso 1: Crear Droplet en Digital Ocean

1. Ve a [Digital Ocean](https://cloud.digitalocean.com)
2. Crear nuevo Droplet:
   - **Imagen:** Ubuntu 22.04 LTS
   - **Plan:** Basic, $12/mes (2GB RAM, 1 vCPU) o superior
   - **Región:** Más cercana a Colombia (NYC o SFO)
   - **Autenticación:** SSH Key (recomendado)

3. Anota la **IP pública** del droplet

---

## 📦 Paso 2: Conectar y Preparar Servidor

```bash
# Conectar por SSH
ssh root@TU_IP_DEL_DROPLET

# Crear usuario (opcional pero recomendado)
adduser asomunicipios
usermod -aG sudo asomunicipios
su - asomunicipios
```

---

## 🐳 Paso 3: Instalar Docker

```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Cerrar sesión y volver a entrar para aplicar grupo docker
exit
ssh asomunicipios@TU_IP_DEL_DROPLET

# Verificar instalación
docker --version
docker-compose --version
```

---

## 📁 Paso 4: Subir Código al Servidor

### Opción A: Desde GitHub (Recomendado)
```bash
# Crear directorio
sudo mkdir -p /opt/asomunicipios
sudo chown $USER:$USER /opt/asomunicipios
cd /opt/asomunicipios

# Clonar repositorio
git clone https://github.com/TU_USUARIO/asomunicipios.git .
```

### Opción B: Subir archivos con SCP
```bash
# Desde tu máquina local
scp -r /ruta/local/asomunicipios/* asomunicipios@TU_IP:/opt/asomunicipios/
```

---

## ⚙️ Paso 5: Configurar Variables de Entorno

```bash
cd /opt/asomunicipios

# Copiar plantilla
cp .env.example .env

# Editar configuración
nano .env
```

### Contenido del archivo `.env`:
```env
# JWT - Generar clave segura
JWT_SECRET=TU_CLAVE_SEGURA_AQUI

# SMTP Office 365
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=catastro@asomunicipios.gov.co
SMTP_PASSWORD=mxkswvbffjrddxgk
SMTP_FROM=Asomunicipios Catastro <catastro@asomunicipios.gov.co>

# URLs - Cambiar por tu dominio
FRONTEND_URL=https://catastro.asomunicipios.gov.co
REACT_APP_BACKEND_URL=https://catastro.asomunicipios.gov.co
CORS_ORIGINS=https://catastro.asomunicipios.gov.co
```

**Generar JWT_SECRET seguro:**
```bash
openssl rand -hex 32
```

---

## 🏗️ Paso 6: Construir y Ejecutar

```bash
cd /opt/asomunicipios

# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar que todo esté corriendo
docker-compose ps
```

**Resultado esperado:**
```
NAME                      STATUS
asomunicipios-mongodb     Up
asomunicipios-backend     Up
asomunicipios-frontend    Up
```

---

## 🔐 Paso 7: Configurar SSL (HTTPS)

### Instalar Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx -y
```

### Configurar Nginx como proxy
```bash
sudo nano /etc/nginx/sites-available/asomunicipios
```

```nginx
server {
    listen 80;
    server_name catastro.asomunicipios.gov.co;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/asomunicipios /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtener certificado SSL
sudo certbot --nginx -d catastro.asomunicipios.gov.co
```

---

## 📊 Paso 8: Importar Datos (MongoDB)

Si tienes un backup de la base de datos:

```bash
# Copiar backup al servidor
scp backup.gz asomunicipios@TU_IP:/opt/asomunicipios/backups/

# Restaurar en MongoDB
docker exec -i asomunicipios-mongodb mongorestore --gzip --archive < /opt/asomunicipios/backups/backup.gz
```

---

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Actualizar código y reconstruir
git pull
docker-compose build --no-cache
docker-compose up -d

# Backup de MongoDB
docker exec asomunicipios-mongodb mongodump --gzip --archive > backup_$(date +%Y%m%d).gz
```

---

## 🔥 Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## ✅ Verificación Final

1. Abrir `https://catastro.asomunicipios.gov.co` en navegador
2. Probar login con credenciales de admin
3. Verificar que los predios carguen correctamente
4. Probar envío de correo (recuperar contraseña)

---

## 📞 Soporte

Si tienes problemas durante el deployment:
1. Revisar logs: `docker-compose logs -f`
2. Verificar estado: `docker-compose ps`
3. Verificar conectividad: `curl http://localhost:8001/api/health`

---

**Documento generado para Asomunicipios**
*Sistema de Gestión Catastral*

# Asomunicipios - Sistema de Gestión Catastral

## Descripción General
Sistema web para gestión catastral de la Asociación de Municipios del Catatumbo, Provincia de Ocaña y Sur del Cesar (Asomunicipios).

## Stack Tecnológico
- **Backend:** FastAPI (Python) + MongoDB
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Mapas:** Leaflet + react-leaflet
- **PDFs:** ReportLab

## Roles de Usuario
1. `ciudadano` - Usuario básico, puede crear peticiones
2. `atencion_usuario` - Atiende peticiones iniciales
3. `gestor` - Gestiona peticiones y predios
4. `gestor_auxiliar` - Asiste a gestores
5. `coordinador` - Aprueba cambios, gestiona permisos
6. `administrador` - Control total del sistema

## Funcionalidades Implementadas

### Gestión de Peticiones
- Crear peticiones con radicado único (RASMCG-XXXX-DD-MM-YYYY)
- Subir archivos adjuntos
- Asignar a gestores
- Seguimiento de estados
- Campo de descripción

### Gestión de Predios
- Dashboard por municipio
- Filtros: zona, destino económico, vigencia, **geometría**
- Visualización de datos R1/R2
- Importación de Excel R1/R2
- Creación de nuevos predios con código de 30 dígitos
- Historial de cambios

### Sistema de Permisos Granulares (NUEVO)
- **upload_gdb**: Subir archivos GDB (Base Gráfica)
- **import_r1r2**: Importar archivos R1/R2 (Excel)
- **approve_changes**: Aprobar/Rechazar cambios de predios
- UI de gestión en `/dashboard/permisos`
- Coordinadores y administradores tienen todos los permisos por defecto

### Visor de Predios (Mapa)
- Visualización de geometrías GDB
- Vinculación automática predio-geometría
- Carga de archivos GDB/ZIP

### Autenticación
- Login/Registro
- Recuperación de contraseña por email
- JWT tokens

## Cambios Recientes (8 Enero 2025)

### Bug Fixes
1. **Filtro "sin geometría" corregido**: El query `$or` de geometría era sobrescrito por el `$or` de búsqueda. Se implementó lógica de combinación con `$and`.

### Nuevas Funcionalidades
1. **Sistema de Permisos Granulares**:
   - Endpoints: `/api/permissions/available`, `/api/permissions/users`, `/api/permissions/user`
   - UI: Nueva página `PermissionsManagement.js`
   - Menú: Icono "Shield" en sidebar para coordinadores/admin

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Rediseñar certificado catastral PDF
- [ ] Mejorar vinculación GDB (~82% actualmente)

### P2 - Media Prioridad  
- [ ] Flujo de rechazo de peticiones con observaciones editables
- [ ] Seguimiento de productividad de gestores

### P3 - Baja Prioridad
- [ ] Firmas digitales en PDFs
- [ ] Backups automáticos de base de datos
- [ ] Actos administrativos en PDF

## Credenciales de Prueba
- **Admin:** `catastro@asomunicipios.gov.co` / `Asm*123*`

## Archivos Clave
- `/app/backend/server.py` - API principal (monolítico)
- `/app/frontend/src/pages/Predios.js` - Gestión de predios
- `/app/frontend/src/pages/PermissionsManagement.js` - Gestión de permisos
- `/app/frontend/src/pages/DashboardLayout.js` - Layout con navegación

## Estadísticas de Datos
- Total predios: 174,419
- Con geometría: 143,354
- Sin geometría: 31,065

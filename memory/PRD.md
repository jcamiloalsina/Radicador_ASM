# Asomunicipios - Sistema de Gestión Catastral

## Descripción General
Sistema web para gestión catastral de la Asociación de Municipios del Catatumbo, Provincia de Ocaña y Sur del Cesar (Asomunicipios).

## Stack Tecnológico
- **Backend:** FastAPI (Python) + MongoDB
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Mapas:** Leaflet + react-leaflet
- **PDFs:** ReportLab
- **Excel:** openpyxl

## Roles de Usuario
1. `usuario` - Usuario externo (antes "ciudadano"), puede crear peticiones y dar seguimiento
2. `atencion_usuario` - Atiende peticiones iniciales
3. `gestor` - Gestiona peticiones y predios
4. `coordinador` - Aprueba cambios, gestiona permisos, ve histórico completo
5. `administrador` - Control total del sistema
6. `comunicaciones` - **Solo lectura**: puede consultar predios, ver visor, ver trámites, descargar/subir archivos para subsanación. No puede crear/editar/eliminar predios.

**Nota:** "Gestor Auxiliar" NO es un rol, sino una condición temporal cuando un gestor necesita ayuda de otro gestor para completar un trámite.

## Funcionalidades Implementadas

### Gestión de Peticiones
- Crear peticiones con radicado único consecutivo (RASMCG-XXXX-DD-MM-YYYY)
- Subir archivos adjuntos
- Asignar a gestores
- Seguimiento de estados
- Campo de descripción
- **Histórico de Trámites** (para coordinador/admin) con filtros avanzados

### Gestión de Predios
- Dashboard por municipio
- Filtros: zona, destino económico, vigencia, **geometría**
- Visualización de datos R1/R2
- Importación de Excel R1/R2
- Creación de nuevos predios con código de 30 dígitos
- Historial de cambios

### Sistema de Permisos Granulares
- **upload_gdb**: Subir archivos GDB (Base Gráfica)
- **import_r1r2**: Importar archivos R1/R2 (Excel)
- **approve_changes**: Aprobar/Rechazar cambios de predios
- UI de gestión en `/dashboard/permisos`
- Coordinadores y administradores tienen todos los permisos por defecto
- **Notificaciones automáticas** cuando se asignan/revocan permisos

### Visor de Predios (Mapa)
- Visualización de geometrías GDB
- Vinculación automática predio-geometría
- Carga de archivos GDB/ZIP

### Autenticación
- Login/Registro
- Recuperación de contraseña por email
- JWT tokens

### Reportes y Exportación
- Exportar listado de trámites a PDF
- **Exportar histórico de trámites a Excel** (coordinador/admin)
- Filtros por estado, municipio, gestor, rango de fechas

## Cambios Recientes (12 Enero 2025)

### Mejoras UX/UI
1. **Renombrado "Ciudadano" → "Usuario"** en toda la aplicación (backend y frontend)
2. **Histórico de Trámites mejorado** para coordinadores/admins:
   - Filtros avanzados: municipio, gestor asignado, rango de fechas
   - Exportación a Excel con resumen por estado y municipio
   - Tabla expandida con columnas: Solicitante, Municipio, Gestor
3. **Migración de datos** completada: 19 usuarios actualizados de 'ciudadano' a 'usuario'

### Nuevos Endpoints
- `GET /api/reports/tramites/export-excel` - Exportar histórico a Excel (solo coordinador/admin)
- `POST /api/admin/migrate-ciudadano-to-usuario` - Migración de roles (solo admin)

## Próximas Tareas (Backlog)

### P0 - Crítico (Fecha límite: Marzo 2026)
- [ ] **Generación de archivos XTF** según Resolución IGAC 0301/2025
  - Ver documento detallado: `/app/memory/XTF_LADM_COL_SINIC.md`
  - Agregar campos faltantes al modelo (condicion_predio, tipo, zona, etc.)
  - Implementar transformación de coordenadas WGS84 → EPSG:9377
  - Crear generador de archivos XTF

### P1 - Alta Prioridad
- [ ] Rediseñar certificado catastral PDF
- [ ] Mejorar vinculación GDB (~82% actualmente)
- [ ] Flujo de rechazo de peticiones con observaciones editables

### P2 - Media Prioridad  
- [ ] Seguimiento de productividad de gestores
- [ ] Panel de acciones rápidas para gestores
- [ ] Historial de cambios de permisos

### P3 - Baja Prioridad
- [ ] Firmas digitales en PDFs
- [ ] Backups automáticos de base de datos
- [ ] Actos administrativos en PDF
- [ ] Búsqueda global (radicados, predios, usuarios)
- [ ] Breadcrumbs y navegación contextual

## Credenciales de Prueba
- **Admin:** `catastro@asomunicipios.gov.co` / `Asm*123*`
- **Usuario de prueba:** `test_usuario@test.com` / `Test*123*`

## Archivos Clave
- `/app/backend/server.py` - API principal
- `/app/frontend/src/pages/AllPetitions.js` - Histórico de trámites con filtros avanzados
- `/app/frontend/src/pages/Predios.js` - Gestión de predios
- `/app/frontend/src/pages/PermissionsManagement.js` - Gestión de permisos
- `/app/frontend/src/pages/UserManagement.js` - Gestión de usuarios
- `/app/frontend/src/pages/DashboardLayout.js` - Layout con navegación

## Estadísticas de Datos
- Total predios: 174,419
- Con geometría: 143,354
- Sin geometría: 31,065
- Total usuarios: 25+

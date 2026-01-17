# Asomunicipios - Sistema de Gestión Catastral

## Descripción General
Sistema web para gestión catastral de la Asociación de Municipios del Catatumbo, Provincia de Ocaña y Sur del Cesar (Asomunicipios).

## Stack Tecnológico
- **Backend:** FastAPI (Python) + MongoDB
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Mapas:** Leaflet + react-leaflet
- **PDFs:** ReportLab
- **Excel:** openpyxl
- **PWA:** Service Worker + IndexedDB (modo offline)

## Roles de Usuario
1. `usuario` - Usuario externo (antes "ciudadano"), puede crear peticiones y dar seguimiento
2. `atencion_usuario` - Atiende peticiones iniciales
3. `gestor` - Gestiona peticiones y predios
4. `coordinador` - Aprueba cambios, gestiona permisos, ve histórico completo
5. `administrador` - Control total del sistema
6. `comunicaciones` - **Solo lectura**: puede consultar predios, ver visor, ver trámites

**Nota:** "Gestor Auxiliar" NO es un rol, sino una condición temporal.

## Funcionalidades Implementadas

### Gestión de Peticiones
- Crear peticiones con radicado único consecutivo (RASMCG-XXXX-DD-MM-YYYY)
- Subir archivos adjuntos
- Asignar a gestores
- Seguimiento de estados
- **Histórico de Trámites** con filtros avanzados y exportación Excel

### Gestión de Predios
- Dashboard por municipio
- Filtros: zona, destino económico, vigencia, geometría
- Visualización de datos R1/R2
- Importación de Excel R1/R2
- Creación de nuevos predios con código de 30 dígitos

### Sistema de Permisos Granulares
- **upload_gdb**: Subir archivos GDB
- **import_r1r2**: Importar archivos R1/R2
- **approve_changes**: Aprobar/Rechazar cambios

### Visor de Predios (Mapa)
- Visualización de geometrías GDB
- Vinculación automática predio-geometría
- Carga de archivos GDB/ZIP

### PWA - Modo Offline (NUEVO)
- ✅ Service Worker para caché de recursos
- ✅ IndexedDB para almacenamiento de predios offline
- ✅ Caché de tiles de mapa para uso sin conexión
- ✅ Indicador de estado de conexión
- ✅ Prompt de instalación como app
- ✅ Instalable en Android e iOS desde navegador

### Notificaciones por Correo
- Recuperación de contraseña
- Notificaciones de asignación de trámites
- Cambios de permisos
- **Remitente:** "Asomunicipios Catastro" (vía Gmail SMTP)

## Cambios Recientes

### Sesión 17 Enero 2026 (Parte 2)
1. **Flujo de Devolución de Peticiones IMPLEMENTADO:**
   - Nuevo estado "Devuelto" con campo `observaciones_devolucion`
   - Staff puede devolver peticiones indicando qué corregir
   - Usuario ve banner naranja con observaciones y botón "Reenviar para Revisión"
   - Al reenviar, se notifica al staff que devolvió (por email y plataforma)
   - Campo editable de observaciones aparece al seleccionar estado "Devuelto"

2. **Formateo Automático de Nombres:**
   - Nuevo endpoint `POST /api/admin/format-user-names` para migrar nombres
   - Registro de usuarios auto-formatea nombres (YACID PINO → Yacid Pino)
   - Tildes automáticas en nombres comunes (Garcia → García, Gutierrez → Gutiérrez)

3. **Mejoras en UI de Predios:**
   - Matrícula inmobiliaria ahora visible en panel "Predio Seleccionado" del visor
   - "Cambios Pendientes" muestra "Código Predial Nacional" (30 dígitos) en lugar de código interno

### Sesión 17 Enero 2026 (Parte 1)
1. **Bugs de Notificaciones CORREGIDOS:**
   - Sistema de marcar notificaciones como leídas funcionando correctamente
   - Contador de campanita se actualiza al marcar notificaciones
   - "Marcar todas como leídas" funciona correctamente
2. **Bugs de Dashboard CORREGIDOS:**
   - Contador "Devueltos" ahora muestra correctamente las peticiones
   - Filtro de peticiones por estado funciona correctamente
   - Stats del dashboard coinciden con datos reales

### Sesión 12 Enero 2025
1. **Renombrado "Ciudadano" → "Usuario"** en toda la aplicación
2. **Migración de datos:** 19 usuarios actualizados a nuevo rol
3. **Histórico de Trámites mejorado** con filtros avanzados y exportación Excel
4. **PWA implementada** para modo offline:
   - Consulta de predios sin conexión
   - Visor de mapas con tiles cacheados
   - Instalable como app en móviles
5. **Configuración de correo actualizada** con remitente "Asomunicipios Catastro"

## Próximas Tareas (Backlog)

### P0 - Crítico
- [ ] **Generación de archivos XTF** según Resolución IGAC 0301/2025
  - Ver: `/app/memory/XTF_LADM_COL_SINIC.md`

### P1 - Alta Prioridad
- [ ] Mejorar funcionalidad offline del PWA (consulta de predios, R1/R2 y visor sin conexión)
- [ ] Flujo de rechazo de peticiones con observaciones editables
- [ ] Mejorar vinculación GDB-Predios (~82% actualmente, issue recurrente)
- [ ] Configurar SMTP Office 365 (requiere desactivar Security Defaults)

### P2 - Media Prioridad
- [ ] Convertir PWA a app nativa con Capacitor (para tiendas)
- [ ] Historial de cambios de permisos
- [ ] Panel de acciones rápidas para gestores

### P3 - Baja Prioridad
- [ ] Rediseñar certificado catastral PDF
- [ ] Firmas digitales en PDFs
- [ ] Búsqueda global

## Credenciales de Prueba
- **Admin:** `catastro@asomunicipios.gov.co` / `Asm*123*`
- **Usuario:** `test_usuario@test.com` / `Test*123*`

## Archivos PWA
- `/app/frontend/public/manifest.json` - Configuración PWA
- `/app/frontend/public/sw.js` - Service Worker
- `/app/frontend/src/hooks/useOffline.js` - Hook para datos offline
- `/app/frontend/src/components/OfflineComponents.js` - UI de estado offline

## Estadísticas de Datos
- Total predios: 174,419
- Con geometría: 143,354
- Sin geometría: 31,065
- Total usuarios: 25+

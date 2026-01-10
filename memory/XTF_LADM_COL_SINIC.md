# Análisis de Generación XTF - LADM_COL SINIC V1.0

## Normatividad de Referencia
- **Resolución IGAC 0301 de 2025** - Adopción del SINIC
- **Modelo:** LADM_COL SINIC V1.0
- **Formato:** XTF (eXtensible Transaction Format - INTERLIS 2.3)

## Plazos de Entrega

### Primera Entrega (Marzo 2026)
- Fecha corte: 28 de febrero de 2026
- Contenido: Totalidad de predios activos
- Formato: Archivo XTF

### Entregas Anuales (desde 2027)
- Fecha corte: 31 de enero de cada año
- Entrega: Primeros días de febrero

### Entregas Parciales (desde Abril 2026)
- Trámites de conservación catastral
- Plazo: 5 días hábiles después de firmeza del acto administrativo
- Medio: Servicio web del IGAC

---

## Estructura del Archivo XTF

### Modelos INTERLIS Referenciados
```xml
<MODEL NAME="INTERLIS_TOPOLOGY" VERSION="2017-09-19"/>
<MODEL NAME="ISO19107_PLANAS_V3_0" VERSION="2016-03-07"/>
<MODEL NAME="LADM_COL_V3_1" VERSION="V1.2.0"/>
<MODEL NAME="Modelo_Aplicacion_LADMCOL_SINIC_V1_0"/>
```

### Clases Principales

#### 1. RIC_Predio (Predio)
```xml
<RIC_Predio TID="uuid">
  <Espacio_De_Nombres>RIC_PREDIO</Espacio_De_Nombres>
  <Local_Id>número</Local_Id>
  <Comienzo_Vida_Util_Version>fecha</Comienzo_Vida_Util_Version>
  <Nombre>NOMBRE DEL PREDIO</Nombre>
  <Tipo>Predio.Privado</Tipo>
  <Departamento>54</Departamento>
  <Municipio>109</Municipio>
  <Codigo_Homologado>BPT0001AADB</Codigo_Homologado>
  <Numero_Predial>541090000000000020004000000000</Numero_Predial>
  <Numero_Predial_Anterior>54109000000020004000</Numero_Predial_Anterior>
  <Direccion>
    <ExtDireccion>
      <Tipo_Direccion>No_Estructurada</Tipo_Direccion>
      <Es_Direccion_Principal>true</Es_Direccion_Principal>
      <Nombre_Predio>NOMBRE</Nombre_Predio>
    </ExtDireccion>
  </Direccion>
  <Condicion_Predio>NPH</Condicion_Predio>
  <Destinacion_Economica>Habitacional</Destinacion_Economica>
  <Avaluo_Catastral>636000.0</Avaluo_Catastral>
  <Zona>Rural</Zona>
  <Vigencia_Actualizacion_Catastral>2009-01-01</Vigencia_Actualizacion_Catastral>
  <Estado>Activo</Estado>
  <Catastro>Ley14</Catastro>
  <ric_gestorcatastral REF="uuid-gestor"/>
  <ric_operadorcatastral REF="uuid-operador"/>
</RIC_Predio>
```

#### 2. RIC_Terreno (Geometría)
```xml
<RIC_Terreno TID="uuid">
  <Espacio_De_Nombres>RIC_TERRENO</Espacio_De_Nombres>
  <Local_Id>número</Local_Id>
  <Dimension>Dim2D</Dimension>
  <Relacion_Superficie>En_Rasante</Relacion_Superficie>
  <Geometria>
    <GM_MultiSurface3D>
      <geometry>
        <SURFACE>
          <BOUNDARY>
            <POLYLINE>
              <COORD><C1>5004898.205</C1><C2>2443536.634</C2><C3>0.000</C3></COORD>
              <!-- Coordenadas en EPSG:9377 (MAGNA-SIRGAS/Origen Nacional) -->
            </POLYLINE>
          </BOUNDARY>
        </SURFACE>
      </geometry>
    </GM_MultiSurface3D>
  </Geometria>
  <Area_Terreno>1734.0</Area_Terreno>
  <Area_Digital_Gestor>2873.6</Area_Digital_Gestor>
</RIC_Terreno>
```

#### 3. RIC_Interesado (Propietario)
```xml
<RIC_Interesado TID="uuid">
  <Espacio_De_Nombres>RIC_INTERESADO</Espacio_De_Nombres>
  <Local_Id>número</Local_Id>
  <Nombre>APELLIDO1 APELLIDO2 NOMBRE</Nombre>
  <Tipo>Persona_Natural</Tipo>
  <Tipo_Documento>Cedula_Ciudadania</Tipo_Documento>
  <Documento_Identidad>000012217333</Documento_Identidad>
  <Primer_Nombre>NOMBRE</Primer_Nombre>
  <Primer_Apellido>APELLIDO1</Primer_Apellido>
  <Segundo_Apellido>APELLIDO2</Segundo_Apellido>
</RIC_Interesado>
```

#### 4. RIC_AgrupacionInteresados (Grupo de Propietarios)
```xml
<RIC_AgrupacionInteresados TID="uuid">
  <Espacio_De_Nombres>RIC_AGRUPACIONINTERESADOS</Espacio_De_Nombres>
  <Local_Id>número</Local_Id>
  <Tipo>Grupo_Civil</Tipo>
</RIC_AgrupacionInteresados>
```

---

## Análisis de Datos Actuales vs Requerimientos XTF

### Datos COMPLETOS (Ya existen en el sistema)

| Campo XTF | Campo Actual | Notas |
|-----------|--------------|-------|
| `Numero_Predial` | `codigo_predial_nacional` | 30 dígitos ✅ |
| `Codigo_Homologado` | `codigo_homologado` | ✅ |
| `Departamento` | `departamento` | ✅ |
| `Municipio` | `municipio` | Convertir a código DIVIPOLA |
| `Direccion` / `Nombre_Predio` | `direccion` | ✅ |
| `Avaluo_Catastral` | `avaluo` | ✅ |
| `Destinacion_Economica` | `destino_economico` | Homologar códigos |
| `Area_Terreno` | `area_terreno` | ✅ |
| `Area_Construida` | `area_construida` | ✅ |
| `Vigencia` | `vigencia` | ✅ |
| Geometría | `gdb_geometrias.geometry` | Transformar coordenadas |
| Propietarios | `propietarios[]` | Reestructurar nombres |
| Zonas físicas | `r2_registros.zonas[]` | ✅ |
| `Matricula_Inmobiliaria` | `r2_registros.matricula_inmobiliaria` | ✅ |

### Datos FALTANTES (Agregar al modelo)

| Campo XTF | Tipo | Valores Ejemplo |
|-----------|------|-----------------|
| `Condicion_Predio` | Enum | NPH, PH, Condominio, Mejora, Parque_Cementerio, Via, Bien_Uso_Publico |
| `Tipo` | Enum | Predio.Privado, Predio.Publico, Predio.Baldio |
| `Zona` | Enum | Rural, Urbano |
| `Estado` | Enum | Activo, Inactivo |
| `Catastro` | Enum | Ley14, Catastro_Multiproposito |
| `Numero_Predial_Anterior` | String | Código de 20 dígitos anterior |

### Transformaciones Requeridas

#### 1. Coordenadas (CRÍTICO)
- **Origen:** WGS84 (EPSG:4326) - Lon/Lat
- **Destino:** MAGNA-SIRGAS/Origen Nacional (EPSG:9377) - Metros planos
- **Herramienta:** pyproj o GDAL

#### 2. Nombres de Propietarios
- **Origen:** `nombre_propietario: "PEREZ GALLARDO ORFA MARIA"`
- **Destino:**
  - `Primer_Nombre: "ORFA"`
  - `Segundo_Nombre: "MARIA"` (opcional)
  - `Primer_Apellido: "PEREZ"`
  - `Segundo_Apellido: "GALLARDO"`

#### 3. Destino Económico
| Código Actual | Valor XTF |
|---------------|-----------|
| A | Agropecuario |
| D | Habitacional |
| C | Comercial |
| I | Industrial |
| ... | ... |

---

## Plan de Implementación

### Fase 1: Preparación de Datos
1. [ ] Agregar campos faltantes al modelo de predios
2. [ ] Crear función de parseo de nombres de propietarios
3. [ ] Crear tabla de homologación de destinos económicos
4. [ ] Crear tabla de códigos DIVIPOLA por municipio

### Fase 2: Transformación de Coordenadas
1. [ ] Instalar pyproj para transformación de coordenadas
2. [ ] Crear función de transformación WGS84 → EPSG:9377
3. [ ] Validar tolerancias topológicas (máx 0.002m)

### Fase 3: Generador XTF
1. [ ] Crear endpoint `/api/xtf/generar/{municipio}`
2. [ ] Implementar generación de cada clase (Predio, Terreno, Interesado, etc.)
3. [ ] Implementar relaciones entre clases
4. [ ] Generar archivo XTF completo

### Fase 4: Validación
1. [ ] Integrar herramienta de pre-validación del IGAC
2. [ ] Validar estructura (nivel básico)
3. [ ] Validar identificación (nivel general)
4. [ ] Validar caracterización
5. [ ] Validar temático/complementario

---

## Documentos de Referencia

1. **Resolución IGAC 0301/2025** - Normativa principal
2. **Anexo 2** - Instructivo para estructuración LADM_COL SINIC V1.0
3. **Anexo 3** - Documento de Homologación
4. **Modelo Aplicación** - Modelo_Aplicacion_LADMCOL_SINIC_V1_0.pdf
5. **Ejemplo XTF** - 54109_RIC_MAYO_20250506.xtf (11MB)

---

## Archivos de Ejemplo Guardados
- `/tmp/ejemplo_xtf.xtf` - Archivo XTF de ejemplo (municipio 54109)

---

## Estado Actual
- **Completitud de datos:** ~70-75%
- **Fecha análisis:** Enero 2025
- **Próximo paso:** Agregar campos faltantes al modelo de predios

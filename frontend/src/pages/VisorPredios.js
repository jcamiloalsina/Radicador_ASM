import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Map, Search, MapPin, Building, User, DollarSign, 
  Layers, ZoomIn, ZoomOut, Home, FileText, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Fix for Leaflet default marker icon
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to fit bounds when geometry changes
function FitBounds({ geometry }) {
  const map = useMap();
  
  useEffect(() => {
    if (geometry && geometry.geometry) {
      try {
        const geoJSON = L.geoJSON(geometry);
        const bounds = geoJSON.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  }, [geometry, map]);
  
  return null;
}

// Component to render municipality limits with zoom on click
function MunicipalityLimits({ limitesMunicipios, filterMunicipio, setFilterMunicipio, tipoLimites }) {
  const map = useMap();
  
  if (!limitesMunicipios || !limitesMunicipios.features) return null;
  
  return (
    <>
      {limitesMunicipios.features.map((feature, idx) => {
        const isSelected = filterMunicipio === feature.properties?.municipio;
        const sinGdb = feature.properties?.sin_gdb;
        
        return (
          <GeoJSON
            key={`limite-${feature.properties?.municipio}-${idx}-${tipoLimites}`}
            data={feature}
            style={() => ({
              color: isSelected ? '#10B981' : '#FFFFFF',
              weight: isSelected ? 4 : 2,
              opacity: 1,
              // Siempre tener un fill para poder hacer click
              fillColor: sinGdb ? '#6366F1' : (isSelected ? '#10B981' : '#FFFFFF'),
              fillOpacity: sinGdb ? 0.25 : (isSelected ? 0.15 : 0.05)
            })}
            onEachFeature={(feat, layer) => {
              const props = feat.properties;
              
              // Registrar evento click directamente en Leaflet
              layer.on('click', (e) => {
                if (!props?.sin_gdb) {
                  setFilterMunicipio(props?.municipio);
                  // Hacer zoom al municipio
                  const bounds = layer.getBounds();
                  if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                  }
                }
              });
              
              layer.bindTooltip(props?.municipio || '', {
                permanent: true,
                direction: 'center',
                className: 'municipio-label'
              });
              const sinGdbMsg = props?.sin_gdb ? '<p class="text-xs text-amber-600 mt-1">⚠️ Sin base gráfica GDB</p>' : '';
              layer.bindPopup(`
                <div class="text-sm p-1">
                  <p class="font-bold text-base text-emerald-700 mb-1">${props?.municipio || 'Sin nombre'}</p>
                  <p class="text-xs text-slate-600">Total predios: <strong>${props?.total_predios?.toLocaleString() || 0}</strong></p>
                  <p class="text-xs text-slate-600">Rurales: <strong>${props?.rurales?.toLocaleString() || 0}</strong></p>
                  <p class="text-xs text-slate-600">Urbanos: <strong>${props?.urbanos?.toLocaleString() || 0}</strong></p>
                  ${sinGdbMsg}
                </div>
              `);
            }}
          />
        );
      })}
    </>
  );
}

export default function VisorPredios() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [selectedPredio, setSelectedPredio] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [gdbStats, setGdbStats] = useState(null);
  const [mapType, setMapType] = useState('satellite'); // satélite por defecto
  const [showUploadGdb, setShowUploadGdb] = useState(false);
  const [uploadingGdb, setUploadingGdb] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // Estado del progreso de carga
  const [filterMunicipio, setFilterMunicipio] = useState('');
  const [filterZona, setFilterZona] = useState('todos');
  const [allGeometries, setAllGeometries] = useState(null);
  const [limitesMunicipios, setLimitesMunicipios] = useState(null); // Límites de municipios
  const [mostrarPredios, setMostrarPredios] = useState(false); // Controlar si mostrar predios individuales
  const [loadingGeometries, setLoadingGeometries] = useState(false);
  const [tipoLimites, setTipoLimites] = useState('gdb'); // 'gdb' para ver errores, 'oficial' para límites limpios
  const [gdbCargadaEsteMes, setGdbCargadaEsteMes] = useState(null); // null = no verificado, true/false
  const [mostrarPreguntaGdb, setMostrarPreguntaGdb] = useState(false);
  const mapRef = useRef(null);

  // Default center: Norte de Santander, Colombia
  const defaultCenter = [8.0, -73.0];
  const defaultZoom = 9;

  useEffect(() => {
    fetchGdbStats();
    fetchLimitesMunicipios(tipoLimites);
  }, []);

  // Recargar límites cuando cambie el tipo
  useEffect(() => {
    fetchLimitesMunicipios(tipoLimites);
  }, [tipoLimites]);

  // Cargar geometrías cuando cambian los filtros Y el usuario quiere ver predios
  useEffect(() => {
    if (filterMunicipio && mostrarPredios) {
      setAllGeometries(null);
      fetchAllGeometries();
    } else if (!mostrarPredios) {
      setAllGeometries(null);
    }
  }, [filterMunicipio, filterZona, mostrarPredios]);

  const fetchLimitesMunicipios = async (fuente = 'gdb') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gdb/limites-municipios?fuente=${fuente}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLimitesMunicipios(response.data);
    } catch (error) {
      console.error('Error loading municipality limits:', error);
    }
  };

  const fetchAllGeometries = async () => {
    setLoadingGeometries(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('municipio', filterMunicipio);
      if (filterZona && filterZona !== 'todos') params.append('zona', filterZona);
      params.append('limit', '10000'); // Aumentar límite para ver todas las geometrías
      
      const response = await axios.get(`${API}/gdb/geometrias?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllGeometries(response.data);
      const zonaText = filterZona === 'todos' ? 'todas las zonas' : filterZona;
      toast.success(`${response.data.total} geometrías (${zonaText}) cargadas`);
    } catch (error) {
      console.error('Error loading geometries:', error);
      toast.error(error.response?.data?.detail || 'Error al cargar geometrías');
      setAllGeometries(null);
    } finally {
      setLoadingGeometries(false);
    }
  };

  const fetchGdbStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gdb/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGdbStats(response.data);
    } catch (error) {
      console.error('Error loading GDB stats:', error);
    }
  };

  const searchPredio = async () => {
    if (!searchCode.trim()) {
      toast.error('Ingrese un código predial para buscar');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // First search in database
      const predioResponse = await axios.get(`${API}/predios?search=${searchCode}&limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (predioResponse.data.predios.length === 0) {
        toast.error('Predio no encontrado en la base de datos');
        setLoading(false);
        return;
      }
      
      const predio = predioResponse.data.predios[0];
      setSelectedPredio(predio);
      
      // Get geometry
      const geoResponse = await axios.get(`${API}/predios/codigo/${predio.codigo_predial_nacional}/geometria`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGeometry(geoResponse.data);
      toast.success('Predio encontrado');
    } catch (error) {
      if (error.response?.status === 404) {
        toast.warning('Predio encontrado pero sin geometría disponible');
      } else {
        toast.error('Error al buscar el predio');
      }
      setGeometry(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const formatArea = (area) => {
    if (!area) return '0 m²';
    if (area >= 10000) {
      const ha = Math.floor(area / 10000);
      const m2 = Math.floor(area % 10000);
      return `${ha} ha ${m2} m²`;
    }
    return `${area} m²`;
  };

  // Estilo de polígonos - Cyan/Blanco para visibilidad en satélite
  const geoJSONStyle = {
    color: '#00FFFF', // Cyan brillante para el borde
    weight: 3,
    opacity: 1,
    fillColor: '#FFFFFF', // Blanco para el relleno
    fillOpacity: 0.25
  };

  const tileLayers = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri'
    },
    topographic: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, HERE, Garmin'
    },
    terrain: {
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
      attribution: 'Map tiles by Stamen Design'
    }
  };

  // Función para subir nueva base GDB (ZIP o carpeta)
  const handleUploadGdb = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingGdb(true);
    setUploadProgress({ status: 'iniciando', progress: 0, message: 'Preparando archivos...' });
    
    const formData = new FormData();
    
    // Si es un solo archivo ZIP
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      formData.append('files', files[0]);
    } else {
      // Si son múltiples archivos (carpeta .gdb)
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Iniciar subida
      setUploadProgress({ status: 'subiendo', progress: 5, message: 'Subiendo archivos al servidor...' });
      
      const response = await axios.post(`${API}/gdb/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 10) / progressEvent.total);
          setUploadProgress({ 
            status: 'subiendo', 
            progress: percentCompleted, 
            message: `Subiendo archivos: ${Math.round(progressEvent.loaded / 1024)}KB` 
          });
        }
      });
      
      // Si hay upload_id, consultar progreso periódicamente
      if (response.data.upload_id) {
        let checkCount = 0;
        const maxChecks = 120; // 2 minutos máximo
        
        const checkProgress = async () => {
          if (checkCount >= maxChecks) {
            setUploadProgress(null);
            return;
          }
          
          try {
            const progressRes = await axios.get(`${API}/gdb/upload-progress/${response.data.upload_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setUploadProgress(progressRes.data);
            
            if (progressRes.data.status !== 'completado' && progressRes.data.status !== 'error') {
              checkCount++;
              setTimeout(checkProgress, 1000);
            } else if (progressRes.data.status === 'completado') {
              toast.success(`¡Completado! ${response.data.predios_relacionados} predios relacionados de ${response.data.total_geometrias_gdb} geometrías GDB`);
              fetchGdbStats();
              setShowUploadGdb(false);
              setTimeout(() => setUploadProgress(null), 3000);
            }
          } catch (err) {
            console.error('Error checking progress:', err);
          }
        };
        
        // Comenzar a verificar progreso después de 1 segundo
        setTimeout(checkProgress, 1000);
      } else {
        // Sin upload_id, mostrar resultado directo
        toast.success(`Base gráfica de ${response.data.municipio || 'municipio'} actualizada. ${response.data.total_geometrias_gdb || response.data.total_geometrias} geometrías, ${response.data.predios_relacionados} predios relacionados.`);
        fetchGdbStats();
        setShowUploadGdb(false);
        setUploadProgress(null);
      }
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir la base gráfica');
      setUploadProgress({ status: 'error', progress: 0, message: error.response?.data?.detail || 'Error al procesar' });
      setTimeout(() => setUploadProgress(null), 5000);
    } finally {
      setUploadingGdb(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-8 h-8 text-emerald-700" />
          <div>
            <h1 className="text-2xl font-bold font-outfit text-slate-800">
              Visor de Predios
            </h1>
            <p className="text-sm text-slate-500">
              Visualización geográfica de predios catastrales
            </p>
          </div>
        </div>
        
        {gdbStats && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="bg-emerald-50">
              <Layers className="w-3 h-3 mr-1" />
              {gdbStats.total_geometrias?.toLocaleString()} geometrías
            </Badge>
            <Badge variant="secondary">
              Rural: {gdbStats.predios_rurales?.toLocaleString()}
            </Badge>
            <Badge variant="secondary">
              Urbano: {gdbStats.predios_urbanos?.toLocaleString()}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Panel Izquierdo - Búsqueda y Detalle con scroll */}
        <div className="col-span-4 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
          {/* Filtros de Municipio y Zona */}
          <Card className="border-emerald-200">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" /> Filtrar Geometrías
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Municipio</label>
                <Select 
                  value={filterMunicipio || "none"} 
                  onValueChange={(v) => {
                    const newValue = v === "none" ? "" : v;
                    setFilterMunicipio(newValue);
                    // Si se limpia el filtro, también ocultar predios
                    if (!newValue) {
                      setMostrarPredios(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin filtro</SelectItem>
                    {gdbStats?.municipios && Object.keys(gdbStats.municipios).sort((a, b) => a.localeCompare(b, 'es')).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Zona</label>
                <Select value={filterZona} onValueChange={setFilterZona} disabled={!filterMunicipio || !mostrarPredios}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las zonas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las zonas</SelectItem>
                    <SelectItem value="urbano">Solo Urbano ({gdbStats?.municipios?.[filterMunicipio]?.urbanos || 0})</SelectItem>
                    <SelectItem value="rural">Solo Rural ({gdbStats?.municipios?.[filterMunicipio]?.rurales || 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Botón para mostrar/ocultar predios */}
              {filterMunicipio && (
                <Button
                  variant={mostrarPredios ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMostrarPredios(!mostrarPredios)}
                  className={mostrarPredios ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500 text-emerald-700"}
                  disabled={loadingGeometries}
                >
                  {loadingGeometries ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cargando...
                    </>
                  ) : mostrarPredios ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Ocultar Predios
                    </>
                  ) : (
                    <>
                      <Map className="w-4 h-4 mr-2" />
                      Ver Predios
                    </>
                  )}
                </Button>
              )}
              {allGeometries && mostrarPredios && (
                <Badge className="bg-emerald-100 text-emerald-800">
                  {allGeometries.total} predios visibles
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Búsqueda */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4" /> Buscar Predio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Código predial o matrícula..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchPredio()}
                />
                <Button 
                  onClick={searchPredio} 
                  disabled={loading}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              <Select value={mapType} onValueChange={setMapType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de mapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topographic">Topográfico</SelectItem>
                  <SelectItem value="satellite">Satélite</SelectItem>
                  <SelectItem value="street">Mapa de Calles</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Selector de tipo de límites - Usando botones */}
              <div className="flex gap-1">
                <Button
                  variant={tipoLimites === 'gdb' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs flex-1"
                  onClick={() => setTipoLimites('gdb')}
                >
                  GDB-ASM
                </Button>
                <Button
                  variant={tipoLimites === 'oficial' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs flex-1"
                  onClick={() => setTipoLimites('oficial')}
                >
                  Oficiales
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Base Gráfica - Solo administradores, coordinadores y gestores autorizados */}
          {(user?.role === 'administrador' || user?.role === 'coordinador' || (user?.role === 'gestor' && user?.puede_actualizar_gdb)) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-3">
                {/* Pregunta si ya se cargó la GDB este mes */}
                {gdbCargadaEsteMes === null && !mostrarPreguntaGdb && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-amber-800">¿Ya se actualizó la Base Gráfica este mes?</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-emerald-500 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => setGdbCargadaEsteMes(true)}
                      >
                        ✓ Sí, ya está actualizada
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-100"
                        onClick={() => {
                          setGdbCargadaEsteMes(false);
                          setMostrarPreguntaGdb(true);
                        }}
                      >
                        ✗ No, necesito cargarla
                      </Button>
                    </div>
                  </div>
                )}

                {/* Si ya fue cargada, mostrar confirmación */}
                {gdbCargadaEsteMes === true && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">✓</span>
                      <p className="text-sm text-emerald-700">Base Gráfica actualizada este mes</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs text-slate-500"
                      onClick={() => {
                        setGdbCargadaEsteMes(null);
                        setMostrarPreguntaGdb(false);
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>
                )}

                {/* Si no fue cargada, mostrar opciones de carga */}
                {(gdbCargadaEsteMes === false || mostrarPreguntaGdb) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Actualizar Base Gráfica</p>
                        <p className="text-xs text-amber-600">Subir archivo .gdb.zip actualizado</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-xs text-slate-500"
                        onClick={() => {
                          setGdbCargadaEsteMes(null);
                          setMostrarPreguntaGdb(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <label className="cursor-pointer flex-1">
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleUploadGdb}
                          className="hidden"
                          disabled={uploadingGdb}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-amber-500 text-amber-700 hover:bg-amber-100"
                          disabled={uploadingGdb}
                          asChild
                        >
                          <span>
                            {uploadingGdb ? 'Procesando...' : 'Subir ZIP'}
                          </span>
                        </Button>
                      </label>
                      <label className="cursor-pointer flex-1">
                        <input
                          type="file"
                          webkitdirectory=""
                          directory=""
                          multiple
                          onChange={handleUploadGdb}
                          className="hidden"
                          disabled={uploadingGdb}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-100"
                          disabled={uploadingGdb}
                          asChild
                        >
                          <span>
                            {uploadingGdb ? 'Procesando...' : 'Subir Carpeta GDB'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Indicador de Progreso */}
                {uploadProgress && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${uploadProgress.status === 'error' ? 'text-red-700' : uploadProgress.status === 'completado' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {uploadProgress.message}
                      </span>
                      <span className="text-slate-600 font-bold">{uploadProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          uploadProgress.status === 'error' ? 'bg-red-500' : 
                          uploadProgress.status === 'completado' ? 'bg-emerald-500' : 
                          'bg-amber-500'
                        }`}
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {uploadProgress.status === 'subiendo' && <span>📤 Subiendo archivos...</span>}
                      {uploadProgress.status === 'extrayendo' && <span>📦 Extrayendo ZIP...</span>}
                      {uploadProgress.status === 'leyendo_rural' && <span>🌾 Leyendo capa rural...</span>}
                      {uploadProgress.status === 'leyendo_urbano' && <span>🏘️ Leyendo capa urbana...</span>}
                      {uploadProgress.status === 'guardando_geometrias' && <span>💾 Guardando geometrías...</span>}
                      {uploadProgress.status === 'relacionando' && <span>🔗 Relacionando con predios...</span>}
                      {uploadProgress.status === 'matching_avanzado' && <span>🔍 Búsqueda avanzada de coincidencias...</span>}
                      {uploadProgress.status === 'completado' && <span>✅ ¡Proceso completado!</span>}
                      {uploadProgress.status === 'error' && <span>❌ Error en el proceso</span>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detalle del Predio */}
          {selectedPredio && (
            <Card>
              <CardHeader className="py-3 bg-emerald-50">
                <CardTitle className="text-sm flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span className="text-emerald-800">Código Predial Nacional</span>
                  </div>
                  <p className="font-mono text-xs text-emerald-700 pl-6">
                    {selectedPredio.codigo_predial_nacional}
                  </p>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-slate-500">Código Homologado</p>
                  <p className="font-medium text-slate-700">
                    {selectedPredio.codigo_homologado}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Municipio</p>
                    <p className="font-medium">{selectedPredio.municipio}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Zona</p>
                    <p className="font-medium">
                      {selectedPredio.zona === '00' ? 'Rural' : 'Urbano'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">Propietario</span>
                  </div>
                  {selectedPredio.propietarios?.length > 0 ? (
                    <div className="space-y-1">
                      {selectedPredio.propietarios.map((p, idx) => (
                        <p key={idx} className="text-sm font-medium">{p.nombre_propietario}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{selectedPredio.nombre_propietario}</p>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Building className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">Características</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Área Terreno</p>
                      <p className="font-medium">{formatArea(selectedPredio.area_terreno)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Área Construida</p>
                      <p className="font-medium">{formatArea(selectedPredio.area_construida)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">Avalúo Catastral</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(selectedPredio.avaluo)}
                  </p>
                </div>

                {geometry && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Map className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-500">Geometría</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Área GDB</p>
                        <p className="font-medium">{formatArea(geometry.properties?.area_m2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Perímetro</p>
                        <p className="font-medium">{geometry.properties?.perimetro_m?.toFixed(2)} m</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón Certificado */}
                {['coordinador', 'administrador', 'atencion_usuario'].includes(user?.role) && (
                  <Button
                    className="w-full bg-emerald-700 hover:bg-emerald-800"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API}/predios/${selectedPredio.id}/certificado`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) throw new Error('Error');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Certificado_${selectedPredio.codigo_predial_nacional}.pdf`;
                        a.click();
                        toast.success('Certificado generado');
                      } catch (e) {
                        toast.error('Error al generar certificado');
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Certificado
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedPredio && (
            <Card className="bg-slate-50">
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  Busque un predio por código para ver su ubicación en el mapa
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel Derecho - Mapa */}
        <div className="col-span-8">
          <Card className="overflow-hidden">
            <div className="h-[calc(100vh-220px)] min-h-[500px]">
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  url={tileLayers[mapType].url}
                  attribution={tileLayers[mapType].attribution}
                />
                
                {/* Mostrar límites de municipios usando componente con acceso al mapa */}
                <MunicipalityLimits 
                  key={`limits-${tipoLimites}-${limitesMunicipios?.total_municipios || 0}`}
                  limitesMunicipios={limitesMunicipios}
                  filterMunicipio={filterMunicipio}
                  setFilterMunicipio={setFilterMunicipio}
                  tipoLimites={tipoLimites}
                />
                
                {/* Mostrar predios individuales solo si está activado y se seleccionó un municipio */}
                {mostrarPredios && allGeometries && allGeometries.features && allGeometries.features.length > 0 && (
                  <GeoJSON
                    key={`predios-${filterMunicipio}-${filterZona}-${allGeometries.total}-${Date.now()}`}
                    data={allGeometries}
                    style={(feature) => ({
                      color: feature.properties?.tipo === 'Urbano' ? '#DC2626' : '#2563EB',
                      weight: feature.properties?.tipo === 'Urbano' ? 2 : 1,
                      opacity: 1,
                      fillColor: feature.properties?.tipo === 'Urbano' ? '#FCA5A5' : '#93C5FD',
                      fillOpacity: feature.properties?.tipo === 'Urbano' ? 0.5 : 0.3
                    })}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(`
                        <div class="text-sm">
                          <p class="font-bold text-xs">${feature.properties?.codigo || 'Sin código'}</p>
                          <p class="text-xs">${feature.properties?.tipo || ''}</p>
                        </div>
                      `);
                    }}
                  />
                )}
                
                {/* Geometría del predio seleccionado (resaltado) */}
                {geometry && (
                  <>
                    <GeoJSON 
                      key={JSON.stringify(geometry)}
                      data={geometry} 
                      style={{
                        color: '#FFFF00', // Amarillo para destacar
                        weight: 4,
                        opacity: 1,
                        fillColor: '#FFFF00',
                        fillOpacity: 0.4
                      }}
                    >
                      <Popup>
                        <div className="text-sm min-w-[200px]">
                          <p className="font-bold text-emerald-700 mb-1 text-xs">
                            Código Predial Nacional
                          </p>
                          <p className="font-mono text-xs bg-slate-100 p-1 rounded mb-2">
                            {selectedPredio?.codigo_predial_nacional}
                          </p>
                          <p className="text-xs text-slate-500">Código Homologado:</p>
                          <p className="text-xs font-medium mb-2">
                            {selectedPredio?.codigo_homologado}
                          </p>
                          <p className="text-xs text-slate-600">
                            {selectedPredio?.municipio} - {selectedPredio?.zona === '00' ? 'Rural' : 'Urbano'}
                          </p>
                          <p className="text-xs mt-1">
                            Área: {formatArea(geometry.properties?.area_m2)}
                          </p>
                        </div>
                      </Popup>
                    </GeoJSON>
                    <FitBounds geometry={geometry} />
                  </>
                )}
              </MapContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

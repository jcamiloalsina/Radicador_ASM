import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, Search, Edit, Trash2, MapPin, FileText, Building, 
  User, DollarSign, LayoutGrid, Eye, History, Download, AlertTriangle, Users,
  Clock, CheckCircle, XCircle, Bell, Map
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PredioMap from '../components/PredioMap';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Predios() {
  const { user } = useAuth();
  const [predios, setPredios] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterMunicipio, setFilterMunicipio] = useState('');
  const [filterVigencia, setFilterVigencia] = useState('');
  const [vigenciasData, setVigenciasData] = useState({});
  const [showDashboard, setShowDashboard] = useState(true);
  const [prediosStats, setPrediosStats] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [showPendientesDialog, setShowPendientesDialog] = useState(false);
  const [selectedPredio, setSelectedPredio] = useState(null);
  const [prediosEliminados, setPrediosEliminados] = useState([]);
  const [cambiosPendientes, setCambiosPendientes] = useState([]);
  const [cambiosStats, setCambiosStats] = useState(null);
  const [terrenoInfo, setTerrenoInfo] = useState(null);
  const [formData, setFormData] = useState({
    municipio: '',
    zona: '00',
    sector: '01',
    manzana_vereda: '0000',
    condicion_predio: '0000',
    predio_horizontal: '0000',
    nombre_propietario: '',
    tipo_documento: 'C',
    numero_documento: '',
    estado_civil: '',
    direccion: '',
    comuna: '0',
    destino_economico: 'A',
    area_terreno: '',
    area_construida: '0',
    avaluo: '',
    tipo_mutacion: '',
    numero_resolucion: '',
    fecha_resolucion: '',
    // R2
    matricula_inmobiliaria: '',
    zona_fisica_1: '0',
    zona_economica_1: '0',
    area_terreno_1: '0',
    habitaciones_1: '0',
    banos_1: '0',
    locales_1: '0',
    pisos_1: '1',
    puntaje_1: '0',
    area_construida_1: '0'
  });

  useEffect(() => {
    fetchCatalogos();
    fetchVigencias();
    fetchPrediosStats();
    fetchCambiosStats();
  }, []);

  useEffect(() => {
    if (filterMunicipio && filterVigencia) {
      fetchPredios();
      setShowDashboard(false);
    }
  }, [filterMunicipio, filterVigencia]);

  // Obtener info del terreno cuando cambia la ubicación
  useEffect(() => {
    if (formData.municipio && showCreateDialog) {
      fetchTerrenoInfo();
    }
  }, [formData.municipio, formData.zona, formData.sector, formData.manzana_vereda, showCreateDialog]);

  const fetchCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/catalogos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogos(res.data);
    } catch (error) {
      toast.error('Error al cargar catálogos');
    }
  };

  const fetchVigencias = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/vigencias`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVigenciasData(res.data);
    } catch (error) {
      console.log('Vigencias no disponibles');
    }
  };

  const fetchPrediosStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrediosStats(res.data);
    } catch (error) {
      console.log('Stats no disponibles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredios = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterMunicipio !== 'todos') params.append('municipio', filterMunicipio);
      if (filterDestino !== 'todos') params.append('destino_economico', filterDestino);
      if (search) params.append('search', search);
      
      const res = await axios.get(`${API}/predios?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredios(res.data.predios);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Error al cargar predios');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerrenoInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API}/predios/terreno-info/${encodeURIComponent(formData.municipio)}?zona=${formData.zona}&sector=${formData.sector}&manzana_vereda=${formData.manzana_vereda}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTerrenoInfo(res.data);
    } catch (error) {
      setTerrenoInfo(null);
    }
  };

  const fetchPrediosEliminados = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/eliminados`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrediosEliminados(res.data.predios);
      setShowDeletedDialog(true);
    } catch (error) {
      toast.error('Error al cargar predios eliminados');
    }
  };

  const fetchCambiosStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/cambios/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCambiosStats(res.data);
    } catch (error) {
      console.log('Stats no disponibles');
    }
  };

  const fetchCambiosPendientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/predios/cambios/pendientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCambiosPendientes(res.data.cambios);
      setShowPendientesDialog(true);
    } catch (error) {
      toast.error('Error al cargar cambios pendientes');
    }
  };

  const handleAprobarRechazar = async (cambioId, aprobado, comentario = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/predios/cambios/aprobar`, {
        cambio_id: cambioId,
        aprobado,
        comentario
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(aprobado ? 'Cambio aprobado exitosamente' : 'Cambio rechazado');
      fetchCambiosPendientes();
      fetchCambiosStats();
      fetchPredios();
    } catch (error) {
      toast.error('Error al procesar el cambio');
    }
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const municipio = filterMunicipio !== 'todos' ? `?municipio=${encodeURIComponent(filterMunicipio)}` : '';
      
      const response = await axios.get(`${API}/predios/export-excel${municipio}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Predios_${filterMunicipio !== 'todos' ? filterMunicipio : 'Todos'}_${fecha}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar Excel');
    }
  };

  const handleSearch = () => {
    fetchPredios();
  };

  // Verificar si el usuario necesita aprobación
  const necesitaAprobacion = user && ['gestor', 'gestor_auxiliar', 'atencion_usuario'].includes(user.role);

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const predioData = {
        municipio: formData.municipio,
        zona: formData.zona,
        sector: formData.sector,
        manzana_vereda: formData.manzana_vereda,
        condicion_predio: formData.condicion_predio,
        predio_horizontal: formData.predio_horizontal,
        nombre_propietario: formData.nombre_propietario,
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento,
        estado_civil: formData.estado_civil || null,
        direccion: formData.direccion,
        comuna: formData.comuna,
        destino_economico: formData.destino_economico,
        area_terreno: parseFloat(formData.area_terreno) || 0,
        area_construida: parseFloat(formData.area_construida) || 0,
        avaluo: parseFloat(formData.avaluo) || 0,
        tipo_mutacion: formData.tipo_mutacion || null,
        numero_resolucion: formData.numero_resolucion || null,
        fecha_resolucion: formData.fecha_resolucion || null,
        // R2
        matricula_inmobiliaria: formData.matricula_inmobiliaria || null,
        zona_fisica_1: parseFloat(formData.zona_fisica_1) || 0,
        zona_economica_1: parseFloat(formData.zona_economica_1) || 0,
        area_terreno_1: parseFloat(formData.area_terreno_1) || 0,
        habitaciones_1: parseInt(formData.habitaciones_1) || 0,
        banos_1: parseInt(formData.banos_1) || 0,
        locales_1: parseInt(formData.locales_1) || 0,
        pisos_1: parseInt(formData.pisos_1) || 1,
        puntaje_1: parseFloat(formData.puntaje_1) || 0,
        area_construida_1: parseFloat(formData.area_construida_1) || 0
      };

      // Usar sistema de aprobación
      const res = await axios.post(`${API}/predios/cambios/proponer`, {
        tipo_cambio: 'creacion',
        datos_propuestos: predioData,
        justificacion: 'Creación de nuevo predio'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.requiere_aprobacion) {
        toast.success('Predio propuesto. Pendiente de aprobación del coordinador.');
      } else {
        toast.success('Predio creado exitosamente');
      }
      
      setShowCreateDialog(false);
      resetForm();
      fetchPredios();
      fetchCambiosStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear predio');
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        nombre_propietario: formData.nombre_propietario,
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento,
        estado_civil: formData.estado_civil || null,
        direccion: formData.direccion,
        comuna: formData.comuna,
        destino_economico: formData.destino_economico,
        area_terreno: parseFloat(formData.area_terreno) || 0,
        area_construida: parseFloat(formData.area_construida) || 0,
        avaluo: parseFloat(formData.avaluo) || 0,
        tipo_mutacion: formData.tipo_mutacion || null,
        numero_resolucion: formData.numero_resolucion || null,
        matricula_inmobiliaria: formData.matricula_inmobiliaria || null
      };
      
      // Usar sistema de aprobación
      const res = await axios.post(`${API}/predios/cambios/proponer`, {
        predio_id: selectedPredio.id,
        tipo_cambio: 'modificacion',
        datos_propuestos: updateData,
        justificacion: 'Modificación de datos del predio'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.requiere_aprobacion) {
        toast.success('Modificación propuesta. Pendiente de aprobación del coordinador.');
      } else {
        toast.success('Predio actualizado exitosamente');
      }
      
      setShowEditDialog(false);
      fetchPredios();
      fetchCambiosStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar predio');
    }
  };

  const handleDelete = async (predio) => {
    if (!window.confirm(`¿Está seguro de eliminar el predio ${predio.codigo_homologado}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Usar sistema de aprobación
      const res = await axios.post(`${API}/predios/cambios/proponer`, {
        predio_id: predio.id,
        tipo_cambio: 'eliminacion',
        datos_propuestos: { codigo_homologado: predio.codigo_homologado, nombre_propietario: predio.nombre_propietario },
        justificacion: 'Eliminación de predio'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.requiere_aprobacion) {
        toast.success('Eliminación propuesta. Pendiente de aprobación del coordinador.');
      } else {
        toast.success('Predio eliminado exitosamente');
      }
      
      fetchPredios();
      fetchCambiosStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar predio');
    }
  };

  const openEditDialog = (predio) => {
    setSelectedPredio(predio);
    setFormData({
      ...formData,
      municipio: predio.municipio,
      zona: predio.zona,
      sector: predio.sector,
      manzana_vereda: predio.manzana_vereda,
      nombre_propietario: predio.nombre_propietario,
      tipo_documento: predio.tipo_documento,
      numero_documento: predio.numero_documento,
      estado_civil: predio.estado_civil || '',
      direccion: predio.direccion,
      comuna: predio.comuna || '0',
      destino_economico: predio.destino_economico,
      area_terreno: predio.area_terreno?.toString() || '0',
      area_construida: predio.area_construida?.toString() || '0',
      avaluo: predio.avaluo?.toString() || '0',
      tipo_mutacion: predio.tipo_mutacion || '',
      numero_resolucion: predio.numero_resolucion || '',
      matricula_inmobiliaria: predio.r2?.matricula_inmobiliaria || ''
    });
    setShowEditDialog(true);
  };

  const openDetailDialog = (predio) => {
    setSelectedPredio(predio);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      municipio: '',
      zona: '00',
      sector: '01',
      manzana_vereda: '0000',
      condicion_predio: '0000',
      predio_horizontal: '0000',
      nombre_propietario: '',
      tipo_documento: 'C',
      numero_documento: '',
      estado_civil: '',
      direccion: '',
      comuna: '0',
      destino_economico: 'A',
      area_terreno: '',
      area_construida: '0',
      avaluo: '',
      tipo_mutacion: '',
      numero_resolucion: '',
      fecha_resolucion: '',
      matricula_inmobiliaria: '',
      zona_fisica_1: '0',
      zona_economica_1: '0',
      area_terreno_1: '0',
      habitaciones_1: '0',
      banos_1: '0',
      locales_1: '0',
      pisos_1: '1',
      puntaje_1: '0',
      area_construida_1: '0'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  };

  // Formato de área: X ha X.XXX m²
  const formatAreaHectareas = (m2) => {
    if (!m2 || m2 === 0) return '0 m²';
    const hectareas = Math.floor(m2 / 10000);
    const metros = m2 % 10000;
    if (hectareas > 0) {
      return `${hectareas} ha ${metros.toLocaleString('es-CO')} m²`;
    }
    return `${m2.toLocaleString('es-CO')} m²`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-outfit">Gestión de Predios</h1>
          <p className="text-sm text-slate-500">Sistema de información catastral - Código Nacional Catastral</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Botón de cambios pendientes - solo para coordinadores */}
          {user && ['coordinador', 'administrador'].includes(user.role) && cambiosStats?.total_pendientes > 0 && (
            <Button variant="outline" onClick={fetchCambiosPendientes} className="border-amber-300 bg-amber-50 hover:bg-amber-100">
              <Bell className="w-4 h-4 mr-2 text-amber-600" />
              Pendientes ({cambiosStats.total_pendientes})
            </Button>
          )}
          <Button variant="outline" onClick={fetchPrediosEliminados}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Eliminados
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => { resetForm(); setTerrenoInfo(null); setShowCreateDialog(true); }} className="bg-emerald-700 hover:bg-emerald-800">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Predio
          </Button>
        </div>
      </div>

      {/* Info banner para gestores */}
      {necesitaAprobacion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Sistema de Aprobación Activo</p>
            <p className="text-xs text-blue-600">Los cambios que realice (crear, modificar, eliminar) quedarán pendientes hasta que un Coordinador los apruebe.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por código, propietario, documento, matrícula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Select value={filterMunicipio} onValueChange={setFilterMunicipio}>
              <SelectTrigger>
                <SelectValue placeholder="Municipio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los municipios</SelectItem>
                {catalogos?.municipios?.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDestino} onValueChange={setFilterDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los destinos</SelectItem>
                {catalogos?.destino_economico && Object.entries(catalogos.destino_economico).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 font-outfit flex items-center justify-between">
            <span>Predios Registrados</span>
            <Badge variant="outline">{total} predios</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Código Nacional</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Propietario(s)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Municipio</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Dirección</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Destino</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Avalúo</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {predios.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No hay predios registrados
                    </td>
                  </tr>
                ) : (
                  predios.map((predio) => (
                    <tr key={predio.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-mono text-xs font-medium text-emerald-800">{predio.codigo_predial_nacional}</p>
                          <p className="text-xs text-slate-500">Homologado: {predio.codigo_homologado}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {predio.propietarios?.[0]?.nombre_propietario || predio.nombre_propietario}
                          </p>
                          {(predio.propietarios?.length > 1) && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              <Users className="w-3 h-3 mr-1" />
                              +{predio.propietarios.length - 1} más
                            </Badge>
                          )}
                          <p className="text-xs text-slate-500">
                            {catalogos?.tipo_documento?.[predio.propietarios?.[0]?.tipo_documento || predio.tipo_documento]}: {predio.propietarios?.[0]?.numero_documento || predio.numero_documento}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{predio.municipio}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">{predio.direccion}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {predio.destino_economico}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(predio.avaluo)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetailDialog(predio)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(predio)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(predio)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-outfit">Nuevo Predio</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="ubicacion" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ubicacion">Código Nacional Catastral</TabsTrigger>
              <TabsTrigger value="propietario">Propietario (R1)</TabsTrigger>
              <TabsTrigger value="fisico">Físico (R2)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ubicacion" className="space-y-4 mt-4">
              {/* Info del terreno disponible */}
              {terrenoInfo && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Información de Terreno para esta Manzana
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Predios activos:</span>
                      <p className="font-bold text-emerald-700">{terrenoInfo.total_activos}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Último terreno usado:</span>
                      <p className="font-bold text-slate-800">{terrenoInfo.ultimo_terreno}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Próximo terreno:</span>
                      <p className="font-bold text-emerald-700 text-lg">{terrenoInfo.siguiente_terreno}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Eliminados (no reutilizables):</span>
                      <p className="font-bold text-red-600">{terrenoInfo.terrenos_no_reutilizables}</p>
                    </div>
                  </div>
                  {terrenoInfo.terrenos_eliminados?.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <span className="font-medium">Terrenos eliminados: </span>
                      {terrenoInfo.terrenos_eliminados.map(t => t.numero).join(', ')}
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Municipio *</Label>
                  <Select value={formData.municipio} onValueChange={(v) => setFormData({...formData, municipio: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione municipio" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos?.municipios?.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Zona (00=Rural, 01+=Urbano) *</Label>
                  <Input value={formData.zona} onChange={(e) => setFormData({...formData, zona: e.target.value})} maxLength={2} />
                </div>
                <div>
                  <Label>Sector *</Label>
                  <Input value={formData.sector} onChange={(e) => setFormData({...formData, sector: e.target.value})} maxLength={2} />
                </div>
                <div>
                  <Label>Manzana/Vereda *</Label>
                  <Input value={formData.manzana_vereda} onChange={(e) => setFormData({...formData, manzana_vereda: e.target.value})} maxLength={4} />
                </div>
                <div>
                  <Label>Condición Predio</Label>
                  <Input value={formData.condicion_predio} onChange={(e) => setFormData({...formData, condicion_predio: e.target.value})} maxLength={4} />
                </div>
                <div>
                  <Label>Predio Horizontal (PH)</Label>
                  <Input value={formData.predio_horizontal} onChange={(e) => setFormData({...formData, predio_horizontal: e.target.value})} maxLength={4} />
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Nota:</strong> El código predial nacional (30 dígitos) y el número de terreno se generarán automáticamente.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="propietario" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre del Propietario *</Label>
                  <Input value={formData.nombre_propietario} onChange={(e) => setFormData({...formData, nombre_propietario: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <Label>Tipo de Documento *</Label>
                  <Select value={formData.tipo_documento} onValueChange={(v) => setFormData({...formData, tipo_documento: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos?.tipo_documento && Object.entries(catalogos.tipo_documento).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número de Documento *</Label>
                  <Input value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} />
                </div>
                <div>
                  <Label>Estado Civil</Label>
                  <Select value={formData.estado_civil || "none"} onValueChange={(v) => setFormData({...formData, estado_civil: v === "none" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {catalogos?.estado_civil && Object.entries(catalogos.estado_civil).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Dirección *</Label>
                  <Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <Label>Comuna</Label>
                  <Input value={formData.comuna} onChange={(e) => setFormData({...formData, comuna: e.target.value})} />
                </div>
                <div>
                  <Label>Destino Económico *</Label>
                  <Select value={formData.destino_economico} onValueChange={(v) => setFormData({...formData, destino_economico: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos?.destino_economico && Object.entries(catalogos.destino_economico).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área Terreno (m²) *</Label>
                  <Input type="number" value={formData.area_terreno} onChange={(e) => setFormData({...formData, area_terreno: e.target.value})} />
                </div>
                <div>
                  <Label>Área Construida (m²)</Label>
                  <Input type="number" value={formData.area_construida} onChange={(e) => setFormData({...formData, area_construida: e.target.value})} />
                </div>
                <div>
                  <Label>Avalúo (COP) *</Label>
                  <Input type="number" value={formData.avaluo} onChange={(e) => setFormData({...formData, avaluo: e.target.value})} />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fisico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Matrícula Inmobiliaria</Label>
                  <Input value={formData.matricula_inmobiliaria} onChange={(e) => setFormData({...formData, matricula_inmobiliaria: e.target.value})} placeholder="Ej: 270-8920" />
                </div>
                <div>
                  <Label>Zona Física</Label>
                  <Input type="number" value={formData.zona_fisica_1} onChange={(e) => setFormData({...formData, zona_fisica_1: e.target.value})} />
                </div>
                <div>
                  <Label>Zona Económica</Label>
                  <Input type="number" value={formData.zona_economica_1} onChange={(e) => setFormData({...formData, zona_economica_1: e.target.value})} />
                </div>
                <div>
                  <Label>Habitaciones</Label>
                  <Input type="number" value={formData.habitaciones_1} onChange={(e) => setFormData({...formData, habitaciones_1: e.target.value})} />
                </div>
                <div>
                  <Label>Baños</Label>
                  <Input type="number" value={formData.banos_1} onChange={(e) => setFormData({...formData, banos_1: e.target.value})} />
                </div>
                <div>
                  <Label>Locales</Label>
                  <Input type="number" value={formData.locales_1} onChange={(e) => setFormData({...formData, locales_1: e.target.value})} />
                </div>
                <div>
                  <Label>Pisos</Label>
                  <Input type="number" value={formData.pisos_1} onChange={(e) => setFormData({...formData, pisos_1: e.target.value})} />
                </div>
                <div>
                  <Label>Puntaje Construcción</Label>
                  <Input type="number" value={formData.puntaje_1} onChange={(e) => setFormData({...formData, puntaje_1: e.target.value})} />
                </div>
                <div>
                  <Label>Área Construida (R2)</Label>
                  <Input type="number" value={formData.area_construida_1} onChange={(e) => setFormData({...formData, area_construida_1: e.target.value})} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-emerald-700 hover:bg-emerald-800">
              Crear Predio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-outfit">Editar Predio - {selectedPredio?.codigo_homologado}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Código Predial:</strong> {selectedPredio?.codigo_predial_nacional}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre del Propietario *</Label>
                <Input value={formData.nombre_propietario} onChange={(e) => setFormData({...formData, nombre_propietario: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <Label>Tipo de Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(v) => setFormData({...formData, tipo_documento: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos?.tipo_documento && Object.entries(catalogos.tipo_documento).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número de Documento *</Label>
                <Input value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Dirección *</Label>
                <Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <Label>Destino Económico *</Label>
                <Select value={formData.destino_economico} onValueChange={(v) => setFormData({...formData, destino_economico: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos?.destino_economico && Object.entries(catalogos.destino_economico).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Avalúo (COP) *</Label>
                <Input type="number" value={formData.avaluo} onChange={(e) => setFormData({...formData, avaluo: e.target.value})} />
              </div>
              <div>
                <Label>Área Terreno (m²)</Label>
                <Input type="number" value={formData.area_terreno} onChange={(e) => setFormData({...formData, area_terreno: e.target.value})} />
              </div>
              <div>
                <Label>Área Construida (m²)</Label>
                <Input type="number" value={formData.area_construida} onChange={(e) => setFormData({...formData, area_construida: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} className="bg-emerald-700 hover:bg-emerald-800">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deleted Predios Dialog */}
      <Dialog open={showDeletedDialog} onOpenChange={setShowDeletedDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-outfit flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Predios Eliminados
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Los siguientes predios han sido eliminados del sistema. Sus números de terreno no pueden ser reutilizados.
            </p>
            
            {prediosEliminados.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No hay predios eliminados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-red-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Código</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Propietario</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Municipio</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Terreno</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Fecha Eliminación</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Eliminado Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediosEliminados.map((predio) => (
                      <tr key={predio.id} className="border-b border-slate-100 hover:bg-red-50/50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{predio.codigo_homologado}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{predio.nombre_propietario}</td>
                        <td className="py-3 px-4 text-slate-700">{predio.municipio}</td>
                        <td className="py-3 px-4">
                          <Badge variant="destructive">{predio.terreno}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {predio.deleted_at ? new Date(predio.deleted_at).toLocaleDateString('es-CO') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{predio.deleted_by_name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm">
              <p className="font-semibold text-amber-800">Importante:</p>
              <p className="text-amber-700">
                Los números de terreno de predios eliminados no pueden ser reutilizados para mantener la integridad del sistema catastral.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeletedDialog(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cambios Pendientes Dialog */}
      <Dialog open={showPendientesDialog} onOpenChange={setShowPendientesDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-outfit flex items-center gap-2 text-amber-700">
              <Bell className="w-5 h-5" />
              Cambios Pendientes de Aprobación
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-700">{cambiosStats?.pendientes_creacion || 0}</p>
                <p className="text-xs text-slate-500">Creaciones</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{cambiosStats?.pendientes_modificacion || 0}</p>
                <p className="text-xs text-slate-500">Modificaciones</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700">{cambiosStats?.pendientes_eliminacion || 0}</p>
                <p className="text-xs text-slate-500">Eliminaciones</p>
              </div>
            </div>

            {cambiosPendientes.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No hay cambios pendientes de aprobación
              </div>
            ) : (
              <div className="space-y-4">
                {cambiosPendientes.map((cambio) => (
                  <Card key={cambio.id} className="border-l-4 border-l-amber-400">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                cambio.tipo_cambio === 'creacion' ? 'default' :
                                cambio.tipo_cambio === 'modificacion' ? 'secondary' : 'destructive'
                              }>
                                {cambio.tipo_cambio === 'creacion' ? 'Nuevo Predio' :
                                 cambio.tipo_cambio === 'modificacion' ? 'Modificación' : 'Eliminación'}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(cambio.fecha_propuesta).toLocaleString('es-CO')}
                              </span>
                            </div>
                            
                            {cambio.predio_actual && (
                              <p className="text-sm"><strong>Predio actual:</strong> {cambio.predio_actual.codigo_homologado} - {cambio.predio_actual.nombre_propietario}</p>
                            )}
                            <p className="text-sm"><strong>Propuesto por:</strong> {cambio.propuesto_por_nombre} ({cambio.propuesto_por_rol})</p>
                            {cambio.justificacion && (
                              <p className="text-sm text-slate-600"><strong>Justificación:</strong> {cambio.justificacion}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleAprobarRechazar(cambio.id, true, 'Aprobado')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                const comentario = window.prompt('Motivo del rechazo:');
                                if (comentario !== null) {
                                  handleAprobarRechazar(cambio.id, false, comentario);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        </div>

                        {/* Datos propuestos expandibles */}
                        <details className="bg-slate-50 rounded-lg p-3">
                          <summary className="cursor-pointer font-medium text-sm text-slate-700 flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Ver datos propuestos
                          </summary>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            {cambio.datos_propuestos.municipio && (
                              <div><span className="text-slate-500">Municipio:</span> <strong>{cambio.datos_propuestos.municipio}</strong></div>
                            )}
                            {cambio.datos_propuestos.nombre_propietario && (
                              <div><span className="text-slate-500">Propietario:</span> <strong>{cambio.datos_propuestos.nombre_propietario}</strong></div>
                            )}
                            {cambio.datos_propuestos.direccion && (
                              <div><span className="text-slate-500">Dirección:</span> <strong>{cambio.datos_propuestos.direccion}</strong></div>
                            )}
                            {cambio.datos_propuestos.destino_economico && (
                              <div><span className="text-slate-500">Destino:</span> <strong>{cambio.datos_propuestos.destino_economico}</strong></div>
                            )}
                            {cambio.datos_propuestos.area_terreno !== undefined && (
                              <div><span className="text-slate-500">Área Terreno:</span> <strong>{cambio.datos_propuestos.area_terreno?.toLocaleString()} m²</strong></div>
                            )}
                            {cambio.datos_propuestos.area_construida !== undefined && (
                              <div><span className="text-slate-500">Área Construida:</span> <strong>{cambio.datos_propuestos.area_construida?.toLocaleString()} m²</strong></div>
                            )}
                            {cambio.datos_propuestos.avaluo !== undefined && (
                              <div><span className="text-slate-500">Avalúo:</span> <strong className="text-emerald-700">{formatCurrency(cambio.datos_propuestos.avaluo)}</strong></div>
                            )}
                            {cambio.datos_propuestos.tipo_documento && (
                              <div><span className="text-slate-500">Tipo Doc:</span> <strong>{cambio.datos_propuestos.tipo_documento}</strong></div>
                            )}
                            {cambio.datos_propuestos.numero_documento && (
                              <div><span className="text-slate-500">Nro. Doc:</span> <strong>{cambio.datos_propuestos.numero_documento}</strong></div>
                            )}
                            {/* Mostrar todos los campos adicionales */}
                            {Object.entries(cambio.datos_propuestos)
                              .filter(([key]) => !['municipio', 'nombre_propietario', 'direccion', 'destino_economico', 'area_terreno', 'area_construida', 'avaluo', 'tipo_documento', 'numero_documento', 'codigo_homologado'].includes(key))
                              .map(([key, value]) => (
                                value !== null && value !== undefined && value !== '' && (
                                  <div key={key}><span className="text-slate-500">{key.replace(/_/g, ' ')}:</span> <strong>{String(value)}</strong></div>
                                )
                              ))
                            }
                          </div>
                        </details>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowPendientesDialog(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-outfit flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              Detalle del Predio - {selectedPredio?.codigo_homologado}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPredio && (
            <div className="space-y-6">
              {/* Botón Generar Certificado */}
              {['coordinador', 'administrador', 'atencion_usuario'].includes(user?.role) && (
                <div className="flex justify-end">
                  <Button
                    variant="default"
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API}/predios/${selectedPredio.id}/certificado`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) throw new Error('Error generando certificado');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Certificado_Catastral_${selectedPredio.codigo_predial_nacional}.pdf`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        toast.success('Certificado generado correctamente');
                      } catch (error) {
                        toast.error('Error al generar el certificado');
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Certificado Catastral
                  </Button>
                </div>
              )}
              
              {/* Códigos */}
              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Código Homologado</p>
                    <p className="font-bold text-lg text-emerald-800">{selectedPredio.codigo_homologado}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Código Predial Nacional (30 dígitos)</p>
                    <p className="font-mono text-sm text-slate-700">{selectedPredio.codigo_predial_nacional}</p>
                  </div>
                </div>
              </div>
              
              {/* Ubicación */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Ubicación Código Nacional Catastral
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Departamento:</span> <strong>{selectedPredio.departamento}</strong></div>
                  <div><span className="text-slate-500">Municipio:</span> <strong>{selectedPredio.municipio}</strong></div>
                  <div><span className="text-slate-500">Zona:</span> <strong>{selectedPredio.zona === '00' ? 'Rural' : 'Urbano'}</strong></div>
                  <div><span className="text-slate-500">Sector:</span> <strong>{selectedPredio.sector}</strong></div>
                  <div><span className="text-slate-500">Manzana/Vereda:</span> <strong>{selectedPredio.manzana_vereda}</strong></div>
                  <div><span className="text-slate-500">Terreno:</span> <strong>{selectedPredio.terreno}</strong></div>
                </CardContent>
              </Card>
              
              {/* Propietarios (R1) */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> 
                    Propietarios (R1)
                    {selectedPredio.propietarios?.length > 1 && (
                      <Badge variant="secondary">{selectedPredio.propietarios.length} propietarios</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPredio.propietarios && selectedPredio.propietarios.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPredio.propietarios.map((prop, idx) => (
                        <div key={idx} className={`grid grid-cols-2 gap-4 text-sm ${idx > 0 ? 'border-t pt-3' : ''}`}>
                          <div className="col-span-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{idx + 1}/{selectedPredio.propietarios.length}</Badge>
                            <strong>{prop.nombre_propietario}</strong>
                          </div>
                          <div><span className="text-slate-500">Documento:</span> <strong>{catalogos?.tipo_documento?.[prop.tipo_documento]} {prop.numero_documento}</strong></div>
                          <div><span className="text-slate-500">Estado Civil:</span> <strong>{catalogos?.estado_civil?.[prop.estado_civil] || 'N/A'}</strong></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2"><span className="text-slate-500">Nombre:</span> <strong>{selectedPredio.nombre_propietario}</strong></div>
                      <div><span className="text-slate-500">Documento:</span> <strong>{catalogos?.tipo_documento?.[selectedPredio.tipo_documento]} {selectedPredio.numero_documento}</strong></div>
                      <div><span className="text-slate-500">Estado Civil:</span> <strong>{catalogos?.estado_civil?.[selectedPredio.estado_civil] || 'N/A'}</strong></div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-slate-500 text-sm">Dirección:</span> <strong className="text-sm">{selectedPredio.direccion}</strong>
                  </div>
                </CardContent>
              </Card>
              
              {/* Características */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="w-4 h-4" /> Características Generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Destino:</span> <strong>{selectedPredio.destino_economico} - {catalogos?.destino_economico?.[selectedPredio.destino_economico]}</strong></div>
                  <div><span className="text-slate-500">Área Terreno:</span> <strong>{formatAreaHectareas(selectedPredio.area_terreno)}</strong></div>
                  <div><span className="text-slate-500">Área Construida:</span> <strong>{formatAreaHectareas(selectedPredio.area_construida)}</strong></div>
                  <div className="col-span-2"><span className="text-slate-500">Avalúo:</span> <strong className="text-emerald-700">{formatCurrency(selectedPredio.avaluo)}</strong></div>
                </CardContent>
              </Card>

              {/* Datos R2 - Información Física */}
              {selectedPredio.r2_registros && selectedPredio.r2_registros.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" /> 
                      Información Física (R2)
                      {selectedPredio.r2_registros.length > 1 && (
                        <Badge variant="secondary">{selectedPredio.r2_registros.length} registros</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedPredio.r2_registros.map((r2, r2Idx) => (
                      <div key={r2Idx} className={r2Idx > 0 ? 'border-t pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-emerald-50">Registro {r2Idx + 1}</Badge>
                          {r2.matricula_inmobiliaria && (
                            <span className="text-sm text-slate-600">
                              Matrícula: <strong>{r2.matricula_inmobiliaria}</strong>
                            </span>
                          )}
                        </div>
                        
                        {r2.zonas && r2.zonas.length > 0 && (
                          <div className="space-y-4">
                            {/* Tabla 1: Zonas Físicas, Económicas y Área Terreno */}
                            <div>
                              <p className="text-sm font-semibold text-slate-700 mb-2">Información de Zonas y Terreno</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border rounded-lg">
                                  <thead>
                                    <tr className="bg-emerald-50 border-b">
                                      <th className="py-2 px-3 text-left">Registro</th>
                                      <th className="py-2 px-3 text-center">Zona Física</th>
                                      <th className="py-2 px-3 text-center">Zona Económica</th>
                                      <th className="py-2 px-3 text-right">Área Terreno</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r2.zonas.map((zona, zIdx) => (
                                      <tr key={zIdx} className="border-b last:border-b-0 hover:bg-slate-50">
                                        <td className="py-2 px-3 font-medium">{zona.zona_numero}</td>
                                        <td className="py-2 px-3 text-center">{zona.zona_fisica}</td>
                                        <td className="py-2 px-3 text-center">{zona.zona_economica}</td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {formatAreaHectareas(zona.area_terreno)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            {/* Tabla 2: Construcción */}
                            <div>
                              <p className="text-sm font-semibold text-slate-700 mb-2">Información de Construcción</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border rounded-lg">
                                  <thead>
                                    <tr className="bg-blue-50 border-b">
                                      <th className="py-2 px-3 text-left">Registro</th>
                                      <th className="py-2 px-3 text-center">Habitaciones</th>
                                      <th className="py-2 px-3 text-center">Baños</th>
                                      <th className="py-2 px-3 text-center">Locales</th>
                                      <th className="py-2 px-3 text-center">Pisos</th>
                                      <th className="py-2 px-3 text-center">Uso</th>
                                      <th className="py-2 px-3 text-center">Puntaje</th>
                                      <th className="py-2 px-3 text-right">Área Construida</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r2.zonas.map((zona, zIdx) => (
                                      <tr key={zIdx} className="border-b last:border-b-0 hover:bg-slate-50">
                                        <td className="py-2 px-3 font-medium">{zona.zona_numero}</td>
                                        <td className="py-2 px-3 text-center">{zona.habitaciones}</td>
                                        <td className="py-2 px-3 text-center">{zona.banos}</td>
                                        <td className="py-2 px-3 text-center">{zona.locales}</td>
                                        <td className="py-2 px-3 text-center">{zona.pisos}</td>
                                        <td className="py-2 px-3 text-center">{zona.uso || '-'}</td>
                                        <td className="py-2 px-3 text-center">{zona.puntaje}</td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {formatAreaHectareas(zona.area_construida)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {/* Historial */}
              {selectedPredio.historial && selectedPredio.historial.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" /> Historial
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedPredio.historial.map((h, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-emerald-200 pl-3 py-1">
                          <p className="font-medium">{h.accion}</p>
                          <p className="text-xs text-slate-500">{h.usuario} - {new Date(h.fecha).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Mapa del Predio (Opción C) */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Map className="w-4 h-4" /> Ubicación Geográfica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PredioMap 
                    codigoPredial={selectedPredio.codigo_predial_nacional}
                    predioData={selectedPredio}
                    height={250}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

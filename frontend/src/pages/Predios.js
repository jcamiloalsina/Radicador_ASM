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
  User, DollarSign, LayoutGrid, Eye, History
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Predios() {
  const [predios, setPredios] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterMunicipio, setFilterMunicipio] = useState('todos');
  const [filterDestino, setFilterDestino] = useState('todos');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPredio, setSelectedPredio] = useState(null);
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
    fetchPredios();
  }, []);

  useEffect(() => {
    fetchPredios();
  }, [filterMunicipio, filterDestino]);

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

  const handleSearch = () => {
    fetchPredios();
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        r1: {
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
          fecha_resolucion: formData.fecha_resolucion || null
        },
        r2: {
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
        }
      };
      
      await axios.post(`${API}/predios`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Predio creado exitosamente');
      setShowCreateDialog(false);
      resetForm();
      fetchPredios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear predio');
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
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
      
      await axios.patch(`${API}/predios/${selectedPredio.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Predio actualizado exitosamente');
      setShowEditDialog(false);
      fetchPredios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar predio');
    }
  };

  const handleDelete = async (predio) => {
    if (!window.confirm(`¿Está seguro de eliminar el predio ${predio.codigo_homologado}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/predios/${predio.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Predio eliminado exitosamente');
      fetchPredios();
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
          <p className="text-sm text-slate-500">Sistema de información catastral Código Nacional Catastral</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-emerald-700 hover:bg-emerald-800">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Predio
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por código, propietario, documento..."
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
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Propietario</th>
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
                          <p className="font-medium text-slate-900">{predio.codigo_homologado}</p>
                          <p className="text-xs text-slate-500">{predio.codigo_predial_nacional?.substring(0, 15)}...</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{predio.nombre_propietario}</p>
                          <p className="text-xs text-slate-500">{catalogos?.tipo_documento?.[predio.tipo_documento]}: {predio.numero_documento}</p>
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
              <TabsTrigger value="ubicacion">Ubicación Código Nacional Catastral</TabsTrigger>
              <TabsTrigger value="propietario">Propietario (R1)</TabsTrigger>
              <TabsTrigger value="fisico">Físico (R2)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ubicacion" className="space-y-4 mt-4">
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
                  {formData.municipio && catalogos?.codigo_nacional?.[formData.municipio] && (
                    <p className="text-xs text-slate-500 mt-1">
                      Código Código Nacional Catastral: {catalogos.codigo_nacional[formData.municipio].departamento}-{catalogos.codigo_nacional[formData.municipio].municipio}
                    </p>
                  )}
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
              
              {/* Propietario */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" /> Propietario (R1)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2"><span className="text-slate-500">Nombre:</span> <strong>{selectedPredio.nombre_propietario}</strong></div>
                  <div><span className="text-slate-500">Documento:</span> <strong>{catalogos?.tipo_documento?.[selectedPredio.tipo_documento]} {selectedPredio.numero_documento}</strong></div>
                  <div><span className="text-slate-500">Estado Civil:</span> <strong>{catalogos?.estado_civil?.[selectedPredio.estado_civil] || 'N/A'}</strong></div>
                  <div className="col-span-2"><span className="text-slate-500">Dirección:</span> <strong>{selectedPredio.direccion}</strong></div>
                </CardContent>
              </Card>
              
              {/* Características */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="w-4 h-4" /> Características
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Destino:</span> <strong>{selectedPredio.destino_economico} - {catalogos?.destino_economico?.[selectedPredio.destino_economico]}</strong></div>
                  <div><span className="text-slate-500">Área Terreno:</span> <strong>{selectedPredio.area_terreno?.toLocaleString()} m²</strong></div>
                  <div><span className="text-slate-500">Área Construida:</span> <strong>{selectedPredio.area_construida?.toLocaleString()} m²</strong></div>
                  <div className="col-span-2"><span className="text-slate-500">Avalúo:</span> <strong className="text-emerald-700">{formatCurrency(selectedPredio.avaluo)}</strong></div>
                </CardContent>
              </Card>
              
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

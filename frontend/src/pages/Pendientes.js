import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Clock, CheckCircle, XCircle, Building, User, MapPin, 
  FileText, Eye, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Pendientes() {
  const { user } = useAuth();
  const [cambiosPendientes, setCambiosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCambio, setSelectedCambio] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchPendientes();
  }, []);

  const fetchPendientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/predios/cambios/pendientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // El API devuelve {total: X, cambios: [...]}
      const data = response.data;
      const cambios = data.cambios || (Array.isArray(data) ? data : []);
      setCambiosPendientes(cambios);
    } catch (error) {
      console.error('Error loading pending changes:', error);
      setCambiosPendientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (cambioId) => {
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/predios/cambios/aprobar`, 
        { cambio_id: cambioId, aprobado: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cambio aprobado exitosamente');
      fetchPendientes();
      setSelectedCambio(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al aprobar cambio');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async (cambioId) => {
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/predios/cambios/aprobar`, 
        { cambio_id: cambioId, aprobado: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cambio rechazado');
      fetchPendientes();
      setSelectedCambio(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al rechazar cambio');
    } finally {
      setProcesando(false);
    }
  };

  const getTipoCambioLabel = (tipo) => {
    const labels = {
      'creacion': 'Nuevo Predio',
      'actualizacion': 'Actualización',
      'eliminacion': 'Eliminación'
    };
    return labels[tipo] || tipo;
  };

  const getTipoCambioColor = (tipo) => {
    const colors = {
      'creacion': 'bg-blue-100 text-blue-800',
      'actualizacion': 'bg-amber-100 text-amber-800',
      'eliminacion': 'bg-red-100 text-red-800'
    };
    return colors[tipo] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-outfit">Cambios Pendientes</h1>
          <p className="text-slate-500 mt-1">Cambios de predios que requieren aprobación</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          {cambiosPendientes.length} pendientes
        </Badge>
      </div>

      {/* Lista de cambios pendientes */}
      {cambiosPendientes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">¡Todo al día!</h3>
            <p className="text-slate-500 mt-2">No hay cambios pendientes de aprobación</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cambiosPendientes.map((cambio) => (
            <Card key={cambio.id} className="border-slate-200 hover:border-emerald-300 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getTipoCambioColor(cambio.tipo_cambio)}>
                        {getTipoCambioLabel(cambio.tipo_cambio)}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {cambio.fecha_propuesta ? new Date(cambio.fecha_propuesta).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Sin fecha'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Código Predial Nacional</p>
                          <p className="font-mono text-sm break-all">{cambio.datos_propuestos?.codigo_predial_nacional || cambio.predio_actual?.codigo_predial_nacional || 'Nuevo'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Municipio</p>
                          <p className="text-sm">{cambio.datos_propuestos?.municipio || cambio.predio_actual?.municipio || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Solicitado por</p>
                          <p className="text-sm">{cambio.propuesto_por_nombre || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCambio(cambio)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => handleAprobar(cambio.id)}
                      disabled={procesando}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => handleRechazar(cambio.id)}
                      disabled={procesando}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de detalle */}
      <Dialog open={!!selectedCambio} onOpenChange={() => setSelectedCambio(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Cambio</DialogTitle>
          </DialogHeader>
          {selectedCambio && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getTipoCambioColor(selectedCambio.tipo_cambio)}>
                  {getTipoCambioLabel(selectedCambio.tipo_cambio)}
                </Badge>
                <span className="text-sm text-slate-500">
                  Solicitado por: {selectedCambio.propuesto_por_nombre || 'N/A'}
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-700 mb-3">Datos del Predio</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Código Predial:</span>
                    <p className="font-mono">{selectedCambio.datos_propuestos?.codigo_predial_nacional || selectedCambio.predio_actual?.codigo_homologado || 'Nuevo'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Municipio:</span>
                    <p>{selectedCambio.datos_propuestos?.municipio || selectedCambio.predio_actual?.municipio || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Dirección:</span>
                    <p>{selectedCambio.datos_propuestos?.direccion || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Propietario:</span>
                    <p>{selectedCambio.datos_propuestos?.nombre_propietario || selectedCambio.datos_propuestos?.propietarios?.[0]?.nombre_propietario || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Área Terreno:</span>
                    <p>{selectedCambio.datos_propuestos?.area_terreno?.toLocaleString() || 'N/A'} m²</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Avalúo:</span>
                    <p>${selectedCambio.datos_propuestos?.avaluo?.toLocaleString() || 'N/A'}</p>
                  </div>
                  {selectedCambio.justificacion && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Justificación:</span>
                      <p>{selectedCambio.justificacion}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCambio(null)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-50"
                  onClick={() => handleRechazar(selectedCambio.id)}
                  disabled={procesando}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => handleAprobar(selectedCambio.id)}
                  disabled={procesando}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar Cambio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
